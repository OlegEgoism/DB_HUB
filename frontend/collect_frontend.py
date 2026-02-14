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

    output_filename = "all_frontend_code.txt"

    with open(output_filename, "w", encoding="utf-8") as out:
        # Записываем заголовок с информацией о папках
        out.write(f"{'=' * 60}\n")
        out.write("FRONTEND CODE COLLECTION\n")
        out.write(f"Folders: {', '.join(FRONTEND_FOLDERS)}\n")
        out.write(f"Directory: {current_dir}\n")
        out.write(f"{'=' * 60}\n\n")

        total_files = 0
        skipped_binary = 0
        skipped_hidden = 0

        for base_folder in found_folders:
            print(f"\n🔍 Сканируем папку: {base_folder.name}")

            # Рекурсивно обходим все файлы
            for root, dirs, files in os.walk(base_folder):
                # Исключаем папки по паттернам
                dirs[:] = [
                    d
                    for d in dirs
                    if not any(pattern in d for pattern in EXCLUDED_PATTERNS)
                ]

                for file in files:
                    path = Path(root) / file
                    rel_path = path.relative_to(current_dir)

                    # Пропускаем скрытые файлы и файлы по паттернам
                    if file.startswith(".") or any(
                        pattern in file
                        or (pattern.startswith("*") and file.endswith(pattern[1:]))
                        for pattern in EXCLUDED_PATTERNS
                    ):
                        skipped_hidden += 1
                        continue

                    try:
                        # Читаем содержимое файла с использованием контекстного менеджера
                        with open(path, encoding="utf-8") as f:
                            content = f.read()

                        # Записываем разделитель и путь к файлу
                        out.write(f"\n{'=' * 60}\n")
                        out.write(f"{rel_path}\n")
                        out.write(f"{'=' * 60}\n\n")

                        # Записываем содержимое файла
                        out.write(content + "\n")

                        total_files += 1
                        print(f"✓ {rel_path}")

                    except UnicodeDecodeError:
                        skipped_binary += 1
                        print(f"✗ {rel_path} (бинарный файл, пропущен)")
                        continue
                    except Exception as e:
                        # Ловим конкретные исключения для надёжности
                        out.write(f"\n{'=' * 60}\n")
                        out.write(f"{rel_path}\n")
                        out.write(f"{'=' * 60}\n\n")
                        out.write(
                            f"# Не удалось прочитать файл: {type(e).__name__}: {e}\n"
                        )
                        print(f"✗ {rel_path} (ошибка чтения: {e})")

    print(f"📁 Результат сохранён в: {output_filename}")


if __name__ == "__main__":
    collect_frontend()
