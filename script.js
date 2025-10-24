const piano = document.getElementById("piano");
const recordBtn = document.getElementById("record-btn");
const recordingIndicator = document.getElementById("recording-indicator");
const downloadBtn = document.getElementById("download-btn");
const loadJsonInput = document.getElementById("load-json");
const playBtn = document.getElementById("play-btn");
const pauseBtn = document.getElementById("pause-btn");
const stopBtn = document.getElementById("stop-btn");
const speedRange = document.getElementById("speed-range");
const progressBar = document.getElementById("progress-bar");

const whiteKeysNames = ['C','D','E','F','G','A','B'];
const blackKeysNames = ['C#','D#','F#','G#','A#'];
const totalOctaves = 7;

const whiteKeys = [];
const blackKeys = [];
const activeOscillators = {};

let isRecording = false;
let recordingStart = 0;
const recordedNotes = [];

let preparedNotes = [];
let playStartTime = 0;
let animationFrameId = null;
let playbackIndex = 0;
let playbackPaused = false;
let playbackSpeed = 1;

// Создание клавиш (как раньше)
for (let octave = 1; octave <= totalOctaves; octave++) {
  for (let i = 0; i < whiteKeysNames.length; i++) {
    const key = document.createElement('div');
    key.classList.add('white-key');
    key.dataset.note = whiteKeysNames[i] + octave;
    piano.appendChild(key);
    whiteKeys.push(key);
  }
}
for (let octave = 1; octave <= totalOctaves; octave++) {
  const positions = [0,1,3,4,5];
  for (let i = 0; i < blackKeysNames.length; i++) {
    const key = document.createElement('div');
    key.classList.add('black-key');
    key.dataset.note = blackKeysNames[i] + octave;
    piano.appendChild(key);
    blackKeys.push(key);
  }
}
function positionBlackKeys() {
  let blackIndex = 0;
  for (let octave = 0; octave < totalOctaves; octave++) {
    const positions = [0,1,3,4,5];
    for (let i = 0; i < blackKeysNames.length; i++) {
      const whiteKey = whiteKeys[octave * 7 + positions[i]];
      const blackKey = blackKeys[blackIndex];
      blackKey.style.left = whiteKey.offsetLeft + whiteKey.offsetWidth - blackKey.offsetWidth/2 + 'px';
      blackIndex++;
    }
  }
}
window.addEventListener('resize', positionBlackKeys);
positionBlackKeys();

// Подсветка клавиш
function pressKey(keyElement) { if (keyElement) keyElement.classList.add('active'); }
function releaseKey(keyElement) { if (keyElement) keyElement.classList.remove('active'); }

// Keyboard mapping
const keyboardMap = {
  KeyA: 'C4', KeyW: 'C#4', KeyS: 'D4', KeyE: 'D#4', KeyD: 'E4', KeyF: 'F4',
  KeyT: 'F#4', KeyG: 'G4', KeyY: 'G#4', KeyH: 'A4', KeyU: 'A#4', KeyJ: 'B4',
  KeyK: 'C5', KeyO: 'C#5', KeyL: 'D5', KeyP: 'D#5', Semicolon: 'E5'
};

// Web Audio API
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
function getFrequency(note) {
  const noteNames = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
  const octave = parseInt(note.slice(-1), 10);
  const key = noteNames.indexOf(note.slice(0, -1));
  const n = key + (octave - 4) * 12 - 9;
  return 440 * Math.pow(2, n/12);
}
const adsr = { attack:0.01, decay:0.1, sustain:0.8, release:0.5 };

function playNoteAudio(note) {
  if (activeOscillators[note]) return;
  const osc = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.value = getFrequency(note);
  osc.connect(gainNode);
  gainNode.connect(audioCtx.destination);
  const now = audioCtx.currentTime;
  gainNode.gain.setValueAtTime(0, now);
  gainNode.gain.linearRampToValueAtTime(1, now + adsr.attack);
  gainNode.gain.linearRampToValueAtTime(adsr.sustain, now + adsr.attack + adsr.decay);
  osc.start();
  activeOscillators[note] = {osc, gainNode};
}
function stopNoteAudio(note) {
  const active = activeOscillators[note];
  if (!active) return;
  const now = audioCtx.currentTime;
  active.gainNode.gain.cancelScheduledValues(now);
  active.gainNode.gain.setValueAtTime(active.gainNode.gain.value, now);
  active.gainNode.gain.linearRampToValueAtTime(0, now + adsr.release);
  active.osc.stop(now + adsr.release);
  delete activeOscillators[note];
}

// Mouse/touch events
[...whiteKeys, ...blackKeys].forEach(key => {
  key.addEventListener('mousedown', () => { pressKey(key); playNoteAudio(key.dataset.note); if (isRecording) addRecordedNote(key.dataset.note); });
  key.addEventListener('mouseup', () => { releaseKey(key); stopNoteAudio(key.dataset.note); });
  key.addEventListener('mouseleave', () => { releaseKey(key); stopNoteAudio(key.dataset.note); });
  key.addEventListener('touchstart', (e) => { e.preventDefault(); pressKey(key); playNoteAudio(key.dataset.note); if (isRecording) addRecordedNote(key.dataset.note); });
  key.addEventListener('touchend', () => { releaseKey(key); stopNoteAudio(key.dataset.note); });
});

// Keyboard events
document.addEventListener('keydown', (e) => {
  const note = keyboardMap[e.code]; if (!note) return;
  const key = [...whiteKeys, ...blackKeys].find(k => k.dataset.note===note);
  pressKey(key); playNoteAudio(note); if (isRecording) addRecordedNote(note);
});
document.addEventListener('keyup', (e) => {
  const note = keyboardMap[e.code]; if (!note) return;
  const key = [...whiteKeys, ...blackKeys].find(k => k.dataset.note===note);
  releaseKey(key); stopNoteAudio(note);
});

// Recording
function addRecordedNote(note) {
  recordedNotes.push({ note, startTime: performance.now() - recordingStart, duration: null });
}
recordBtn.addEventListener('click', () => {
  isRecording = !isRecording;
  if (isRecording) { recordedNotes.length = 0; recordingStart = performance.now(); recordingIndicator.classList.remove('hidden'); recordBtn.textContent='Stop'; }
  else { recordingIndicator.classList.add('hidden'); recordBtn.textContent='Record'; }
});
downloadBtn.addEventListener('click', () => {
  if (!recordedNotes.length) return;
  const blob = new Blob([JSON.stringify({ name:"recording", notes: recordedNotes }, null,2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a=document.createElement('a'); a.href=url; a.download='recording.json'; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
});

// Prepared Mode
loadJsonInput.addEventListener('change', (e) => {
  const file = e.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = (event) => {
    const data = JSON.parse(event.target.result);
    preparedNotes = data.notes || [];
    resetPlayback();
  };
  reader.readAsText(file);
});

speedRange.addEventListener('input', () => { playbackSpeed = parseFloat(speedRange.value); });

playBtn.addEventListener('click', () => { if (preparedNotes.length) { playbackPaused=false; playPrepared(); } });
pauseBtn.addEventListener('click', () => { playbackPaused=true; });
stopBtn.addEventListener('click', () => { playbackPaused=true; resetPlayback(); });

function resetPlayback() {
  playbackIndex=0;
  preparedNotes.forEach(n=>stopNoteAudio(n.note));
  updateProgress(0);
}

function updateProgress(value){ progressBar.style.width=`${value*100}%`; }

function playPrepared() {
  if (playbackIndex >= preparedNotes.length) { resetPlayback(); return; }
  playStartTime = performance.now() - (preparedNotes[playbackIndex].startTime / playbackSpeed);
  function step(){
    if (playbackPaused) { animationFrameId=requestAnimationFrame(step); return; }
    const elapsed=(performance.now()-playStartTime)*playbackSpeed;
    while(playbackIndex<preparedNotes.length && preparedNotes[playbackIndex].startTime<=elapsed){
      const noteObj=preparedNotes[playbackIndex];
      playNoteAudio(noteObj.note);
      const key=[...whiteKeys,...blackKeys].find(k=>k.dataset.note===noteObj.note);
      pressKey(key);
      setTimeout(()=>{ stopNoteAudio(noteObj.note); releaseKey(key); }, noteObj.duration/playbackSpeed);
      playbackIndex++;
    }
    updateProgress(elapsed/preparedNotes[preparedNotes.length-1].startTime);
    if(playbackIndex<preparedNotes.length){ animationFrameId=requestAnimationFrame(step); } else { resetPlayback(); }
  }
  step();
}
