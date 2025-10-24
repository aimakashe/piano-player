/* script.js — точное позиционирование чёрных клавиш и улучшённый синтетический тембр */

/* Конфигурация */
const START_OCTAVE = 1;
const OCTAVES = 7;
const OCTAVE_NOTES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const WHITE_IN_OCTAVE = ['C','D','E','F','G','A','B'];

/* Простой KEY_MAP для центральных клавиш (mouse покрывает весь диапазон) */
const KEY_MAP = {
  'q':'C3','2':'C#3','w':'D3','3':'D#3','e':'E3','r':'F3','5':'F#3','t':'G3','6':'G#3','y':'A3','7':'A#3','u':'B3',
  'i':'C4','9':'C#4','o':'D4','0':'D#4','p':'E4','z':'F4','s':'F#4','x':'G4','d':'G#4','c':'A4','f':'A#4','v':'B4',
  'b':'C5','h':'C#5','n':'D5','j':'D#5','m':'E5'
};

/* State */
const state = {
  audioContext: null,
  masterGain: null,
  currentNotes: new Map(),
  activeKeys: new Set(),
  isRecording: false,
  recordStartTime: 0,
  recording: { name:'My Song', duration:0, notes:[] },
  loadedSongs: {},
  currentSong: null,
  isPlaying: false,
  isPaused: false,
  playbackStartTime: 0,
  pausedTime: 0,
  playbackTimers: [],
  speed: 1
};

/* Генерация нот и частот */
function allNotesList(startOctave, octaves) {
  const arr = [];
  for (let o = startOctave; o < startOctave + octaves; o++) {
    for (const n of OCTAVE_NOTES) arr.push(`${n}${o}`);
  }
  return arr;
}

function noteFreq(note) {
  const map = { 'C': -9,'C#':-8,'D':-7,'D#':-6,'E':-5,'F':-4,'F#':-3,'G':-2,'G#':-1,'A':0,'A#':1,'B':2 };
  const m = note.match(/^([A-G]#?)(\d)$/);
  if (!m) return null;
  const key = m[1];
  const oct = +m[2];
  const semitone = map[key] + (oct - 4) * 12;
  return +(440 * Math.pow(2, semitone / 12)).toFixed(2);
}

const ALL_NOTES = allNotesList(START_OCTAVE, OCTAVES);
const NOTES = {};
ALL_NOTES.forEach(n => { NOTES[n] = noteFreq(n); });

/* Audio init */
function initAudio() {
  if (!state.audioContext) {
    state.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    state.masterGain = state.audioContext.createGain();
    state.masterGain.gain.value = 0.26;
    const comp = state.audioContext.createDynamicsCompressor();
    comp.threshold.setValueAtTime(-30, state.audioContext.currentTime);
    comp.knee.setValueAtTime(20, state.audioContext.currentTime);
    comp.ratio.setValueAtTime(6, state.audioContext.currentTime);
    comp.connect(state.audioContext.destination);
    state.masterGain.connect(comp);
  }
}

/* Более реалистичный синтез: суммируем гармоники + небольшой lowpass */
function createPianoVoice(freq, durationSec) {
  if (!state.audioContext) initAudio();
  const ctx = state.audioContext;
  const now = ctx.currentTime;

  // Создаём ноду управления громкостью
  const outGain = ctx.createGain();
  outGain.gain.setValueAtTime(0.0001, now);

  // Низкочастотный фильтр - смягчит верхние гармоники
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.setValueAtTime(8000, now);
  lp.Q.value = 0.7;

  // Несколько осцилляторов (основной + гармоники)
  const oscMain = ctx.createOscillator();
  oscMain.type = 'triangle';
  oscMain.frequency.value = freq;

  const oscH1 = ctx.createOscillator();
  oscH1.type = 'sine';
  oscH1.frequency.value = freq * 2;

  const oscH2 = ctx.createOscillator();
  oscH2.type = 'sine';
  oscH2.frequency.value = freq * 3;

  // Суммарный грубый баланс гармоник через отдельные gains
  const gMain = ctx.createGain();
  const gH1 = ctx.createGain();
  const gH2 = ctx.createGain();

  gMain.gain.setValueAtTime(0.8, now);
  gH1.gain.setValueAtTime(0.25, now);
  gH2.gain.setValueAtTime(0.08, now);

  oscMain.connect(gMain);
  oscH1.connect(gH1);
  oscH2.connect(gH2);

  gMain.connect(outGain);
  gH1.connect(outGain);
  gH2.connect(outGain);

  outGain.connect(lp);
  lp.connect(state.masterGain);

  // ADSR-ish envelope on outGain
  const attack = 0.004;
  const decay = Math.min(0.2, durationSec * 0.2);
  const sustain = 0.02 + Math.min(0.6, durationSec * 0.4);
  outGain.gain.cancelScheduledValues(now);
  outGain.gain.setValueAtTime(0.0001, now);
  outGain.gain.exponentialRampToValueAtTime(1.0, now + attack);
  outGain.gain.exponentialRampToValueAtTime(sustain, now + attack + decay);
  outGain.gain.setValueAtTime(sustain, now + attack + decay);

  // Запуск
  oscMain.start(now);
  oscH1.start(now);
  oscH2.start(now);

  // Остановка — делаем релиз
  const stopTime = now + durationSec;
  outGain.gain.exponentialRampToValueAtTime(0.0001, stopTime + 0.08);

  oscMain.stop(stopTime + 0.1);
  oscH1.stop(stopTime + 0.1);
  oscH2.stop(stopTime + 0.1);

  return {
    stop: () => {
      const t = ctx.currentTime;
      outGain.gain.cancelScheduledValues(t);
      outGain.gain.setValueAtTime(outGain.gain.value, t);
      outGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
    }
  };
}

/* playNote/stopNote с поддержкой polyphony */
function playNote(note, durationSec = 1) {
  if (!NOTES[note]) return;
  if (!state.audioContext) initAudio();

  const voice = createPianoVoice(NOTES[note], durationSec);
  state.currentNotes.set(note, voice);
}

function stopNote(note) {
  const voice = state.currentNotes.get(note);
  if (!voice) return;
  try {
    voice.stop();
  } catch (e) {
    // ignore
  }
  state.currentNotes.delete(note);
}

/* UI: создание клавиатуры с точным позиционированием черных клавиш */
function createPiano() {
  const piano = document.getElementById('piano');
  piano.innerHTML = '';

  const whiteContainer = document.createElement('div');
  whiteContainer.className = 'white-keys';
  const blackContainer = document.createElement('div');
  blackContainer.className = 'black-keys';

  piano.appendChild(whiteContainer);
  piano.appendChild(blackContainer);

  // Считаем белые клавиши (в одной октаве 7)
  const totalWhite = OCTAVES * WHITE_IN_OCTAVE.length;
  const styles = getComputedStyle(piano);
  const padLeft = parseFloat(styles.paddingLeft) || 12;
  const padRight = parseFloat(styles.paddingRight) || 12;
  const available = piano.clientWidth - padLeft - padRight;
  const whiteW = Math.max(24, available / totalWhite); // минимальная ширина
  piano.style.setProperty('--white-key-width', `${whiteW}px`);

  // Список структур для позиций
  const keyInfos = [];
  let whiteIdx = 0;
  ALL_NOTES.forEach((fullNote, idx) => {
    const base = fullNote.replace(/\d/,'');
    const black = base.includes('#');
    if (!black) {
      // create white key
      const key = document.createElement('div');
      key.className = 'key white';
      key.dataset.note = fullNote;
      const label = document.createElement('div');
      label.className = 'key-label';
      label.textContent = fullNote;
      key.appendChild(label);
      // events
      key.addEventListener('mousedown', () => { handleKeyDown(fullNote); });
      key.addEventListener('mouseup', () => { handleKeyUp(fullNote); });
      key.addEventListener('mouseleave', () => { handleKeyUp(fullNote); });
      whiteContainer.appendChild(key);
      keyInfos.push({ note: fullNote, isBlack:false, whiteIndex: whiteIdx });
      whiteIdx++;
    } else {
      keyInfos.push({ note: fullNote, isBlack:true, whiteIndex: null });
    }
  });

  // Теперь создаём чёрные клавиши — позиция: центр между left white and next white
  keyInfos.forEach((ki, idx) => {
    if (!ki.isBlack) return;
    // найти предыдущую белую слева
    let j = idx - 1;
    while (j >= 0 && keyInfos[j].isBlack) j--;
    if (j < 0) return;
    const leftWhiteIndex = keyInfos[j].whiteIndex;
    // позиция центра между leftWhite и (leftWhite+1)
    const center = padLeft + (leftWhiteIndex + 0.5) * whiteW;
    const blackW = whiteW * 0.62;
    const left = center - blackW / 2;
    const key = document.createElement('div');
    key.className = 'key black';
    key.dataset.note = ki.note;
    key.style.left = `${left}px`;
    const label = document.createElement('div');
    label.className = 'key-label';
    label.textContent = ki.note;
    key.appendChild(label);
    // events
    key.addEventListener('mousedown', (e) => { e.stopPropagation(); handleKeyDown(ki.note); });
    key.addEventListener('mouseup', (e) => { e.stopPropagation(); handleKeyUp(ki.note); });
    key.addEventListener('mouseleave', (e) => { e.stopPropagation(); handleKeyUp(ki.note); });
    blackContainer.appendChild(key);
  });

  // При ресайзе пересоздавать (debounce)
  let resizeTimer = null;
  function onResize() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => createPiano(), 80);
  }
  window.removeEventListener('resize', onResize);
  window.addEventListener('resize', onResize);
}

/* Keyboard events (interactive only) */
document.addEventListener('keydown', (e) => {
  if (document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA')) return;
  if (e.repeat) return;
  const note = KEY_MAP[e.key.toLowerCase()];
  if (!note) return;
  handleKeyDown(note);
});

document.addEventListener('keyup', (e) => {
  const note = KEY_MAP[e.key.toLowerCase()];
  if (!note) return;
  handleKeyUp(note);
});

/* handleKeyDown/Up */
function handleKeyDown(note) {
  if (!NOTES[note]) return;
  if (state.activeKeys.has(note)) return;
  state.activeKeys.add(note);
  const el = document.querySelector(`[data-note="${note}"]`);
  if (el) el.classList.add('active');
  playNote(note, 1.6);
  if (state.isRecording) {
    state.recording.notes.push({ key: note, startTime: Date.now() - state.recordStartTime, duration: 0 });
  }
}

function handleKeyUp(note) {
  if (!NOTES[note]) return;
  state.activeKeys.delete(note);
  const el = document.querySelector(`[data-note="${note}"]`);
  if (el) el.classList.remove('active');
  stopNote(note);
  if (state.isRecording) {
    for (let i = state.recording.notes.length - 1; i >= 0; i--) {
      if (state.recording.notes[i].key === note && state.recording.notes[i].duration === 0) {
        state.recording.notes[i].duration = Date.now() - state.recordStartTime - state.recording.notes[i].startTime;
        break;
      }
    }
  }
}

/* Recording UI */
const recordBtnEl = () => document.getElementById('record-btn');
const stopRecordBtnEl = () => document.getElementById('stop-record-btn');
const downloadBtnEl = () => document.getElementById('download-btn');
const recordTimeEl = () => document.getElementById('record-time');

recordBtnEl().addEventListener('click', () => {
  state.isRecording = true;
  state.recordStartTime = Date.now();
  state.recording = { name:'My Song', duration:0, notes:[] };
  recordBtnEl().disabled = true;
  stopRecordBtnEl().disabled = false;
  downloadBtnEl().disabled = true;
  tickRecordTime();
});

stopRecordBtnEl().addEventListener('click', () => {
  state.isRecording = false;
  state.recording.duration = Date.now() - state.recordStartTime;
  recordBtnEl().disabled = false;
  stopRecordBtnEl().disabled = true;
  downloadBtnEl().disabled = false;
});

function tickRecordTime() {
  if (!state.isRecording) return;
  recordTimeEl().textContent = msToTime(Date.now() - state.recordStartTime);
  requestAnimationFrame(tickRecordTime);
}

downloadBtnEl().addEventListener('click', () => {
  const data = JSON.stringify(state.recording, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${state.recording.name}.json`;
  a.click();
  URL.revokeObjectURL(url);
});

/* Prepared mode (load builtins, play/pause/stop) */
const BUILTIN = [
  { name:'Crystal Castles - Kerosene', path:'assets/songs/Crystal Castles - Kerosene.json' },
  { name:'Fuji Kaze - Hana', path:'assets/songs/Fujii Kaze - Hana.json' } // проверьте имя файла в assets
];

async function loadBuiltin() {
  const sel = document.getElementById('song-list');
  for (const item of BUILTIN) {
    try {
      const res = await fetch(item.path);
      if (!res.ok) continue;
      const json = await res.json();
      state.loadedSongs[item.name] = json;
      const opt = document.createElement('option');
      opt.value = item.name;
      opt.textContent = item.name;
      sel.appendChild(opt);
    } catch (e) {
      // ignore
    }
  }
}

document.getElementById('song-list').addEventListener('change', (e) => {
  const name = e.target.value;
  if (!name) {
    state.currentSong = null;
    document.getElementById('play-btn').disabled = true;
    return;
  }
  state.currentSong = state.loadedSongs[name];
  if (state.currentSong && typeof state.currentSong.duration !== 'number') {
    const last = (state.currentSong.notes || []).reduce((acc, n) => (n.startTime + n.duration) > (acc.startTime + acc.duration) ? n : acc, { startTime:0, duration:0 });
    state.currentSong.duration = (last.startTime || 0) + (last.duration || 0);
  }
  document.getElementById('total-time').textContent = msToTime(state.currentSong.duration || 0);
  document.getElementById('play-btn').disabled = false;
  stopPlayback();
});

document.getElementById('upload-btn').addEventListener('click', () => { document.getElementById('file-input').click(); });
document.getElementById('file-input').addEventListener('change', (e) => {
  const f = e.target.files[0];
  if (!f) return;
  const r = new FileReader();
  r.onload = (ev) => {
    try {
      const json = JSON.parse(ev.target.result);
      const nm = f.name.replace('.json','');
      state.loadedSongs[nm] = json;
      const opt = document.createElement('option'); opt.value = nm; opt.textContent = nm;
      document.getElementById('song-list').appendChild(opt);
      document.getElementById('song-list').value = nm;
      document.getElementById('song-list').dispatchEvent(new Event('change'));
    } catch {
      alert('Ошибка парсинга JSON');
    }
  };
  r.readAsText(f);
});

/* Playback controls */
const playBtn = document.getElementById('play-btn');
const pauseBtn = document.getElementById('pause-btn');
const stopBtn = document.getElementById('stop-play-btn');
const speedEl = document.getElementById('speed');
const speedValueEl = document.getElementById('speed-value');
const progressFillEl = document.getElementById('progress-fill');
const currentTimeEl = document.getElementById('current-time');

playBtn.addEventListener('click', () => {
  if (!state.currentSong) return;
  if (state.isPaused) resumePlayback();
  else startPlayback();
});
pauseBtn.addEventListener('click', pausePlayback);
stopBtn.addEventListener('click', stopPlayback);
speedEl.addEventListener('input', (e) => {
  state.speed = parseFloat(e.target.value);
  speedValueEl.textContent = `${state.speed}x`;
  if (state.isPlaying) { stopPlayback(); startPlayback(); }
});

/* Playback scheduling */
function scheduleNotes(offsetMs = 0) {
  if (!state.currentSong || !Array.isArray(state.currentSong.notes)) return;
  clearScheduled();
  state.playbackTimers = [];
  const notes = state.currentSong.notes;
  const now = Date.now();
  notes.forEach((n) => {
    const start = Math.max(0, (n.startTime - offsetMs) / state.speed);
    const dur = (n.duration || 100) / state.speed;
    const t1 = setTimeout(() => {
      const el = document.querySelector(`[data-note="${n.key}"]`);
      if (el) el.classList.add('active');
      playNote(n.key, Math.max(0.05, dur / 1000));
    }, start);
    const t2 = setTimeout(() => {
      const el = document.querySelector(`[data-note="${n.key}"]`);
      if (el) el.classList.remove('active');
      stopNote(n.key);
    }, start + dur);
    state.playbackTimers.push(t1, t2);
  });
  const total = (state.currentSong.duration || 0) / state.speed;
  const endTimer = setTimeout(() => { if (state.isPlaying) stopPlayback(); }, total);
  state.playbackTimers.push(endTimer);
}

function clearScheduled() {
  state.playbackTimers.forEach(t => clearTimeout(t));
  state.playbackTimers = [];
}

function startPlayback() {
  if (!state.currentSong) return;
  state.isPlaying = true;
  state.isPaused = false;
  state.playbackStartTime = Date.now();
  scheduleNotes(0);
  playBtn.disabled = true; pauseBtn.disabled = false; stopBtn.disabled = false;
  updateProgress();
}

function resumePlayback() {
  state.isPlaying = true;
  state.isPaused = false;
  state.playbackStartTime = Date.now() - state.pausedTime;
  scheduleNotes(state.pausedTime);
  playBtn.disabled = true; pauseBtn.disabled = false;
  updateProgress();
}

function pausePlayback() {
  if (!state.isPlaying) return;
  state.isPlaying = false;
  state.isPaused = true;
  state.pausedTime = Date.now() - state.playbackStartTime;
  clearScheduled();
  stopAllNotes();
  playBtn.disabled = false; pauseBtn.disabled = true;
}

function stopPlayback() {
  state.isPlaying = false;
  state.isPaused = false;
  state.pausedTime = 0;
  clearScheduled();
  stopAllNotes();
  progressFillEl.style.width = '0%';
  currentTimeEl.textContent = '00:00';
  document.querySelectorAll('.key.active').forEach(k => k.classList.remove('active'));
  playBtn.disabled = false; pauseBtn.disabled = true; stopBtn.disabled = true;
}

function stopAllNotes() {
  Array.from(state.currentNotes.keys()).forEach(k => stopNote(k));
}

/* progress update */
function updateProgress() {
  if (!state.isPlaying) return;
  const elapsed = (Date.now() - state.playbackStartTime) * state.speed;
  const total = (state.currentSong && state.currentSong.duration) ? state.currentSong.duration : 0;
  const pct = total > 0 ? Math.min(100, (elapsed / total) * 100) : 0;
  progressFillEl.style.width = `${pct}%`;
  currentTimeEl.textContent = msToTime(elapsed);
  updateUpcoming(elapsed);
  requestAnimationFrame(updateProgress);
}

function updateUpcoming(currentMs) {
  const ul = document.querySelector('#upcoming-notes ul');
  ul.innerHTML = '';
  if (!state.currentSong || !Array.isArray(state.currentSong.notes)) {
    const li = document.createElement('li'); li.textContent = 'Нет песни'; ul.appendChild(li); return;
  }
  const upcoming = state.currentSong.notes.filter(n => (n.startTime || 0) > currentMs).sort((a,b)=>a.startTime-b.startTime).slice(0,6);
  if (!upcoming.length) { const li=document.createElement('li');li.textContent='Нет предстоящих нот';ul.appendChild(li); return; }
  upcoming.forEach(n => {
    const li = document.createElement('li');
    li.textContent = `${n.key} (${msToTime((n.startTime||0)-currentMs)})`;
    ul.appendChild(li);
  });
}

/* Helpers */
function msToTime(ms) {
  if (!ms || ms <= 0) return '00:00';
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60); const s = total % 60;
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

/* Mode switching */
document.querySelectorAll('.mode-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const mode = btn.dataset.mode;
    document.querySelectorAll('.mode').forEach(m => m.classList.add('hidden'));
    document.getElementById(`${mode}-mode`).classList.remove('hidden');
    stopPlayback();
    state.isRecording = false;
    stopRecordBtnEl().disabled = true;
    recordBtnEl().disabled = false;
    document.querySelectorAll('.key.active').forEach(k => k.classList.remove('active'));
  });
});

/* Init */
document.addEventListener('DOMContentLoaded', async () => {
  createPiano();
  await loadBuiltin();
});