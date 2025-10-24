import json
import sys 

def convert_midi_json(input_filename, output_filename):
    """
    Конвертирует "сырой" MIDI-to-JSON файл в формат для вашего плеера.
    """
    try:
        with open(input_filename, 'r', encoding='utf-8') as f:
            raw_data = json.load(f)
    except FileNotFoundError:
        print(f"Ошибка: Файл '{input_filename}' не найден.")
        return
    except json.JSONDecodeError:
        print(f"Ошибка: Не удалось прочитать JSON из файла '{input_filename}'. Проверьте его формат.")
        return

    all_notes = []
    # Шаг 1: Извлечь ноты из всех треков
    for track in raw_data.get('tracks', []):
        if 'notes' in track and track['notes']:
            all_notes.extend(track['notes'])

    # Шаг 2: Отсортировать все ноты по времени начала
    all_notes.sort(key=lambda note: note['time'])

    converted_notes = []
    max_end_time = 0

    # Таблица для замены диезов на бемоли
    sharp_to_flat = {
        'C#': 'Db',
        'D#': 'Eb',
        'F#': 'Gb',
        'G#': 'Ab',
        'A#': 'Bb'
    }

    # Шаг 3: Конвертировать каждую ноту
    for raw_note in all_notes:
        start_time_ms = round(raw_note['time'] * 1000)
        duration_ms = round(raw_note['duration'] * 1000)
        
        if duration_ms == 0:
            duration_ms = 1

        note_name = raw_note['name']
        
        for sharp, flat in sharp_to_flat.items():
            if sharp in note_name:
                note_name = note_name.replace(sharp, flat)

        converted_notes.append({
            'key': note_name,
            'startTime': start_time_ms,
            'duration': duration_ms
        })

        # Шаг 4: Вычислить общую длительность песни
        max_end_time = max(max_end_time, start_time_ms + duration_ms)

    song_name = raw_data.get('header', {}).get('name', input_filename.replace('.json', ''))

    output_data = {
        'name': song_name,
        'duration': max_end_time,
        'notes': converted_notes
    }

    # Шаг 5: Сохраняем результат
    with open(output_filename, 'w', encoding='utf-8') as f:
        json.dump(output_data, f, indent=2, ensure_ascii=False)

    print(f"✅ Конвертация завершена! Файл сохранен как '{output_filename}'")


# --- ИСПОЛЬЗОВАНИЕ ---
if __name__ == "__main__":
    # Проверяем, что передан ровно один аргумент (имя файла)
    if len(sys.argv) != 2:
        print("Использование: python converter.py <входной_файл.json>")
        print("Пример: python converter.py fujii_kaze_hana.json")
    else:
        input_file = sys.argv[1]
        
        # Проверяем, что это JSON файл
        if not input_file.lower().endswith('.json'):
            print(f"Ошибка: Файл '{input_file}' должен иметь расширение .json")
        else:
            # Автоматически создаем имя выходного файла
            base_name = input_file.rsplit('.json', 1)[0]
            output_file = f"{base_name}_converted.json"
            
            # Добавим проверку, чтобы не перезаписать самого себя
            if input_file == output_file:
                 print("Ошибка: Имя входного файла не может заканчиваться на '_converted.json', чтобы избежать перезаписи.")
            else:
                convert_midi_json(input_file, output_file)