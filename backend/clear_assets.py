
import os
from PIL import Image

BASE_DIR    = os.path.dirname(os.path.abspath(__file__))
ASSETS_ROOT = os.path.normpath(os.path.join(BASE_DIR, "..", "templates", "shooter", "assets"))

deleted = kept = 0

for root, dirs, files in os.walk(ASSETS_ROOT):
    for f in files:
        if not (f.endswith(".png") or f.endswith(".jpg")):
            continue
        path = os.path.join(root, f)
        rel  = os.path.relpath(path, ASSETS_ROOT)
        try:
            img  = Image.open(path)
            w, h = img.size
            size = os.path.getsize(path)
            # Placeholder = tiny file OR wrong dimensions
            is_placeholder = (
                size < 8000 or
                (w <= 64 and h <= 64 and size < 20000 and "background" not in root)
            )
            if is_placeholder:
                os.remove(path)
                print(f"    Deleted placeholder ({size}B, {w}x{h}): {rel}")
                deleted += 1
            else:
                print(f"   Kept ({size//1024}KB, {w}x{h}): {rel}")
                kept += 1
        except:
            os.remove(path)
            print(f"    Deleted (unreadable): {rel}")
            deleted += 1

print(f"\n Done. Deleted {deleted} placeholders, kept {kept} real images.")
print("Now restart Flask → real AI images via HuggingFace FLUX on next game.")