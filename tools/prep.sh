#!/usr/bin/env bash
# Turn a generated video into a scroll-scrub frame sequence.
# usage: tools/prep.sh <scene> <landscape.mp4> [portrait.mp4] [frames=150]
#   scene: 01-reveal | 02-monsoon | 03-anatomy | 04-orbit | 05-lights
# Output: media/<scene>/d (1920w), m (1080w), p (portrait 1080w, optional) + manifest.json
set -euo pipefail
cd "$(dirname "$0")/.."
SCENE=$1; SRC=$2; PORT=${3:-}; N=${4:-150}
OUT=media/$SCENE
rm -rf "$OUT"/{d,m,p}; mkdir -p "$OUT"/{d,m}

dur=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$SRC")
fps=$(python3 -c "print($N/$dur)")
grade="eq=contrast=1.04:saturation=0.92"   # keep it strict and dark; tweak if needed

ffmpeg -v error -y -i "$SRC" -vf "fps=$fps,$grade,scale='min(1920,iw)':-2:flags=lanczos" -q:v 4 -frames:v $N "$OUT/d/%04d.jpg"
ffmpeg -v error -y -i "$SRC" -vf "fps=$fps,$grade,scale='min(960,iw)':-2:flags=lanczos" -q:v 5 -frames:v $N "$OUT/m/%04d.jpg"
sets='"d","m"'
if [[ -n "$PORT" ]]; then
  mkdir -p "$OUT/p"
  ffmpeg -v error -y -i "$PORT" -vf "fps=$fps,$grade,scale='min(960,iw)':-2:flags=lanczos" -q:v 5 -frames:v $N "$OUT/p/%04d.jpg"
  sets='"d","m","p"'
fi
count=$(ls "$OUT/d" | wc -l | tr -d ' ')
echo "{\"frames\": $count, \"ext\": \"jpg\", \"sets\": [$sets]}" > "$OUT/manifest.json"
du -sh "$OUT"/d "$OUT"/m ${PORT:+"$OUT/p"}
echo "✓ $SCENE: $count frames"
