const audioContext = new AudioContext();

const keyboardMap = {
    'q': 'C3', '2': 'Db3', 'w': 'D3', '3': 'Eb3', 'e': 'E3', 'r': 'F3', '5': 'Gb3',
    't': 'G3', '6': 'Ab3', 'y': 'A3', '7': 'Bb3', 'u': 'B3', 'i': 'C4', '9': 'Db4',
    'o': 'D4', '0': 'Eb4', 'p': 'E4', 'z': 'F4', 's': 'Gb4', 'x': 'G4', 'd': 'Ab4',
    'c': 'A4', 'f': 'Bb4', 'v': 'B4', 'b': 'C5', 'h': 'Db5', 'n': 'D5', 'j': 'Eb5',
    'm': 'E5', ',': 'F5', 'l': 'Gb5', '.': 'G5', ';': 'Ab5', '/': 'A5'
};

const notes = [
    'A0', 'Bb0', 'B0',
    'C1', 'Db1', 'D1', 'Eb1', 'E1', 'F1', 'Gb1', 'G1', 'Ab1', 'A1', 'Bb1', 'B1',
    'C2', 'Db2', 'D2', 'Eb2', 'E2', 'F2', 'Gb2', 'G2', 'Ab2', 'A2', 'Bb2', 'B2',
    'C3', 'Db3', 'D3', 'Eb3', 'E3', 'F3', 'Gb3', 'G3', 'Ab3', 'A3', 'Bb3', 'B3',
    'C4', 'Db4', 'D4', 'Eb4', 'E4', 'F4', 'Gb4', 'G4', 'Ab4', 'A4', 'Bb4', 'B4',
    'C5', 'Db5', 'D5', 'Eb5', 'E5', 'F5', 'Gb5', 'G5', 'Ab5', 'A5', 'Bb5', 'B5',
    'C6', 'Db6', 'D6', 'Eb6', 'E6', 'F6', 'Gb6', 'G6', 'Ab6', 'A6', 'Bb6', 'B6',
    'C7', 'Db7', 'D7', 'Eb7', 'E7', 'F7', 'Gb7', 'G7', 'Ab7', 'A7', 'Bb7', 'B7',
    'C8'
];

const soundBuffers = {};
let isRecording = false;
let recordedNotes = [];
let recordingStartTime;
let pressedKeys = {};
let loadedSong = null;
let playbackTimeouts = [];
let playbackSpeed = 1;
let playbackPosition = 0;
let playbackRealTime = 0;
let playbackState = 'stopped';
let lastSecond = -1;
let animationFrameId = null;
let savedRecording = null;
let isMouseDown = false;

const recordBtn = document.getElementById('record-button');
const stopBtn = document.getElementById('stop-button');
const importBtn = document.getElementById('import-button');
const playBtn = document.getElementById('play-button');
const pauseBtn = document.getElementById('pause-button');
const stopPlaybackBtn = document.getElementById('playback-stop-button');
const speedSlider = document.getElementById('song-speed');
const progressBar = document.getElementById('progress-bar');
const fileNameDisplay = document.getElementById('file-name-display');
const currentTimeDisplay = document.getElementById('current-time');
const totalDurationDisplay = document.getElementById('total-duration');
const speedDisplay = document.getElementById('speed-display');
const downloadBtn = document.getElementById('download-button');
const noteScroller = document.getElementById('note-scroller');

const playbackControls = [playBtn, pauseBtn, stopPlaybackBtn, speedSlider, progressBar];

function noteToFrequency(note) {
    const noteNames = {
        'C': 0, 'Db': 1, 'D': 2, 'Eb': 3, 'E': 4, 'F': 5,
        'Gb': 6, 'G': 7, 'Ab': 8, 'A': 9, 'Bb': 10, 'B': 11
    };
    const match = note.match(/([A-G]b?)(\d)/);
    if (!match) return 440;
    const noteName = match[1];
    const octave = parseInt(match[2]);
    const semitone = noteNames[noteName];
    const a4 = 440;
    const c0 = a4 * Math.pow(2, -4.75);
    return c0 * Math.pow(2, octave + semitone / 12);
}

function loadSound(note) {
    return new Promise((resolve) => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        oscillator.frequency.value = noteToFrequency(note);
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        soundBuffers[note] = { oscillator, gainNode, loaded: true };
        resolve();
    });
}

function playSound(note) {
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }
    
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.type = 'sine';
    oscillator.frequency.value = noteToFrequency(note);
    
    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.01);
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    oscillator.start();
    
    if (!soundBuffers[note]) {
        soundBuffers[note] = [];
    }
    soundBuffers[note].push({ oscillator, gainNode });
}

function stopSound(note) {
    if (!soundBuffers[note]) return;
    
    const instances = soundBuffers[note];
    if (Array.isArray(instances)) {
        instances.forEach(({ oscillator, gainNode }) => {
            gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.1);
            setTimeout(() => {
                try {
                    oscillator.stop();
                } catch (e) {
                    // Ignore if already stopped
                }
            }, 150);
        });
        soundBuffers[note] = [];
    }
}

function highlightKey(note) {
    const keyElement = document.querySelector(`[data-note="${note}"]`);
    if (keyElement) keyElement.classList.add('active');
}

function unhighlightKey(note) {
    const keyElement = document.querySelector(`[data-note="${note}"]`);
    if (keyElement) keyElement.classList.remove('active');
}

function formatTime(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function handleKeyPress(note) {
    playSound(note);
    highlightKey(note);
    if (isRecording) {
        recordedNotes.push({
            key: note,
            startTime: Date.now() - recordingStartTime,
            duration: 0
        });
    }
}

function handleKeyRelease(note) {
    stopSound(note);
    unhighlightKey(note);
    if (isRecording) {
        const noteRecord = recordedNotes.find(n => n.key === note && n.duration === 0);
        if (noteRecord) {
            noteRecord.duration = Date.now() - recordingStartTime - noteRecord.startTime;
        }
    }
}

notes.forEach(note => {
    loadSound(note);
});

const keys = document.querySelectorAll('.key');
keys.forEach(key => {
    const note = key.dataset.note;
    
    key.addEventListener('mousedown', function(event) {
        isMouseDown = true;
        if (event.button === 0 || event.button === 2) {
            handleKeyPress(note);
        }
    });
    
    key.addEventListener('mouseover', function() {
        if (isMouseDown) {
            handleKeyPress(note);
        }
    });
    
    key.addEventListener('contextmenu', function(event) {
        event.preventDefault();
    });
    
    key.addEventListener('mouseup', function() {
        handleKeyRelease(note);
    });
    
    key.addEventListener('mouseleave', function() {
        if (isMouseDown) {
            handleKeyRelease(note);
        }
    });
});

window.addEventListener('keydown', function(event) {
    const note = keyboardMap[event.key];
    if (!note || pressedKeys[note]) return;
    pressedKeys[note] = true;
    handleKeyPress(note);
});

window.addEventListener('keyup', function(event) {
    const note = keyboardMap[event.key];
    if (note && pressedKeys[note]) {
        delete pressedKeys[note];
        handleKeyRelease(note);
    }
});

window.addEventListener('mouseup', function() {
    isMouseDown = false;
});

recordBtn.addEventListener('click', function() {
    isRecording = true;
    recordedNotes = [];
    recordingStartTime = Date.now();
    stopBtn.disabled = false;
    recordBtn.classList.add('is-recording');
    downloadBtn.disabled = true;
    savedRecording = null;
});

stopBtn.addEventListener('click', function() {
    isRecording = false;
    stopBtn.disabled = true;
    recordBtn.classList.remove('is-recording');
    savedRecording = {
        name: 'My Recording ' + new Date().toLocaleTimeString(),
        duration: Date.now() - recordingStartTime,
        notes: recordedNotes
    };
    downloadBtn.disabled = false;
});

downloadBtn.addEventListener('click', function() {
    if (savedRecording) {
        const jsonStr = JSON.stringify(savedRecording, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'my-recording.json';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }
});

importBtn.addEventListener('change', function(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            stopSong();
            const songData = JSON.parse(e.target.result);
            
            if (!songData || typeof songData.name !== 'string' || 
                typeof songData.duration !== 'number' || !Array.isArray(songData.notes)) {
                alert('Ошибка: неверный формат файла');
                return;
            }
            
            loadedSong = songData;
            fileNameDisplay.textContent = file.name.replace('.json', '');
            totalDurationDisplay.textContent = formatTime(loadedSong.duration);
            progressBar.max = loadedSong.duration;
            
            playbackControls.forEach(control => control.disabled = false);
            createFallingNotes(loadedSong);
        } catch (error) {
            alert('Не удалось прочитать файл');
        }
    };
    reader.readAsText(file);
});

playBtn.addEventListener('click', function() {
    if (!loadedSong) {
        alert('Сначала выберите файл');
        return;
    }
    if (playbackState === 'playing') return;
    
    playbackState = 'playing';
    playbackRealTime = Date.now();
    playSong(loadedSong, playbackPosition);
    animationFrameId = requestAnimationFrame(updateProgressBar);
});

pauseBtn.addEventListener('click', function() {
    if (playbackState !== 'playing') return;
    
    playbackState = 'paused';
    playbackPosition += (Date.now() - playbackRealTime) * playbackSpeed;
    clearAllTimeouts();
    keys.forEach(key => key.classList.remove('active'));
    cancelAnimationFrame(animationFrameId);
});

stopPlaybackBtn.addEventListener('click', function() {
    stopSong();
});

function playSong(song, startOffset) {
    clearAllTimeouts();
    
    if (!song || !song.notes) return;
    
    song.notes.forEach(function(note) {
        if (note.startTime < startOffset) return;
        
        const startTimeout = setTimeout(() => {
            playSound(note.key);
            highlightKey(note.key);
        }, (note.startTime - startOffset) / playbackSpeed);
        
        playbackTimeouts.push(startTimeout);
        
        if (typeof note.duration === 'number') {
            const endTimeout = setTimeout(() => {
                unhighlightKey(note.key);
                stopSound(note.key);
            }, (note.startTime + note.duration - startOffset) / playbackSpeed);
            
            playbackTimeouts.push(endTimeout);
        }
    });
}

speedSlider.addEventListener('input', function(event) {
    if (playbackState === 'playing') {
        playbackPosition += (Date.now() - playbackRealTime) * playbackSpeed;
        playbackRealTime = Date.now();
    }
    
    playbackSpeed = parseFloat(event.target.value);
    speedDisplay.textContent = `x${playbackSpeed.toFixed(1)}`;
    
    if (playbackState === 'playing') {
        playSong(loadedSong, playbackPosition);
    }
});

function clearAllTimeouts() {
    playbackTimeouts.forEach(clearTimeout);
    playbackTimeouts = [];
    keys.forEach(key => key.classList.remove('active'));
}

progressBar.addEventListener('mousedown', function() {
    if (playbackState === 'playing') {
        cancelAnimationFrame(animationFrameId);
    }
});

progressBar.addEventListener('change', function(event) {
    if (!loadedSong) return;
    
    const newTime = parseInt(event.target.value, 10);
    playbackPosition = newTime;
    
    if (playbackState === 'playing') {
        playbackRealTime = Date.now();
        playSong(loadedSong, playbackPosition);
        animationFrameId = requestAnimationFrame(updateProgressBar);
    }
});

progressBar.addEventListener('input', function(event) {
    if (!loadedSong) return;
    const newTime = parseInt(event.target.value, 10);
    currentTimeDisplay.textContent = formatTime(newTime);
});

function createFallingNotes(song) {
    noteScroller.innerHTML = '';
    if (!song) return;
    
    const pixelsPerMs = 0.2;
    const containerHeight = 400;
    const totalHeight = (song.duration * pixelsPerMs) + containerHeight;
    noteScroller.style.height = totalHeight + 'px';
    
    song.notes.forEach(note => {
        const keyElement = document.querySelector(`.key[data-note="${note.key}"]`);
        if (!keyElement) return;
        
        const noteDiv = document.createElement('div');
        noteDiv.className = 'falling-note';
        
        const keyRect = keyElement.getBoundingClientRect();
        const pianoRect = document.querySelector('.piano').getBoundingClientRect();
        
        noteDiv.style.width = keyRect.width + 'px';
        noteDiv.style.left = (keyRect.left - pianoRect.left) + 'px';
        noteDiv.style.height = (note.duration * pixelsPerMs) + 'px';
        noteDiv.style.top = (totalHeight - (note.startTime * pixelsPerMs) - (note.duration * pixelsPerMs)) + 'px';
        
        noteScroller.appendChild(noteDiv);
    });
}

function updateProgressBar() {
    if (playbackState === 'playing' && loadedSong) {
        const currentTime = playbackPosition + (Date.now() - playbackRealTime) * playbackSpeed;
        
        const pixelsPerMs = 0.2;
        const containerHeight = 400;
        const totalHeight = (loadedSong.duration * pixelsPerMs) + containerHeight;
        noteScroller.style.transform = `translateY(${-(totalHeight - containerHeight) + (currentTime * pixelsPerMs)}px)`;
        
        if (currentTime >= loadedSong.duration) {
            stopPlaybackBtn.click();
            return;
        }
        
        const currentSeconds = Math.floor(currentTime / 1000);
        if (currentSeconds !== lastSecond) {
            currentTimeDisplay.textContent = formatTime(currentTime);
            lastSecond = currentSeconds;
        }
        
        progressBar.value = currentTime;
        animationFrameId = requestAnimationFrame(updateProgressBar);
    }
}

function stopSong() {
    playbackState = 'stopped';
    playbackPosition = 0;
    clearAllTimeouts();
    cancelAnimationFrame(animationFrameId);
    currentTimeDisplay.textContent = '0:00';
    lastSecond = -1;
    progressBar.value = 0;
    noteScroller.style.transform = 'translateY(0px)';
    createFallingNotes(loadedSong);
}