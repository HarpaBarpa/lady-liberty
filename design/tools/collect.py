"""Move Codex generated images out of ~/.codex/generated_images into design/raw.

Usage: py -3.12 design/tools/collect.py <job-name> [<job-name> ...]

For each job the session id is read from the Codex log (design/logs/<job>.log), and only the
image paths that log lists under its final summary are MOVED (not copied) to design/raw/<job>-<n>.png
in the order Codex printed them. Nothing else in generated_images is touched.
"""
import re
import shutil
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
RAW = ROOT / "design" / "raw"
LOGS = ROOT / "design" / "logs"
GEN = Path.home() / ".codex" / "generated_images"


def listed_images(job: str) -> list[Path]:
    log = LOGS / f"{job}.log"
    if not log.exists():
        return []
    text = log.read_text(encoding="utf-8", errors="replace")
    sid = None
    for line in text.splitlines()[:40]:
        m = re.match(r"session id:\s*([0-9a-f-]{36})", line)
        if m:
            sid = m.group(1)
            break
    if not sid:
        return []
    pat = re.compile(r"([A-Za-z]:\\[^\s]*?generated_images\\" + re.escape(sid) + r"\\[^\s]+?\.png)")
    seen, out = set(), []
    for m in pat.finditer(text):
        p = Path(m.group(1))
        if p.name not in seen:
            seen.add(p.name)
            out.append(p)
    return out


def main(jobs):
    RAW.mkdir(parents=True, exist_ok=True)
    for job in jobs:
        files = listed_images(job)
        if not files:
            print(f"{job}: no image paths found in log")
            continue
        for i, f in enumerate(files, start=1):
            dest = RAW / f"{job}-{i}.png"
            if not f.exists():
                print(f"{job}: {f} missing (already collected?)")
                continue
            if dest.exists():
                dest = RAW / f"{job}-{i}-{f.stem[-6:]}.png"
            shutil.move(str(f), str(dest))
            with Image.open(dest) as im:
                print(f"{job}: {i} {im.size} {im.mode} -> {dest}")


if __name__ == "__main__":
    main(sys.argv[1:])
