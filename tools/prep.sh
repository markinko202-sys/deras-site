#!/usr/bin/env bash
# Turn a generated video into scroll-scrub frame sequences.
# usage: tools/prep.sh <scene> <video.mp4> [frames=192] [--no-portrait]
# Output in media/<scene>/:
#   d/  desktop   — every frame, up to 1920 wide
#   m/  phone, landscape — every 2nd frame, 640×360
#   p/  phone, portrait  — every 2nd frame, centre crop 9:16, 360×640
# Phones decode ~6–8× less image memory than with the desktop set, so long pages don't crash Safari.
set -euo pipefail
cd "$(dirname "$0")/.."
SCENE=$1; SRC=$2; N=${3:-192}; PORTRAIT=1
[[ "${4:-}" == "--no-portrait" ]] && PORTRAIT=0
OUT=media/$SCENE
rm -rf "$OUT"/{d,m,p}; mkdir -p "$OUT"/{d,m}

dur=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$SRC")
fps=$(python3 -c "print($N/$dur)")
half=$(python3 -c "print($N/$dur/2)")
grade="eq=contrast=1.04:saturation=0.92"   # keep it strict and dark

ffmpeg -v error -y -i "$SRC" -vf "fps=$fps,$grade,scale='min(1920,iw)':-2:flags=lanczos" -q:v 4 -frames:v $N "$OUT/d/%04d.jpg"
ffmpeg -v error -y -i "$SRC" -vf "fps=$half,$grade,scale=640:-2:flags=lanczos" -q:v 5 "$OUT/m/%04d.jpg"
sets='"d","m"'; steps='"d":1,"m":2'
if [[ $PORTRAIT == 1 ]]; then
  mkdir -p "$OUT/p"
  ffmpeg -v error -y -i "$SRC" -vf "fps=$half,$grade,crop=ih*9/16:ih,scale=360:-2:flags=lanczos" -q:v 5 "$OUT/p/%04d.jpg"
  sets="$sets,\"p\""; steps="$steps,\"p\":2"
fi
count=$(ls "$OUT/d" | wc -l | tr -d ' ')
counts=$(for s in d m p; do [[ -d "$OUT/$s" ]] && printf '"%s":%s,' "$s" "$(ls "$OUT/$s" | wc -l | tr -d ' ')"; done); counts=${counts%,}
echo "{\"frames\": $count, \"ext\": \"jpg\", \"sets\": [$sets], \"counts\": {$counts}}" > "$OUT/manifest.json"
du -sh "$OUT"/*/ | tr '\n' ' '; echo
echo "✓ $SCENE: $count frames"

# rebuild media/manifest.js from every scene's manifest.json
python3 - <<'PY'
import json, glob, os
m = {os.path.basename(os.path.dirname(f)): json.load(open(f)) for f in sorted(glob.glob("media/*/manifest.json"))}
open("media/manifest.js", "w").write("window.DERAS_MEDIA = " + json.dumps(m) + ";\n")
PY
echo "✓ media/manifest.js updated"
