const piano = document.getElementById("piano");

const whiteKeysNames = ['C','D','E','F','G','A','B'];
const blackKeysNames = ['C#','D#','F#','G#','A#'];
const totalOctaves = 7;

const whiteKeys = [];
const blackKeys = [];

// Создание белых клавиш
for (let octave = 1; octave <= totalOctaves; octave++) {
  for (let i = 0; i < whiteKeysNames.length; i++) {
    const key = document.createElement('div');
    key.classList.add('white-key');
    key.dataset.note = whiteKeysNames[i] + octave;
    piano.appendChild(key);
    whiteKeys.push(key);
  }
}

// Создание черных клавиш
for (let octave = 1; octave <= totalOctaves; octave++) {
  const positions = [0,1,3,4,5]; // индексы белых клавиш для черных
  for (let i = 0; i < blackKeysNames.length; i++) {
    const key = document.createElement('div');
    key.classList.add('black-key');
    key.dataset.note = blackKeysNames[i] + octave;
    piano.appendChild(key);
    blackKeys.push(key);
  }
}

// Позиционирование черных клавиш после рендеринга белых
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
function pressKey(keyElement) {
  if (!keyElement) return;
  keyElement.classList.add('active');
}

function releaseKey(keyElement) {
  if (!keyElement) return;
  keyElement.classList.remove('active');
}

// Mouse / touch события
[...whiteKeys, ...blackKeys].forEach(key => {
  key.addEventListener('mousedown', () => pressKey(key));
  key.addEventListener('mouseup', () => releaseKey(key));
  key.addEventListener('mouseleave', () => releaseKey(key));
  key.addEventListener('touchstart', (e) => { e.preventDefault(); pressKey(key); });
  key.addEventListener('touchend', () => releaseKey(key));
});

// Физическая клавиатура
const keyboardMap = {
  KeyA: 'C4', KeyW: 'C#4', KeyS: 'D4', KeyE: 'D#4', KeyD: 'E4', KeyF: 'F4',
  KeyT: 'F#4', KeyG: 'G4', KeyY: 'G#4', KeyH: 'A4', KeyU: 'A#4', KeyJ: 'B4',
  KeyK: 'C5', KeyO: 'C#5', KeyL: 'D5', KeyP: 'D#5', Semicolon: 'E5'
};

document.addEventListener('keydown', (e) => {
  const note = keyboardMap[e.code];
  if (!note) return;
  const key = [...whiteKeys, ...blackKeys].find(k => k.dataset.note === note);
  pressKey(key);
});

document.addEventListener('keyup', (e) => {
  const note = keyboardMap[e.code];
  if (!note) return;
  const key = [...whiteKeys, ...blackKeys].find(k => k.dataset.note === note);
  releaseKey(key);
});
