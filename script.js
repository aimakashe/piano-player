// Генерация клавиатуры

// Карта соответствия клавиши клавиатуры и ноты
const KEY_MAP = {
    'q': 'C3', '2': 'C#3', 'w': 'D3', '3': 'D#3', 'e': 'E3', 'r': 'F3', '5': 'F#3', 't': 'G3', '6': 'G#3', 'y': 'A3', '7': 'A#3', 'u': 'B3', // Октава 3
    'i': 'C4', '9': 'C#4', 'o': 'D4', '0': 'D#4', 'p': 'E4', 'z': 'F4', 's': 'F#4', 'x': 'G4', 'd': 'G#4', 'c': 'A4', 'f': 'A#4', 'v': 'B4', // Октава 4
    'b': 'C5', 'h': 'C#5', 'n': 'D5', 'j': 'D#5', 'm': 'E5' // Начало Октавы 5 (для запаса)
};

// Список нот для генерации: от C3 до C5 (2 октавы + 1 нота)
const ALL_NOTES = [
    'C3', 'C#3', 'D3', 'D#3', 'E3', 'F3', 'F#3', 'G3', 'G#3', 'A3', 'A#3', 'B3',
    'C4', 'C#4', 'D4', 'D#4', 'E4', 'F4', 'F#4', 'G4', 'G#4', 'A4', 'A#4', 'B4',
    'C5'
];

// Функция для определения типа клавиши (белая или черная)
const isBlackKey = (note) => note.includes('#');

// Функция для генерации HTML-разметки клавиатуры
const createKeyboard = () => {
    const keyboardContainer = document.getElementById('piano-keyboard');
    keyboardContainer.innerHTML = ''; 

    ALL_NOTES.forEach(note => {
        const keyElement = document.createElement('div');
        const isBlack = isBlackKey(note);
        
        keyElement.classList.add('key');
        keyElement.classList.add(isBlack ? 'black' : 'white');

        keyElement.dataset.note = note;

        const keyboardKey = Object.keys(KEY_MAP).find(key => KEY_MAP[key] === note);
        
        if (keyboardKey) {
            const keyLabel = document.createElement('span');
            keyLabel.classList.add('key-label');
            keyLabel.textContent = keyboardKey.toUpperCase();
            keyElement.appendChild(keyLabel);
        }

        keyboardContainer.appendChild(keyElement);
    });
};

// Запуск генерации при загрузке страницы
document.addEventListener('DOMContentLoaded', createKeyboard);