// =========================================================
//              ШАГ 1 & 2: НАСТРОЙКА И АУДИО
// =========================================================

// --- 1. Конфигурация Web Audio API и Маппинг Нота-Частота ---

// AudioContext объявлен, но инициализация отложена до первого взаимодействия пользователя.
let audioContext = null; 

// Функция для инициализации AudioContext при первом взаимодействии
const initAudioContext = () => {
    // Если контекст уже создан, выходим
    if (audioContext) {
        return;
    }
    
    // Инициализация AudioContext. Создается только один раз!
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    // Проверяем, не находится ли он в состоянии 'suspended', и возобновляем его
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }
};

// Карта соответствия клавиши клавиатуры и ноты
const KEY_MAP = {
    'q': 'C3', '2': 'C#3', 'w': 'D3', '3': 'D#3', 'e': 'E3', 'r': 'F3', '5': 'F#3', 
    't': 'G3', '6': 'G#3', 'y': 'A3', '7': 'A#3', 'u': 'B3', 
    'i': 'C4', '9': 'C#4', 'o': 'D4', '0': 'D#4', 'p': 'E4', 
    'z': 'F4', 's': 'F#4', 'x': 'G4', 'd': 'G#4', 'c': 'A4', 'f': 'A#4', 'v': 'B4',
    'b': 'C5', 'h': 'C#5', 'n': 'D5', 'j': 'D#5', 'm': 'E5' 
};

// Список нот для генерации
const ALL_NOTES = [
    'C3', 'C#3', 'D3', 'D#3', 'E3', 'F3', 'F#3', 'G3', 'G#3', 'A3', 'A#3', 'B3',
    'C4', 'C#4', 'D4', 'D#4', 'E4', 'F4', 'F#4', 'G4', 'G#4', 'A4', 'A#4', 'B4',
    'C5'
];

const NOTE_TO_HALFSTEPS = {
    'C3': -21, 'C#3': -20, 'D3': -19, 'D#3': -18, 'E3': -17, 'F3': -16, 
    'F#3': -15, 'G3': -14, 'G#3': -13, 'A3': -12, 'A#3': -11, 'B3': -10,
    'C4': -9,  'C#4': -8,  'D4': -7,  'D#4': -6,  'E4': -5,  'F4': -4,  
    'F#4': -3,  'G4': -2,  'G#4': -1,  'A4': 0,   'A#4': 1,   'B4': 2,
    'C5': 3,   'C#5': 4,   'D5': 5,   'D#5': 6,   'E5': 7    
};

const activeNotes = {};

// --- 2. Функции генерации звука ---

const getFrequency = (note) => {
    const halfSteps = NOTE_TO_HALFSTEPS[note];
    return 440 * Math.pow(2, halfSteps / 12);
};

const playNote = (note) => {
    // Проверяем, что аудио-контекст инициализирован
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

        const keyboardKey = Object.entries(KEY_MAP).find(([, value]) => value === note);
        
        if (keyboardKey) {
            const [keyChar] = keyboardKey;
            const keyLabel = document.createElement('span');
            keyLabel.classList.add('key-label');
            keyLabel.textContent = keyChar.toUpperCase();
            keyElement.appendChild(keyLabel);
        }

        keyboardContainer.appendChild(keyElement);
    });
};


// --- 4. Обработчики событий ---

const getNoteFromKey = (key) => KEY_MAP[key.toLowerCase()];

const setKeyActiveState = (note, isActive) => {
    const keyElement = document.querySelector(`.key[data-note="${note}"]`);
    if (keyElement) {
        keyElement.classList.toggle('active', isActive);
    }
};

const initEventHandlers = () => {
    const keyboard = document.getElementById('piano-keyboard');

    // 1. Обработка кликов мыши (mousedown/mouseup)
    keyboard.addEventListener('mousedown', (event) => {
        // !!! Инициализация AudioContext при первом действии пользователя !!!
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
        // !!! Инициализация AudioContext при первом действии пользователя !!!
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
});

// =========================================================
//              ПЕРЕМЕННЫЕ ДЛЯ СЛЕДУЮЩИХ ШАГОВ (Шаг 3)
// =========================================================

let isRecording = false;
let recordingStartTime = 0;
let recordedNotes = [];