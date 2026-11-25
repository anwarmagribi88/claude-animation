import {
  THREE, W, H, PI, scene, camera, composer, bokeh, hemi, sun, mesh, sphere, box, cyl, basic, toon, outlineMat, ease, inout, back, lerp, clamp01,
  canvasTex, texPlane, FONT, fitText, sky, makeStick, hero, idle, hold, walk, setMouth
} from './toon.js';

const TIMING = await (await fetch('yamaguchi.timing.json')).json();
const SCENES = [];
const T_ = si => TIMING.scenes[si];
const wordT = (si, word) => { const w = T_(si).words.find(o => o.w.toLowerCase().replace(/[^a-z0-9]/g, '') === word); return w ? w.s : 0; };
const cue = (si, name) => T_(si).cues[name] ?? 0;
const rnd = (seed => () => (seed = (seed * 9301 + 49297) % 233280) / 233280)(5);
const ink = 0x14101c;
function addScene(def) { const g = new THREE.Group(); g.visible = false; scene.add(g); def.root = g; def.i = SCENES.length; def.build(g); SCENES.push(def); }
const plane = (w, h, color, parent, o = 0) => mesh(new THREE.PlaneGeometry(w, h), color, { o, parent });
const skyPlane = (top, bot, parent, z = -14, w = 80, h = 40, y = 8) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: sky(top, bot) })); m.position.set(0, y, z); parent.add(m); return m; };
const ground = (parent, color, w = 80, d = 60) => { const f = plane(w, d, color, parent); f.rotation.x = -PI / 2; f.position.z = -d / 2 + 10; return f; };

// ============ props ============
function hills(parent, layers) { // [{z,color,y,r,xs:[...],sx,sy}]
  layers.forEach(L => L.xs.forEach(x => { const m = mesh(sphere(1), L.color, { parent, o: L.o ?? 0 }); m.scale.set(L.sx, L.sy, 2); m.position.set(x, L.y, L.z); }));
}
function house(w = 1.4, h = 1.0, d = 1.2, wall = 0xe8d9b8, roof = 0x3b4a5a) {
  const g = new THREE.Group();
  mesh(box(w, h, d), wall, { parent: g, o: 0.02 }).position.y = h / 2;
  const r = (w + 0.35) / 1.73;
  const rf = mesh(new THREE.CylinderGeometry(r, r, d + 0.3, 3), roof, { parent: g, o: 0.02 }); rf.rotation.x = -PI / 2; rf.position.y = h + r * 0.5;
  for (const s of [-1, 1]) { const wn = mesh(box(w * 0.22, h * 0.32, 0.03), 0x2b3a55, { parent: g, o: 0.008 }); wn.position.set(s * w * 0.27, h * 0.58, d / 2 + 0.01); }
  const dr = mesh(box(w * 0.2, h * 0.5, 0.03), 0x6a4630, { parent: g, o: 0.008 }); dr.position.set(0, h * 0.25, d / 2 + 0.01);
  return g;
}
const facadeTex = (c1 = '#9aa6b8', c2 = '#1e2a40', lit = 0.25) => canvasTex(128, 256, (x, w, h) => {
  x.fillStyle = c1; x.fillRect(0, 0, w, h);
  for (let r = 0; r < 12; r++) for (let c = 0; c < 4; c++) { x.fillStyle = Math.random() < lit ? '#ffe9a0' : c2; x.fillRect(10 + c * 29, 12 + r * 20, 18, 12); }
});
function tallBuilding(w, h, d, c1, c2) { const m = new THREE.Mesh(box(w, h, d), new THREE.MeshBasicMaterial({ map: facadeTex(c1, c2, 0) })); m.add(new THREE.Mesh(box(w, h, d), outlineMat(0.05))); m.children[0].scale.setScalar(1.0); return m; }
function briefcase() {
  const g = new THREE.Group();
  mesh(box(0.5, 0.36, 0.14), 0x6b3f22, { parent: g, o: 0.014 });
  const hd = mesh(new THREE.TorusGeometry(0.08, 0.018, 8, 16, PI), 0x3a2414, { parent: g, o: 0.006 }); hd.position.y = 0.18;
  const cl = mesh(box(0.06, 0.05, 0.02), 0xd8b85a, { parent: g, o: 0.004 }); cl.position.set(0, 0.1, 0.08);
  g.position.y = -0.25; const w = new THREE.Group(); w.add(g); return w;
}
function signBoard(text, { w = 3.2, h = 0.9, bg = '#1d3f7a', fg = '#fff', post = true } = {}) {
  const g = new THREE.Group();
  const tex = canvasTex(1024, Math.round(1024 * h / w), (x, cw, ch) => { x.fillStyle = bg; x.fillRect(0, 0, cw, ch); x.strokeStyle = fg; x.lineWidth = 14; x.strokeRect(14, 14, cw - 28, ch - 28); fitText(x, text, cw, ch, 190, fg); });
  mesh(box(w, h, 0.12), 0x2b2b35, { parent: g, o: 0.02 });
  const f = texPlane(w * 0.97, h * 0.93, tex, g); f.position.z = 0.07;
  if (post) for (const s of [-1, 1]) { const p = mesh(box(0.14, 2.6, 0.14), 0x4a3a2a, { parent: g, o: 0.02 }); p.position.set(s * (w / 2 - 0.2), -h / 2 - 1.3 + 0.0, 0); }
  return g;
}
function trainCar(len = 3.8, color = 0x4f7a58) {
  const g = new THREE.Group(); const H0 = 0.75, H1 = 1.65, top = 1.95;
  const low = mesh(box(len, H0, 1.2), color, { parent: g, o: 0.025 }); low.position.y = H0 / 2;
  const up = mesh(box(len, top - H1, 1.2), color, { parent: g, o: 0.025 }); up.position.y = (top + H1) / 2;
  for (let k = 0; k <= 3; k++) { const p = mesh(box(0.16, H1 - H0, 1.2), color, { parent: g, o: 0.02 }); p.position.set(-len / 2 + 0.08 + k * (len - 0.16) / 3, (H0 + H1) / 2, 0); }
  const back_ = mesh(box(len, H1 - H0, 0.05), 0x5a4632, { parent: g, o: 0 }); back_.position.set(0, (H0 + H1) / 2, -0.5);
  const roof = mesh(box(len + 0.1, 0.16, 1.32), 0x3a3a44, { parent: g, o: 0.02 }); roof.position.y = top + 0.08;
  const stripe = mesh(box(len + 0.01, 0.1, 1.21), 0xf1e3b8, { parent: g, o: 0 }); stripe.position.y = H0 + 0.06;
  const stripe2 = mesh(box(len + 0.01, 0.07, 1.21), 0xf1e3b8, { parent: g, o: 0 }); stripe2.position.y = H1 - 0.04;
  const wheels = [];
  for (const x of [-len * 0.34, -len * 0.18, len * 0.18, len * 0.34]) for (const z of [-0.45, 0.45]) { const w = mesh(cyl(0.2, 0.08, 20), 0x23232b, { parent: g, o: 0.02 }); w.rotation.x = PI / 2; w.position.set(x, 0.1, z * 1.38); wheels.push(w); }
  g.userData.wheels = wheels; return g;
}
function crane(color = 0xffffff) {
  const g = new THREE.Group();
  const M = new THREE.MeshToonMaterial({ color, side: THREE.DoubleSide });
  const tri = (a, b, c, m = M) => { const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute([...a, ...b, ...c], 3)); geo.computeVertexNormals(); const me = new THREE.Mesh(geo, m); me.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0x14101c, wireframe: true }))); return me; };
  const A = [0, 0.12, 0], B = [0, -0.08, 0], C = [0, 0, 0.3], D = [0, 0, -0.3];
  for (const s of [-1, 1]) { const E = [s * 0.07, 0.02, 0]; g.add(tri(C, A, E), tri(A, D, E), tri(D, B, E), tri(B, C, E)); }
  g.add(tri(C, [0, 0.4, 0.5], [0, 0.04, 0.2]), tri(D, [0, 0.24, -0.5], [0, 0.03, -0.2]), tri([0, 0.4, 0.5], [0, 0.34, 0.62], [0, 0.36, 0.46]));
  const wings = [];
  for (const s of [-1, 1]) { const w = new THREE.Group(); w.add(tri([0, 0.08, 0.1], [s * 0.55, 0.2, -0.05], [0, 0.04, -0.2])); g.add(w); wings.push(w); }
  g.userData.wings = wings; return g;
}
function office(parent, { skyTop = '#4c93e8', skyBot = '#cfe6ff' } = {}) {
  const o = {};
  plane(40, 18, 0xe9dcbd, parent).position.set(0, 6, -4);
  const fl = plane(40, 30, 0x8a5a3a, parent); fl.rotation.x = -PI / 2; fl.position.set(0, 0, 4);
  for (let i = -8; i <= 8; i++) { const s = mesh(box(0.04, 0.01, 30), 0x6e4528, { o: 0, parent }); s.position.set(i * 1.1, 0.01, 4); }
  // window with view
  const view = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 2.2), new THREE.MeshBasicMaterial({ map: sky(skyTop, skyBot) })); view.position.set(-0.4, 3.6, -3.93); parent.add(view); o.view = view;
  const hl = mesh(sphere(1), 0x6fa86a, { parent, o: 0 }); hl.scale.set(1.6, 0.5, 0.1); hl.position.set(-0.9, 2.65, -3.9);
  const hl2 = mesh(sphere(1), 0x4f8f5a, { parent, o: 0 }); hl2.scale.set(1.3, 0.4, 0.1); hl2.position.set(0.3, 2.62, -3.9);
  for (const [x, y, w, h] of [[-0.4, 4.74, 2.7, 0.14], [-0.4, 2.46, 2.7, 0.14], [-1.65, 3.6, 0.14, 2.4], [0.85, 3.6, 0.14, 2.4], [-0.4, 3.6, 0.08, 2.2]]) mesh(box(w, h, 0.12), 0x6a4630, { parent, o: 0.015 }).position.set(x, y, -3.85);
  o.glow = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 2.2), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 })); o.glow.position.set(-0.4, 3.6, -3.8); parent.add(o.glow);
  // calendar, clock
  const cal = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 1.0), new THREE.MeshBasicMaterial({ map: canvasTex(160, 200, (x, w, h) => { x.fillStyle = '#fff'; x.fillRect(0, 0, w, h); x.fillStyle = '#c0322e'; x.fillRect(0, 0, w, 56); x.fillStyle = '#fff'; x.font = `900 36px ${FONT}`; x.textAlign = 'center'; x.fillText('AUG', w / 2, 40); x.fillStyle = '#14101c'; x.font = `900 100px ${FONT}`; x.fillText('9', w / 2, 160); }) })); cal.position.set(2.1, 3.6, -3.9); parent.add(cal);
  const clk = mesh(cyl(0.4, 0.08, 28), 0xf1e6c8, { parent, o: 0.02 }); clk.rotation.x = PI / 2; clk.position.set(2.3, 4.7, -3.9);
  const hh = mesh(box(0.04, 0.22, 0.02), ink, { parent, o: 0 }); hh.position.set(2.3, 4.77, -3.83);
  const mh = mesh(box(0.03, 0.3, 0.02), ink, { parent, o: 0 }); mh.position.set(2.3, 4.73, -3.83); mh.rotation.z = -0.3;
  // desk + ship model + papers
  const desk = mesh(box(3.0, 0.2, 1.1), 0x7a4a28, { parent, o: 0.02 }); desk.position.set(1.15, 1.25, -1.1);
  const front = mesh(box(3.0, 1.2, 0.1), 0x6a3f20, { parent, o: 0.02 }); front.position.set(1.15, 0.65, -0.58);
  const hull = mesh(box(0.9, 0.16, 0.26), 0x2b4a7a, { parent, o: 0.012 }); hull.position.set(1.9, 1.45, -1.0);
  const cab = mesh(box(0.28, 0.2, 0.2), 0xf1ead8, { parent, o: 0.01 }); cab.position.set(1.95, 1.62, -1.0);
  const fun = mesh(cyl(0.05, 0.22, 10), 0xc0322e, { parent, o: 0.008 }); fun.position.set(1.95, 1.8, -1.0);
  const pap = mesh(box(0.55, 0.02, 0.4), 0xffffff, { parent, o: 0.006 }); pap.position.set(0.4, 1.36, -0.95); pap.rotation.y = 0.3;
  return o;
}
function ruins(parent, { seed = 3, n = 14 } = {}) {
  let s = seed; const r = () => (s = (s * 9301 + 49297) % 233280) / 233280;
  for (let i = 0; i < n; i++) {
    const w = 0.8 + r() * 1.2, h = 0.8 + r() * 3.2, x = -11 + i * 1.7 + r(), z = -7 - r() * 4;
    const b = mesh(box(w, h, 1.2), [0x5a5560, 0x6a6470, 0x4a4650][i % 3], { parent, o: 0.03 }); b.position.set(x, h / 2 - (i % 2) * 0.1, z); b.rotation.z = (r() - 0.5) * 0.18;
    for (let k = 0; k < 3; k++) { const hole = mesh(box(w * 0.22, 0.3, 0.05), 0x14101c, { parent, o: 0 }); hole.position.set(x + (k - 1) * w * 0.28, h * (0.4 + r() * 0.4), z + 0.62); }
    // jagged top
    const t = mesh(box(w * 0.5, 0.5 + r() * 0.5, 1.0), 0x5a5560, { parent, o: 0.02 }); t.position.set(x + (r() - 0.5) * w * 0.4, h + 0.2, z); t.rotation.z = (r() - 0.5) * 0.7;
  }
  for (let i = 0; i < 26; i++) { const m = mesh(box(0.2 + r() * 0.5, 0.15 + r() * 0.3, 0.2 + r() * 0.4), [0x6a6470, 0x4a4650, 0x7a5a40][i % 3], { parent, o: 0.015 }); m.position.set(-5 + r() * 10, 0.1, -5 + r() * 7); m.rotation.set(r(), r(), r()); }
}
const smoke = (parent, x, z, n = 6) => { const arr = []; for (let i = 0; i < n; i++) { const m = mesh(sphere(0.5), 0x3a3540, { parent, o: 0.02 }); arr.push(m); } parent.userData.smoke = parent.userData.smoke || []; parent.userData.smoke.push({ arr, x, z }); };
function updateSmoke(parent, t) { (parent.userData.smoke || []).forEach(({ arr, x, z }) => arr.forEach((m, i) => { const k = (t * 0.25 + i / arr.length) % 1; m.position.set(x + Math.sin(k * 6 + i) * 0.5 * k, 0.4 + k * 6, z); m.scale.setScalar(0.5 + k * 1.6); })); }
function ash(parent, n = 40) { const arr = []; for (let i = 0; i < n; i++) { const m = new THREE.Mesh(box(0.07, 0.07, 0.02), basic(i % 4 ? 0x2a2630 : 0xe8d9b8)); parent.add(m); arr.push({ m, x: rnd() * 8 - 4, y: rnd() * 8, z: rnd() * 6 - 1.5, sp: 0.3 + rnd() * 0.5, ph: rnd() * 6 }); } return arr; }
const updateAsh = (arr, t) => arr.forEach(a => { a.m.position.set(a.x + Math.sin(t * 0.8 + a.ph) * 0.4 + t * 0.15, ((a.y - t * a.sp) % 8 + 8) % 8, a.z); a.m.rotation.set(t * 2 + a.ph, t * 1.5, t); });
const pose = { // arm poses
  hang: (u) => { u.arms[0].rotation.set(0, 0, -0.25); u.arms[1].rotation.set(0, 0, 0.25); },
};
const fear = (h, k = 1.35) => h.userData.eyes.forEach(e => e.scale.set(k, k, 1));
const shakeCam = (amp, t) => { camera.position.x += Math.sin(t * 61) * amp; camera.position.y += Math.cos(t * 53) * amp; };

// ================= SCENES =================
// ---- 0: hook. Bandaged man with a briefcase, train rolling in (1945) ----
addScene({
  bg: 0xf3b575, fog: [0xf3b575, 16, 46],
  build(g) {
    skyPlane('#f48c5a', '#ffe0a8', g);
    const sunD = mesh(cyl(2.6, 0.1, 40), 0xfff0b8, { parent: g, o: 0 }); sunD.rotation.x = PI / 2; sunD.position.set(2.5, 5.2, -13);
    ground(g, 0xb9b0a0);
    const line = mesh(box(40, 0.02, 0.18), 0xffc928, { o: 0, parent: g }); line.position.set(0, 0.01, -1.6);
    hills(g, [{ z: -16, color: 0x9a6a7a, y: -2, sx: 8, sy: 5, xs: [-10, 2, 14] }, { z: -12, color: 0x7a5a70, y: -2.4, sx: 7, sy: 3.4, xs: [-6, 8] }]);
    this.train = new THREE.Group(); g.add(this.train);
    for (let i = 0; i < 3; i++) { const c = trainCar(3.8); c.position.x = -i * 4.0; this.train.add(c); }
    this.train.position.set(14, 0, -4.2);
    this.sign = signBoard('HIROSHIMA', { w: 2.8, h: 0.8 }); this.sign.position.set(-2.2, 3.3, -2.2); g.add(this.sign);
    this.h = hero({ body: 0x3d4f66, tie: 0xb0362e, wrap: true, armWrap: true }, g); this.h.position.set(0.1, 0, 0.4); setMouth(this.h, 'flat');
    this.bag = briefcase();
  },
  update(t) {
    const h = this.h, u = h.userData; idle(h, t); u.hats.visible = false;
    u.arms[1].rotation.set(0.05, 0, 0.1); u.arms[0].rotation.set(0, 0, -0.2 + Math.sin(t * 3.2) * 0.04);
    hold(h, this.bag, 1, { x: 0.02, y: -0.5, z: 0.08 });
    u.head.rotation.y = lerp(0.2, -0.05, ease(t / 1.2));
    const k = ease((t - 0.5) / 3.6); this.train.position.x = lerp(14, 6.6, k);
    this.train.children.forEach(c => c.userData.wheels.forEach(w => w.rotation.y = 0));
    this.train.position.y = Math.sin(t * 22) * 0.012 * (1 - k);
    const c = inout(t / 4.4);
    camera.position.set(lerp(0.5, 0.15, c), lerp(2.05, 1.95, c), lerp(11.0, 8.6, c)); camera.lookAt(0.1, lerp(1.7, 1.55, c), 0); camera.rotateZ(0.025);
    return camera.position.distanceTo(h.position);
  }
});

// ---- 1: Hiroshima morning, engineer walking ----
addScene({
  bg: 0x8ec8f5, fog: [0xbfe0ff, 16, 48],
  build(g) {
    skyPlane('#5aa9f2', '#e9f6ff', g);
    const sunD = mesh(cyl(1.4, 0.1, 40), 0xfff2a8, { parent: g, o: 0 }); sunD.rotation.x = PI / 2; sunD.position.set(-3, 8, -13);
    hills(g, [{ z: -14, color: 0x6f9a8a, y: -2, sx: 9, sy: 6, xs: [-8, 6, 20] }, { z: -11, color: 0x58a070, y: -2.2, sx: 7, sy: 3.4, xs: [-3, 11] }]);
    ground(g, 0xcfb98a);
    this.world = new THREE.Group(); g.add(this.world);
    const cols = [[0xe8d9b8, 0x3b4a5a], [0xd9b88a, 0x5a3a30], [0xf0e6d0, 0x3a5a4a], [0xe0c8a0, 0x3b4a5a]];
    for (let i = 0; i < 14; i++) { const [w, r] = cols[i % 4]; const hs = house(1.5 + rnd() * 0.8, 1.0 + rnd() * 0.7, 1.4, w, r); hs.position.set(-4 + i * 3.1, 0, -3.6 - (i % 2) * 0.8); this.world.add(hs); }
    // tall shipyard crane
    const cr = new THREE.Group(); this.world.add(cr); cr.position.set(7, 0, -6.5);
    mesh(box(0.3, 7, 0.3), 0xd8442e, { parent: cr, o: 0.02 }).position.y = 3.5; const arm = mesh(box(4, 0.25, 0.25), 0xd8442e, { parent: cr, o: 0.02 }); arm.position.set(1.6, 6.9, 0);
    const bn = new THREE.Group(); this.world.add(bn); bn.position.set(10.0, 0, -2.2);
    this.arch = signBoard('HIROSHIMA', { w: 3.4, h: 0.9, bg: '#c0322e' }); this.arch.position.set(0, 4.3, 0); bn.add(this.arch); this.bn = bn;
    this.h = hero({ body: 0x3d4f66, tie: 0xb0362e, hat: 'hard' }, g); this.h.position.set(0, 0, 0.5); this.bag = briefcase();
  },
  update(t) {
    const h = this.h, u = h.userData; idle(h, t); walk(h, t, 7.5, 0.5);
    u.arms[1].rotation.x = 0.1; hold(h, this.bag, 1, { x: 0.02, y: -0.5, z: 0.08 });
    u.head.rotation.y = 0.12 * Math.sin(t * 1.2);
    const v = 1.35, tH = wordT(1, 'hiroshima');
    this.world.position.x = -v * t;
    this.bn.position.x = v * (tH + 0.1); // gate passes the hero right on the word "Hiroshima"
    camera.position.set(0.5 - t * 0.05, 2.0, 10.5 - t * 0.12); camera.lookAt(0.3, 1.9, 0); camera.rotateZ(-0.02);
    return 10.2;
  }
});

// ---- 2: the blast (first bomb) ----
addScene({
  bg: 0x6fb4ee, fog: [0xbfe0ff, 20, 60], flashIn: 0.18,
  build(g) {
    this.skyM = skyPlane('#5aa9f2', '#e9f6ff', g, -26, 120, 60, 12);
    ground(g, 0xc9b790, 100, 60);
    hills(g, [{ z: -24, color: 0x6f9a8a, y: -3, sx: 12, sy: 6, xs: [-14, 8, 24] }]);
    this.city = new THREE.Group(); g.add(this.city);
    for (let i = 0; i < 16; i++) {
      const w = 1.0 + rnd() * 1.0, hh = 1.0 + rnd() * 2.6; const b = mesh(box(w, hh, 1.2), [0xd9cfb8, 0xc7bba2, 0xe6dcc6][i % 3], { parent: this.city, o: 0.03 });
      b.position.set(-9 + i * 1.2, hh / 2, -10 - (i % 3) * 1.2); b.userData = { s: i % 2 ? 1 : -1, hh };
      const r = mesh(box(w * 1.05, 0.14, 1.3), 0x4a4a55, { parent: b, o: 0.01 }); r.position.y = hh / 2 + 0.07;
    }
    this.plane = new THREE.Group(); g.add(this.plane);
    mesh(new THREE.CapsuleGeometry(0.22, 1.5, 6, 12), 0x8a95a8, { parent: this.plane, o: 0.02 }).rotation.z = PI / 2;
    mesh(box(0.5, 0.06, 2.6), 0x8a95a8, { parent: this.plane, o: 0.02 }).position.x = 0.1; mesh(box(0.3, 0.5, 0.06), 0x8a95a8, { parent: this.plane, o: 0.02 }).position.set(-0.9, 0.25, 0);
    this.bomb = mesh(new THREE.CapsuleGeometry(0.14, 0.4, 6, 10), 0x2a2a35, { parent: g, o: 0.015 });
    this.fire = mesh(sphere(1), 0xffd65a, { o: 0, parent: g, mat: basic(0xffc548) }); this.fire2 = mesh(sphere(1), 0xff8a2a, { o: 0, parent: g, mat: basic(0xff7a22) });
    this.stem = mesh(cyl(1, 1, 24), 0x8a6a58, { parent: g, o: 0.05 }); this.cap = new THREE.Group(); g.add(this.cap);
    [[0, 0, 1.6], [1.6, -0.3, 1.3], [-1.6, -0.3, 1.3], [0.9, 0.9, 1.2], [-0.9, 0.9, 1.2], [0, 1.4, 1.0]].forEach(([a, b, r], i) => mesh(sphere(r), [0xff9a3a, 0xffb84a, 0xe0782a, 0xc9582a, 0x9a4a30, 0xffd65a][i], { parent: this.cap, o: 0.05 }).position.set(a, b, 0));
    this.ring = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.0, 64), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 })); g.add(this.ring);
    this.debris = []; for (let i = 0; i < 46; i++) { const m = mesh(box(0.12 + rnd() * 0.25, 0.1 + rnd() * 0.2, 0.1 + rnd() * 0.2), [0xe8d9b8, 0x6a5a48, 0x3a3540][i % 3], { parent: g, o: 0.012 }); this.debris.push({ m, x: (rnd() - 0.5) * 7, y: 0.5 + rnd() * 5, sp: 4 + rnd() * 9, ph: rnd() * 6 }); }
    this.h = hero({ body: 0x3d4f66, tie: 0xb0362e, hat: 'hard' }, g); this.h.position.set(-0.5, 0, 0.6);
    this.ashA = ash(g, 40);
  },
  update(t) {
    const B = cue(2, 'boom'), after = t - B, pre = t < B; const h = this.h, u = h.userData; idle(h, t);
    // plane crosses, bomb drops
    this.plane.position.set(lerp(-9, 8, clamp01(t / (B + 1.2))), 8.6, -12); this.plane.visible = pre || after < 1.4;
    const bt = clamp01((t - (B - 1.5)) / 1.5);
    this.bomb.position.set(lerp(-9, 8, clamp01((B - 1.5) / (B + 1.2))), lerp(8.4, 4.3, bt * bt), -12); this.bomb.rotation.z = lerp(PI / 2, 0.1, bt); this.bomb.visible = pre && t > B - 1.5;
    // hero looks up, then recoils
    if (pre) { u.head.rotation.x = -0.35; u.arms[0].rotation.set(0, 0, -0.3); u.arms[1].rotation.set(0, 0, 0.3); }
    else { const k = ease(after / 0.5); u.hats.visible = false; u.wraps.visible = after > 0.9; u.head.rotation.x = 0.15 * k; u.arms[0].rotation.set(-2.5 * k, 0, 0.4 * k); u.arms[1].rotation.set(-2.5 * k, 0, -0.4 * k); fear(h); setMouth(h, 'open'); h.rotation.x = -0.22 * k; h.position.z = 0.6 - 0.6 * ease(after / 1.4); }
    // fireball + cloud
    const fk = ease(after / 1.6), show = !pre;
    this.fire.visible = this.fire2.visible = this.stem.visible = this.cap.visible = show; this.ring.visible = show;
    const cx = 0.9, cz = -14;
    this.fire.position.set(cx, 1.6 + fk * 1.0, cz); this.fire.scale.setScalar(Math.max(0.01, fk * 3.4) * (1 - 0.45 * ease((after - 1.6) / 2.5))); this.fire2.position.set(cx, 1.6 + fk * 0.6, cz + 1); this.fire2.scale.setScalar(Math.max(0.01, fk * 2.3) * (1 - 0.5 * ease((after - 1.6) / 2.5)));
    const sh = ease(after / 4.2) * 9; this.stem.position.set(cx, sh / 2 + 0.5, cz - 0.5); this.stem.scale.set(1.0 + 0.4 * fk, Math.max(0.01, sh), 1.0 + 0.4 * fk);
    this.cap.position.set(cx, sh + 1.2, cz - 0.5); this.cap.scale.setScalar(Math.max(0.01, ease((after - 0.5) / 3.5) * 1.25)); this.cap.rotation.y = t * 0.4;
    const rk = clamp01(after / 1.3); this.ring.position.set(0, 2.6, -8); this.ring.scale.setScalar(Math.max(0.01, rk * 30)); this.ring.material.opacity = show ? (1 - rk) * 0.9 : 0;
    this.city.children.forEach(b => { const k = show ? ease(after / 2.4) : 0; b.rotation.z = b.userData.s * k * 0.25 * (1 + b.userData.hh * 0.1); b.position.y = b.userData.hh / 2 - k * 0.35; });
    this.debris.forEach(d => { const k = show ? Math.max(0, after - 0.05) : 0; d.m.visible = show; d.m.position.set(d.x * (1 + k * 1.5), d.y + k * 1.5 * Math.sin(d.ph), -14 + k * d.sp * 1.5 - 0 ); d.m.rotation.set(k * 6 + d.ph, k * 4, 0); });
    this.ashA.forEach(a => a.m.visible = show); updateAsh(this.ashA, t);
    // sky turns to dust
    const dk = show ? ease(after / 1.2) : 0; this.skyM.material.color.setRGB(lerp(1, 1.0, dk), lerp(1, 0.62, dk), lerp(1, 0.42, dk));
    scene.background = new THREE.Color().setRGB(lerp(0.44, 0.88, dk), lerp(0.7, 0.5, dk), lerp(0.93, 0.25, dk)); scene.fog.color.copy(scene.background);
    hemi.intensity = lerp(1.1, 0.8, dk); sun.color.setRGB(1, lerp(1, 0.6, dk), lerp(1, 0.35, dk));
    const c = ease(t / 6.6); camera.position.set(lerp(0.2, 0.5, c), lerp(2.4, 3.0, c), lerp(14.5, 13.2, c)); camera.lookAt(0.3, lerp(3.4, 4.8, c), -3);
    if (show) shakeCam(0.22 * Math.exp(-after * 1.1), t);
    camera.rotateZ(0.02 + (show ? 0.05 * Math.exp(-after) * Math.sin(t * 40) : 0));
    return camera.position.distanceTo(new THREE.Vector3(0, 2, 0.5)) + (show ? 6 : 0);
  }
});

// ---- 3: burned, deaf, blind... but alive. Air-raid shelter ----
addScene({
  bg: 0x16100e, fog: [0x16100e, 8, 24],
  build(g) {
    plane(40, 20, 0x35261f, g).position.set(0, 5, -4.2);
    const f = plane(40, 30, 0x2a1f1a, g); f.rotation.x = -PI / 2; f.position.z = 4;
    for (let i = -4; i <= 4; i++) { const p = mesh(box(0.28, 9, 0.28), 0x5a3f2a, { parent: g, o: 0.02 }); p.position.set(i * 2.2, 4, -3.8); }
    const beam = mesh(box(30, 0.3, 0.5), 0x5a3f2a, { parent: g, o: 0.02 }); beam.position.set(0, 5.6, -3.4);
    const rope = mesh(cyl(0.015, 1.4, 6), ink, { parent: g, o: 0 }); rope.position.set(1.5, 4.9, -2.2);
    this.lamp = mesh(cyl(0.2, 0.36, 12), 0xffd37a, { parent: g, o: 0.02, mat: basic(0xffd37a) }); this.lamp.position.set(1.5, 4.0, -2.2);
    const hat = mesh(cyl(0.26, 0.08, 12), 0x2b2b35, { parent: g, o: 0.01 }); hat.position.set(1.5, 4.24, -2.2);
    this.pl = new THREE.PointLight(0xffb45a, 40, 14, 1.6); this.pl.position.set(1.5, 3.8, -1.2); g.add(this.pl);
    this.h = hero({ body: 0x3d4f66, tie: 0xb0362e, wrap: true, armWrap: true }, g); this.h.position.set(-0.2, -0.46, 0.3); this.h.rotation.y = 0.0;
    this.motes = ash(g, 30);
    for (const [x, z, c] of [[-2.0, -1.2, 0x7a5a3a], [2.2, -1.0, 0x6a4a30]]) { const sb = mesh(box(0.9, 0.7, 0.8), c, { parent: g, o: 0.02 }); sb.position.set(x, 0.35, z); sb.rotation.y = 0.4; }
  },
  update(t) {
    const h = this.h, u = h.userData; idle(h, t, { bob: 0.5, sway: 0.4 }); u.hats.visible = false;
    const tA = wordT(3, 'alive'), up = ease((t - tA + 0.1) / 0.6);
    u.legs.forEach(l => l.rotation.x = -1.45); u.arms[0].rotation.set(-0.7, 0, -0.3); u.arms[1].rotation.set(-0.7, 0, 0.3);
    u.head.rotation.x = lerp(0.42, -0.05, up); u.head.rotation.y = lerp(0.1, 0, up);
    setMouth(h, up > 0.4 ? 'smile' : 'frown'); u.eyes.forEach(e => e.scale.y *= lerp(0.45, 1, up));
    this.pl.intensity = (40 + Math.sin(t * 9) * 4 + Math.sin(t * 23) * 3) * lerp(1, 1.8, up);
    this.lamp.scale.setScalar(1 + 0.03 * Math.sin(t * 9) + 0.08 * up);
    hemi.intensity = 0.35 + 0.25 * up; sun.intensity = 0.4; hemi.color.setHex(0xffd9a0); hemi.groundColor.setHex(0x3a2a20);
    updateAsh(this.motes, t * 0.4);
    const k = ease(t / 5); camera.position.set(lerp(1.4, 0.5, k), lerp(2.0, 1.7, k), lerp(12.5, 9.8, k)); camera.lookAt(0.1, lerp(1.3, 1.3, k), 0); camera.rotateZ(-0.02);
    return camera.position.distanceTo(h.position);
  }
});

// ---- 4: the train home (AUG 7) ----
addScene({
  bg: 0xf9c690, fog: [0xf9c690, 18, 60],
  build(g) {
    skyPlane('#7aa6e8', '#ffd9a8', g, -26, 120, 60, 12);
    const sunD = mesh(cyl(2.2, 0.1, 40), 0xfff0b8, { parent: g, o: 0 }); sunD.rotation.x = PI / 2; sunD.position.set(-3, 4.6, -22);
    this.far = new THREE.Group(); g.add(this.far); this.mid = new THREE.Group(); g.add(this.mid);
    for (let i = 0; i < 10; i++) { const m = mesh(sphere(1), 0x8a8fb0, { parent: this.far, o: 0 }); m.scale.set(6, 3 + (i % 3), 2); m.position.set(-24 + i * 6.5, -0.6, -20); }
    for (let i = 0; i < 12; i++) { const m = mesh(sphere(1), i % 2 ? 0x5a9a62 : 0x6aa86a, { parent: this.mid, o: 0 }); m.scale.set(3.4, 1.6 + (i % 3) * 0.5, 2); m.position.set(-20 + i * 4.2, -0.4, -9); }
    const gr = plane(120, 30, 0x4f8a50, g); gr.rotation.x = -PI / 2; gr.position.set(0, -0.3, -8);
    this.poles = []; for (let i = 0; i < 8; i++) { const p = new THREE.Group(); g.add(p); mesh(cyl(0.07, 5, 8), 0x4a3a2a, { parent: p, o: 0.015 }).position.y = 2.5; mesh(box(1.1, 0.08, 0.08), 0x4a3a2a, { parent: p, o: 0.01 }).position.y = 4.7; this.poles.push(p); }
    this.rail = mesh(box(120, 0.08, 0.14), 0x3a3a44, { parent: g, o: 0 }); this.rail.position.set(0, 0.0, 0.62); this.rail2 = this.rail.clone(); this.rail2.position.z = -0.62; g.add(this.rail2);
    this.sleepers = []; for (let i = 0; i < 20; i++) { const s = mesh(box(0.18, 0.06, 2.0), 0x5a3f2a, { parent: g, o: 0 }); this.sleepers.push(s); }
    this.car = trainCar(3.8, 0x4f7a58); g.add(this.car); this.car.position.set(0, 0.28, 0);
    this.h = hero({ body: 0x3d4f66, tie: 0xb0362e, wrap: true, armWrap: true }, g); this.h.scale.setScalar(0.5); this.h.position.set(0.0, 0.5, 0.0); setMouth(this.h, 'flat');
    this.puffs = []; for (let i = 0; i < 7; i++) { const m = mesh(sphere(0.4), 0xf4f4f8, { parent: g, o: 0.02 }); this.puffs.push(m); }
  },
  update(t) {
    const h = this.h, u = h.userData; idle(h, t * 1.6, { bob: 0.6, sway: 0.5 }); u.hats.visible = false; u.head.rotation.y = -0.45 + 0.05 * Math.sin(t); u.head.rotation.x = 0.1;
    const v = 7.5; this.far.position.x = -((t * v * 0.12) % 6.5); this.mid.position.x = -((t * v * 0.4) % 4.2);
    this.poles.forEach((p, i) => p.position.set(((i * 6 - t * v * 1.4) % 48 + 48) % 48 - 20, 0, -3.2));
    this.sleepers.forEach((s, i) => s.position.set(((i * 0.9 - t * v * 0.9) % 18 + 18) % 18 - 9, -0.02, 0));
    const sw = Math.sin(t * 23) * 0.012 + Math.sin(t * 3.1) * 0.01; this.car.position.y = 0.28 + sw; this.h.position.y = 0.5 + sw; this.car.rotation.z = Math.sin(t * 2.3) * 0.004;
    this.car.userData.wheels.forEach(w => w.rotation.y = t * 9);
    this.puffs.forEach((m, i) => { const k = (t * 0.6 + i / 7) % 1; m.position.set(-2.6 - k * 4.0, 3.0 + k * 2.0, -0.5); m.scale.setScalar(0.35 + k * 1.1); m.visible = true; });
    const c = ease(t / 5); camera.position.set(lerp(0.6, -0.1, c), lerp(2.3, 1.9, c), lerp(12.2, 9.6, c)); camera.lookAt(lerp(0.2, 0.0, c), lerp(1.7, 1.25, c), 0); camera.rotateZ(0.015);
    return camera.position.distanceTo(new THREE.Vector3(0, 1.2, 0));
  }
});

// ---- 5: "Home was... Nagasaki." ----
addScene({
  bg: 0x7ec0f0, fog: [0xcfe8ff, 18, 60],
  build(g) {
    skyPlane('#4fa0ee', '#e6f4ff', g, -26, 120, 60, 12);
    const sea = plane(120, 30, 0x2f78b8, g); sea.rotation.x = -PI / 2; sea.position.set(0, -0.1, -22);
    hills(g, [{ z: -22, color: 0x5a8a78, y: -1.5, sx: 10, sy: 6, xs: [-14, 6, 22] }, { z: -14, color: 0x4f9a62, y: -1.8, sx: 8, sy: 4.4, xs: [-8, 12] }]);
    ground(g, 0xc4bcae);
    for (let i = 0; i < 9; i++) { const hs = house(1.2 + rnd() * 0.6, 0.9 + rnd() * 0.5, 1.1, [0xe8d9b8, 0xf0e6d0, 0xd9b88a][i % 3], [0x3b4a5a, 0x5a3a30][i % 2]); hs.position.set(-7 + i * 1.9, 0.2 + (i % 3) * 0.4, -10 - (i % 3)); hs.scale.setScalar(0.9); g.add(hs); }
    this.sign = signBoard('NAGASAKI', { w: 3.4, h: 1.0, bg: '#1d3f7a' }); this.sign.position.set(0.0, 4.5, -1.2); g.add(this.sign);
    this.h = hero({ body: 0x3d4f66, tie: 0xb0362e, wrap: true, armWrap: true }, g); this.h.position.set(0.0, 0, 0.8); this.bag = briefcase();
    const tr = trainCar(3.8, 0x4f7a58); tr.position.set(-6.6, 0, -4.4); g.add(tr);
  },
  update(t) {
    const h = this.h, u = h.userData; idle(h, t); u.hats.visible = false;
    const tN = cue(5, 'ding'), pop = back((t - tN + 0.02) / 0.5);
    this.sign.scale.setScalar(Math.max(0.001, pop)); this.sign.rotation.z = (1 - clamp01(pop)) * 0.5 + Math.sin(t * 2) * 0.012;
    u.arms[0].rotation.set(0, 0, -0.25); u.arms[1].rotation.set(0.05, 0, 0.1); hold(h, this.bag, 1, { x: 0.02, y: -0.5, z: 0.08 });
    setMouth(h, t > tN ? 'smile' : 'flat'); u.head.rotation.y = lerp(0.35, 0, ease((t - 0.2) / 1.0)); u.head.rotation.x = t < tN ? 0.05 : -0.12;
    const c = ease(t / 3.1); camera.position.set(0.2, lerp(2.2, 2.9, c), lerp(8.2, 11.2, c)); camera.lookAt(0.0, lerp(1.8, 2.7, c), 0); camera.rotateZ(-0.015);
    return camera.position.distanceTo(h.position);
  }
});

// ---- 6: Nagasaki office, the boss doesn't believe him ----
addScene({
  bg: 0xe9dcbd, fog: [0xe9dcbd, 18, 50],
  build(g) {
    office(g);
    this.boss = hero({ body: 0x6a4a2a, tie: 0x3a5a8a, hat: 'fedora', hatColor: 0x6b6b72, mustache: true, glasses: false }, g); this.boss.position.set(1.0, 0.0, -1.3);
    this.h = hero({ body: 0x3d4f66, tie: 0xb0362e, wrap: true, armWrap: true }, g); this.h.position.set(-1.0, 0, 0.5);
    this.boss.userData.legs.forEach(l => l.visible = false);
  },
  update(t) {
    const h = this.h, u = h.userData, b = this.boss, bu = b.userData; idle(h, t); idle(b, t + 1.3, { sway: 0.5 }); u.hats.visible = false;
    const tB = wordT(6, 'one') - 0.05, spk = t < tB - 0.2;
    // hero explains with gestures, boss crosses arms and leans back
    u.arms[1].rotation.set(-1.0 + Math.sin(t * 5) * 0.35, 0, 0.5 + Math.sin(t * 4) * 0.2); u.arms[0].rotation.set(-0.5, 0, -0.5 + Math.sin(t * 3.4) * 0.25);
    u.head.rotation.y = 0.5; if (spk) setMouth(h, 'flat'); else setMouth(h, 'frown');
    bu.arms[0].rotation.set(-1.2, 0.0, 1.0); bu.arms[1].rotation.set(-1.2, 0.0, -1.0); bu.head.rotation.y = -0.45; bu.head.rotation.z = Math.sin(t * 1.2) * 0.05 + (spk ? 0 : -0.1);
    bu.eyes.forEach(e => e.scale.y *= 0.8); setMouth(b, spk ? 'flat' : 'frown');
    b.position.y = -0.02; const lean = ease((t - tB) / 0.4); bu.torso.rotation.x = -0.1 * lean; b.position.z = -1.3 - 0.1 * lean;
    this.bub = { text: '"One bomb can\'t destroy a whole city!"', at: tB };
    const c = inout((t - 0.4) / 2.6), c2 = inout((t - tB + 0.2) / 1.4);
    camera.position.set(lerp(0.0, 0.1, c2), lerp(2.9, 2.5, c2), lerp(15.5, 12.0, c2) + c * -0.8); camera.lookAt(lerp(0.1, 0.0, c2), lerp(2.5, 2.35, c2), -1); camera.rotateZ(0.01);
    return camera.position.distanceTo(new THREE.Vector3(0.3, 2, -0.5));
  }
});

// ---- 7: "Then the sky turned white... again." ----
addScene({
  bg: 0xe9dcbd, fog: [0xe9dcbd, 18, 50], flashIn: 0.12,
  build(g) {
    this.o = office(g);
    this.boss = hero({ body: 0x6a4a2a, tie: 0x3a5a8a, hat: 'fedora', hatColor: 0x6b6b72, mustache: true }, g); this.boss.position.set(1.0, -0.02, -1.4); this.boss.userData.legs.forEach(l => l.visible = false);
    this.h = hero({ body: 0x3d4f66, tie: 0xb0362e, wrap: true, armWrap: true }, g); this.h.position.set(-1.0, 0, 0.5);
  },
  update(t) {
    const B = cue(7, 'boom'), tS = wordT(7, 'sky'), k = clamp01((t - tS) / (B - tS)); const h = this.h, u = h.userData, b = this.boss, bu = b.userData;
    idle(h, t); idle(b, t, { sway: 0.2 }); u.hats.visible = false;
    const turn = ease((t - tS + 0.3) / 0.5);
    u.head.rotation.y = lerp(0.5, -0.7, turn); bu.head.rotation.y = lerp(-0.45, 0.5, turn);
    u.arms[1].rotation.set(-0.2, 0, 0.3); u.arms[0].rotation.set(0, 0, -0.3); bu.arms[0].rotation.set(0, 0, -0.4); bu.arms[1].rotation.set(0, 0, 0.4);
    fear(h, lerp(1, 1.4, turn)); fear(b, lerp(1, 1.4, turn)); setMouth(h, turn > 0.5 ? 'open' : 'frown'); setMouth(b, turn > 0.5 ? 'open' : 'frown');
    this.o.glow.material.opacity = k * k; this.o.view.material.color.setRGB(1, 1, 1);
    hemi.intensity = lerp(1.1, 3.0, k * k); sun.intensity = lerp(2.2, 0.4, k);
    const zoom = inout(t / (B + 0.2)); camera.position.set(lerp(0.1, -0.2, zoom), lerp(2.5, 3.1, zoom), lerp(12.0, 8.4, zoom)); camera.lookAt(lerp(0.0, -0.3, zoom), lerp(2.35, 3.3, zoom), -2);
    camera.rotateZ(0.012 + 0.03 * k * Math.sin(t * 30)); if (t > B - 0.8) shakeCam(0.05 * (t - B + 0.8), t);
    return camera.position.distanceTo(new THREE.Vector3(0, 2, -1));
  }
});

// ---- 8: aftermath. Same man, same distance. ----
addScene({
  bg: 0xc98a52, fog: [0xc98a52, 12, 38], flashIn: 1.5,
  build(g) {
    this.skyM = skyPlane('#8a6a6a', '#e8a860', g, -26, 120, 60, 12);
    ground(g, 0x6a5a4a, 100, 60); ruins(g);
    smoke(g, -2.8, -8.5, 7); smoke(g, 3.2, -9, 7); smoke(g, 0.3, -12, 8);
    this.h = hero({ body: 0x3d4f66, tie: 0xb0362e, wrap: true, armWrap: true }, g); this.h.position.set(0, 0, 0.8);
    this.ashA = ash(g, 56);
  },
  update(t) {
    const h = this.h, u = h.userData; idle(h, t); u.hats.visible = false; updateSmoke(this.root, t); updateAsh(this.ashA, t);
    const tA = cue(8, 'ding'), up = ease((t - tA + 0.4) / 0.9);
    u.arms[0].rotation.set(0, 0, -0.2); u.arms[1].rotation.set(0, 0, 0.2); u.head.rotation.x = lerp(0.3, -0.18, up); u.head.rotation.y = 0;
    setMouth(h, up > 0.5 ? 'flat' : 'frown'); h.position.y = 0;
    hemi.intensity = 0.8; hemi.color.setHex(0xffc890); sun.color.setHex(0xffb070);
    const k = ease(t / 5.2); camera.position.set(lerp(-0.8, 0.1, k), lerp(1.0, 1.9, k), lerp(13.5, 10.2, k)); camera.lookAt(0.1, lerp(2.2, 2.0, k), 0); camera.rotateZ(0.025);
    return camera.position.distanceTo(h.position);
  }
});

// ---- 9: outro. Cranes at sunrise. ----
addScene({
  bg: 0xffc58a, fog: [0xffc58a, 20, 70],
  build(g) {
    skyPlane('#ff8a6c', '#ffe9b8', g, -26, 120, 60, 12);
    const sunD = mesh(cyl(4.2, 0.1, 48), 0xfff3c8, { parent: g, o: 0, mat: basic(0xfff3c8) }); sunD.rotation.x = PI / 2; sunD.position.set(2.0, 4.8, -24);
    hills(g, [{ z: -22, color: 0xb86a8a, y: -2.4, sx: 12, sy: 6, xs: [-16, 4, 22] }, { z: -14, color: 0x8a5a8a, y: -2.4, sx: 9, sy: 4.6, xs: [-9, 10] }]);
    const hill = mesh(sphere(1), 0x5a9a56, { parent: g, o: 0.03 }); hill.scale.set(10, 2.4, 6); hill.position.set(0, -2.2, -1);
    for (let i = 0; i < 14; i++) { const m = mesh(new THREE.ConeGeometry(0.06, 0.35, 5), 0x4a8a4a, { parent: g, o: 0 }); m.position.set(-4 + rnd() * 8, 0.1, 1.5 + rnd() * 2); }
    this.h = hero({ body: 0x3d4f66, tie: 0xb0362e }, g); this.h.position.set(-0.1, 0.15, 1.2);
    this.hc = crane(0xffffff); this.hc.scale.setScalar(1.5);
    this.flock = []; for (let i = 0; i < 11; i++) { const c = crane([0xffffff, 0xffd23f, 0xff8fa8, 0x8fd6ff, 0xb6ff8a][i % 5]); g.add(c); this.flock.push(c); }
  },
  update(t) {
    const h = this.h, u = h.userData; idle(h, t, { sway: 0.5 }); u.hats.visible = false; u.wraps.visible = false; setMouth(h, 'smile');
    u.arms[1].rotation.set(-2.4 + Math.sin(t * 2) * 0.05, 0, 0.35); u.arms[0].rotation.set(0, 0, -0.25); u.head.rotation.x = -0.25;
    hold(h, this.hc, 1, { x: 0.05, y: -0.75, z: 0.05 }); this.hc.rotation.set(0.1, 0.6, 0); this.hc.userData.wings.forEach((w, i) => w.rotation.z = (i ? -1 : 1) * (0.3 + 0.35 * Math.sin(t * 7)));
    const k = ease((t - 1.0) / 8.0);
    this.flock.forEach((c, i) => {
      const p = clamp01((t - 0.6 - i * 0.28) / 8.5), a = p * 6.0 + i * 0.4; c.visible = p > 0;
      c.position.set(-1.0 + p * 5.5 + Math.sin(a) * 0.5, 2.8 + p * 6.0 + Math.sin(a * 1.3 + i) * 0.4, 0.5 - i * 0.3 - p * 2);
      c.rotation.set(-0.3, 1.2 + Math.sin(a) * 0.2, Math.sin(a) * 0.15); c.scale.setScalar(1.1 - p * 0.35);
      c.userData.wings.forEach((w, j) => w.rotation.z = (j ? -1 : 1) * (0.3 + 0.4 * Math.sin(t * 6 + i)));
    });
    const c = ease(t / 9.5); camera.position.set(lerp(0.2, 0.9, c), lerp(2.4, 3.8, c), lerp(10.6, 14.5, c)); camera.lookAt(lerp(0.0, 0.6, c), lerp(2.3, 4.4, c), 0); camera.rotateZ(-0.02);
    return camera.position.distanceTo(h.position) + 1;
  }
});

// ================= overlays =================
const $ = id => document.getElementById(id);
const capEl = $('cap'), stampEl = $('stamp'), flashEl = $('flash'), badgeEl = $('badge'), bubEl = $('bubble'), fadeEl = $('fade'), cardEl = $('card');
const EMPH = /^(bomb|alive|again|nagasaki|survived|peace|train|white|blind|burned|home)/i;
function caption(t, si) {
  const T = T_(si), words = T.words; let cur = null;
  for (const w of words) if (t >= w.s) cur = w;
  if (!cur || t > T.dur - 0.2) { capEl.style.opacity = 0; return; }
  capEl.textContent = cur.w; capEl.style.opacity = 1;
  const big = EMPH.test(cur.w.replace(/[^a-z]/gi, '')); capEl.style.color = big ? '#ffd23f' : '#fff';
  capEl.style.transform = `scale(${(0.6 + 0.4 * back((t - cur.s) / 0.16)) * (big ? 1.12 : 1)})`;
  capEl.style.fontSize = (cur.w.length > 12 ? 92 : 112) + 'px';
}
const BADGES = { 2: ['3 KM AWAY', () => wordT(2, 'three')], 8: ['SURVIVED ×2', () => cue(8, 'ding')] };

window.renderFrame = (t) => {
  let si = TIMING.scenes.findIndex(s => t >= s.start && t < s.start + s.dur); if (si < 0) si = SCENES.length - 1;
  const S = SCENES[si], T = T_(si), lt = t - T.start;
  SCENES.forEach((s, i) => s.root.visible = i === si);
  scene.background = new THREE.Color(S.bg); scene.fog = new THREE.Fog(...S.fog);
  hemi.intensity = 1.1; hemi.color.setHex(0xfff1d6); hemi.groundColor.setHex(0x6a4a7a); sun.intensity = 2.2; sun.color.setHex(0xffffff);
  camera.fov = 32; scene.fog.color.copy(scene.background);
  const focus = S.update(lt);
  camera.fov = 32 * (1 + 0.1 * (1 - ease(lt / 0.35))); camera.updateProjectionMatrix();
  bokeh.uniforms.focus.value = focus; bokeh.uniforms.aperture.value = 0.0011; bokeh.uniforms.maxblur.value = 0.009;
  const toEnd = T.dur - lt;
  // flash: scene-in flash, plus the blast flashes
  let fl = Math.max(0, 1 - lt / (S.flashIn ?? 0.18)) * (si === 0 ? 0 : 0.85);
  if (si === 2) { const B = cue(2, 'boom'); fl = Math.max(fl, lt < B ? 0 : Math.max(0, 1 - (lt - B) / 1.1)); }
  if (si === 7) { const B = cue(7, 'boom'); fl = Math.max(fl, lt < B ? 0 : 1); }
  if (si === 7) fl = Math.max(fl, toEnd < 0.1 ? 1 : 0);
  else if (toEnd < 0.08) fl = Math.max(fl, (1 - toEnd / 0.08) * 0.85);
  flashEl.style.opacity = Math.min(1, fl);
  // stamp (date / place)
  const st = T.stamp; stampEl.textContent = st; stampEl.style.fontSize = Math.min(140, 980 / (Math.max(st.length, 4) * 0.66)) + 'px';
  stampEl.style.opacity = st && toEnd > 0.2 ? 1 : 0;
  stampEl.style.transform = `translateX(${(1 - ease((lt - 0.1) / 0.4)) * -700}px) rotate(-4deg) scale(${0.9 + 0.1 * back((lt - 0.1) / 0.4)})`;
  // badge
  const bd = BADGES[si];
  if (bd && lt >= bd[1]()) { const at = bd[1](); badgeEl.style.opacity = toEnd > 0.2 ? 1 : 0; badgeEl.textContent = bd[0]; badgeEl.style.transform = `scale(${0.5 + 0.5 * back((lt - at) / 0.25)}) rotate(3deg)`; } else badgeEl.style.opacity = 0;
  // speech bubble
  if (si === 6 && S.bub && lt >= S.bub.at) { bubEl.textContent = S.bub.text; bubEl.style.opacity = toEnd > 0.15 ? 1 : 0; bubEl.style.transform = `scale(${0.4 + 0.6 * back((lt - S.bub.at) / 0.25)})`; } else bubEl.style.opacity = 0;
  // outro: fade + dedication
  fadeEl.style.opacity = si === SCENES.length - 1 ? clamp01(1 - (toEnd - 0.2) / 1.0) : 0;
  cardEl.style.opacity = si === SCENES.length - 1 ? clamp01((lt - (T.dur - 3.6)) / 0.6) * (1 - clamp01(1 - (toEnd - 0.2) / 1.0)) : 0;
  caption(lt, si);
  composer.render();
};
window.TOTAL = TIMING.total;
window.ready = true;
