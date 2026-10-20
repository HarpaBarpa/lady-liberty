"""Turn selected raw renders into web assets for site/claude/assets.

Usage: py -3.12 design/tools/optimize.py
Edit PICKS to change which raw render feeds which asset. Transparent assets are trimmed to
their alpha bounds plus a small margin; backgrounds keep their full frame.
"""
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
RAW = ROOT / "design" / "raw"
REF = ROOT / "design" / "ref"
OUT = ROOT / "site" / "claude" / "assets"

# asset name: (source, kind, max width)
PICKS = {
    "liberty-hero": (RAW / "01-hero-2.png", "alpha", 1024),
    "harbor-dawn": (RAW / "02-places-a-1.png", "bg", 1672),
    "crown-view": (RAW / "02-places-a-3.png", "bg", 1672),
    "copper-interior": (RAW / "03-places-b-1.png", "bg", 1672),
    "torch-night": (RAW / "03-places-b-2.png", "bg", 1672),
    "pedestal-vault": (RAW / "04-props-1.png", "alpha-trim", 900),
    "pigeon": (RAW / "04-props-2.png", "alpha-trim", 512),
    "pigeon-flap": (RAW / "04-props-3.png", "alpha-trim", 512),
    "liberty-avatar": (REF / "sweet-liberty-avatar.png", "alpha", 640),
}


def trim(im: Image.Image, margin: float = 0.04) -> Image.Image:
    a = im.getchannel("A").point(lambda v: 255 if v > 12 else 0)
    box = a.getbbox()
    if not box:
        return im
    m = int(max(im.size) * margin)
    piece = im.crop(box)
    side = max(piece.width, piece.height) + 2 * m
    canvas = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    canvas.paste(piece, ((side - piece.width) // 2, (side - piece.height) // 2))
    return canvas


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for name, (src, kind, maxw) in PICKS.items():
        if not src.exists():
            print(f"{name}: missing {src.name}, skipped")
            continue
        im = Image.open(src)
        im = im.convert("RGBA") if kind.startswith("alpha") else im.convert("RGB")
        if kind == "alpha-trim":
            im = trim(im)
        if im.width > maxw:
            im = im.resize((maxw, round(im.height * maxw / im.width)), Image.LANCZOS)
        dest = OUT / f"{name}.webp"
        im.save(dest, "WEBP", quality=84 if kind == "bg" else 88, method=6)
        print(f"{name}: {im.size} {im.mode} {dest.stat().st_size // 1024} KB")


if __name__ == "__main__":
    main()
