import os
from pathlib import Path

# Файлы для исключения
EXCLUDED = ["collect_app_code.py", "generate_app_key.py"]


def collect_code():
    backend = Path.cwd()  # / "backend"
    if not backend.exists():
        print("❌ Нет папки backend")
        return
    with open("all_code.txt", "w", encoding="utf-8") as out:
        for root, _, files in os.walk(backend):
            for file in files:
                if file.endswith(".py") and file not in EXCLUDED:
                    path = Path(root) / file
                    rel_path = path.relative_to(backend)
                    out.write(f"\n{'=' * 60}\n{rel_path}\n{'=' * 60}\n\n")
                    try:
                        out.write(open(path, encoding="utf-8").read() + "\n")
                    except:
                        out.write("# Ошибка чтения\n")
    print("\n✅ Done!")


if __name__ == "__main__":
    collect_code()
