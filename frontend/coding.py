#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import sys
from pathlib import Path
from datetime import datetime


def collect_frontend_files(output_file='frontend_bundle.txt',
                           folders=['public', 'src'],
                           exclude_patterns=['node_modules', '.git', '__pycache__', '*.pyc']):
    """
    Собирает все файлы фронтенд приложения в один файл

    :param output_file: Имя выходного файла
    :param folders: Список папок для сканирования
    :param exclude_patterns: Паттерны для исключения файлов/папок
    """
    # Проверяем существование папок
    for folder in folders:
        if not os.path.exists(folder):
            print(f"⚠️ Папка {folder} не найдена, пропускаем...")

    # Открываем выходной файл для записи
    with open(output_file, 'w', encoding='utf-8') as outfile:
        # Записываем заголовок
        outfile.write("=" * 80 + "\n")
        outfile.write(f"FRONTEND APPLICATION BUNDLE\n")
        outfile.write(f"Собрано: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        outfile.write(f"Папки: {', '.join(folders)}\n")
        outfile.write("=" * 80 + "\n\n")

        total_files = 0
        total_size = 0

        # Обрабатываем каждую папку
        for folder in folders:
            if not os.path.exists(folder):
                continue

            folder_path = Path(folder)

            # Рекурсивно обходим все файлы в папке
            for filepath in folder_path.rglob('*'):
                # Пропускаем директории
                if filepath.is_dir():
                    continue

                # Проверяем паттерны исключения
                skip = False
                for pattern in exclude_patterns:
                    if pattern in str(filepath):
                        skip = True
                        break
                if skip:
                    continue

                try:
                    # Читаем содержимое файла
                    with open(filepath, 'r', encoding='utf-8') as infile:
                        content = infile.read()

                    # Записываем информацию о файле
                    relative_path = filepath.relative_to(folder_path.parent)
                    file_size = filepath.stat().st_size

                    outfile.write(f"\n{'=' * 80}\n")
                    outfile.write(f"Файл: {relative_path}\n")
                    outfile.write(f"Размер: {file_size} байт\n")
                    outfile.write(f"{'=' * 80}\n\n")
                    outfile.write(content)
                    outfile.write("\n\n")

                    total_files += 1
                    total_size += file_size

                    print(f"✓ Добавлен: {relative_path} ({file_size} байт)")

                except Exception as e:
                    print(f"✗ Ошибка при чтении {filepath}: {e}")

        # Записываем итоговую информацию
        outfile.write("=" * 80 + "\n")
        outfile.write(f"ИТОГО: {total_files} файлов, {total_size} байт\n")
        outfile.write("=" * 80 + "\n")

    print(f"\n✅ Сборка завершена!")
    print(f"   Файлов: {total_files}")
    print(f"   Общий размер: {total_size} байт")
    print(f"   Результат: {output_file}")


if __name__ == "__main__":
    # Запускаем сборку
    collect_frontend_files(
        output_file='frontend_bundle.txt',
        folders=['public', 'src'],
        exclude_patterns=['node_modules', '.git', '__pycache__', '*.pyc', '*.log', '.DS_Store']
    )