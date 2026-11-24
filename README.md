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
