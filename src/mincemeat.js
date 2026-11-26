import {
  THREE, PI, scene, camera, composer, bokeh, hemi, sun, mesh, sphere, box, cyl, basic, ease, inout, back, lerp, clamp01,
  canvasTex, texPlane, FONT, fitText, sky, hero, idle, hold, setMouth
} from './toon.js';

const TIMING = await (await fetch('mincemeat.timing.json')).json();
const SCENES = [];
const T_ = si => TIMING.scenes[si];
const norm = w => w.toLowerCase().replace(/[^a-z0-9]/g, '');
const wordT = (si, word) => { const w = T_(si).words.find(o => norm(o.w) === word); return w ? w.s : 0; };
const cue = (si, name) => T_(si).cues[name] ?? 0;
const rnd = (seed => () => (seed = (seed * 9301 + 49297) % 233280) / 233280)(13);
function addScene(def) { const g = new THREE.Group(); g.visible = false; scene.add(g); def.root = g; def.i = SCENES.length; def.build(g); SCENES.push(def); }
const plane = (w, h, color, parent) => mesh(new THREE.PlaneGeometry(w, h), color, { o: 0, parent });
const skyPlane = (top, bot, parent, z = -26) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(120, 60), new THREE.MeshBasicMaterial({ map: sky(top, bot) })); m.position.set(0, 12, z); parent.add(m); return m; };
const floorP = (parent, color, z = 4) => { const f = plane(60, 40, color, parent); f.rotation.x = -PI / 2; f.position.z = z; return f; };
const shakeCam = (amp, t) => { camera.position.x += Math.sin(t * 61) * amp; camera.position.y += Math.cos(t * 53) * amp; };
const closeEyes = h => h.userData.eyes.forEach(e => e.scale.set(1, 0.06, 1));
const KHAKI = 0x8a7a50, NAVY = 0x2a3a5a, GREY = 0x5a5f6a;

// ---------- props ----------
function flagTex() { return canvasTex(300, 180, (x, w, h) => { x.fillStyle = '#1d3a8a'; x.fillRect(0, 0, w, h); x.strokeStyle = '#fff'; x.lineWidth = 36; x.beginPath(); x.moveTo(0, 0); x.lineTo(w, h); x.moveTo(w, 0); x.lineTo(0, h); x.stroke(); x.strokeStyle = '#c0322e'; x.lineWidth = 14; x.beginPath(); x.moveTo(0, 0); x.lineTo(w, h); x.moveTo(w, 0); x.lineTo(0, h); x.stroke(); x.fillStyle = '#fff'; x.fillRect(w / 2 - 30, 0, 60, h); x.fillRect(0, h / 2 - 30, w, 60); x.fillStyle = '#c0322e'; x.fillRect(w / 2 - 18, 0, 36, h); x.fillRect(0, h / 2 - 18, w, 36); }); }
// map: 512x400 canvas, redrawn per frame when `state` changes
function drawMap(x, w, h, st = {}) {
  x.fillStyle = '#4f86bd'; x.fillRect(0, 0, w, h);
  const land = (pts, c = '#d8c88a') => { x.fillStyle = c; x.strokeStyle = '#6a5a30'; x.lineWidth = 4; x.beginPath(); pts.forEach(([a, b], i) => i ? x.lineTo(a, b) : x.moveTo(a, b)); x.closePath(); x.fill(); x.stroke(); };
  land([[0, 50], [130, 40], [150, 120], [70, 170], [0, 150]], '#c9b878'); land([[190, 50], [270, 38], [305, 120], [350, 185], [385, 235], [345, 245], [300, 175], [248, 135], [195, 92]]);
  land([[300, 262], [362, 248], [340, 296]], st.real ? '#ffd23f' : '#d8c88a'); land([[420, 90], [505, 78], [495, 205], [452, 232], [430, 165]], '#c9b878');
  land([[0, 335], [120, 322], [240, 340], [380, 328], [512, 338], [512, 400], [0, 400]], '#d8b870'); x.fillStyle = '#d8c88a'; x.beginPath(); x.ellipse(205, 205, 13, 26, 0, 0, 2 * PI); x.fill(); x.stroke();
  x.fillStyle = '#14101c'; x.font = `900 24px ${FONT}`; x.textAlign = 'center'; x.fillText('SPAIN', 70, 108); x.fillText('ITALY', 255, 100); x.fillText('GREECE', 462, 150); x.fillText('SICILY', 332, 322); x.fillText('NORTH AFRICA', 250, 380);
  const arrow = (x0, y0, x1, y1, col, dash, k = 1) => { const ex = lerp(x0, x1, k), ey = lerp(y0, y1, k); x.strokeStyle = col; x.lineWidth = 12; x.setLineDash(dash ? [22, 14] : []); x.beginPath(); x.moveTo(x0, y0); x.lineTo(ex, ey); x.stroke(); x.setLineDash([]); if (k > 0.98) { const a = Math.atan2(y1 - y0, x1 - x0); x.fillStyle = col; x.beginPath(); x.moveTo(x1, y1); x.lineTo(x1 - 36 * Math.cos(a - 0.45), y1 - 36 * Math.sin(a - 0.45)); x.lineTo(x1 - 36 * Math.cos(a + 0.45), y1 - 36 * Math.sin(a + 0.45)); x.fill(); } };
  if (st.fake) { arrow(150, 340, 450, 232, '#e0352e', true, st.fake); x.fillStyle = '#e0352e'; x.font = `900 30px ${FONT}`; x.fillText('INVASION?', 300, 270); }
  if (st.troops) { for (let i = 0; i < 6; i++) { const k = clamp01(st.troops * 1.3 - i * 0.08); if (k <= 0) continue; const px = lerp(330, 455, k), py = lerp(262, 200, k) + (i % 3 - 1) * 14; x.fillStyle = '#3a3f4a'; x.fillRect(px - 9, py - 9, 18, 18); x.strokeStyle = '#fff'; x.lineWidth = 3; x.strokeRect(px - 9, py - 9, 18, 18); } arrow(330, 262, 455, 205, '#3a3f4a', false, clamp01(st.troops)); }
  if (st.real) { const p = 1 + 0.25 * Math.sin(st.real * 10); x.strokeStyle = '#ffd23f'; x.lineWidth = 8; x.beginPath(); x.arc(332, 274, 46 * p, 0, 2 * PI); x.stroke(); arrow(240, 360, 322, 292, '#2f8fe0', false, 1); x.fillStyle = '#fff'; x.strokeStyle = '#14101c'; x.lineWidth = 8; x.font = `900 28px ${FONT}`; x.strokeText('REAL TARGET', 250, 240); x.fillText('REAL TARGET', 250, 240); }
}
function mapBoard(w, h, st) { const g = new THREE.Group(); const cv = document.createElement('canvas'); cv.width = 512; cv.height = 400; const ctx = cv.getContext('2d'); drawMap(ctx, 512, 400, st); const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; mesh(box(w + 0.2, h + 0.2, 0.12), 0x5a3a20, { parent: g, o: 0.02 }); const pl = texPlane(w, h, tex, g); pl.position.z = 0.07; g.userData = { ctx, tex, draw: s => { drawMap(ctx, 512, 400, s); tex.needsUpdate = true; } }; return g; }
function briefcase(s = 1) { const g = new THREE.Group(); mesh(box(0.5, 0.36, 0.14), 0x6b3f22, { parent: g, o: 0.014 }); const hd = mesh(new THREE.TorusGeometry(0.08, 0.018, 8, 16, PI), 0x3a2414, { parent: g, o: 0.006 }); hd.position.y = 0.18; const cl = mesh(box(0.06, 0.05, 0.02), 0xd8b85a, { parent: g, o: 0.004 }); cl.position.set(0, 0.1, 0.08); g.position.y = -0.25; const w = new THREE.Group(); w.add(g); w.scale.setScalar(s); return w; }
function idCard() { const g = new THREE.Group(); const tex = canvasTex(512, 320, (x, w, h) => { x.fillStyle = '#f1e6c0'; x.fillRect(0, 0, w, h); x.strokeStyle = '#2a3a5a'; x.lineWidth = 10; x.strokeRect(10, 10, w - 20, h - 20); x.fillStyle = '#2a3a5a'; x.font = `900 40px ${FONT}`; x.textAlign = 'left'; x.fillText('ROYAL MARINES', 150, 70); x.fillStyle = '#c9b88a'; x.fillRect(32, 40, 100, 130); x.fillStyle = '#e8e8ee'; x.beginPath(); x.arc(82, 90, 26, 0, 2 * PI); x.fill(); x.fillStyle = '#14101c'; x.fillRect(58, 88, 48, 4); x.fillStyle = '#14101c'; x.font = `900 52px ${FONT}`; x.fillText('MAJOR', 150, 140); x.font = `900 46px ${FONT}`; x.fillText('WILLIAM MARTIN', 32, 250); }); mesh(box(1.7, 1.06, 0.04), 0xf1e6c0, { parent: g, o: 0.02 }); texPlane(1.64, 1.02, tex, g).position.z = 0.025; return g; }
const document_ = () => { const g = new THREE.Group(); mesh(box(0.7, 0.9, 0.02), 0xfaf3dc, { parent: g, o: 0.012 }); for (let i = 0; i < 5; i++) { const l = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.03), basic(0x6a6a70)); l.position.set(0, 0.2 - i * 0.12, 0.012); g.add(l); } const st = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.14), new THREE.MeshBasicMaterial({ map: canvasTex(256, 70, (x, w, h) => { x.strokeStyle = '#c0322e'; x.lineWidth = 8; x.strokeRect(6, 6, w - 12, h - 12); x.fillStyle = '#c0322e'; x.font = `900 38px ${FONT}`; x.textAlign = 'center'; x.fillText('TOP SECRET', w / 2, 49); }), transparent: true })); st.position.set(0, 0.34, 0.014); st.rotation.z = -0.15; g.add(st); return g; };
function bulb() { const g = new THREE.Group(); mesh(sphere(0.3), 0xfff3a0, { parent: g, o: 0.02, mat: basic(0xfff3a0) }); mesh(cyl(0.14, 0.2, 12), 0x6a6a70, { parent: g, o: 0.015 }).position.y = -0.32; for (let i = 0; i < 8; i++) { const r = mesh(box(0.05, 0.22, 0.02), 0xffd23f, { parent: g, o: 0 }); const a = i / 8 * 2 * PI; r.position.set(Math.sin(a) * 0.55, Math.cos(a) * 0.55, 0); r.rotation.z = -a; } return g; }

// ============ 0: hook ============
addScene({
  bg: 0x14101c, fog: [0x14101c, 10, 30],
  build(g) {
    floorP(g, 0x1e1a28); plane(40, 20, 0x2a1e30, g).position.set(0, 6, -4);
    const cone = new THREE.Mesh(new THREE.ConeGeometry(1.7, 9, 32, 1, true), new THREE.MeshBasicMaterial({ color: 0xfff1c0, transparent: true, opacity: 0.09, side: THREE.DoubleSide, depthWrite: false })); cone.position.set(0, 4.6, 0.3); g.add(cone);
    const pool = new THREE.Mesh(new THREE.CircleGeometry(2.2, 40), new THREE.MeshBasicMaterial({ color: 0xfff1c0, transparent: true, opacity: 0.25 })); pool.rotation.x = -PI / 2; pool.position.set(0, 0.02, 0.3); g.add(pool);
    this.h = hero({ body: KHAKI, hat: 'officer', hatColor: 0x6a5a3a, tie: 0x2a2a30 }, g); this.h.position.set(0, 0, 0.3);
  },
  update(t) {
    const h = this.h, u = h.userData; idle(h, t * 0.5, { bob: 0.3, sway: 0.2 }); closeEyes(h); setMouth(h, 'flat');
    u.arms[0].rotation.set(0, 0, -0.12); u.arms[1].rotation.set(0, 0, 0.12); h.rotation.z = Math.sin(t * 0.9) * 0.03; u.head.rotation.x = 0.08;
    const nz = wordT(0, 'nazi'), r = clamp01((t - nz) / 0.6); scene.background = new THREE.Color().setRGB(lerp(0.08, 0.3, r) * (0.8 + 0.2 * Math.sin(t * 6) * r), 0.06, lerp(0.11, 0.1, r)); scene.fog.color.copy(scene.background);
    const k = ease(t / 4.2); camera.position.set(0, lerp(2.4, 2.2, k), lerp(14.5, 10.8, k)); camera.lookAt(0, lerp(2.0, 1.9, k), 0); camera.rotateZ(0.015);
    return camera.position.distanceTo(h.position);
  }
});

// ============ 1: British intelligence, the plan ============
addScene({
  bg: 0x4a5a46, fog: [0x4a5a46, 18, 50],
  build(g) {
    plane(40, 16, 0x5d6f58, g).position.set(0, 5, -4); floorP(g, 0x6a5a40);
    const fl = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.44), new THREE.MeshBasicMaterial({ map: flagTex() })); fl.position.set(-2.8, 5.6, -3.9); g.add(fl);
    this.map = mapBoard(3.4, 2.65, { fake: 0 }); this.map.position.set(0.4, 3.4, -3.7); g.add(this.map);
    this.a = hero({ body: NAVY, hat: 'officer', hatColor: NAVY, glasses: true }, g); this.a.position.set(-0.7, 0, 0.5);
    this.b = hero({ body: 0x4a3a2a, hat: 'fedora', hatColor: 0x3a3a42, mustache: true }, g); this.b.position.set(1.3, 0, 0.3);
    this.bulb = bulb(); g.add(this.bulb); this.bulb.position.set(0.3, 5.6, 0.4);
    this.table = mesh(box(4.2, 0.2, 1.4), 0x6a4a2a, { parent: g, o: 0.02 }); this.table.position.set(0.3, 1.0, -1.4);
  },
  update(t) {
    const a = this.a, b = this.b, au = a.userData, bu = b.userData; idle(a, t); idle(b, t + 1); const D = cue(1, 'ding');
    au.arms[1].rotation.set(-2.2 + Math.sin(t * 4) * 0.1, 0, 0.3); au.head.rotation.y = 0.5; au.head.rotation.x = -0.1; au.arms[0].rotation.set(-0.5, 0, -0.3);
    bu.arms[0].rotation.set(-0.9, 0, -0.5); bu.arms[1].rotation.set(-0.5, 0, 0.5); bu.head.rotation.y = -0.45; setMouth(b, t > D ? 'grin' : 'flat'); setMouth(a, 'smile');
    const p = back((t - D + 0.1) / 0.4); this.bulb.scale.setScalar(Math.max(0.001, p) * (1 + 0.05 * Math.sin(t * 8))); this.bulb.position.y = 5.6 + 0.08 * Math.sin(t * 3);
    this.map.userData.draw({ fake: 0 });
    const k = ease(t / 8.9); camera.position.set(lerp(0.0, 0.5, k), lerp(2.8, 3.2, k), lerp(16.0, 13.2, k)); camera.lookAt(0.3, 2.6, 0); camera.rotateZ(-0.012);
    return 13;
  }
});

// ============ 2: dressed as Major William Martin ============
addScene({
  bg: 0x3e4a60, fog: [0x3e4a60, 16, 46],
  build(g) {
    plane(40, 16, 0x56627a, g).position.set(0, 5, -4); floorP(g, 0x4a3a2a);
    for (const x of [-3, 3]) { const lt = mesh(sphere(0.3), 0xfff3a0, { parent: g, o: 0.015, mat: basic(0xfff3a0) }); lt.position.set(x, 5.2, -3); mesh(cyl(0.015, 1.5, 6), 0x14101c, { parent: g, o: 0 }).position.set(x, 6.0, -3); }
    this.m = hero({ body: 0xe8e8ee, tie: null, hat: 'officer', hatColor: 0x6a5a3a }, g); this.m.position.set(0, 0, 0.2);
    this.a = hero({ body: NAVY, glasses: true }, g); this.a.position.set(-1.3, 0, 0.5); this.b = hero({ body: 0x4a3a2a, hat: 'fedora', hatColor: 0x3a3a42, mustache: true }, g); this.b.position.set(1.3, 0, 0.5);
    this.id = idCard(); this.id.position.set(0.2, 4.7, 0.6); g.add(this.id);
    this.tie = mesh(box(0.14, 0.5, 0.03), 0x2a2a30, { parent: this.m, o: 0.012 }); this.tie.position.set(0, 1.2, 0.46);
  },
  update(t) {
    const m = this.m, mu = m.userData, a = this.a, b = this.b, au = a.userData, bu = b.userData, tD = wordT(2, 'dressed') + 0.2, D = cue(2, 'ding');
    idle(m, t * 0.5, { bob: 0.2, sway: 0.1 }); idle(a, t); idle(b, t + 1); closeEyes(m); setMouth(m, 'flat'); m.rotation.z = Math.sin(t * 0.8) * 0.025;
    const dressed = t > tD; mu.hats.visible = dressed; this.tie.visible = dressed; m.children[0].material.color.setHex(dressed ? KHAKI : 0xe8e8ee);
    mu.arms[0].rotation.set(0, 0, -0.12); mu.arms[1].rotation.set(0, 0, 0.12);
    au.arms[1].rotation.set(-1.0 + Math.sin(t * 6) * 0.3, 0, 0.6); au.arms[0].rotation.set(-0.3, 0, -0.2); au.head.rotation.y = 0.5; bu.arms[0].rotation.set(-1.9 + Math.sin(t * 5) * 0.2, 0, -0.5); bu.arms[1].rotation.set(-0.3, 0, 0.2); bu.head.rotation.y = -0.5; setMouth(a, 'smile'); setMouth(b, 'smile');
    const p = back((t - D + 0.1) / 0.45); this.id.scale.setScalar(Math.max(0.001, p)); this.id.rotation.z = Math.sin(t * 2) * 0.03 + (1 - clamp01(p)) * 0.4; this.id.position.y = 4.6 + 0.05 * Math.sin(t * 2.5);
    const k = ease(t / 8.7); camera.position.set(lerp(0.3, 0.0, k), lerp(2.4, 2.8, k), lerp(16.0, 12.8, k)); camera.lookAt(0.1, 2.4, 0); camera.rotateZ(0.012);
    return 12;
  }
});

// ============ 3: the briefcase with the fake plan ============
addScene({
  bg: 0x2b3446, fog: [0x2b3446, 16, 46],
  build(g) {
    plane(40, 16, 0x3b465e, g).position.set(0, 5, -4); floorP(g, 0x3a2e24);
    this.m = hero({ body: KHAKI, hat: 'officer', hatColor: 0x6a5a3a, tie: 0x2a2a30 }, g); this.m.position.set(-0.7, 0, 0.4); this.bag = briefcase(1.3);
    this.doc = mapBoard(2.6, 2.03, { fake: 0 }); this.doc.position.set(1.0, 3.5, -0.4); g.add(this.doc);
    this.papers = []; for (let i = 0; i < 4; i++) { const d = document_(); g.add(d); this.papers.push(d); }
    this.fakeTag = null;
  },
  update(t) {
    const m = this.m, u = m.userData, tDoc = wordT(3, 'documents'), tF = cue(3, 'gavel'); idle(m, t * 0.6, { bob: 0.3, sway: 0.2 }); closeEyes(m); setMouth(m, 'flat');
    u.arms[1].rotation.set(0.05, 0, 0.12); u.arms[0].rotation.set(0, 0, -0.15); hold(m, this.bag, 1, { x: 0.02, y: -0.45, z: 0.1 }); u.head.rotation.y = 0.3; m.rotation.z = Math.sin(t * 0.8) * 0.03;
    const pp = back((t - tDoc + 0.2) / 0.5); this.doc.scale.setScalar(Math.max(0.001, pp)); this.doc.rotation.set(0, -0.15, Math.sin(t * 1.5) * 0.02); this.doc.userData.draw({ fake: clamp01((t - tDoc - 0.3) / 1.4) });
    this.papers.forEach((d, i) => { const k = Math.max(0, t - tDoc + 0.6 - i * 0.2); d.visible = k > 0 && k < 3.5; d.position.set(-0.4 + i * 0.5 + Math.sin(t * 2 + i) * 0.1, 1.8 + k * 0.9, 0.8 - i * 0.1); d.rotation.set(0.2, Math.sin(t + i) * 0.4, -0.3 + i * 0.2); });
    if (t > tF) { hemi.color.setHex(0xffd0d0); }
    const k = ease(t / 8.7); camera.position.set(lerp(0.8, 0.2, k), lerp(2.7, 3.0, k), lerp(15.5, 12.5, k)); camera.lookAt(0.1, 2.6, 0); camera.rotateZ(-0.01); if (t > tF) shakeCam(0.07 * Math.exp(-(t - tF) * 5), t);
    return 12;
  }
});

// ============ 4: released into the sea, found near Spain ============
addScene({
  bg: 0x7fb8e8, fog: [0xbfe0f8, 20, 60],
  build(g) {
    skyPlane('#5aa0e8', '#e6f4ff', g); const sea = plane(120, 40, 0x2f78b8, g); sea.rotation.x = -PI / 2; sea.position.set(-8, 0, -8);
    this.humps = []; for (let i = 0; i < 14; i++) { const m = mesh(sphere(1), i % 2 ? 0x3c8ad0 : 0x2f78b8, { parent: g, o: 0 }); m.scale.set(1.6, 0.18, 1.1); m.position.set(-9 + i * 1.5, 0.05, -2 + (i % 4) * 1.1); this.humps.push(m); }
    const sand = plane(30, 14, 0xe8d49a, g); sand.rotation.x = -PI / 2; sand.position.set(18, 0.02, 0); const hill = mesh(sphere(1), 0x6f9a60, { parent: g, o: 0.02 }); hill.scale.set(9, 3, 3); hill.position.set(12, -0.6, -7);
    this.m = hero({ body: KHAKI, hat: 'officer', hatColor: 0x6a5a3a, tie: 0x2a2a30 }, g); this.bag = briefcase(1.2);
    this.fisher = hero({ body: 0xc9a060, hat: 'fedora', hatColor: 0xe8d08a }, g); this.fisher.position.set(3.5, 0, 0.9);
    this.agent = hero({ body: GREY, hat: 'fedora', hatColor: 0x23232b, glasses: true, mustache: true }, g); this.agent.position.set(4.2, 0, 0.5);
    this.sub = new THREE.Group(); g.add(this.sub); mesh(new THREE.CapsuleGeometry(0.5, 4.5, 6, 14), 0x3a4a5a, { parent: this.sub, o: 0.03 }).rotation.z = PI / 2; mesh(box(0.9, 0.9, 0.5), 0x3a4a5a, { parent: this.sub, o: 0.03 }).position.set(0.3, 0.7, 0); mesh(cyl(0.04, 0.7, 8), 0x14101c, { parent: this.sub, o: 0.006 }).position.set(0.3, 1.4, 0); this.sub.position.set(-4.2, 0.1, -3);
  },
  update(t) {
    const m = this.m, mu = m.userData, T = T_(4), tG = wordT(4, 'german'), D = cue(4, 'ding'), R = cue(4, 'rush'), a = this.agent, au = a.userData, f = this.fisher;
    idle(m, t, { bob: 0 }); closeEyes(m); setMouth(m, 'flat'); idle(a, t); idle(f, t + 1);
    const drift = inout((t - 0.2) / 6.6); m.position.set(lerp(-3.3, 0.9, drift), 0.4 + Math.sin(t * 1.8) * 0.12, 0.9); m.scale.setScalar(1.25); m.rotation.set(0, 0, -PI / 2 + Math.sin(t * 1.5) * 0.06); mu.arms[0].rotation.set(0, 0, 0.3); mu.arms[1].rotation.set(0, 0, -0.3);
    const got = t > D; hold(got ? a : m, this.bag, 1, got ? { x: 0.02, y: -0.5, z: 0.1 } : { x: 0.1, y: -0.5, z: 0.15 }); if (!got) { this.bag.rotation.z = PI / 2 * 0; }
    this.humps.forEach((h, i) => { h.position.y = 0.05 + 0.1 * Math.sin(t * 2 + i); h.position.x = -9 + ((i * 1.5 + t * 0.5) % 21); h.visible = h.position.x < 3.8; });
    this.sub.position.x = lerp(-4.2, -9, ease((t - 0.2) / 3)); this.sub.position.y = 0.1 - 0.4 * ease((t - 1.2) / 2.5);
    au.arms[1].rotation.set(got ? -0.9 : -2.0, 0, 0.4); au.head.rotation.y = -0.5; setMouth(a, got ? 'grin' : 'flat'); if (got) a.position.x = lerp(4.2, 3.4, ease((t - D) / 0.4)); f.userData.head.rotation.y = -0.5; setMouth(f, 'open'); f.userData.arms[0].rotation.set(-2.2, 0, -0.3);
    const k = ease((t - tG + 0.3) / 1.6); const fx = lerp(m.position.x + 2.0, 2.3, k); camera.position.set(fx - 0.1, 2.4, lerp(12.8, 12.0, k)); camera.lookAt(fx, 1.2, 0); camera.rotateZ(0.012);
    return 12;
  }
});

// ============ 5: the Germans take the bait ============
addScene({
  bg: 0x3a3f46, fog: [0x3a3f46, 16, 46],
  build(g) {
    plane(40, 16, 0x4a5058, g).position.set(0, 5, -4); floorP(g, 0x2e2a28);
    this.map = mapBoard(3.6, 2.8, {}); this.map.position.set(0.2, 3.6, -3.7); g.add(this.map);
    this.gen = hero({ body: GREY, hat: 'officer', hatColor: 0x4a4f58, glasses: true, mustache: true }, g); this.gen.position.set(-1.2, 0, 0.5);
    this.off = hero({ body: GREY, hat: 'officer', hatColor: 0x4a4f58 }, g); this.off.position.set(1.4, 0, 0.5);
    this.ptr = mesh(cyl(0.025, 2.4, 6), 0x14101c, { o: 0, parent: g });
  },
  update(t) {
    const gu = this.gen.userData, ou = this.off.userData, tB = wordT(5, 'believed'), tR = wordT(5, 'redirected'), tS = cue(5, 'ding'); idle(this.gen, t); idle(this.off, t + 1);
    gu.arms[1].rotation.set(-2.0, 0, 0.2); hold(this.gen, this.ptr, 1, { x: 0.0, y: -1.1, z: 0.05 }); this.ptr.rotation.z = 0.6; gu.head.rotation.y = 0.4; gu.head.rotation.x = 0.1 + 0.12 * Math.max(0, Math.sin((t - tB) * 7)) * (t > tB && t < tB + 1.2 ? 1 : 0); setMouth(this.gen, 'smile');
    ou.arms[1].rotation.set(-2.7, 0, -0.2); ou.head.rotation.y = -0.4; setMouth(this.off, 'flat'); ou.arms[0].rotation.set(0, 0, -0.2);
    this.map.userData.draw({ troops: clamp01((t - tR) / 2.2), real: t > tS ? t - tS : 0 });
    const k = ease(t / 7); camera.position.set(lerp(-0.6, 0.3, k), lerp(2.8, 3.2, k), lerp(16.0, 13.4, k)); camera.lookAt(0.2, 2.8, 0); camera.rotateZ(-0.01);
    return 12;
  }
});

// ============ 6: Operation Mincemeat, success ============
addScene({
  bg: 0xffd27a, fog: [0xffd27a, 18, 50], flashIn: 0.2,
  build(g) {
    skyPlane('#ff9a5a', '#ffe8a8', g); const sunD = mesh(cyl(4.4, 0.1, 48), 0xfff3c8, { parent: g, o: 0, mat: basic(0xffe9a8) }); sunD.rotation.x = PI / 2; sunD.position.set(0, 4.5, -22); floorP(g, 0xc9a070);
    this.sign = (() => { const gg = new THREE.Group(); const tex = canvasTex(1024, 420, (x, w, h) => { x.fillStyle = '#1d2f5a'; x.fillRect(0, 0, w, h); x.strokeStyle = '#ffd23f'; x.lineWidth = 14; x.strokeRect(16, 16, w - 32, h - 32); x.fillStyle = '#fff3d0'; x.font = `900 110px ${FONT}`; x.textAlign = 'center'; x.fillText('OPERATION', w / 2, 170); x.fillStyle = '#ffd23f'; x.font = `900 140px ${FONT}`; x.fillText('MINCEMEAT', w / 2, 320); }); mesh(box(3.6, 1.5, 0.15), 0x2b2b35, { parent: gg, o: 0.02 }); texPlane(3.5, 1.42, tex, gg).position.z = 0.09; return gg; })();
    this.sign.position.set(0, 5.9, -1.0); g.add(this.sign);
    this.m = hero({ body: KHAKI, hat: 'officer', hatColor: 0x6a5a3a, tie: 0x2a2a30 }, g); this.m.position.set(0, 0, 0.5);
    this.a = hero({ body: NAVY, hat: 'officer', hatColor: NAVY, glasses: true }, g); this.a.position.set(-1.4, 0, 0.5); this.b = hero({ body: 0x4a3a2a, hat: 'fedora', hatColor: 0x3a3a42, mustache: true }, g); this.b.position.set(1.4, 0, 0.5);
    this.conf = []; for (let i = 0; i < 40; i++) { const c = new THREE.Mesh(box(0.1, 0.16, 0.02), basic([0xffd23f, 0xe0352e, 0x2f8fe0, 0xffffff][i % 4])); g.add(c); this.conf.push({ c, x: (rnd() - 0.5) * 6, z: rnd() * 3 - 1, s: 1 + rnd() * 1.5, ph: rnd() * 6 }); }
  },
  update(t) {
    const m = this.m, mu = m.userData, a = this.a, b = this.b, D = cue(6, 'ding'); idle(m, t, { bob: 0.3 }); idle(a, t); idle(b, t + 1); closeEyes(m); setMouth(m, 'smile');
    mu.arms[1].rotation.set(-2.5, 0, 0.9); mu.arms[0].rotation.set(0, 0, -0.15); mu.head.rotation.x = -0.05;
    for (const [h, s] of [[a, 1], [b, -1]]) { const u = h.userData; u.arms[0].rotation.set(-2.6 + Math.sin(t * 8 + s) * 0.3, 0, -0.5); u.arms[1].rotation.set(-2.6 + Math.sin(t * 8 + s + 2) * 0.3, 0, 0.5); setMouth(h, 'grin'); h.position.y = Math.abs(Math.sin(t * 5 + s)) * 0.12; }
    const p = back((t - D + 0.05) / 0.5); this.sign.scale.setScalar(Math.max(0.001, p)); this.sign.rotation.z = (1 - clamp01(p)) * 0.4 + Math.sin(t * 1.6) * 0.012;
    this.conf.forEach(o => { const k = Math.max(0, t - D); o.c.visible = k > 0; o.c.position.set(o.x + Math.sin(k * 2 + o.ph) * 0.3, 7 - ((k * o.s * 1.4 + o.ph) % 7), o.z); o.c.rotation.set(k * 4, k * 3, k * 5); });
    const k = ease(t / 8); camera.position.set(0.2, lerp(2.8, 3.3, k), lerp(13.5, 15.5, k)); camera.lookAt(0, lerp(2.7, 3.4, k), 0); camera.rotateZ(0.012);
    return 12;
  }
});

// ================= overlays =================
const $ = id => document.getElementById(id);
const capEl = $('cap'), stampEl = $('stamp'), flashEl = $('flash'), badgeEl = $('badge'), fadeEl = $('fade');
const EMPH = /^(dead|nazi|germany|strangest|fake|identity|martin|false|secret|sea|spain|obtained|sicily|mincemeat|successful|deception)/i;
function caption(t, si) {
  const T = T_(si), words = T.words; let cur = null;
  for (const w of words) if (t >= w.s) cur = w;
  if (!cur || t > T.dur - 0.15) { capEl.style.opacity = 0; return; }
  capEl.textContent = cur.w; capEl.style.opacity = 1;
  const big = EMPH.test(norm(cur.w)); capEl.style.color = big ? '#ffd23f' : '#fff';
  capEl.style.transform = `scale(${(0.6 + 0.4 * back((t - cur.s) / 0.16)) * (big ? 1.12 : 1)})`;
  capEl.style.fontSize = (cur.w.length > 12 ? 88 : 112) + 'px';
}
const BADGES = {
  3: [['FAKE PLAN', () => cue(3, 'gavel'), '#ff5a4a']],
  4: [['INTERCEPTED', () => cue(4, 'ding'), '#ffd23f']],
  5: [['TROOPS → GREECE', () => wordT(5, 'redirected'), '#ff5a4a']],
  6: [['MISSION SUCCESS', () => wordT(6, 'successful'), '#7dff6a']],
};
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
  let fl = Math.max(0, 1 - lt / (S.flashIn ?? 0.18)) * (si === 0 ? 0 : 0.85);
  if (si === 0) { const c = cue(0, 'crack'); fl = Math.max(fl, lt < c ? 0 : Math.max(0, 1 - (lt - c) / 0.35) * 0.5); }
  if (toEnd < 0.08 && si !== SCENES.length - 1) fl = Math.max(fl, (1 - toEnd / 0.08) * 0.85);
  flashEl.style.opacity = Math.min(1, fl);
  const st = T.stamp; stampEl.textContent = st; stampEl.style.fontSize = Math.min(140, 900 / (Math.max(st.length, 4) * 0.8)) + 'px';
  stampEl.style.opacity = st && toEnd > 0.2 ? 1 : 0;
  stampEl.style.transform = `translateX(${(1 - ease((lt - 0.1) / 0.4)) * -700}px) rotate(-4deg) scale(${0.9 + 0.1 * back((lt - 0.1) / 0.4)})`;
  const bl = (BADGES[si] || []).filter(b => lt >= b[1]()).pop();
  if (bl) { badgeEl.style.top = si === 6 ? '560px' : '330px'; badgeEl.style.opacity = toEnd > 0.2 ? 1 : 0; badgeEl.textContent = bl[0]; badgeEl.style.color = bl[2]; badgeEl.style.fontSize = (bl[0].length > 12 ? 84 : 120) + 'px'; badgeEl.style.transform = `scale(${0.5 + 0.5 * back((lt - bl[1]()) / 0.25)}) rotate(3deg)`; } else badgeEl.style.opacity = 0;
  fadeEl.style.opacity = si === SCENES.length - 1 ? clamp01(1 - (toEnd - 0.1) / 0.9) : 0;
  caption(lt, si);
  composer.render();
};
window.TOTAL = TIMING.total;
window.ready = true;
