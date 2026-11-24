# Mobile processor history short
Three.js toon renderer (stickman style) -> headless Chromium -> ffmpeg. 1080x1920, 30fps.
Render: `node tools/render.mjs out/scene70.mp4 <seconds> 30` (single frame: add a 4th arg, time in s).
Scenes live in `src/main.js`; `window.renderFrame(t)` is deterministic.
