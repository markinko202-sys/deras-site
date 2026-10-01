#!/usr/bin/env bash
# Turn a generated video into scroll-scrub frame sequences.
# usage: tools/prep.sh <scene> <video.mp4> [frames=192] [--portrait]
# Output in media/<scene>/:
#   d/  desktop   — every frame, up to 1920 wide
#   m/  phone, landscape — every frame, 800×450
#   p/  optional 9:16 centre crop, 450×800 (--portrait)
# Phones keep these as compressed JPEG blobs and decode only the ~30 frames around the scroll
# position (js/frames.js), so they get every frame, sharp, without running out of memory.
set -euo pipefail
cd "$(dirname "$0")/.."
SCENE=$1; SRC=$2; N=${3:-192}; PORTRAIT=0
[[ "${4:-}" == "--portrait" ]] && PORTRAIT=1   # phones show the whole landscape frame; a 9:16 crop is opt-in
OUT=media/$SCENE
rm -rf "$OUT"/{d,m,p}; mkdir -p "$OUT"/{d,m}

dur=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$SRC")
fps=$(python3 -c "print($N/$dur)")
half=$(python3 -c "print($N/$dur/2)")
grade="eq=contrast=1.04:saturation=0.92"   # keep it strict and dark

ffmpeg -v error -y -i "$SRC" -vf "fps=$fps,$grade,scale='min(1920,iw)':-2:flags=lanczos" -q:v 4 -frames:v $N "$OUT/d/%04d.jpg"
ffmpeg -v error -y -i "$SRC" -vf "fps=$fps,$grade,scale=800:-2:flags=lanczos" -q:v 5 -frames:v $N "$OUT/m/%04d.jpg"
sets='"d","m"'
if [[ $PORTRAIT == 1 ]]; then
  mkdir -p "$OUT/p"
  ffmpeg -v error -y -i "$SRC" -vf "fps=$fps,$grade,crop=ih*9/16:ih,scale=450:-2:flags=lanczos" -q:v 5 -frames:v $N "$OUT/p/%04d.jpg"
  sets="$sets,\"p\""
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
