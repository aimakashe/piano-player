# 🎹 PianoPlayer

Интерактивное веб-приложение для игры на виртуальном пианино с возможностью записи и воспроизведения мелодий.

![PianoPlayer](https://img.shields.io/badge/Piano-Player-blue?style=for-the-badge&logo=music)
![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)

# Настройка npm и ESLint
npm init -y - Это создаст файл package.json
npm install eslint --save-dev - установка ESLint

## ✨ Возможности

### 🎮 Интерактивная игра
- **88 клавиш** (от A0 до C8) - полноценное пианино
- **Управление мышью**: 
  - Левая и правая кнопка мыши
  - Глиссандо - проведи мышкой по клавишам с зажатой кнопкой
- **Управление клавиатурой**: играй используя компьютерную клавиатуру (см. маппинг ниже)
- **Реалистичные звуки**: настоящие сэмплы пианино

### 🎵 Запись и воспроизведение
- **Режим записи**: записывай свои исполнения с точной фиксацией времени
- **Экспорт в JSON**: сохраняй записи на диск
- **Импорт мелодий**: загружай и проигрывай готовые композиции
- **Управление воспроизведением**: Play, Pause, Stop
- **Регулировка скорости**: от 0.5x до 2x
- **Интерактивная перемотка**: кликай на прогресс-баре для перехода

### 🎨 Визуализация
- **Подсветка клавиш**: синхронно с музыкой
- **Падающие ноты**: визуализация в стиле Synthesia
- **Современный дизайн**: градиенты, неоновые эффекты, анимации

## 🎹 Клавиатурный маппинг

Используй следующие клавиши для игры:

| Клавиша | Нота | Клавиша | Нота | Клавиша | Нота |
|---------|------|---------|------|---------|------|
| Q | C3 | I | C4 | B | C5 |
| 2 | Db3 | 9 | Db4 | H | Db5 |
| W | D3 | O | D4 | N | D5 |
| 3 | Eb3 | 0 | Eb4 | J | Eb5 |
| E | E3 | P | E4 | M | E5 |
| R | F3 | Z | F4 | | |
| 5 | Gb3 | S | Gb4 | | |
| T | G3 | X | G4 | | |
| 6 | Ab3 | D | Ab4 | | |
| Y | A3 | C | A4 | | |
| 7 | Bb3 | F | Bb4 | | |
| U | B3 | V | B4 | | |

**Белые клавиши**: Q W E R T Y U I O P Z X C V B N M  
**Чёрные клавиши**: 2 3 5 6 7 9 0 S D F H J

## 🚀 Установка и запуск

### Требования
- Современный браузер (Chrome, Firefox, Edge, Safari)
- Локальный веб-сервер (из-за CORS политики для загрузки звуков)
- Node.js (для ESLint проверки)

### Шаги установки

1. **Клонируй репозиторий**
```bash
git clone https://github.com/yourusername/piano-player.git
cd piano-player
```

2. **Установи зависимости** (для ESLint)
```bash
npm install
```

3. **Запусти локальный сервер**

Вариант 1 - Python:
```bash
python3 -m http.server 8000
```

Вариант 2 - Node.js:
```bash
npx serve
```

Вариант 3 - VS Code:
- Установи расширение "Live Server"
- Кликни правой кнопкой на `index.html` → "Open with Live Server"

4. **Открой в браузере**
```
http://localhost:8000
```

## 📁 Структура проекта

```
piano-player/
├── 📁 sounds/           # Аудио файлы (88 MP3)
├── 📁 songs/            # JSON файлы с мелодиями (опционально)
├── 📄 index.html        # Главная страница
├── 📄 style.css         # Стили
├── 📄 script.js         # Логика приложения
├── ⚙️ .eslintrc.json   # Конфиг ESLint
├── 📦 package.json      # Конфиг npm
├── 🔒 package-lock.json # Фиксация версий
└── 📖 README.md         # Документация
```

## 🎼 Формат JSON файлов

Записи сохраняются в следующем формате:

```json
{
  "name": "My Recording",
  "duration": 12500,
  "notes": [
    {
      "key": "C4",
      "startTime": 0,
      "duration": 500
    },
    {
      "key": "E4",
      "startTime": 500,
      "duration": 1000
    }
  ]
}
```

### Поля:
- `name` (string) - название композиции
- `duration` (number) - общая длительность в миллисекундах
- `notes` (array) - массив нот
  - `key` (string) - нота (например: "C4", "Db5")
  - `startTime` (number) - время начала в мс от начала композиции
  - `duration` (number) - длительность ноты в мс

## 🛠️ Разработка

### Проверка кода (ESLint)
```bash
npm run lint
```

### Автоматическое исправление
```bash
npm run lint -- --fix
```

### ESLint правила
- `semi`: обязательные точки с запятой
- `no-console`: запрет console.log (для production)
- `no-unused-vars`: запрет неиспользуемых переменных
- `no-var`: использовать let/const вместо var
- `no-undef`: запрет необъявленных переменных

## 🎨 Технологии

- **HTML5** - структура приложения
- **CSS3** - современный дизайн с градиентами и анимациями
  - Flexbox для адаптивной верстки
  - CSS Animations для плавных переходов
  - Glassmorphism эффекты
- **Vanilla JavaScript (ES6+)** - без фреймворков
  - Web Audio API для воспроизведения звука
  - File API для работы с файлами
  - RequestAnimationFrame для плавной анимации

## 📱 Адаптивность

Приложение адаптировано для различных экранов:
- 💻 Desktop (1920px+) - полный функционал
- 💻 Laptop (1024px+) - оптимизированный вид
- 📱 Tablet (768px) - уменьшенные клавиши
- 📱 Mobile (480px) - минимальная версия с прокруткой

