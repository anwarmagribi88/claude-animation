import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const W = 1080, H = 1920, PI = Math.PI;
const TIMING = await (await fetch('timing.json')).json();

const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setSize(W, H); renderer.setPixelRatio(1);
document.getElementById('stage').prepend(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(32, W / H, 0.1, 120);
const rt = new THREE.WebGLRenderTarget(W, H, { samples: 4, type: THREE.HalfFloatType });
const composer = new EffectComposer(renderer, rt);
composer.addPass(new RenderPass(scene, camera));
const bokeh = new BokehPass(scene, camera, { focus: 9, aperture: 0.0012, maxblur: 0.008 });
composer.addPass(bokeh);
composer.addPass(new OutputPass());

// ================= toon helpers =================
const grad = new THREE.DataTexture(new Uint8Array([95, 95, 95, 255, 175, 175, 175, 255, 255, 255, 255, 255]), 3, 1, THREE.RGBAFormat);
grad.minFilter = grad.magFilter = THREE.NearestFilter; grad.needsUpdate = true;
const toon = c => new THREE.MeshToonMaterial({ color: c, gradientMap: grad });
const outlineMat = t => new THREE.ShaderMaterial({
  side: THREE.BackSide, uniforms: { t: { value: t } },
  vertexShader: 'uniform float t;void main(){gl_Position=projectionMatrix*modelViewMatrix*vec4(position+normal*t,1.);}',
  fragmentShader: 'void main(){gl_FragColor=vec4(.07,.04,.12,1.);}'
});
function mesh(geo, color, { o = 0.02, parent, mat } = {}) {
  const m = new THREE.Mesh(geo, mat || toon(color));
  if (o > 0) m.add(new THREE.Mesh(geo, outlineMat(o)));
  if (parent) parent.add(m); return m;
}
const sphere = r => new THREE.SphereGeometry(r, 32, 24);
const box = (x, y, z) => new THREE.BoxGeometry(x, y, z);
const cyl = (r, h, s = 16) => new THREE.CylinderGeometry(r, r, h, s);
const basic = c => new THREE.MeshBasicMaterial({ color: c });
const ease = x => x < 0 ? 0 : x > 1 ? 1 : 1 - Math.pow(1 - x, 3);
const inout = x => x < 0 ? 0 : x > 1 ? 1 : x * x * (3 - 2 * x);
const back = x => { x = Math.min(Math.max(x, 0), 1); const c1 = 2.2, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
const lerp = (a, b, k) => a + (b - a) * k;

function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
const texPlane = (w, h, tex, parent) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true })); if (parent) parent.add(m); return m; };
const FONT = '"Arial Black","DejaVu Sans",Impact,sans-serif';
function fitText(x, text, w, h, maxSize, color, stroke) {
  let s = maxSize; x.font = `900 ${s}px ${FONT}`;
  while (x.measureText(text).width > w * 0.84 && s > 10) { s -= 4; x.font = `900 ${s}px ${FONT}`; }
  x.textAlign = 'center'; x.textBaseline = 'middle';
  if (stroke) { x.lineWidth = s * 0.14; x.strokeStyle = stroke; x.lineJoin = 'round'; x.strokeText(text, w / 2, h / 2); }
  x.fillStyle = color; x.fillText(text, w / 2, h / 2);
}

scene.add(new THREE.HemisphereLight(0xfff1d6, 0x6a4a7a, 1.1));
const sun = new THREE.DirectionalLight(0xffffff, 2.2); sun.position.set(-3, 6, 5); scene.add(sun);

// ================= stickman =================
const mouthTex = canvasTex(256, 128, (x) => {
  x.fillStyle = '#fff'; x.strokeStyle = '#14101c'; x.lineWidth = 12; x.lineJoin = 'round';
  x.beginPath(); x.roundRect(20, 22, 216, 84, 26); x.fill(); x.stroke();
  x.lineWidth = 7; x.beginPath(); x.moveTo(20, 64); x.lineTo(236, 64);
  for (let i = 1; i < 6; i++) { x.moveTo(20 + i * 36, 22); x.lineTo(20 + i * 36, 106); } x.stroke();
});
const glassesTex = canvasTex(512, 160, (x) => {
  x.strokeStyle = '#14101c'; x.lineWidth = 14; x.fillStyle = 'rgba(160,170,190,.35)';
  for (const cx of [130, 382]) { x.beginPath(); x.roundRect(cx - 105, 25, 210, 110, 18); x.fill(); x.stroke(); }
  x.beginPath(); x.moveTo(235, 70); x.lineTo(277, 70); x.stroke();
});
function makeStick({ body = 0x1c1c24, shoe = 0x5a3320, skin = 0xf4f4fb, hat = null, glasses = false, hatColor = 0xffd23f } = {}) {
  const g = new THREE.Group();
  const torso = mesh(sphere(0.5), body, { parent: g, o: 0.025 }); torso.scale.set(1, 1.25, 0.9); torso.position.y = 1.0;
  const head = new THREE.Group(); head.position.y = 2.0; g.add(head);
  const skull = mesh(sphere(0.62), skin, { parent: head, o: 0.035 }); skull.scale.set(1, 1.04, 0.96);
  const eyes = [];
  for (const s of [-1, 1]) {
    const e = new THREE.Group(); e.position.set(s * 0.22, 0.04, 0.58); e.rotation.y = s * 0.35; head.add(e);
    const eye = new THREE.Mesh(new THREE.CircleGeometry(0.1, 24, PI, PI), basic(0x14101c)); eye.position.y = -0.01; e.add(eye);
    const lid = new THREE.Mesh(new THREE.PlaneGeometry(0.27, 0.045), basic(0x14101c)); lid.position.y = 0.005; lid.rotation.z = s * -0.08; e.add(lid);
    eyes.push(e);
  }
  const mouth = texPlane(0.42, 0.21, mouthTex, head); mouth.position.set(0, -0.27, 0.585);
  if (glasses) { const gl = texPlane(0.62, 0.2, glassesTex, head); gl.position.set(0, 0.02, 0.62); }
  if (hat === 'hard') {
    const dome = mesh(new THREE.SphereGeometry(0.66, 32, 16, 0, 2 * PI, 0, PI / 2), hatColor, { parent: head, o: 0.03 }); dome.position.y = 0.12;
    const brim = mesh(cyl(0.82, 0.05, 32), hatColor, { parent: head, o: 0.02 }); brim.position.set(0, 0.14, 0.08);
  } else if (hat === 'crown') {
    const cr = new THREE.Group(); cr.position.y = 0.5; head.add(cr);
    mesh(new THREE.CylinderGeometry(0.42, 0.4, 0.2, 24, 1, true), 0xf2c230, { parent: cr, o: 0.02, mat: new THREE.MeshToonMaterial({ color: 0xf2c230, gradientMap: grad, side: THREE.DoubleSide }) });
    for (let i = 0; i < 6; i++) {
      const a = i / 6 * 2 * PI, c = mesh(new THREE.ConeGeometry(0.08, 0.26, 8), 0xf2c230, { parent: cr, o: 0.015 });
      c.position.set(Math.sin(a) * 0.41, 0.22, Math.cos(a) * 0.41);
      const b = mesh(sphere(0.045), 0xffe680, { parent: cr, o: 0.01 }); b.position.set(Math.sin(a) * 0.41, 0.37, Math.cos(a) * 0.41);
    }
  }
  const limb = (len, r) => { const p = new THREE.Group(); const m = mesh(cyl(r, len, 10), 0x14101c, { parent: p, o: 0.012 }); m.position.y = -len / 2; return p; };
  const arms = [], legs = [];
  for (const s of [-1, 1]) {
    const a = limb(0.6, 0.045); a.position.set(s * 0.46, 1.25, 0); g.add(a);
    const hand = mesh(sphere(0.1), body, { parent: a, o: 0.02 }); hand.position.y = -0.62; arms.push(a);
    const l = limb(0.75, 0.045); l.position.set(s * 0.2, 0.55, 0); g.add(l);
    const sh = mesh(sphere(0.14), shoe, { parent: l, o: 0.02 }); sh.scale.set(1, 0.7, 1.5); sh.position.set(0, -0.78, 0.07); legs.push(l);
  }
  g.userData = { head, eyes, arms, legs, torso, mouth };
  return g;
}
function idle(h, t, { sway = 1 } = {}) {
  const u = h.userData;
  u.torso.position.y = 1.0 + Math.sin(t * 3.2) * 0.025;
  u.head.position.y = 2.0 + Math.sin(t * 3.2 - 0.4) * 0.03;
  u.head.rotation.z = Math.sin(t * 2.1) * 0.06 * sway; u.head.rotation.y = Math.sin(t * 1.3) * 0.15 * sway;
  const blink = ((t + (h.userData.hid||0) * 0.37) % 2.7) > 2.6 ? 0.12 : 1; u.eyes.forEach(e => e.scale.y = blink);
  u.mouth.scale.y = 1;
}
// keep a held object upright relative to world while arm rotates
function hold(h, obj, arm = 1, { x = 0.05, y = -0.62, z = 0.12, rz = 0 } = {}) {
  const a = h.userData.arms[arm];
  if (obj.parent !== a) a.add(obj);
  obj.position.set(x, y, z);
  obj.rotation.set(-a.rotation.x, 0, -a.rotation.z + rz);
}

// ================= props =================
function chip(text, { w = 1, d = 1, color = 0x23232b, fg = '#e8e8f0', bg = '#2b2b35', glow = null } = {}) {
  const g = new THREE.Group();
  mesh(box(w, 0.12, d), color, { parent: g, o: 0.02 });
  const n = Math.max(4, Math.round(w * 7));
  for (let i = 0; i < n; i++) for (const s of [-1, 1]) {
    const p = mesh(box(0.045, 0.035, 0.1), 0xd5d5df, { parent: g, o: 0 }); p.position.set(-w / 2 + (i + 0.5) * w / n, -0.02, s * (d / 2 + 0.04));
    const q = mesh(box(0.1, 0.035, 0.045), 0xd5d5df, { parent: g, o: 0 }); q.position.set(s * (w / 2 + 0.04), -0.02, -d / 2 + (i + 0.5) * d / n);
  }
  const tex = canvasTex(512, 512, (x, cw, ch) => {
    x.fillStyle = bg; x.fillRect(0, 0, cw, ch);
    x.strokeStyle = 'rgba(255,255,255,.18)'; x.lineWidth = 10; x.strokeRect(24, 24, cw - 48, ch - 48);
    if (glow) { const g2 = x.createRadialGradient(256, 256, 20, 256, 256, 260); g2.addColorStop(0, glow); g2.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g2; x.fillRect(0, 0, cw, ch); }
    fitText(x, text, cw, ch, 200, fg);
  });
  const top = texPlane(w * 0.86, d * 0.86, tex, g); top.rotation.x = -PI / 2; top.position.y = 0.062;
  return g;
}
const sky = (top, bot) => canvasTex(16, 256, (x, w, h) => { const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, top); g.addColorStop(1, bot); x.fillStyle = g; x.fillRect(0, 0, w, h); });

function makeBrick() {
  const p = new THREE.Group();
  mesh(box(0.32, 1.0, 0.2), 0x3a3a44, { parent: p, o: 0.015 });
  const scr = mesh(box(0.24, 0.1, 0.02), 0x9bd37a, { parent: p, o: 0.004 }); scr.position.set(0, 0.3, 0.11);
  for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) { const k = mesh(box(0.065, 0.06, 0.03), 0xe8e0cc, { o: 0.003, parent: p }); k.position.set(-0.09 + c * 0.09, 0.1 - r * 0.09, 0.11); }
  const ant = mesh(cyl(0.018, 0.5, 8), 0x14101c, { parent: p, o: 0.006 }); ant.position.set(0.1, 0.74, 0);
  const tip = mesh(sphere(0.03), 0xd8342e, { parent: p, o: 0.006 }); tip.position.set(0.1, 1.0, 0);
  return p;
}
const snakeTex = canvasTex(128, 160, (x, w, h) => {
  x.fillStyle = '#a8d878'; x.fillRect(0, 0, w, h); x.fillStyle = '#26401a';
  [[2, 3], [3, 3], [4, 3], [5, 3], [5, 4], [5, 5], [6, 5], [7, 5], [7, 6], [7, 7]].forEach(([a, b]) => x.fillRect(a * 12, b * 12 + 10, 11, 11));
  x.fillRect(4 * 12, 8 * 12 + 10, 11, 11); x.font = `900 22px ${FONT}`; x.fillText('0042', 10, 26);
});
function makeCandy() {
  const p = new THREE.Group();
  const b = mesh(box(0.3, 0.78, 0.13), 0x3b5f8a, { parent: p, o: 0.014 });
  const face = mesh(box(0.26, 0.4, 0.02), 0x2a3d57, { parent: p, o: 0 }); face.position.set(0, 0.16, 0.07);
  const s = texPlane(0.2, 0.22, snakeTex, p); s.position.set(0, 0.2, 0.082);
  for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) { const k = mesh(box(0.06, 0.04, 0.03), 0xd9dde6, { o: 0.003, parent: p }); k.position.set(-0.08 + c * 0.08, -0.12 - r * 0.06, 0.07); }
  const st = mesh(cyl(0.025, 0.14, 8), 0x14101c, { parent: p, o: 0.006 }); st.position.set(0.1, 0.45, 0);
  return p;
}
const flipScreenTex = canvasTex(160, 200, (x, w, h) => {
  const g = x.createLinearGradient(0, 0, w, h); g.addColorStop(0, '#ff5fa2'); g.addColorStop(.5, '#7a5cff'); g.addColorStop(1, '#2fd3ff'); x.fillStyle = g; x.fillRect(0, 0, w, h);
  x.fillStyle = '#fff'; x.font = `900 40px ${FONT}`; x.textAlign = 'center'; x.fillText('12:00', w / 2, 70);
  ['#ffd23f', '#5cff8a', '#ff7a3d'].forEach((c, i) => { x.fillStyle = c; x.beginPath(); x.roundRect(18 + i * 46, 120, 36, 36, 8); x.fill(); });
});
function makeFlip() {
  const p = new THREE.Group();
  const bot = mesh(box(0.32, 0.5, 0.06), 0xc8ccd6, { parent: p, o: 0.012 }); bot.position.y = -0.25;
  for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) { const k = mesh(box(0.07, 0.05, 0.02), 0x5a6070, { o: 0.003, parent: p }); k.position.set(-0.09 + c * 0.09, -0.12 - r * 0.08, 0.035); }
  const lid = new THREE.Group(); p.add(lid);
  const top = mesh(box(0.32, 0.5, 0.06), 0xc8ccd6, { parent: lid, o: 0.012 }); top.position.y = 0.25;
  const scr = texPlane(0.24, 0.32, flipScreenTex, lid); scr.position.set(0, 0.27, 0.031);
  const lens = mesh(cyl(0.04, 0.02, 16), 0x14101c, { parent: lid, o: 0.006 }); lens.rotation.x = PI / 2; lens.position.set(0.09, 0.4, -0.035);
  p.userData.lid = lid; return p;
}
const appGridTex = (dark = '#0d0f16') => canvasTex(256, 512, (x, w, h) => {
  const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#1b2a6b'); g.addColorStop(1, dark); x.fillStyle = g; x.fillRect(0, 0, w, h);
  const cols = ['#ff5f57', '#ffbd2e', '#28c840', '#2f9bff', '#b05cff', '#ff7ac6', '#43e0d0', '#ff9a3d'];
  for (let r = 0; r < 5; r++) for (let c = 0; c < 4; c++) { x.fillStyle = cols[(r * 4 + c) % 8]; x.beginPath(); x.roundRect(22 + c * 56, 60 + r * 70, 42, 42, 11); x.fill(); }
  x.fillStyle = '#fff'; x.font = `900 26px ${FONT}`; x.textAlign = 'center'; x.fillText('12:00', w / 2, 34);
});
function makeSlab() {
  const p = new THREE.Group();
  mesh(box(0.5, 0.96, 0.06), 0x1a1a1f, { parent: p, o: 0.014 });
  const s = texPlane(0.42, 0.74, appGridTex(), p); s.position.z = 0.031;
  const btn = mesh(cyl(0.035, 0.01, 16), 0x3a3a44, { parent: p, o: 0.004 }); btn.rotation.x = PI / 2; btn.position.set(0, -0.42, 0.031);
  return p;
}
const modernTex = canvasTex(256, 540, (x, w, h) => {
  const g = x.createLinearGradient(0, 0, w, h); g.addColorStop(0, '#ff3d7f'); g.addColorStop(.5, '#7a2cff'); g.addColorStop(1, '#00c2ff'); x.fillStyle = g; x.fillRect(0, 0, w, h);
  x.fillStyle = '#fff'; x.font = `900 64px ${FONT}`; x.textAlign = 'center'; x.fillText('12:00', w / 2, 130);
  x.fillStyle = '#000'; x.beginPath(); x.roundRect(w / 2 - 34, 14, 68, 18, 9); x.fill();
});
function makeModern() {
  const p = new THREE.Group();
  mesh(box(0.5, 1.04, 0.05), 0x2b2d36, { parent: p, o: 0.014 });
  const s = texPlane(0.47, 1.0, modernTex, p); s.position.z = 0.026;
  const bump = mesh(box(0.22, 0.22, 0.03), 0x2b2d36, { parent: p, o: 0.008 }); bump.position.set(-0.1, 0.35, -0.04);
  [[-0.15, 0.4], [-0.05, 0.4], [-0.1, 0.3]].forEach(([a, b]) => { const l = mesh(cyl(0.035, 0.03, 16), 0x0b0b10, { parent: p, o: 0.005 }); l.rotation.x = PI / 2; l.position.set(a, b, -0.06); });
  return p;
}

// ================= scenes =================
const SCENES = [];
function addScene(def) { const g = new THREE.Group(); g.visible = false; scene.add(g); def.root = g; def.build(g); SCENES.push(def); }
let heroId = 0;
const hero = (opts, parent) => { const h = makeStick(opts); h.userData.hid = heroId++; parent.add(h); return h; };
const wordT = (si, word) => { const w = TIMING.scenes[si].words.find(o => o.w.toLowerCase().replace(/[^a-z0-9]/g, '') === word); return w ? w.s - TIMING.scenes[si].start : 0; };

// ---- 1: 1970s workshop ----
addScene({
  bg: 0x8a5a2a, fog: [0x8a5a2a, 14, 40],
  build(g) {
    const wall = mesh(new THREE.PlaneGeometry(30, 16), 0xe0a63a, { o: 0, parent: g }); wall.position.set(0, 5, -5);
    const floor = mesh(new THREE.PlaneGeometry(30, 30), 0xb85a2e, { o: 0, parent: g }); floor.rotation.x = -PI / 2;
    for (let i = -8; i <= 8; i++) { const s = mesh(box(0.08, 16, 0.05), 0xb47a24, { o: 0, parent: g }); s.position.set(i * 1.2, 5, -4.95); }
    const peg = mesh(box(5, 3, 0.1), 0x8a5a3a, { parent: g }); peg.position.set(2.6, 3.4, -4.8);
    for (let i = 0; i < 5; i++) { const tl = mesh(box(0.12, 0.9 + i * 0.1, 0.08), [0xc9c9d4, 0xd8342e, 0x2f6fb0, 0xe8e0cc, 0x3a3a44][i], { parent: g, o: 0.012 }); tl.position.set(0.9 + i * 0.9, 3.5, -4.7); }
    const clock = mesh(cyl(0.6, 0.1, 28), 0xf1e6c8, { parent: g }); clock.rotation.x = PI / 2; clock.position.set(-2.4, 4.2, -4.8);
    const bench = mesh(box(5.2, 0.25, 1.6), 0x7a4a28, { parent: g }); bench.position.set(0.9, 1.2, -2.8);
    for (const x of [-1.6, 3.4]) for (const z of [-3.4, -2.2]) { const l = mesh(box(0.2, 1.15, 0.2), 0x5e3a20, { parent: g }); l.position.set(x - 0.4, 0.6, z); }
    const pcb = mesh(box(1.6, 0.06, 1.1), 0x1f7a3c, { parent: g }); pcb.position.set(1.7, 1.36, -2.7);
    for (let i = 0; i < 6; i++) { const c = chip('', { w: 0.3, d: 0.18 }); c.position.set(1.2 + (i % 3) * 0.45, 1.43, -3.0 + Math.floor(i / 3) * 0.35); g.add(c); }
    this.h = hero({}, g); this.h.position.set(0.1, 0, 0.6);
    this.phone = makeBrick();
  },
  update(t) {
    const h = this.h, u = h.userData; idle(h, t);
    const lift = ease((t - 2.0) / 0.8) - ease((t - 4.6) / 0.8) * 0.6;
    u.arms[1].rotation.set(-0.6 - lift * 1.1, 0, 0.25 + lift * 0.2);
    u.arms[0].rotation.set(0, 0, -0.35 + Math.sin(t * 3.2) * 0.05);
    hold(h, this.phone, 1, { x: 0.08, y: -0.2, z: 0.18, rz: -0.12 });
    const k = ease(t / 8);
    camera.position.set(0.3 + k * 0.2, 2.1 + k * 0.1, 13 - k * 3.0); camera.lookAt(0.65, 1.45, 0); camera.rotateZ(0.02 + 0.02 * Math.sin(t * 0.6));
    return camera.position.distanceTo(h.position) - 0.3;
  }
});

// ---- 2: 1990s bedroom, ARM chip ----
addScene({
  bg: 0x2a8f88, fog: [0x2a8f88, 14, 40],
  build(g) {
    const wall = mesh(new THREE.PlaneGeometry(30, 16), 0x2bb5a8, { o: 0, parent: g }); wall.position.set(0, 5, -5);
    const floor = mesh(new THREE.PlaneGeometry(30, 30), 0x6b4fa0, { o: 0, parent: g }); floor.rotation.x = -PI / 2;
    const rnd = (() => { let s = 7; return () => (s = (s * 9301 + 49297) % 233280) / 233280; })();
    for (let i = 0; i < 26; i++) {
      const sq = mesh(box(0.7, 0.12, 0.04), [0xffd23f, 0xff5fa2, 0x6b4fa0, 0xffffff][i % 4], { parent: g, o: 0 });
      sq.position.set(-6 + rnd() * 12, 1.5 + rnd() * 7, -4.95); sq.rotation.z = rnd() * PI;
    }
    // CRT TV
    const tv = mesh(box(1.6, 1.3, 1.2), 0x8d8a92, { parent: g }); tv.position.set(-2.2, 1.65, -3.6);
    const bars = canvasTex(256, 192, (x, w, h) => { ['#fff', '#ff0', '#0ff', '#0f0', '#f0f', '#f00', '#00f'].forEach((c, i) => { x.fillStyle = c; x.fillRect(i * w / 7, 0, w / 7 + 1, h); }); });
    const scr = texPlane(1.2, 0.9, bars, g); scr.position.set(-2.2, 1.7, -2.99);
    const stand = mesh(box(1.8, 1.0, 1.2), 0x4a3570, { parent: g }); stand.position.set(-2.2, 0.5, -3.6);
    this.h = hero({ body: 0x2a2a6e }, g); this.h.position.set(-0.2, 0, 0.5);
    this.phone = makeCandy();
    this.chip = chip('ARM', { w: 1.1, d: 1.1, bg: '#203040', fg: '#7af0ff' }); this.chip.position.set(1.5, 2.6, -0.3); g.add(this.chip);
  },
  update(t) {
    const h = this.h, u = h.userData; idle(h, t);
    u.arms[1].rotation.set(-1.45, 0, 0.35);
    u.arms[0].rotation.set(0, 0, -0.3 + Math.sin(t * 3) * 0.05);
    u.head.rotation.y += -0.25;
    hold(h, this.phone, 1, { x: 0.05, y: -0.3, z: 0.15, rz: -0.25 });
    const pop = back((t - wordT(1, 'arm') + 0.15) / 0.5);
    this.chip.scale.setScalar(Math.max(0.001, pop));
    this.chip.rotation.set(1.15 + Math.sin(t * 1.5) * 0.1, Math.sin(t * 0.9) * 0.3, 0);
    this.chip.position.y = 2.6 + Math.sin(t * 2) * 0.08;
    const k = inout(t / 7);
    camera.position.set(lerp(-1.2, 1.6, k), 2.2, lerp(10, 8.8, k)); camera.lookAt(0.6, 1.7, 0); camera.rotateZ(-0.03);
    return camera.position.distanceTo(h.position);
  }
});

// ---- 3: 2000s flip phone, features pop ----
addScene({
  bg: 0x3d7be0, fog: [0x8fbaf5, 14, 40],
  build(g) {
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(40, 20), new THREE.MeshBasicMaterial({ map: sky('#2e6ee0', '#a9d0ff') })); wall.position.set(0, 6, -6); g.add(wall);
    const floor = mesh(new THREE.PlaneGeometry(30, 30), 0xe9f0fb, { o: 0, parent: g }); floor.rotation.x = -PI / 2;
    for (let i = -10; i <= 10; i++) {
      const a = mesh(box(0.03, 0.005, 30), 0xb7c6e0, { o: 0, parent: g }); a.position.set(i * 1.2, 0.01, 0);
      const b = mesh(box(30, 0.005, 0.03), 0xb7c6e0, { o: 0, parent: g }); b.position.set(0, 0.01, i * 1.2);
    }
    for (const [x, y, s] of [[-3, 6, 1.4], [3.5, 7.5, 1.1], [0.5, 9, 1.2]]) {
      const c = new THREE.Group(); c.position.set(x, y, -5.5); g.add(c);
      [[0, 0, 0.6], [0.6, 0.1, 0.45], [-0.6, -0.05, 0.45]].forEach(([a, b, r]) => mesh(sphere(r * s), 0xffffff, { parent: c, o: 0 }).position.set(a * s, b * s, 0));
    }
    this.h = hero({ body: 0xd8342e }, g); this.h.position.set(0.15, 0, 0.5);
    this.phone = makeFlip();
    // feature icons
    const cam = new THREE.Group(); mesh(box(0.7, 0.48, 0.3), 0x2b2d36, { parent: cam }); const l = mesh(cyl(0.16, 0.2, 24), 0x7ad0ff, { parent: cam, o: 0.02 }); l.rotation.x = PI / 2; l.position.z = 0.2;
    const note = new THREE.Group(); const hd = mesh(sphere(0.16), 0xffd23f, { parent: note }); hd.scale.set(1.3, 1, 1); const st = mesh(cyl(0.035, 0.75), 0xffd23f, { parent: note }); st.position.set(0.18, 0.37, 0); const fl = mesh(box(0.28, 0.12, 0.05), 0xffd23f, { parent: note }); fl.position.set(0.3, 0.68, 0);
    const color = new THREE.Group(); [0xff5fa2, 0x5cff8a, 0x2fd3ff, 0xffd23f].forEach((c, i) => mesh(box(0.28, 0.28, 0.28), c, { parent: color }).position.set((i % 2) * 0.34 - 0.17, Math.floor(i / 2) * 0.34 - 0.17, 0));
    this.icons = [[color, 'color', [1.55, 3.2, 0]], [cam, 'cameras', [1.9, 2.25, 0]], [note, 'music', [1.6, 1.25, 0.3]]];
    this.icons.forEach(([o, , p]) => { o.position.set(...p); g.add(o); });
  },
  update(t) {
    const h = this.h, u = h.userData; idle(h, t);
    u.arms[1].rotation.set(-1.0, 0, 0.3);
    u.arms[0].rotation.set(-0.4, 0, -0.25);
    hold(h, this.phone, 1, { x: 0.05, y: -0.3, z: 0.2, rz: -0.15 });
    this.phone.userData.lid.rotation.x = lerp(PI * 0.96, 0.15, back((t - 0.6) / 0.45));
    this.icons.forEach(([o, w], i) => { const k = back((t - wordT(2, w) + 0.1) / 0.4); o.scale.setScalar(Math.max(0.001, k)); o.rotation.y = Math.sin(t * 2 + i) * 0.4; o.rotation.x = 0.2; o.position.y += Math.sin(t * 3 + i) * 0.003; });
    u.head.rotation.y += 0.3;
    const k = ease(t / 7);
    camera.position.set(lerp(0.4, 1.0, k), lerp(1.7, 2.0, k), lerp(10, 8.8, k)); camera.lookAt(0.8, 1.85, 0); camera.rotateZ(0.04);
    return camera.position.distanceTo(h.position);
  }
});

// ---- 4: 2007 touchscreen, lab with servers ----
addScene({
  bg: 0xdfe6f0, fog: [0xdfe6f0, 12, 40],
  build(g) {
    const wall = mesh(new THREE.PlaneGeometry(30, 16), 0xe8eef6, { o: 0, parent: g }); wall.position.set(0, 5, -6);
    const floor = mesh(new THREE.PlaneGeometry(30, 30), 0xcfd8e6, { o: 0, parent: g }); floor.rotation.x = -PI / 2;
    const stripe = mesh(box(30, 0.12, 0.05), 0xffc928, { o: 0, parent: g }); stripe.position.set(0, 4.2, -5.9);
    for (let i = -4; i <= 4; i++) {
      const r = mesh(box(1.1, 3.2, 0.9), 0x223a6b, { parent: g, o: 0.02 }); r.position.set(i * 1.25, 1.6, -5);
      for (let j = 0; j < 8; j++) { const led = new THREE.Mesh(box(0.7, 0.06, 0.02), basic(j % 3 ? 0x5ab0ff : 0x9cff7a)); led.position.set(i * 1.25, 0.4 + j * 0.36, -4.54); g.add(led); }
    }
    this.h = hero({ body: 0x2456b8, skin: 0xf4f4fb }, g); this.h.position.set(-0.6, 0, 0.4);
    this.slab = makeSlab(); this.slab.scale.setScalar(2.4); this.slab.position.set(0.95, 1.85, 0.2); g.add(this.slab);
    this.chip = chip('CPU', { w: 0.8, d: 0.8, bg: '#2a2a35', fg: '#ffc928' }); this.chip.position.set(0.15, 3.75, -0.6); g.add(this.chip);
  },
  update(t) {
    const h = this.h, u = h.userData; idle(h, t);
    const tap = Math.max(0, Math.sin(t * 5)) * (t > 1.2 ? 1 : 0);
    u.arms[1].rotation.set(-0.3, 0, 1.25 + tap * 0.12);
    u.arms[0].rotation.set(0, 0, -0.3);
    u.head.rotation.y += 0.5;
    this.slab.rotation.set(0, -0.35 + Math.sin(t) * 0.05, 0.03);
    const pop = back((t - wordT(3, 'chips') + 0.1) / 0.45);
    this.chip.scale.setScalar(Math.max(0.001, pop)); this.chip.rotation.set(1.2, t * 0.8, 0);
    const k = inout(t / 7.5);
    camera.position.set(lerp(1.8, -0.4, k), lerp(2.6, 2.1, k), lerp(9.5, 9.0, k)); camera.lookAt(0.15, 2.0, 0); camera.rotateZ(-0.02);
    return camera.position.distanceTo(new THREE.Vector3(0, 1.5, 0.3));
  }
});

// ---- 5: core wars ----
addScene({
  bg: 0x1a1240, fog: [0x1a1240, 10, 34],
  build(g) {
    const floor = mesh(new THREE.PlaneGeometry(40, 40), 0x2a1f5e, { o: 0, parent: g }); floor.rotation.x = -PI / 2;
    for (let i = -12; i <= 12; i++) {
      const a = new THREE.Mesh(box(0.04, 0.01, 40), basic(0x5236b0)); a.position.set(i * 1.5, 0.01, 0); g.add(a);
      const b = new THREE.Mesh(box(40, 0.01, 0.04), basic(0x5236b0)); b.position.set(0, 0.01, i * 1.5); g.add(b);
    }
    const big = chip('', { w: 3.4, d: 3.4, bg: '#1c1c26' }); big.scale.y = 2; g.add(big); big.position.set(0.6, 0.12, -1.2);
    this.cores = [];
    for (let i = 0; i < 8; i++) {
      const m = new THREE.Mesh(box(0.62, 0.08, 0.62), new THREE.MeshBasicMaterial({ color: 0x2b2b3a }));
      m.add(new THREE.Mesh(m.geometry, outlineMat(0.015)));
      m.position.set(0.6 + ((i % 4) - 1.5) * 0.74, 0.3, -1.2 + (Math.floor(i / 4) - 0.5) * 0.9); g.add(m); this.cores.push(m);
    }
    this.h = hero({ body: 0x1c1c24, hat: 'hard' }, g); this.h.position.set(-0.5, 0.24, 0.05);
    this.order = [0, 4, 1, 5, 2, 6, 3, 7];
  },
  update(t) {
    const h = this.h, u = h.userData; idle(h, t);
    u.arms[1].rotation.set(-0.2, 0, 1.6 + Math.sin(t * 6) * 0.05);
    u.arms[0].rotation.set(0, 0, -0.4);
    u.head.rotation.y += 0.4;
    const t2 = wordT(4, 'two'), t4 = wordT(4, 'four'), t8 = wordT(4, 'eight');
    const n = t >= t8 ? 8 : t >= t4 ? 4 : t >= t2 ? 2 : 1;
    const cols = [0xb6ff3d, 0x3dfff0, 0xffd23f, 0xff5fa2];
    this.cores.forEach((m, i) => {
      const rank = this.order.indexOf(i), on = rank < n;
      const at = rank < 1 ? 0 : rank < 2 ? t2 : rank < 4 ? t4 : t8;
      m.material.color.setHex(on ? cols[Math.floor(rank / 2) % 4] : 0x2b2b3a);
      const p = on ? back((t - at) / 0.3) : 0; m.scale.set(1, 1 + 3 * (1 - p) * (on ? 1 : 0) + (on ? 0.6 + 0.3 * Math.sin(t * 8 + i) : 0), 1);
    });
    this.badge = n;
    const k = inout(t / 8);
    const ang = lerp(-0.5, 0.5, k);
    camera.position.set(0.3 + Math.sin(ang) * 8.5, lerp(6.0, 4.5, k), -0.6 + Math.cos(ang) * 8.5); camera.lookAt(0.0, 0.9, -0.5);
    return camera.position.distanceTo(new THREE.Vector3(0, 0.5, -0.5));
  }
});

// ---- 6: today, throne of chips ----
addScene({
  bg: 0x0d1418, fog: [0x0d1418, 12, 36],
  build(g) {
    const floor = mesh(new THREE.PlaneGeometry(40, 40), 0x1b5e2a, { o: 0, parent: g }); floor.rotation.x = -PI / 2;
    const wall = mesh(new THREE.PlaneGeometry(40, 20), 0x22303a, { o: 0, parent: g }); wall.position.set(0, 8, -7);
    const th = new THREE.Group(); g.add(th); th.position.set(0, 0, -1.6);
    const tier = (w, h, d, y, z) => {
      const b = mesh(box(w, h, d), 0x26333a, { parent: th, o: 0.03 }); b.position.set(0, y, z);
      const s = new THREE.Mesh(box(w + 0.02, 0.12, d + 0.02), basic(0xb6e01e)); s.position.set(0, y + h / 2 - 0.2, z); th.add(s);
      for (let i = 0; i < Math.round(w / 1.3); i++) {
        const fx = -w / 2 + 0.65 + i * 1.3;
        const fan = mesh(cyl(0.45, 0.06, 28), 0x1a2a28, { parent: th, o: 0.02 }); fan.rotation.x = PI / 2; fan.position.set(fx, y - 0.1, z + d / 2 + 0.03);
        const hub = new THREE.Mesh(cyl(0.18, 0.08, 20), basic(0xb6e01e)); hub.rotation.x = PI / 2; hub.position.set(fx, y - 0.1, z + d / 2 + 0.06); th.add(hub);
      }
    };
    tier(6.5, 1.2, 2.6, 0.6, 0.3); tier(5.2, 1.4, 1.2, 1.9, -0.6); tier(4.4, 1.4, 1.0, 3.3, -0.9); tier(3.4, 1.4, 1.0, 4.7, -1.1);
    const armL = mesh(box(0.8, 1.0, 2.4), 0x26333a, { parent: th, o: 0.03 }); armL.position.set(-2.2, 1.6, 0.6);
    const armR = armL.clone(); armR.position.x = 2.2; th.add(armR);
    this.h = hero({ body: 0x1c1c24, hat: 'crown', glasses: true }, g); this.h.position.set(0, 0.55, -0.2);
    this.soc = chip('AI', { w: 1.2, d: 1.2, bg: '#0f1a12', fg: '#c6ff3d', glow: 'rgba(182,224,30,.55)' }); this.soc.position.set(-0.85, 3.35, 1.2); g.add(this.soc);
    this.sparks = [];
    for (let i = 0; i < 18; i++) { const s = new THREE.Mesh(box(0.06, 0.06, 0.06), basic(i % 2 ? 0xc6ff3d : 0xffffff)); g.add(s); this.sparks.push(s); }
    this.phone = makeModern();
  },
  update(t) {
    const h = this.h, u = h.userData; idle(h, t, { sway: 0.6 });
    u.legs.forEach((l, i) => l.rotation.x = -0.35 + Math.sin(t * 2 + i * 1.5) * 0.08);
    u.arms[0].rotation.set(0, 0, -1.1);
    u.arms[1].rotation.set(-0.9, 0, 0.5);
    hold(h, this.phone, 1, { x: 0.05, y: -0.25, z: 0.15, rz: -0.3 });
    const pop = back((t - wordT(5, 'ai') + 0.2) / 0.5);
    this.soc.scale.setScalar(Math.max(0.001, pop) * (1 + 0.05 * Math.sin(t * 7)));
    this.soc.rotation.set(1.2, Math.sin(t) * 0.3, 0.1);
    this.sparks.forEach((s, i) => { const a = t * 1.5 + i / 18 * 2 * PI, r = 0.9 + 0.2 * Math.sin(t * 3 + i); s.position.set(-0.85 + Math.cos(a) * r, 3.35 + Math.sin(a * 2) * 0.3, 1.2 + Math.sin(a) * r); s.rotation.set(t * 2, t * 3, 0); s.visible = pop > 0.5; });
    const k = ease(t / 8);
    camera.position.set(lerp(1.2, 0.4, k), lerp(1.5, 2.4, k), lerp(10.5, 8.6, k)); camera.lookAt(-0.1, 2.4, 0); camera.rotateZ(-0.05);
    return camera.position.distanceTo(new THREE.Vector3(0, 2.5, 0));
  }
});

// ---- 7: outro, evolution lineup ----
addScene({
  bg: 0xffb36b, fog: [0xffc58a, 12, 40],
  build(g) {
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(50, 20), new THREE.MeshBasicMaterial({ map: sky('#ff7a59', '#ffd08a') })); wall.position.set(0, 6, -6); g.add(wall);
    const floor = mesh(new THREE.PlaneGeometry(50, 30), 0xf2a65a, { o: 0, parent: g }); floor.rotation.x = -PI / 2;
    this.phones = [makeBrick(), makeCandy(), makeFlip(), makeSlab(), makeModern()];
    this.phones.forEach((p, i) => {
      const x = -4 + i * 2; const ped = mesh(cyl(0.55, 1.0, 28), 0xfff1de, { parent: g, o: 0.025 }); ped.position.set(x, 0.5, 0);
      p.scale.setScalar(1.4); p.position.set(x, 1.85, 0); g.add(p);
      if (p.userData.lid) p.userData.lid.rotation.x = 0.15;
    });
    this.h = hero({ body: 0x1c1c24, hat: 'crown' }, g); this.h.position.set(5.6, 0, 0.6);
  },
  update(t) {
    const h = this.h, u = h.userData; idle(h, t);
    u.arms[1].rotation.set(0, 0, 2.6 + Math.sin(t * 9) * 0.35);
    u.arms[0].rotation.set(0, 0, -0.35); u.head.rotation.y -= 0.4;
    this.phones.forEach((p, i) => { p.rotation.y = Math.sin(t * 1.5 + i) * 0.35; p.position.y = 1.85 + Math.sin(t * 2.5 + i) * 0.05; });
    const k = inout(t / 5.2);
    camera.position.set(lerp(-4.5, 4.4, k), 2.2, lerp(6.8, 8.0, k)); camera.lookAt(lerp(-3.8, 4.6, k), 1.6, 0); camera.rotateZ(0.03);
    return 6;
  }
});

// ================= overlays =================
const capEl = document.getElementById('cap'), yearEl = document.getElementById('year'), flashEl = document.getElementById('flash'), badgeEl = document.getElementById('badge');
const ALLWORDS = TIMING.scenes.flatMap(s => s.words);
function caption(t, si) {
  const words = TIMING.scenes[si].words; let cur = null;
  for (const w of words) if (t >= w.s) cur = w;
  const end = TIMING.scenes[si].start + TIMING.scenes[si].dur - 0.25;
  if (!cur || t > end) { capEl.style.opacity = 0; return; }
  capEl.textContent = cur.w; capEl.style.opacity = 1;
  const big = /[!]|\.\.\./.test(cur.w) || /^(bricks|brain|ai|eight|pocket|supercomputers)/i.test(cur.w);
  capEl.style.color = big ? '#ffd23f' : '#fff';
  capEl.style.transform = `scale(${(0.6 + 0.4 * back((t - cur.s) / 0.16)) * (big ? 1.12 : 1)})`;
}

window.renderFrame = (t) => {
  let si = TIMING.scenes.findIndex(s => t >= s.start && t < s.start + s.dur); if (si < 0) si = SCENES.length - 1;
  const S = SCENES[si], T = TIMING.scenes[si], lt = t - T.start;
  SCENES.forEach((s, i) => s.root.visible = i === si);
  scene.background = new THREE.Color(S.bg); scene.fog = new THREE.Fog(...S.fog);
  camera.fov = 32;
  const focus = S.update(lt);
  // punch-in at scene start
  camera.fov = 32 * (1 + 0.12 * (1 - ease(lt / 0.35))); camera.updateProjectionMatrix();
  bokeh.uniforms.focus.value = focus; bokeh.uniforms.aperture.value = 0.0011; bokeh.uniforms.maxblur.value = 0.009;
  // overlays
  const toEnd = T.dur - lt;
  flashEl.style.opacity = Math.max(0, 1 - lt / 0.18, toEnd < 0.08 ? 1 - toEnd / 0.08 : 0) * (si === 0 && lt < 0.18 ? 0 : 0.85);
  yearEl.textContent = T.year; yearEl.style.opacity = T.year && toEnd > 0.2 ? 1 : 0;
  yearEl.style.transform = `translateX(${(1 - ease((lt - 0.1) / 0.4)) * -600}px) rotate(-4deg) scale(${0.9 + 0.1 * back((lt - 0.1) / 0.4)})`;
  if (si === 4 && S.badge) { badgeEl.style.opacity = 1; badgeEl.textContent = `×${S.badge} CORE${S.badge > 1 ? 'S' : ''}`; const at = [0, wordT(4, 'two'), wordT(4, 'four'), wordT(4, 'eight')][[1, 2, 4, 8].indexOf(S.badge)]; badgeEl.style.transform = `scale(${0.5 + 0.5 * back((lt - at) / 0.25)}) rotate(3deg)`; }
  else badgeEl.style.opacity = 0;
  caption(t, si);
  composer.render();
};
window.TOTAL = TIMING.total;
window.ready = true;
