// Shared toon renderer + stickman (egg head, stick limbs, thick outlines, cel shading, depth of field)
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
export { THREE };

export const W = 1080, H = 1920, PI = Math.PI;
export const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setSize(W, H); renderer.setPixelRatio(1);
document.getElementById('stage').prepend(renderer.domElement);
export const scene = new THREE.Scene();
export const camera = new THREE.PerspectiveCamera(32, W / H, 0.1, 160);
const rt = new THREE.WebGLRenderTarget(W, H, { samples: 4, type: THREE.HalfFloatType });
export const composer = new EffectComposer(renderer, rt);
composer.addPass(new RenderPass(scene, camera));
export const bokeh = new BokehPass(scene, camera, { focus: 9, aperture: 0.0012, maxblur: 0.008 });
composer.addPass(bokeh);
composer.addPass(new OutputPass());

// ---------- toon helpers ----------
const grad = new THREE.DataTexture(new Uint8Array([95, 95, 95, 255, 175, 175, 175, 255, 255, 255, 255, 255]), 3, 1, THREE.RGBAFormat);
grad.minFilter = grad.magFilter = THREE.NearestFilter; grad.needsUpdate = true;
export const toon = (c, side) => new THREE.MeshToonMaterial({ color: c, gradientMap: grad, side });
export const outlineMat = t => new THREE.ShaderMaterial({
  side: THREE.BackSide, uniforms: { t: { value: t } },
  vertexShader: 'uniform float t;void main(){gl_Position=projectionMatrix*modelViewMatrix*vec4(position+normal*t,1.);}',
  fragmentShader: 'void main(){gl_FragColor=vec4(.07,.04,.12,1.);}'
});
export function mesh(geo, color, { o = 0.02, parent, mat } = {}) {
  const m = new THREE.Mesh(geo, mat || toon(color));
  if (o > 0) m.add(new THREE.Mesh(geo, outlineMat(o)));
  if (parent) parent.add(m); return m;
}
export const sphere = r => new THREE.SphereGeometry(r, 32, 24);
export const box = (x, y, z) => new THREE.BoxGeometry(x, y, z);
export const cyl = (r, h, s = 16) => new THREE.CylinderGeometry(r, r, h, s);
export const basic = c => new THREE.MeshBasicMaterial({ color: c });
export const ease = x => x < 0 ? 0 : x > 1 ? 1 : 1 - Math.pow(1 - x, 3);
export const inout = x => x < 0 ? 0 : x > 1 ? 1 : x * x * (3 - 2 * x);
export const back = x => { x = Math.min(Math.max(x, 0), 1); const c1 = 2.2, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
export const lerp = (a, b, k) => a + (b - a) * k;
export const clamp01 = x => Math.min(Math.max(x, 0), 1);

export function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
export const texPlane = (w, h, tex, parent) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true })); if (parent) parent.add(m); return m; };
export const FONT = '"Arial Black","DejaVu Sans",Impact,sans-serif';
export function fitText(x, text, w, h, maxSize, color, stroke) {
  let s = maxSize; x.font = `900 ${s}px ${FONT}`;
  while (x.measureText(text).width > w * 0.84 && s > 10) { s -= 4; x.font = `900 ${s}px ${FONT}`; }
  x.textAlign = 'center'; x.textBaseline = 'middle';
  if (stroke) { x.lineWidth = s * 0.14; x.strokeStyle = stroke; x.lineJoin = 'round'; x.strokeText(text, w / 2, h / 2); }
  x.fillStyle = color; x.fillText(text, w / 2, h / 2);
}
export const sky = (top, bot) => canvasTex(16, 256, (x, w, h) => { const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, top); g.addColorStop(1, bot); x.fillStyle = g; x.fillRect(0, 0, w, h); });

export const hemi = new THREE.HemisphereLight(0xfff1d6, 0x6a4a7a, 1.1); scene.add(hemi);
export const sun = new THREE.DirectionalLight(0xffffff, 2.2); sun.position.set(-3, 6, 5); scene.add(sun);

// ---------- faces ----------
const ink = '#14101c';
const mouths = {
  grin: canvasTex(256, 128, (x) => {
    x.fillStyle = '#fff'; x.strokeStyle = ink; x.lineWidth = 12; x.lineJoin = 'round';
    x.beginPath(); x.roundRect(20, 22, 216, 84, 26); x.fill(); x.stroke();
    x.lineWidth = 7; x.beginPath(); x.moveTo(20, 64); x.lineTo(236, 64);
    for (let i = 1; i < 6; i++) { x.moveTo(20 + i * 36, 22); x.lineTo(20 + i * 36, 106); } x.stroke();
  }),
  flat: canvasTex(256, 128, (x) => { x.strokeStyle = ink; x.lineWidth = 14; x.lineCap = 'round'; x.beginPath(); x.moveTo(60, 70); x.quadraticCurveTo(128, 56, 196, 74); x.stroke(); }),
  frown: canvasTex(256, 128, (x) => { x.strokeStyle = ink; x.lineWidth = 14; x.lineCap = 'round'; x.beginPath(); x.moveTo(60, 86); x.quadraticCurveTo(128, 40, 196, 86); x.stroke(); }),
  smile: canvasTex(256, 128, (x) => { x.strokeStyle = ink; x.lineWidth = 14; x.lineCap = 'round'; x.beginPath(); x.moveTo(52, 52); x.quadraticCurveTo(128, 120, 204, 52); x.stroke(); }),
  open: canvasTex(256, 128, (x) => {
    x.fillStyle = '#2a1018'; x.strokeStyle = ink; x.lineWidth = 12; x.beginPath(); x.ellipse(128, 66, 46, 44, 0, 0, 2 * PI); x.fill(); x.stroke();
    x.fillStyle = '#fff'; x.beginPath(); x.roundRect(98, 26, 60, 18, 6); x.fill();
  }),
};
const glassesTex = canvasTex(512, 160, (x) => {
  x.strokeStyle = ink; x.lineWidth = 14; x.fillStyle = 'rgba(160,170,190,.35)';
  for (const cx of [130, 382]) { x.beginPath(); x.roundRect(cx - 105, 25, 210, 110, 18); x.fill(); x.stroke(); }
  x.beginPath(); x.moveTo(235, 70); x.lineTo(277, 70); x.stroke();
});
const mustacheTex = canvasTex(256, 128, (x) => {
  x.fillStyle = ink; x.beginPath(); x.moveTo(128, 40);
  x.bezierCurveTo(100, 14, 40, 20, 14, 70); x.bezierCurveTo(48, 62, 90, 74, 128, 96);
  x.bezierCurveTo(166, 74, 208, 62, 242, 70); x.bezierCurveTo(216, 20, 156, 14, 128, 40); x.fill();
  x.strokeStyle = '#3a3340'; x.lineWidth = 4; for (let i = 0; i < 6; i++) { x.beginPath(); x.moveTo(40 + i * 28, 56); x.lineTo(46 + i * 26, 78); x.stroke(); }
});
export function setMouth(h, kind) { const m = h.userData.mouth; if (m.userData.kind !== kind) { m.material.map = mouths[kind]; m.material.needsUpdate = true; m.userData.kind = kind; } }

// ---------- stickman ----------
export function makeStick({ body = 0x1c1c24, shoe = 0x5a3320, skin = 0xf4f4fb, glasses = false, mustache = false, tie = null, hat = null, hatColor = 0xf3f1e8, wrap = false, armWrap = false, belly = 1 } = {}) {
  const g = new THREE.Group();
  const torso = mesh(sphere(0.5), body, { parent: g, o: 0.025 }); torso.scale.set(belly, 1.25, 0.9 * (belly > 1 ? 1.15 : 1)); torso.position.y = 1.0;
  if (tie) { const t = mesh(box(0.12, 0.5, 0.03), tie, { parent: g, o: 0.012 }); t.position.set(0, 1.2, 0.44); t.rotation.x = -0.12; }
  const head = new THREE.Group(); head.position.y = 2.0; g.add(head);
  const skull = mesh(sphere(0.62), skin, { parent: head, o: 0.035 }); skull.scale.set(1, 1.04, 0.96);
  const eyes = [];
  for (const s of [-1, 1]) {
    const e = new THREE.Group(); e.position.set(s * 0.22, 0.04, 0.58); e.rotation.y = s * 0.35; head.add(e);
    const eye = new THREE.Mesh(new THREE.CircleGeometry(0.1, 24, PI, PI), basic(0x14101c)); eye.position.y = -0.01; e.add(eye);
    const lid = new THREE.Mesh(new THREE.PlaneGeometry(0.27, 0.045), basic(0x14101c)); lid.position.y = 0.005; lid.rotation.z = s * -0.08; e.add(lid);
    eyes.push(e);
  }
  const mouth = texPlane(0.42, 0.21, mouths.grin, head); mouth.position.set(0, -0.27, 0.585); mouth.userData.kind = 'grin';
  mouth.material = mouth.material.clone();
  if (mustache) { const m = texPlane(0.4, 0.2, mustacheTex, head); m.position.set(0, -0.1, 0.606); m.rotation.x = 0; }
  if (glasses) { const gl = texPlane(0.62, 0.2, glassesTex, head); gl.position.set(0, 0.02, 0.62); }
  // hats / bandages (toggle with .visible)
  const hats = new THREE.Group(); head.add(hats);
  if (hat === 'hard') {
    const dome = mesh(new THREE.SphereGeometry(0.66, 32, 16, 0, 2 * PI, 0, PI / 2), hatColor, { parent: hats, o: 0.03 }); dome.position.y = 0.12;
    const brim = mesh(cyl(0.82, 0.05, 32), hatColor, { parent: hats, o: 0.02 }); brim.position.set(0, 0.14, 0.08);
    const rib = mesh(box(0.1, 0.05, 1.1), hatColor, { parent: hats, o: 0.015 }); rib.position.y = 0.8;
  } else if (hat === 'fedora') {
    const crown = mesh(cyl(0.42, 0.42, 24), hatColor, { parent: hats, o: 0.025 }); crown.position.set(0, 0.62, 0);
    const band = mesh(cyl(0.435, 0.1, 24), 0x5a2a2a, { parent: hats, o: 0.01 }); band.position.set(0, 0.5, 0);
    const brim = mesh(cyl(0.88, 0.05, 32), hatColor, { parent: hats, o: 0.02 }); brim.position.set(0, 0.4, 0.04); brim.rotation.z = 0.04;
  }
  else if (hat === 'top') {
    const crown = mesh(cyl(0.38, 0.7, 24), hatColor, { parent: hats, o: 0.025 }); crown.position.y = 0.78;
    const band = mesh(cyl(0.39, 0.1, 24), 0xc0322e, { parent: hats, o: 0.01 }); band.position.y = 0.52;
    const brim = mesh(cyl(0.68, 0.05, 32), hatColor, { parent: hats, o: 0.02 }); brim.position.y = 0.45;
  } else if (hat === 'nightcap') {
    const cone = mesh(new THREE.ConeGeometry(0.55, 1.0, 20), 0xdfe8ff, { parent: hats, o: 0.025 }); cone.position.set(0.1, 0.55, 0); cone.rotation.z = -0.6;
    const pom = mesh(sphere(0.12), 0xffffff, { parent: hats, o: 0.015 }); pom.position.set(0.4, 0.95, 0);
    const rim = mesh(new THREE.TorusGeometry(0.58, 0.08, 10, 32), 0xffffff, { parent: hats, o: 0.012 }); rim.rotation.x = PI / 2; rim.position.y = 0.28;
  } else if (hat === 'wig') {
    const w = mesh(sphere(0.72), 0xf4f1ea, { parent: hats, o: 0.03 }); w.position.set(0, 0.24, -0.16); w.scale.set(1.08, 0.95, 1.0);
    for (const sx of [-1, 1]) for (const yy of [-0.1, -0.38]) { const c = mesh(sphere(0.2), 0xf4f1ea, { parent: hats, o: 0.02 }); c.position.set(sx * 0.62, yy, -0.05); }
  }
  const wraps = new THREE.Group(); head.add(wraps); wraps.visible = !!wrap;
  const gauze = 0xf1e8d2;
  { // head bandage: band around forehead + diagonal strip + cheek patch
    const t1 = mesh(new THREE.TorusGeometry(0.6, 0.075, 12, 40), gauze, { parent: wraps, o: 0.012 }); t1.rotation.x = PI / 2; t1.position.y = 0.24; t1.scale.set(1.02, 1.0, 0.98);
    const t2 = mesh(new THREE.TorusGeometry(0.6, 0.065, 12, 40), gauze, { parent: wraps, o: 0.012 }); t2.rotation.set(PI / 2 + 0.38, 0, 0.2); t2.position.y = 0.3;
    const patch = mesh(box(0.2, 0.17, 0.03), gauze, { parent: wraps, o: 0.01 }); patch.position.set(0.3, -0.16, 0.55); patch.rotation.set(0, 0.5, 0.2);
  }
  const limb = (len, r) => { const p = new THREE.Group(); const m = mesh(cyl(r, len, 10), 0x14101c, { parent: p, o: 0.012 }); m.position.y = -len / 2; return p; };
  const arms = [], legs = [], armWraps = [];
  for (const s of [-1, 1]) {
    const a = limb(0.6, 0.045); a.position.set(s * 0.46, 1.25, 0); g.add(a);
    const hand = mesh(sphere(0.1), body, { parent: a, o: 0.02 }); hand.position.y = -0.62; arms.push(a);
    const aw = new THREE.Group(); a.add(aw); aw.visible = !!armWrap; armWraps.push(aw);
    for (const yy of [-0.12, -0.28, -0.44]) { const r = mesh(cyl(0.07, 0.12, 12), gauze, { parent: aw, o: 0.01 }); r.position.y = yy; r.rotation.z = 0.12; }
    const l = limb(0.75, 0.045); l.position.set(s * 0.2, 0.55, 0); g.add(l);
    const sh = mesh(sphere(0.14), shoe, { parent: l, o: 0.02 }); sh.scale.set(1, 0.7, 1.5); sh.position.set(0, -0.78, 0.07); legs.push(l);
  }
  g.userData = { head, eyes, arms, legs, torso, mouth, hats, wraps, armWraps };
  return g;
}
let hid = 0;
export const hero = (opts, parent) => { const h = makeStick(opts); h.userData.hid = hid++; if (parent) parent.add(h); return h; };
export function idle(h, t, { sway = 1, bob = 1 } = {}) {
  const u = h.userData;
  u.torso.position.y = 1.0 + Math.sin(t * 3.2) * 0.025 * bob;
  u.head.position.y = 2.0 + Math.sin(t * 3.2 - 0.4) * 0.03 * bob;
  u.head.rotation.z = Math.sin(t * 2.1) * 0.06 * sway; u.head.rotation.y = Math.sin(t * 1.3) * 0.15 * sway; u.head.rotation.x = 0;
  const blink = ((t + h.userData.hid * 0.37) % 2.7) > 2.6 ? 0.12 : 1; u.eyes.forEach(e => e.scale.set(1, blink, 1));
  u.legs.forEach(l => l.rotation.set(0, 0, 0)); u.arms.forEach(a => a.rotation.set(0, 0, 0));
}
// keep a held object upright relative to world while the arm rotates
export function hold(h, obj, arm = 1, { x = 0.05, y = -0.62, z = 0.12, rz = 0 } = {}) {
  const a = h.userData.arms[arm];
  if (obj.parent !== a) a.add(obj);
  obj.position.set(x, y, z);
  obj.rotation.set(-a.rotation.x, 0, -a.rotation.z + rz);
}
export function walk(h, t, speed = 7, amp = 0.55) {
  const u = h.userData, s = Math.sin(t * speed);
  u.legs[0].rotation.x = s * amp; u.legs[1].rotation.x = -s * amp;
  u.arms[0].rotation.x = -s * amp * 0.7; u.arms[1].rotation.x = s * amp * 0.7;
  u.torso.position.y = 1.0 + Math.abs(Math.sin(t * speed)) * 0.07; u.head.position.y = 2.0 + Math.abs(Math.sin(t * speed)) * 0.09;
}
