# History of Mobile Processors — YouTube Short

Stickman toon style (egg head, stick limbs, thick outlines, cel shading, DOF blur, word-by-word captions).
1080x1920, 30 fps, ~51 s, with voiceover + music.

## Pipeline
1. `python3 tools/audio.py` — Piper TTS narration (voice in `voice/`, model file is gitignored) + synthesized music bed, whooshes, ducking.
   Writes `audio/mix.wav` and `src/timing.json` (scene lengths + caption word times). Edit `SCRIPT` here to change narration.
2. `node tools/render.mjs out/mobile_processors_short.mp4` — renders `src/main.js` (Three.js) in headless Chromium, frame by frame, muxes audio.
   Stills for preview: `node tools/render.mjs out/sheet 4 11 20.5`.

## Scenes
1970s brick phone · 1990s ARM chip · 2000s flip phone · 2007 touchscreen · 2010s core wars · today's AI chip · outro lineup.

---

# He Survived Hiroshima, Then Took the Train Home — YouTube Short (Tsutomu Yamaguchi)
1080x1920, 30 fps, 57 s. `out/hiroshima_to_nagasaki_short.mp4`, with upload-ready phrase captions in `out/yamaguchi_captions.srt`.
Same toon-stickman style, plus a shared `src/toon.js` (bandages, hard hat, fedora, mustache, mouth expressions).

1. `python3 tools/audio_yamaguchi.py` — Kokoro TTS (voice `am_michael`), synthesized somber score and sfx cued to specific words.
   Writes `audio/yamaguchi_mix.wav`, `src/yamaguchi.timing.json`, `out/yamaguchi_captions.srt`. Edit `SCRIPT` to change narration.
   Needs `kokoro-v1.0.onnx` + `voices-v1.0.bin` in `voice/` (or `KOKORO_DIR`), from the kokoro-onnx `model-files-v1.0` GitHub release (gitignored).
2. `PAGE=yamaguchi.html AUDIO=audio/yamaguchi_mix.wav node tools/render.mjs out/hiroshima_to_nagasaki_short.mp4` (~45 min on CPU).
   Stills: `PAGE=yamaguchi.html node tools/render.mjs out/still 12 24 40`.

Scenes: hook · Hiroshima · first blast · survived · the train · "Nagasaki." · boss disbelief · second flash · aftermath · paper cranes/memorial.

---

# The London Beer Flood (1814) — YouTube Short
1080x1920, 30 fps, 54.5 s. `out/london_beer_flood_short.mp4` + `out/beer_captions.srt`. User-supplied narration, animated with the same toon style
(new: top hat, nightcap, judge's wig, big-bellied owner). Comedic oompah score that drops to a quiet pad for the casualties line.

1. `python3 tools/audio_beer.py` — narration, score, sfx cued to words -> `audio/beer_mix.wav`, `src/beer.timing.json`.
2. `PAGE=beer.html AUDIO=audio/beer_mix.wav node tools/render.mjs out/london_beer_flood_short.mp4`
