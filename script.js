//              ШАГ 1 & 2: НАСТРОЙКА И АУДИО

// AudioContext объявлен, но инициализация отложена до первого взаимодействия пользователя.
let audioContext = null; 

// Функция для инициализации AudioContext при первом взаимодействии
const initAudioContext = () => {
    if (audioContext) {
        return;
    }
    
    // Инициализация AudioContext. Создается только один раз!
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    // Возобновляем, если контекст был приостановлен браузером
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }
};

// Карта соответствия клавиши клавиатуры и ноты (4+ октавы)
const KEY_MAP = {
    // Октава 3 (Z-M)
    'z': 'C3', 's': 'C#3', 'x': 'D3', 'd': 'D#3', 'c': 'E3', 'v': 'F3', 'g': 'F#3', 
    'b': 'G3', 'h': 'G#3', 'n': 'A3', 'j': 'A#3', 'm': 'B3',

    // Октава 4 (Q-U + 2,3,5,6,7) - Стандартная
    'q': 'C4', '2': 'C#4', 'w': 'D4', '3': 'D#4', 'e': 'E4', 'r': 'F4', '5': 'F#4', 
    't': 'G4', '6': 'G#4', 'y': 'A4', '7': 'A#4', 'u': 'B4',
    
    // Октава 5 (I-P + 9,0, [,])
    'i': 'C5', '9': 'C#5', 'o': 'D5', '0': 'D#5', 'p': 'E5', '[': 'F5', '=': 'F#5', 
    ']': 'G5', '-': 'G#5', '\\': 'A5', 

    // Дополнительные клавиши для расширения
    'l': 'A#5', ';': 'B5', "'": 'C6',
};

// Обратная карта для быстрого поиска клавиши клавиатуры по ноте
const createNoteToKeyMap = (keyMap) => {
    const map = {};
    for (const key in keyMap) {
        // Сохраняем только первое сопоставление (для отображения лейбла)
        if (!map[keyMap[key]]) {
            map[keyMap[key]] = key;
        }
    }
    return map;
};

const NOTE_TO_KEY = createNoteToKeyMap(KEY_MAP);


// Список нот для генерации: C3 до C7 (29 белых клавиш)
const ALL_NOTES = [
    'C3', 'C#3', 'D3', 'D#3', 'E3', 'F3', 'F#3', 'G3', 'G#3', 'A3', 'A#3', 'B3', 
    'C4', 'C#4', 'D4', 'D#4', 'E4', 'F4', 'F#4', 'G4', 'G#4', 'A4', 'A#4', 'B4', 
    'C5', 'C#5', 'D5', 'D#5', 'E5', 'F5', 'F#5', 'G5', 'G#5', 'A5', 'A#5', 'B5', 
    'C6', 'C#6', 'D6', 'D#6', 'E6', 'F6', 'F#6', 'G6', 'G#6', 'A6', 'A#6', 'B6', 
    'C7'
];

// Карта соответствия ноты и её смещения (n) от A4 (440 Hz)
const NOTE_TO_HALFSTEPS = {
    'C3': -21, 'C#3': -20, 'D3': -19, 'D#3': -18, 'E3': -17, 'F3': -16, 
    'F#3': -15, 'G3': -14, 'G#3': -13, 'A3': -12, 'A#3': -11, 'B3': -10,
    'C4': -9,  'C#4': -8,  'D4': -7,  'D#4': -6,  'E4': -5,  'F4': -4,  
    'F#4': -3,  'G4': -2,  'G#4': -1,  'A4': 0,   'A#4': 1,   'B4': 2,
    'C5': 3,   'C#5': 4,   'D5': 5,   'D#5': 6,   'E5': 7,   'F5': 8,
    'F#5': 9,  'G5': 10,  'G#5': 11,  'A5': 12,  'A#5': 13,  'B5': 14,
    'C6': 15,  'C#6': 16,  'D6': 17,  'D#6': 18,  'E6': 19,  'F6': 20,
    'F#6': 21,  'G6': 22,  'G#6': 23,  'A6': 24,  'A#6': 25,  'B6': 26,
    'C7': 27
};

const activeNotes = {};

// --- 2. Функции генерации звука (Обновлены для записи в Шаге 3) ---

const getFrequency = (note) => {
    const halfSteps = NOTE_TO_HALFSTEPS[note];
    return 440 * Math.pow(2, halfSteps / 12);
};

const playNote = (note) => {
    if (!audioContext || activeNotes[note]) {
        return; 
    }

    const freq = getFrequency(note);
    const now = audioContext.currentTime;

    const oscillator = audioContext.createOscillator();
    oscillator.type = 'triangle'; 
    oscillator.frequency.setValueAtTime(freq, now);

    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    const attackTime = 0.02; 
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.5, now + attackTime); 

    oscillator.start(now);
    
    activeNotes[note] = { oscillator, gainNode };

    // ЛОГИКА ЗАПИСИ (для Шага 3)
    if (isRecording) {
        recordedNotes.push({
            note: note,
            time: audioContext.currentTime - recordingStartTime,
            type: 'start'
        });
    }
};

const stopNote = (note) => {
    const active = activeNotes[note];
    if (!active) {
        return;
    }

    const { oscillator, gainNode } = active;
    const now = audioContext.currentTime;
    
    const releaseTime = 0.5; 
    
    gainNode.gain.cancelScheduledValues(now);
    gainNode.gain.linearRampToValueAtTime(0, now + releaseTime);

    oscillator.stop(now + releaseTime);
    
    delete activeNotes[note];

    // ЛОГИКА ЗАПИСИ (для Шага 3)
    if (isRecording) {
        recordedNotes.push({
            note: note,
            time: audioContext.currentTime - recordingStartTime,
            type: 'stop'
        });
    }
};


// --- 3. Генерация HTML-разметки клавиатуры ---

const isBlackKey = (note) => note.includes('#');

const createKeyboard = () => {
    const keyboardContainer = document.getElementById('piano-keyboard');
    keyboardContainer.innerHTML = ''; 

    ALL_NOTES.forEach(note => {
        const keyElement = document.createElement('div');
        const isBlack = isBlackKey(note);
        
        keyElement.classList.add('key');
        keyElement.classList.add(isBlack ? 'black' : 'white');

        keyElement.dataset.note = note;

        // Корректное отображение лейбла
        const keyboardKeyChar = NOTE_TO_KEY[note];
        
        if (keyboardKeyChar) {
            const keyLabel = document.createElement('span');
            keyLabel.classList.add('key-label');
            keyLabel.textContent = keyboardKeyChar.toUpperCase();
            keyElement.appendChild(keyLabel);
        }

        keyboardContainer.appendChild(keyElement);
    });
};


// --- 4. Обработчики событий (Обновлены для Шага 3) ---

const getNoteFromKey = (key) => KEY_MAP[key.toLowerCase()];

const setKeyActiveState = (note, isActive) => {
    const keyElement = document.querySelector(`.key[data-note="${note}"]`);
    if (keyElement) {
        keyElement.classList.toggle('active', isActive);
    }
};

// Функции управления записью (Для Шага 3)
const updateControlsState = () => {
    // Эта функция будет полностью реализована в Шаге 3, пока заглушка
    const recordBtn = document.getElementById('record-btn');
    const stopBtn = document.getElementById('stop-btn');
    const playBtn = document.getElementById('play-btn');
    
    if (recordBtn) recordBtn.textContent = isRecording ? 'Запись... 🔴' : 'Запись 🔴';
    if (stopBtn) stopBtn.disabled = !isRecording;
    if (playBtn) playBtn.disabled = recordedNotes.length === 0 || isRecording;
};

const startRecording = () => {
    initAudioContext(); 
    recordedNotes = [];
    recordingStartTime = audioContext.currentTime;
    isRecording = true;
    updateControlsState();
};

const stopRecording = () => {
    isRecording = false;
    updateControlsState();
};


const initEventHandlers = () => {
    const keyboard = document.getElementById('piano-keyboard');

    // Привязка кнопок записи (Для Шага 3)
    const recordBtn = document.getElementById('record-btn');
    const stopBtn = document.getElementById('stop-btn');
    
    if (recordBtn) recordBtn.addEventListener('click', startRecording);
    if (stopBtn) stopBtn.addEventListener('click', stopRecording);
    // Кнопка Play будет привязана в Шаге 4

    // 1. Обработка кликов мыши (mousedown/mouseup)
    keyboard.addEventListener('mousedown', (event) => {
        initAudioContext(); 
        
        const keyElement = event.target.closest('.key');
        if (!keyElement) {
            return;
        }
        const note = keyElement.dataset.note;
        playNote(note);
        setKeyActiveState(note, true);
    });

    keyboard.addEventListener('mouseup', (event) => {
        const keyElement = event.target.closest('.key');
        if (!keyElement) {
            return;
        }
        const note = keyElement.dataset.note;
        stopNote(note);
        setKeyActiveState(note, false);
    });
    
    keyboard.addEventListener('mouseleave', (event) => {
        const activeKey = event.target.closest('.key.active');
        if (activeKey) {
            const note = activeKey.dataset.note;
            stopNote(note);
            setKeyActiveState(note, false);
        }
    });


    // 2. Обработка клавиатуры (keydown/keyup)
    document.addEventListener('keydown', (event) => {
        initAudioContext();
        
        if (event.repeat) {
            return; 
        }

        const note = getNoteFromKey(event.key);
        if (note && !activeNotes[note]) {
            playNote(note);
            setKeyActiveState(note, true);
        }
    });

    document.addEventListener('keyup', (event) => {
        const note = getNoteFromKey(event.key);
        if (note) {
            stopNote(note);
            setKeyActiveState(note, false);
        }
    });
};

// --- 5. Запуск приложения ---

document.addEventListener('DOMContentLoaded', () => {
    createKeyboard();
    initEventHandlers();
    updateControlsState(); // Устанавливаем начальное состояние кнопок
});


let isRecording = false;
let recordingStartTime = 0;
let recordedNotes = [];