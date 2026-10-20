#!/usr/bin/env bash
# Runs Codex image generation jobs in parallel.
# Usage: design/tools/run-codex.sh <prompt-name> [<prompt-name> ...]
# A prompt name is a file in design/prompts without the .txt suffix (for example 01-hero).
# Each job is prompts/00-style.txt + prompts/<name>.txt piped to `codex exec` with the built-in image_gen tool.
# Optional reference images: prompts/<name>.images, one path per line, relative to the repo root (passed as -i).
# The reference files live in design/ref, which is not committed; put your own references there.
# Logs go to $SCR/<name>.log, a status line per finished job to $SCR/queue.status.
# Images land in ~/.codex/generated_images/<session>/ ; move them with design/tools/collect.py.
set -u
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
P="$ROOT/design/prompts"
SCR="${SCR:-$ROOT/design/logs}"
MODEL="${CODEX_MODEL:-gpt-5.6-sol}"
MAXJOBS="${MAXJOBS:-3}"
mkdir -p "$SCR"

run_job() {
  local name="$1"
  cat "$P/00-style.txt" <(echo) "$P/$name.txt" > "$SCR/$name.full.txt"
  echo "start $name $(date +%H:%M:%S)" >> "$SCR/queue.status"
  local imgargs=()
  if [ -f "$P/$name.images" ]; then
    while IFS= read -r line; do
      line="${line%$'\r'}"
      [ -z "$line" ] && continue
      case "$line" in /*|[A-Za-z]:*) ;; *) line="$ROOT/$line" ;; esac
      imgargs+=(-i "$line")
    done < "$P/$name.images"
  fi
  codex exec -m "$MODEL" -c 'model_reasoning_effort="high"' -C "$SCR" --skip-git-repo-check -s read-only "${imgargs[@]}" - \
    < "$SCR/$name.full.txt" > "$SCR/$name.log" 2>&1
  echo "done $name exit=$? $(date +%H:%M:%S)" >> "$SCR/queue.status"
}

for name in "$@"; do
  while [ "$(jobs -rp | wc -l)" -ge "$MAXJOBS" ]; do
    wait -n
  done
  run_job "$name" &
  sleep 2
done
wait
echo "queue finished $(date +%H:%M:%S)" >> "$SCR/queue.status"
