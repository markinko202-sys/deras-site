# DERAS — промпты для фото и видео

Бренд: **DERAS** (малайск. «стремительный, бурный», как река после муссона). Модели: **Kilat** (молния), **Senja** (закат), **Rimba** (джунгли).
Вайб: строгий, тёмный. Чёрный, цвет слоновой кости, латунь. Никакого неона, никакого «киберпанка».

**Как работать:**
1. Фото и стартовые/финальные кадры генерируешь в **Nano Banana 2** (Google Flow / Whisk). Каждый промпт начинается с блока **CAR LOCK**, чтобы машина везде была одна и та же.
2. Видео делаешь в **Veo 3.1 → Frames to Video** (или Seedance 2.5 first+last frame). Загружаешь START и END кадр, вставляешь видеопромпт.
3. Кидаешь мне mp4, я прогоняю `tools/prep.sh`, и видео начинает прокручиваться скроллом.

---

## 0. LOCK-блоки (вставлять в начало КАЖДОГО промпта)

### CAR LOCK — DERAS KILAT
```
DERAS KILAT: a fictional low, wide two-door electric grand tourer coupe. Long flat hood, short rear deck, smooth fastback roofline, frameless doors with flush handles. Grille-less nose: a closed front panel with a fine laser-etched pattern of small repeating triangles (Malay songket "pucuk rebung" bamboo-shoot motif), barely visible, catching light only at grazing angles. One ultra-thin full-width LED light bar at the front and one at the rear. Paint "Hitam Malam": deep gloss black with a very subtle warm bronze metallic flake. Dark bronze 21-inch forged wheels with thin twin spokes, brushed brass brake calipers. Tinted black glass. No badges, no logos, no visible text anywhere. Original design — does not resemble any existing car brand.
```

### STYLE LOCK
```
Strict, dark, cinematic automotive photography. Near-black environment, single controlled light source, deep shadows, high contrast but no crushed detail on the car. Palette: black, warm ivory highlights, muted brass accents. Shot on a medium-format camera, 50mm–85mm lens, low camera height. Clean, restrained, luxurious. No neon, no lens flare streaks, no people, no text, no watermark.
```

Для **Senja** замени первую фразу CAR LOCK на: *«DERAS SENJA: the four-seat four-door grand tourer version, slightly longer wheelbase and taller roof, same design language, paint: deep oxblood red-brown that reads almost black in shadow.»*
Для **Rimba**: *«DERAS RIMBA: the raised all-wheel-drive crossover coupe version, +60 mm ground clearance, matte black wheel-arch cladding, paint: dark jungle green that reads almost black in shadow.»*

---

## 1. Фото для сайта (Nano Banana 2)

Формат указан в скобках. Сохраняй в `deras-site/img/` под этими именами.

**`model-kilat.jpg` (4:5)**
```
[CAR LOCK — KILAT] [STYLE LOCK] Front three-quarter view of the car standing on polished black concrete in an empty dark studio. A single long horizontal softbox above rakes light along the shoulder line and the hood, the songket pattern on the nose catches a faint glint. Soft reflection on the floor. Car occupies the lower two-thirds of the frame, lots of black negative space above.
```

**`model-senja.jpg` (4:5)**
```
[CAR LOCK — SENJA] [STYLE LOCK] Rear three-quarter view on an empty coastal road in Terengganu at the very last minute of dusk, sky a thin band of deep amber on the horizon fading into near-black, silhouette of casuarina trees. The rear light bar glows. The car reads mostly as a silhouette with a warm rim light along the roof.
```

**`model-rimba.jpg` (4:5)**
```
[CAR LOCK — RIMBA] [STYLE LOCK] Parked on a wet red-earth road in the Cameron Highlands at blue hour, dense dark rainforest and tea terraces dissolving into heavy fog behind. Headlight bar on, cutting into the mist. Moody, almost monochrome, only the headlights warm.
```

**Детали (16:9 или 1:1, для будущих секций и соцсетей)**
```
[CAR LOCK — KILAT] [STYLE LOCK] Extreme macro of the grille-less nose: the laser-etched pucuk rebung songket triangle pattern in the black paint, a single grazing brass-coloured light reveals the pattern, the rest falls into black. Shallow depth of field.
```
```
[CAR LOCK — KILAT] [STYLE LOCK] Close-up of the dark bronze forged wheel and brushed brass brake caliper, water droplets on the tyre wall, low side light, black background.
```
```
[STYLE LOCK] Interior of the DERAS KILAT: black leather seats with a fine woven songket-pattern insert in dark brass thread across the backrest, brushed brass rotary controls, a thin horizontal screen switched off. Night, lit only by soft amber ambient light from the door panels.
```
```
[CAR LOCK — KILAT] [STYLE LOCK] The car parked on an empty rooftop car park in Kuala Lumpur at 2 a.m., Petronas Twin Towers far in the background, softly out of focus, lights dimmed. Wet ground reflections. Car lit only by the city glow — dark and quiet.
```

**OG-картинка для превью ссылки (1200×630)**
```
[CAR LOCK — KILAT] [STYLE LOCK] Pure side profile, centered, in total darkness; only a single thin line of light traces the roofline and the light bars. Wide 1.9:1 composition, car occupies the middle third.
```

---

## 2. Видео для скролла (5 сцен)

### Правила, чтобы видео нормально «скроллилось»
- **16:9, 1080p, 8 секунд, одним дублем.** Никаких склеек и смены плана.
- **Камера неподвижна или делает ОДНО медленное равномерное движение.** Без тряски, handheld, zoom-рывков.
- **Действие идёт равномерно от начала до конца**: скролл = время, пауза в середине = «мёртвый» скролл.
- Машина в центре кадра: на телефоне я кадрирую 16:9 до вертикали по центру. Если хочешь идеально, сделай ещё вертикальную 9:16 версию, я подключу её для мобильных.
- Ни текста, ни логотипов в кадре: текст рисует сайт.
- В каждом видеопромпте в конце добавляй: *«Single continuous shot, locked-off tripod unless stated, constant motion speed, no cuts, no text, no camera shake, no morphing of the car's shape.»*

---

### 01 · REVEAL — «Out of the dark» (hero, `01-reveal`)
Машина проявляется из полной темноты, по ней проходит полоса света.

**START кадр (Nano Banana 2, 16:9):**
```
[CAR LOCK — KILAT] [STYLE LOCK] Almost completely black frame. A dark studio; the car in front three-quarter view is only hinted at by the faintest rim of light on the very tip of the roofline. 95% of the image is pure black.
```
**END кадр:**
```
[CAR LOCK — KILAT] [STYLE LOCK] Same camera position and framing. The car is now fully revealed by a single long horizontal strip light hanging above and to the right: highlights run along the whole shoulder line, hood and roof, the front LED light bar is ON in warm white. Faint reflection on the black floor. Background stays black.
```
**Видео (Veo 3.1 Frames to Video):**
```
A thin horizontal blade of warm white light slowly travels from left to right across a pitch-black studio, progressively revealing the black DERAS coupe surface by surface: first the rear haunch, then the roofline, the door, the hood, and finally the nose. In the last second the thin front LED light bar switches on with a soft glow. Camera completely static. Slow, deliberate, silent, luxurious. Single continuous shot, locked-off tripod, constant motion speed, no cuts, no text, no camera shake, no morphing of the car's shape.
```

---

### 02 · MONSOON — «Hujan» (`02-monsoon`)
Ночь, тропический ливень, медленный наезд камеры, одна вспышка молнии в середине.

**START:**
```
[CAR LOCK — KILAT] [STYLE LOCK] Night on an empty Malaysian highway (Karak Highway), torrential tropical rain, wide shot, the car small in the centre of the frame, front three-quarter, headlight bar on, rain streaks visible in the headlight beam, wet asphalt mirror-like, dark silhouettes of jungle hills behind. Very dark, cold blue-grey tones, warm headlights only.
```
**END:**
```
Same scene, same lighting. Now a close front three-quarter shot of the car's nose and front wheel, filling the frame; heavy rain drops bead and roll off the gloss black hood, water spray at the tyre.
```
**Видео:**
```
Slow, perfectly smooth dolly-in toward the parked DERAS coupe on an empty night highway in torrential tropical rain. Rain falls steadily through the headlight beam, drops bead and run off the black paint. Exactly halfway through, a single distant lightning flash briefly lights the whole scene and the jungle hills, then darkness returns. Single continuous shot, constant dolly speed, no cuts, no text, no camera shake, no morphing of the car's shape.
```

---

### 03 · ANATOMY — «Take it apart» (`03-anatomy`)
Машина разбирается на детали в воздухе (exploded view), а в конце собирается обратно.

**START:**
```
[CAR LOCK — KILAT] [STYLE LOCK] Pure side profile of the complete car, centered, floating slightly above a black floor in a dark studio, thin overhead light. Plenty of empty space around it.
```
**END:**
```
[STYLE LOCK] Technical exploded view of the same DERAS coupe in pure side profile, same scale and position: the glass canopy lifted high above, the black body shell raised, below it a flat carbon-fibre tub, a thin battery pack made of rows of modules with brass-coloured connectors, two compact electric motors near the axles, the four dark bronze wheels moved outward. All parts float in perfect alignment on a black background, precise museum-like lighting, faint thin brass rim light on every part.
```
**Видео:**
```
The complete DERAS coupe slowly and precisely separates into its components, like an engineering exploded view: the glass canopy rises, the body shell lifts, the carbon tub, the battery pack and the two electric motors are revealed, the wheels slide outward. All movement is smooth, symmetric and mechanical, perfectly aligned, in total silence on a black background. Camera static, pure side view. Single continuous shot, constant motion speed, no cuts, no text, no morphing.
```
> Лайфхак: если модель ломает разборку, сгенерируй **обратное** видео (END → START, детали собираются в машину) и скажи мне. Я разверну его через ffmpeg (`reverse`). Сборка у моделей получается стабильнее. На сайте в конце сцены машина всё равно «собирается», это заложено в текст.

---

### 04 · DESIGN — «Every line, drawn in KL» (`04-orbit`)
Медленный облёт 180° вокруг машины под одним прожектором, финал на носу с узором songket.

**START:**
```
[CAR LOCK — KILAT] [STYLE LOCK] Pure side profile, car facing right, standing under a single round overhead spotlight that forms a soft pool of light on black polished concrete. Everything outside the pool is black.
```
**END:**
```
Same car, same spotlight. Camera is now low and close at the front, looking straight at the grille-less nose; the laser-etched pucuk rebung songket triangle pattern is clearly visible, the thin LED light bar glows warm white above it.
```
**Видео:**
```
The camera slowly orbits 180 degrees around the stationary DERAS coupe under a single overhead spotlight, moving from the pure side profile to a low frontal view of the nose, ending close on the laser-etched songket triangle pattern and the glowing light bar. Perfectly smooth, constant orbit speed, the car never changes shape. Single continuous shot, no cuts, no text, no camera shake.
```

---

### 05 · ARRIVAL — «It's already on its way» (`05-lights`, фон под форму)
Из темноты на камеру едут фары, вспышка, машина останавливается. Верх кадра остаётся тёмным под текст.

**START:**
```
[STYLE LOCK] Night, a straight empty road through dense fog on the way to Genting Highlands, total darkness; far away in the centre of the frame, two tiny warm-white points of headlights. Lower half of the frame is road, upper half pure black fog.
```
**END:**
```
[CAR LOCK — KILAT] [STYLE LOCK] Same road and fog, the car has stopped close to the camera, front view, occupying the lower third of the frame only, headlight bar dimmed to a soft glow, warm haze in the fog around it. The upper two-thirds of the frame are dark fog, almost empty.
```
**Видео:**
```
From the darkness a pair of headlights approaches slowly through thick fog directly toward a static camera, growing larger, the light blooms softly in the fog as the car gets close, then the black DERAS coupe glides to a stop in the lower third of the frame and its headlight bar dims to a soft warm glow. The upper part of the frame stays dark and empty. Single continuous shot, locked-off tripod, no cuts, no text, no camera shake, no morphing of the car's shape.
```

---

## 3. Бонус-идеи для следующих сцен (если захочешь больше)
- **06 · KOPITIAM 3 AM:** машина медленно проезжает мимо закрытого kopitiam с одной горящей лампой, отражение неоновой вывески «KOPI» в двери (текст на вывеске можно, это часть мира).
- **07 · PENANG BRIDGE:** вид сверху (дрон, медленно вниз) на одинокую машину на мосту ночью, огни моста тянутся в туман.
- **08 · BATIK LIGHT:** машина в студии, свет проходит через трафарет с batik-узором, узор тени ползёт по кузову (очень «наш» кадр, отлично ложится на скролл).

---

## 4. Когда видео готово
Скинь файлы (или положи в `deras-site/raw/`) и скажи, какая сцена. Я запущу:
```bash
tools/prep.sh 01-reveal raw/reveal.mp4
```
С вертикальной версией для телефонов:
```bash
tools/prep.sh 01-reveal raw/reveal.mp4 raw/reveal_9x16.mp4
```
