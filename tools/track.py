"""Finds where the car is in every frame, so the phone's vertical "camera" can follow it.

The footage is a lit car on a black studio background, so the brightness-weighted centre of the
frame is a good proxy for the car. For each frame we store, in 0..1 frame-width units:
  fx      — horizontal centre of the car
  x0, x1  — left/right extent of the car (5th/95th percentile of brightness mass)
The curves are smoothed (no jitter) and written into media/<scene>/manifest.json as "track".

    python3 tools/track.py            # all scenes
"""
import glob, json, os
import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def analyse(path):
    im = Image.open(path).convert("L").resize((240, 135))
    a = np.asarray(im, dtype=np.float32) / 255.0
    w = np.clip(a - 0.12, 0, None) ** 1.5           # ignore the near-black studio
    col = w.sum(axis=0)
    total = col.sum()
    if total < 1.0:                                   # almost black frame (start of the reveal)
        return None
    xs = (np.arange(col.size) + 0.5) / col.size
    cdf = np.cumsum(col) / total
    return float((col * xs).sum() / total), float(xs[np.searchsorted(cdf, 0.05)]), float(xs[np.searchsorted(cdf, 0.95)]), float(total)


def smooth(v, k=9):
    v = np.asarray(v, dtype=np.float64)
    pad = np.pad(v, k, mode="edge")
    ker = np.hanning(2 * k + 1); ker /= ker.sum()
    return np.convolve(pad, ker, mode="same")[k:-k]


for man_path in sorted(glob.glob(os.path.join(ROOT, "media", "*", "manifest.json"))):
    scene_dir = os.path.dirname(man_path)
    frames = sorted(glob.glob(os.path.join(scene_dir, "m", "*.jpg")))
    if not frames:
        continue
    raw = [analyse(f) for f in frames]
    # fill dark frames from the nearest known value
    known = [i for i, r in enumerate(raw) if r]
    fx, x0, x1 = [], [], []
    for i, r in enumerate(raw):
        if r is None:
            j = min(known, key=lambda k: abs(k - i)) if known else None
            r = raw[j] if j is not None else (0.5, 0.2, 0.8, 0)
        fx.append(r[0]); x0.append(r[1]); x1.append(r[2])
    track = {k: [round(float(x), 3) for x in smooth(v)] for k, v in (("fx", fx), ("x0", x0), ("x1", x1))}
    man = json.load(open(man_path))
    man["track"] = track
    json.dump(man, open(man_path, "w"))
    name = os.path.basename(scene_dir)
    print(f"{name:10s} frames {len(frames)}  fx {min(track['fx']):.2f}–{max(track['fx']):.2f}  span {np.mean(np.array(track['x1']) - np.array(track['x0'])):.2f}")

# rebuild media/manifest.js
m = {os.path.basename(os.path.dirname(f)): json.load(open(f)) for f in sorted(glob.glob(os.path.join(ROOT, "media", "*", "manifest.json")))}
open(os.path.join(ROOT, "media", "manifest.js"), "w").write("window.DERAS_MEDIA = " + json.dumps(m) + ";\n")
print("✓ media/manifest.js updated")
