const audioContext = new (window.AudioContext || window.webkitAudioContext)();

// --- Константы для позиционирования ---
const WHITE_KEY_WIDTH = 60; // Должна соответствовать .white-key в CSS
const BLACK_KEY_WIDTH = 40; // Должна соответствовать .black-key в CSS

// Расширенный маппинг клавиш (C2 - G5)
const keyMap = {
    // Октава 2 (C2-B2 - нижний ряд клавиатуры)
    'z': 'C2', 's': 'C#2', 'x': 'D2', 'd': 'D#2', 'c': 'E2',
    'v': 'F2', 'g': 'F#2', 'b': 'G2', 'h': 'G#2', 'n': 'A2',
    'j': 'A#2', 'm': 'B2',

    // Октава 3 (C3-B3 - QWERTY-ряд)
    'q': 'C3', '2': 'C#3', 'w': 'D3', '3': 'D#3', 'e': 'E3',
    'r': 'F3', '5': 'F#3', 't': 'G3', '6': 'G#3', 'y': 'A3',
    '7': 'A#3', 'u': 'B3', 

    // Октава 4 (C4-B4 - Цифровой ряд)
    'i': 'C4', '9': 'C#4', 'o': 'D4', '0': 'D#4', 'p': 'E4',
    '[': 'F4', '-': 'F#4', ']': 'G4', '=': 'G#4', 'backspace': 'A4',
    
    // Дополнительные клавиши для октав 4 и 5 (A#4-G5)
    'k': 'A#4', 'l': 'B4', ';': 'C5', "'": 'C#5',
    'enter': 'D5', 'rshift': 'D#5', 'rctrl': 'E5', 'ralt': 'F5',
    'alt': 'F#5', 'shift': 'G5'
};

const noteFrequencies = {
    'C2': 65.41, 'C#2': 69.30, 'D2': 73.42, 'D#2': 77.78, 'E2': 82.41,
    'F2': 87.31, 'F#2': 92.50, 'G2': 98.00, 'G#2': 103.83, 'A2': 110.00,
    'A#2': 116.54, 'B2': 123.47,
    'C3': 130.81, 'C#3': 138.59, 'D3': 146.83, 'D#3': 155.56, 'E3': 164.81,
    'F3': 174.61, 'F#3': 185.00, 'G3': 196.00, 'G#3': 207.65, 'A3': 220.00,
    'A#3': 233.08, 'B3': 246.94, 
    'C4': 261.63, 'C#4': 277.18, 'D4': 293.66, 'D#4': 311.13, 'E4': 329.63,
    'F4': 349.23, 'F#4': 369.99, 'G4': 392.00, 'G#4': 415.30, 'A4': 440.00,
    'A#4': 466.16, 'B4': 493.88, 
    'C5': 523.25, 'C#5': 554.37, 'D5': 587.33, 'D#5': 622.25, 'E5': 659.25,
    'F5': 698.46, 'F#5': 739.99, 'G5': 783.99, 'G#5': 830.61
};

let currentMode = 'interactive';
let isRecording = false;
let recordingData = [];
let recordingStartTime = null;
let activeNotes = {};
let loadedSong = null;
let isPlaying = false;
let playbackTimeouts = [];
let playbackStartTime = null;
let playbackPausedAt = 0;
let playbackSpeed = 1;

function createPiano() {
    const piano = document.getElementById('piano');
    piano.innerHTML = '';
    
    const pianoContainer = document.createElement('div');
    pianoContainer.className = 'piano-container';
    
    const allNotes = Object.keys(noteFrequencies);
    const whiteKeys = allNotes.filter(note => !note.includes('#'));
    const blackKeys = allNotes.filter(note => note.includes('#'));

    // --- Шаг 1: Создание белых клавиш ---
    whiteKeys.forEach((note, i) => {
        const key = document.createElement('div');
        key.className = 'key white-key';
        key.dataset.note = note;
        // Позиционируем белые клавиши с помощью left
        key.style.left = `${i * WHITE_KEY_WIDTH}px`; 
        
        const label = document.createElement('div');
        label.className = 'key-label';
        const keyBinding = Object.keys(keyMap).find(k => keyMap[k] === note);
        label.textContent = note + (keyBinding ? `\n${keyBinding.toUpperCase()}` : '');
        key.appendChild(label);
        
        key.addEventListener('mousedown', () => playNote(note));
        key.addEventListener('mouseup', () => stopNote(note));
        key.addEventListener('mouseleave', () => stopNote(note));
        
        pianoContainer.appendChild(key);
    });
    
    // Устанавливаем ширину контейнера, чтобы все клавиши поместились
    pianoContainer.style.width = `${whiteKeys.length * WHITE_KEY_WIDTH}px`;


    // --- Шаг 2: Создание черных клавиш ---
    blackKeys.forEach(note => {
        const baseNote = note.slice(0, -1); // 'C#3' -> 'C3'
        const baseNoteIndex = whiteKeys.indexOf(baseNote);
        
        // Черные клавиши идут после C, D, F, G, A.
        const sharpsAfter = ['C', 'D', 'F', 'G', 'A'];
        const noteName = note.charAt(0); 
        
        if (baseNoteIndex !== -1 && sharpsAfter.includes(noteName)) {
            const key = document.createElement('div');
            key.className = 'key black-key';
            key.dataset.note = note;
            
            // КОРРЕКЦИЯ: Позиционируем черную клавишу.
            // Левый край белой клавиши (C): baseNoteIndex * WHITE_KEY_WIDTH
            // Центр щели: (baseNoteIndex * WHITE_KEY_WIDTH) + WHITE_KEY_WIDTH
            // Смещаем влево на половину ширины черной клавиши (BLACK_KEY_WIDTH / 2 = 20px).
            key.style.left = `${(baseNoteIndex + 1) * WHITE_KEY_WIDTH - (BLACK_KEY_WIDTH / 2)}px`; 
            
            const label = document.createElement('div');
            label.className = 'key-label';
            const keyBinding = Object.keys(keyMap).find(k => keyMap[k] === note);
            label.textContent = keyBinding ? keyBinding.toUpperCase() : '';
            key.appendChild(label);
            
            key.addEventListener('mousedown', (e) => {
                e.stopPropagation();
                playNote(note);
            });
            key.addEventListener('mouseup', () => stopNote(note));
            key.addEventListener('mouseleave', () => stopNote(note));
            
            pianoContainer.appendChild(key);
        }
    });
    
    piano.appendChild(pianoContainer);
}

// ... (Остальная часть script.js без изменений) ...

function playNote(note) {
    if (activeNotes[note]) {
        return;
    }

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.type = 'sine';
    if (!noteFrequencies[note]) {
        console.warn(`Note frequency not found for: ${note}`);
        return;
    }
    oscillator.frequency.setValueAtTime(noteFrequencies[note], audioContext.currentTime);
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 2);
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.start();
    
    activeNotes[note] = {
        oscillator: oscillator,
        gainNode: gainNode,
        startTime: Date.now()
    };
    
    const keyElement = document.querySelector(`[data-note="${note}"]`);
    if (keyElement) {
        keyElement.classList.add('active');
    }
    
    if (isRecording) {
        const currentTime = Date.now() - recordingStartTime;
        activeNotes[note].recordStartTime = currentTime;
    }
}

function stopNote(note) {
    if (!activeNotes[note]) {
        return;
    }

    const noteData = activeNotes[note];
    noteData.gainNode.gain.cancelScheduledValues(audioContext.currentTime);
    noteData.gainNode.gain.setValueAtTime(noteData.gainNode.gain.value, audioContext.currentTime);
    noteData.gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.1);
    
    noteData.oscillator.stop(audioContext.currentTime + 0.1);
    
    const keyElement = document.querySelector(`[data-note="${note}"]`);
    if (keyElement) {
        keyElement.classList.remove('active');
    }
    
    if (isRecording && noteData.recordStartTime !== undefined) {
        const endTime = Date.now() - recordingStartTime;
        recordingData.push({
            key: note,
            startTime: noteData.recordStartTime,
            duration: endTime - noteData.recordStartTime
        });
    }
    
    delete activeNotes[note];
}

function handleKeyDown(e) {
    if (e.repeat) {
        return;
    }
    let key = e.key.toLowerCase();
    if (e.code === 'ShiftRight') key = 'rshift';
    if (e.code === 'ControlRight') key = 'rctrl';
    if (e.code === 'AltRight') key = 'ralt';
    if (e.code === 'Backspace') key = 'backspace';
    if (e.code === 'Enter') key = 'enter';
    if (e.code === 'ShiftLeft') key = 'shift';
    if (e.code === 'AltLeft') key = 'alt';


    const note = keyMap[key];
    if (note) {
        playNote(note);
        e.preventDefault(); 
    }
}

function handleKeyUp(e) {
    let key = e.key.toLowerCase();
    if (e.code === 'ShiftRight') key = 'rshift';
    if (e.code === 'ControlRight') key = 'rctrl';
    if (e.code === 'AltRight') key = 'ralt';
    if (e.code === 'Backspace') key = 'backspace';
    if (e.code === 'Enter') key = 'enter';
    if (e.code === 'ShiftLeft') key = 'shift';
    if (e.code === 'AltLeft') key = 'alt';

    const note = keyMap[key];
    if (note) {
        stopNote(note);
    }
}

document.addEventListener('keydown', handleKeyDown);
document.addEventListener('keyup', handleKeyUp);

document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentMode = btn.dataset.mode;
        
        if (currentMode === 'interactive') {
            document.getElementById('interactiveControls').style.display = 'flex';
            document.getElementById('preparedControls').classList.remove('active');
            stopPlayback();
        } else {
            document.getElementById('interactiveControls').style.display = 'none';
            document.getElementById('preparedControls').classList.add('active');
            if (isRecording) {
                toggleRecording();
            }
        }
    });
});

document.getElementById('recordBtn').addEventListener('click', toggleRecording);

function toggleRecording() {
    const recordBtn = document.getElementById('recordBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    const status = document.getElementById('status');
    
    if (!isRecording) {
        isRecording = true;
        recordingData = [];
        recordingStartTime = Date.now();
        recordBtn.textContent = 'Stop Recording';
        recordBtn.classList.add('recording');
        downloadBtn.disabled = true;
        status.textContent = '🔴 Recording...';
    } else {
        isRecording = false;
        recordBtn.textContent = 'Start Recording';
        recordBtn.classList.remove('recording');
        downloadBtn.disabled = false;
        status.textContent = '✓ Recording saved';
        
        Object.keys(activeNotes).forEach(note => stopNote(note));
    }
}

document.getElementById('downloadBtn').addEventListener('click', () => {
    if (recordingData.length === 0) {
        alert('No recording to download');
        return;
    }
    
    const duration = Math.max(...recordingData.map(n => n.startTime + n.duration));
    const recording = {
        name: 'My Recording',
        duration: duration,
        notes: recordingData.sort((a, b) => a.startTime - b.startTime)
    };
    
    const blob = new Blob([JSON.stringify(recording, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'recording.json';
    a.click();
    URL.revokeObjectURL(url);
});

document.getElementById('fileInput').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) {
        return;
    }
    
    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            loadedSong = JSON.parse(event.target.result);
            document.getElementById('songInfo').textContent = `Loaded: ${loadedSong.name} (${(loadedSong.duration / 1000).toFixed(1)}s)`;
            document.getElementById('playBtn').disabled = false;
            document.getElementById('status').textContent = '✓ Song loaded successfully';
        } catch (error) {
            alert('Invalid JSON file');
        }
    };
    reader.readAsText(file);
});

document.getElementById('playBtn').addEventListener('click', () => {
    if (!loadedSong) {
        return;
    }
    startPlayback();
});

document.getElementById('pauseBtn').addEventListener('click', pausePlayback);
document.getElementById('stopBtn').addEventListener('click', stopPlayback);

document.getElementById('speedSlider').addEventListener('input', (e) => {
    playbackSpeed = parseFloat(e.target.value);
    document.getElementById('speedValue').textContent = playbackSpeed.toFixed(1) + 'x';
    
    if (isPlaying) {
        const wasPaused = playbackPausedAt > 0;
        pausePlayback();
        if (!wasPaused) {
            setTimeout(() => startPlayback(), 50); 
        }
    }
});

function startPlayback() {
    if (!loadedSong || isPlaying) {
        return;
    }
    
    isPlaying = true;
    document.getElementById('playBtn').disabled = true;
    document.getElementById('pauseBtn').disabled = false;
    document.getElementById('stopBtn').disabled = false;
    document.getElementById('status').textContent = '▶ Playing...';
    
    playbackStartTime = Date.now() - playbackPausedAt; 
    
    loadedSong.notes.forEach(note => {
        const adjustedStart = note.startTime / playbackSpeed;
        const adjustedDuration = note.duration / playbackSpeed;
        
        if (note.startTime >= playbackPausedAt) {
            const delay1 = adjustedStart - playbackPausedAt / playbackSpeed;
            const delay2 = adjustedStart + adjustedDuration - playbackPausedAt / playbackSpeed;
            
            if (delay1 >= 0) {
                const timeout1 = setTimeout(() => {
                    playNote(note.key);
                }, delay1);
                playbackTimeouts.push(timeout1);
            }

            if (delay2 >= 0) {
                const timeout2 = setTimeout(() => {
                    stopNote(note.key);
                }, delay2);
                playbackTimeouts.push(timeout2);
            }
        }
    });
    
    const progressInterval = setInterval(() => {
        if (!isPlaying) {
            clearInterval(progressInterval);
            return;
        }
        
        const elapsed = (Date.now() - playbackStartTime) * playbackSpeed;
        const progress = (elapsed / loadedSong.duration) * 100;
        
        document.getElementById('progressFill').style.width = Math.min(progress, 100) + '%';
        document.getElementById('progressTime').textContent = 
            formatTime(elapsed) + ' / ' + formatTime(loadedSong.duration);
        
        if (elapsed >= loadedSong.duration) {
            stopPlayback();
        }
    }, 100);
    
    playbackTimeouts.push(progressInterval);
}

function pausePlayback() {
    if (!isPlaying) {
        return;
    }
    
    isPlaying = false;
    playbackPausedAt = (Date.now() - playbackStartTime) * playbackSpeed; 
    
    playbackTimeouts.forEach(t => clearTimeout(t));
    playbackTimeouts = [];
    
    Object.keys(activeNotes).forEach(note => stopNote(note));
    
    document.getElementById('playBtn').disabled = false;
    document.getElementById('pauseBtn').disabled = true;
    document.getElementById('status').textContent = '⏸ Paused';
}

function stopPlayback() {
    isPlaying = false;
    playbackPausedAt = 0;
    
    playbackTimeouts.forEach(t => clearTimeout(t));
    playbackTimeouts = [];
    
    Object.keys(activeNotes).forEach(note => stopNote(note));
    
    document.getElementById('progressFill').style.width = '0%';
    document.getElementById('progressTime').textContent = '0:00 / ' + 
        (loadedSong ? formatTime(loadedSong.duration) : '0:00');
    
    document.getElementById('playBtn').disabled = !loadedSong; 
    document.getElementById('pauseBtn').disabled = true;
    document.getElementById('stopBtn').disabled = true;
    document.getElementById('status').textContent = '⏹ Stopped';
}

function formatTime(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const remainingSeconds = totalSeconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

createPiano();