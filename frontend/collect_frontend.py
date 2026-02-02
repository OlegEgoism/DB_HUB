#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
from pathlib import Path

# Папки для сканирования (относительно текущей директории)
FRONTEND_FOLDERS = ["public", "src"]
# Паттерны для исключения
EXCLUDED_PATTERNS = ["node_modules", ".git", "__pycache__", "*.pyc", ".DS_Store"]


def collect_frontend():
    """
    Собирает все файлы фронтенд приложения в один файл в стиле бэкенд-скрипта
    """
    current_dir = Path.cwd()
    print(f"📁 Текущая директория: {current_dir}")

    # Проверяем существование хотя бы одной папки
    found_folders = []
    for folder in FRONTEND_FOLDERS:
        folder_path = current_dir / folder
        if folder_path.exists():
            found_folders.append(folder_path)
            print(f"✓ Найдена папка: {folder}")
        else:
            print(f"⚠️ Нет папки {folder}, пропускаем...")

    if not found_folders:
        print("❌ Нет папок фронтенда для обработки")
        return

    with open("collect_frontend.txt", "w", encoding="utf-8") as out:
        # Записываем заголовок с информацией о папках
        out.write(f"{'=' * 60}\n")
        out.write(f"FRONTEND CODE COLLECTION\n")
        out.write(f"Folders: {', '.join(FRONTEND_FOLDERS)}\n")
        out.write(f"Directory: {current_dir}\n")
        out.write(f"{'=' * 60}\n\n")

        total_files = 0

        for base_folder in found_folders:
            print(f"\n🔍 Сканируем папку: {base_folder.name}")

            # Рекурсивно обходим все файлы
            for root, dirs, files in os.walk(base_folder):
                # Исключаем папки по паттернам
                dirs[:] = [d for d in dirs if not any(pattern in d for pattern in EXCLUDED_PATTERNS)]

                for file in files:
                    # Проверяем исключения по имени файла
                    skip_file = False
                    for pattern in EXCLUDED_PATTERNS:
                        if '*' in pattern and file.endswith(pattern.replace('*', '')):
                            skip_file = True
                            break
                        if pattern in file:
                            skip_file = True
                            break

                    if skip_file:
                        continue

                    path = Path(root) / file

                    # Пропускаем скрытые файлы
                    if file.startswith('.'):
                        continue

                    try:
                        # Читаем содержимое файла
                        content = open(path, encoding="utf-8").read()

                        # Получаем относительный путь от корневой папки сканирования
                        # Если base_folder - это подпапка текущей директории
                        rel_path = path.relative_to(current_dir)

                        # Записываем разделитель и путь к файлу
                        out.write(f"\n{'=' * 60}\n")
                        out.write(f"{rel_path}\n")
                        out.write(f"{'=' * 60}\n\n")

                        # Записываем содержимое файла
                        out.write(content + "\n")

                        total_files += 1
                        print(f"✓ {rel_path}")

                    except UnicodeDecodeError:
                        # Если не текстовый файл (бинарный), пропускаем
                        print(f"✗ {path.relative_to(current_dir) if current_dir in path.parents else path} (бинарный файл)")
                        continue
                    except Exception as e:
                        # Для остальных ошибок записываем заметку
                        try:
                            rel_path = path.relative_to(current_dir)
                        except:
                            rel_path = path

                        out.write(f"\n{'=' * 60}\n")
                        out.write(f"{rel_path}\n")
                        out.write(f"{'=' * 60}\n\n")
                        out.write(f"# Не удалось прочитать файл: {e}\n")
                        print(f"✗ {rel_path} (ошибка чтения)")

    print(f"\n✅ Сборка завершена! Обработано файлов: {total_files}")
    print(f"📁 Результат сохранен в: all_frontend_code.txt")


if __name__ == "__main__":
    collect_frontend()