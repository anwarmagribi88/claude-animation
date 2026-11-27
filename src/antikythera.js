import {
  THREE, PI, scene, camera, composer, bokeh, hemi, sun, mesh, sphere, box, cyl, basic, ease, inout, back, lerp, clamp01,
  canvasTex, texPlane, FONT, fitText, sky, hero, idle, hold, setMouth
} from './toon.js';

const TIMING = await (await fetch('antikythera.timing.json')).json();
const SCENES = [];
const T_ = si => TIMING.scenes[si];
const norm = w => w.toLowerCase().replace(/[^a-z0-9]/g, '');
const wordT = (si, word) => { const w = T_(si).words.find(o => norm(o.w) === word); return w ? w.s : 0; };
const cue = (si, name) => T_(si).cues[name] ?? 0;
const rnd = (seed => () => (seed = (seed * 9301 + 49297) % 233280) / 233280)(17);
function addScene(def) { const g = new THREE.Group(); g.visible = false; scene.add(g); def.root = g; def.i = SCENES.length; def.build(g); SCENES.push(def); }
const plane = (w, h, color, parent) => mesh(new THREE.PlaneGeometry(w, h), color, { o: 0, parent });
const skyPlane = (top, bot, parent, z = -26) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(120, 60), new THREE.MeshBasicMaterial({ map: sky(top, bot) })); m.position.set(0, 12, z); parent.add(m); return m; };
const floorP = (parent, color, z = 4) => { const f = plane(60, 40, color, parent); f.rotation.x = -PI / 2; f.position.z = z; return f; };
const shakeCam = (amp, t) => { camera.position.x += Math.sin(t * 61) * amp; camera.position.y += Math.cos(t * 53) * amp; };
const fear = (h, k = 1.35) => h.userData.eyes.forEach(e => e.scale.set(k, k, 1));
const BRONZE = 0xc98a3a, DARKB = 0x7a4f1e, TOGA = 0xf3ead6, COAT = 0xf4f4fb;

// ---------- props ----------
function gear(r, teeth, thick = 0.18, color = BRONZE) {
  const g = new THREE.Group(); const body = mesh(cyl(r, thick, Math.max(24, teeth * 2)), color, { parent: g, o: 0.02 }); body.rotation.x = PI / 2;
  for (let i = 0; i < teeth; i++) { const a = i / teeth * 2 * PI, t = mesh(box(r * 0.3, r * 0.22, thick), color, { parent: g, o: 0.012 }); t.position.set(Math.cos(a) * r * 1.08, Math.sin(a) * r * 1.08, 0); t.rotation.z = a; }
  for (let i = 0; i < 3; i++) { const s = mesh(box(r * 1.5, r * 0.16, thick * 0.4), DARKB, { parent: g, o: 0 }); s.position.z = thick * 0.52; s.rotation.z = i / 3 * PI; }
  const hub = mesh(cyl(r * 0.22, thick * 1.5, 16), DARKB, { parent: g, o: 0.01 }); hub.rotation.x = PI / 2; return g;
}
function mechanism(w = 3.2, h = 2.6) { // bronze board with meshing gears
  const g = new THREE.Group(); mesh(box(w, h, 0.22), 0x6a4a28, { parent: g, o: 0.03 }); mesh(box(w - 0.2, h - 0.2, 0.05), 0xa77a3c, { parent: g, o: 0 }).position.z = 0.12;
  const defs = [[-0.9, 0.6, 0.62, 16], [0.15, 0.78, 0.5, 13], [0.95, 0.3, 0.42, 11], [-0.15, -0.28, 0.55, 14], [0.85, -0.8, 0.46, 12], [-1.0, -0.85, 0.4, 10], [0.05, -1.05, 0.3, 8]]; g.userData.gears = [];
  defs.forEach(([x, y, r, n], i) => { const ge = gear(r, n); ge.position.set(x * w / 3.2, y * h / 2.6, 0.25 + (i % 2) * 0.12); g.add(ge); g.userData.gears.push({ ge, spd: (i % 2 ? -1 : 1) * 1.6 / r }); });
  return g;
}
const spinGears = (m, t) => m.userData.gears.forEach(o => o.ge.rotation.z = t * o.spd * 0.5);
function qMark(color = '#ffd23f') { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 1.1), new THREE.MeshBasicMaterial({ map: canvasTex(128, 160, (x, w, h) => { x.font = `900 140px ${FONT}`; x.textAlign = 'center'; x.lineWidth = 16; x.strokeStyle = '#14101c'; x.lineJoin = 'round'; x.strokeText('?', w / 2, 125); x.fillStyle = color; x.fillText('?', w / 2, 125); }), transparent: true })); return m; }
function signBoard(lines, { w = 3.4, h = 1.4, bg = '#1d3f7a', fg = '#fff3d0', hl = '#ffd23f' } = {}) { const g = new THREE.Group(); const tex = canvasTex(1024, Math.round(1024 * h / w), (x, cw, ch) => { x.fillStyle = bg; x.fillRect(0, 0, cw, ch); x.strokeStyle = hl; x.lineWidth = 14; x.strokeRect(14, 14, cw - 28, ch - 28); lines.forEach(([txt, col], i) => { x.save(); x.translate(0, (i - (lines.length - 1) / 2) * ch * 0.4); fitText(x, txt, cw, ch, 130, col || fg); x.restore(); }); }); mesh(box(w, h, 0.14), 0x2b2b35, { parent: g, o: 0.02 }); texPlane(w * 0.97, h * 0.94, tex, g).position.z = 0.08; return g; }
function column(h = 3.2, r = 0.28) { const g = new THREE.Group(); mesh(cyl(r, h, 14), 0xf3ead6, { parent: g, o: 0.02 }).position.y = h / 2; mesh(box(r * 2.6, 0.16, r * 2.6), 0xe8dcc0, { parent: g, o: 0.015 }).position.y = h + 0.08; mesh(box(r * 2.4, 0.14, r * 2.4), 0xe8dcc0, { parent: g, o: 0.015 }).position.y = 0.07; return g; }
const sparkle = (parent, n, color = 0xffe680) => { const a = []; for (let i = 0; i < n; i++) { const m = new THREE.Mesh(box(0.1, 0.1, 0.02), basic(i % 2 ? color : 0xffffff)); parent.add(m); a.push({ m, ph: rnd() * 6, r: 0.8 + rnd() * 0.8, s: 1 + rnd() * 1.5 }); } return a; };
const updSparkle = (arr, t, c, k) => arr.forEach(o => { o.m.visible = k > 0.01; const a = t * o.s + o.ph; o.m.position.set(c.x + Math.cos(a) * o.r * k, c.y + Math.sin(a * 1.3) * o.r * 0.7 * k, c.z + Math.sin(a) * 0.4); o.m.rotation.z = a * 3; o.m.scale.setScalar(k * (0.6 + 0.5 * Math.sin(a * 5))); });
const lump = () => { const g = new THREE.Group(); mesh(sphere(0.5), 0x5c7a5a, { parent: g, o: 0.03 }).scale.set(1.3, 0.85, 0.9); for (const [x, y, z, r, c] of [[0.4, 0.22, 0.2, 0.2, 0x8a6a3a], [-0.35, 0.1, 0.25, 0.18, 0x4a6a4a], [0.1, -0.1, 0.4, 0.16, 0xb86a2a], [-0.1, 0.3, 0.1, 0.17, 0x6a8a62]]) mesh(sphere(r), c, { parent: g, o: 0.02 }).position.set(x, y, z); return g; };

// ============ 0: hook — a Greek builds a computer ============
addScene({
  bg: 0x8ec8f5, fog: [0xcfe8ff, 18, 56],
  build(g) {
    skyPlane('#4fb0ff', '#eaf6ff', g); floorP(g, 0xe8d8b0);
    const sea = plane(120, 30, 0x2f78b8, g); sea.rotation.x = -PI / 2; sea.position.set(0, 0.0, -24); const hill = mesh(sphere(1), 0xd8c89a, { parent: g, o: 0 }); hill.scale.set(9, 3, 3); hill.position.set(-8, -0.5, -14);
    const temple = new THREE.Group(); g.add(temple); temple.position.set(0, 0, -6);
    mesh(box(7, 0.3, 2.6), 0xe8dcc0, { parent: temple, o: 0.02 }).position.y = 0.15; mesh(box(6.4, 0.3, 2.2), 0xefe4cc, { parent: temple, o: 0.02 }).position.y = 0.45;
    for (let i = 0; i < 6; i++) { const c = column(3.4); c.position.set(-2.5 + i, 0.6, 0); temple.add(c); }
    mesh(box(6.6, 0.45, 2.0), 0xe8dcc0, { parent: temple, o: 0.02 }).position.y = 4.4; const ped = mesh(new THREE.CylinderGeometry(1.9, 1.9, 2.0, 3), 0xdcd0b4, { parent: temple, o: 0.025 }); ped.rotation.set(PI / 2, 0, PI / 2 + PI / 6 * 0); ped.rotation.y = 0; ped.position.y = 5.5; ped.rotation.x = PI / 2; ped.scale.set(1, 1, 0.5); ped.rotation.z = 0; ped.rotation.set(PI / 2, 0, 0); ped.rotation.y = PI;
    this.h = hero({ body: TOGA, tie: 0xb03a2e, hat: 'laurel' }, g); this.h.position.set(-0.4, 0, 0.6);
    this.m = mechanism(1.7, 1.35); g.add(this.m); this.m.position.set(0.7, 3.8, 0.4); this.sp = sparkle(g, 18);
  },
  update(t) {
    const h = this.h, u = h.userData, D = cue(0, 'ding'), C = cue(0, 'chime'); idle(h, t); setMouth(h, 'smile');
    const up = ease((t - D + 0.4) / 0.5); u.arms[1].rotation.set(lerp(0, -2.7, up), 0, lerp(0.15, 0.7, up)); u.arms[0].rotation.set(0, 0, -0.3); u.head.rotation.y = 0.2; u.head.rotation.x = -0.15 * up;
    const p = back((t - D + 0.1) / 0.5); this.m.scale.setScalar(Math.max(0.001, p)); this.m.rotation.y = Math.sin(t * 1.2) * 0.25; this.m.position.y = 3.8 + 0.08 * Math.sin(t * 2); spinGears(this.m, t);
    updSparkle(this.sp, t, { x: 0.7, y: 3.8, z: 0.5 }, clamp01((t - C) / 0.8) * (1.4 - 0.4 * clamp01((t - C - 0.8))));
    const k = ease(t / 8); camera.position.set(lerp(0.3, 0.3, k), lerp(2.7, 3.0, k), lerp(15.0, 12.0, k)); camera.lookAt(0.2, lerp(2.4, 2.9, k), 0); camera.rotateZ(0.012);
    return 12;
  }
});

// ============ 1: 1901 — divers find a corroded lump ============
addScene({
  bg: 0x0b4f7a, fog: [0x0b4f7a, 8, 30],
  build(g) {
    skyPlane('#2a9ad0', '#06324f', g, -16); const sea = plane(60, 30, 0x8a7a5a, g); sea.rotation.x = -PI / 2; sea.position.set(0, 0, -6);
    for (let i = 0; i < 10; i++) { const r = mesh(sphere(0.5 + rnd() * 0.5), 0x5a5a5a, { parent: g, o: 0.02 }); r.position.set(-6 + i * 1.4, 0.1, -4 - rnd() * 3); r.scale.y = 0.6; }
    const wreck = new THREE.Group(); g.add(wreck); wreck.position.set(1.8, 0, -3.5);
    mesh(box(5.2, 0.2, 0.4), 0x4a3320, { parent: wreck, o: 0.02 }).position.y = 0.1;
    for (let i = 0; i < 7; i++) for (const s of [-1, 1]) { const rib = mesh(box(0.16, 2.2 - Math.abs(i - 3) * 0.2, 0.16), 0x5a3f28, { parent: wreck, o: 0.02 }); rib.position.set(-2.4 + i * 0.8, 1.0, s * 0.5 * 0.7); rib.rotation.z = (i - 3) * 0.02; rib.rotation.x = s * 0.35; }
    mesh(box(0.2, 3.4, 0.2), 0x5a3f28, { parent: wreck, o: 0.02 }).position.set(-1.6, 1.8, 0); wreck.children[wreck.children.length - 1].rotation.z = 0.5;
    for (let i = 0; i < 4; i++) { const am = mesh(cyl(0.2, 0.7, 12), 0xb86a3a, { parent: g, o: 0.02 }); am.position.set(-3 + i * 1.7, 0.2, 1.5 + (i % 2) * 1.0 - 2.5); am.rotation.z = PI / 2 + i; }
    this.h = hero({ body: 0xd8a020, hat: 'diver' }, g); this.h.position.set(-0.8, 0.35, 0.9);
    const hose = mesh(cyl(0.06, 14, 8), 0x23232b, { parent: g, o: 0.01 }); hose.position.set(0.1, 9.5, 0.6); hose.rotation.z = -0.25;
    this.lump = lump(); this.lump.position.set(0.9, 0.45, 0.4); g.add(this.lump); this.lump.scale.setScalar(1.1);
    this.glow = new THREE.Mesh(new THREE.CircleGeometry(1.0, 32), new THREE.MeshBasicMaterial({ color: 0xfff0a0, transparent: true, opacity: 0.0, depthWrite: false })); this.glow.position.set(0.9, 0.6, 0.2); g.add(this.glow);
    this.bub = []; for (let i = 0; i < 26; i++) { const b = mesh(sphere(0.07 + rnd() * 0.1), 0xdff6ff, { parent: g, o: 0, mat: new THREE.MeshBasicMaterial({ color: 0xdff6ff, transparent: true, opacity: 0.6 }) }); this.bub.push({ b, x: -1.1 + (rnd() - 0.5) * 0.6, s: 0.8 + rnd(), ph: rnd() * 6 }); }
  },
  update(t) {
    const h = this.h, u = h.userData, D = cue(1, 'ding'); idle(h, t * 0.7, { bob: 1.5, sway: 0.5 }); h.position.y = 0.35 + 0.1 * Math.sin(t * 1.3); setMouth(h, t > D ? 'open' : 'flat');
    const pt = ease((t - D + 0.5) / 0.5); u.arms[1].rotation.set(lerp(0, -1.2, pt), 0, lerp(0.2, -1.1, pt)); u.arms[0].rotation.set(0, 0, -0.3); u.head.rotation.y = lerp(0.1, -0.45, pt); if (t > D) fear(h, 1.25);
    this.lump.rotation.y = Math.sin(t) * 0.1; this.glow.material.opacity = (0.15 + 0.1 * Math.sin(t * 4)) * ease((t - D + 0.6) / 0.6); this.glow.scale.setScalar(1 + 0.1 * Math.sin(t * 4));
    this.bub.forEach(o => { o.b.position.set(o.x + Math.sin(t * 2 + o.ph) * 0.15, 2.8 + ((t * o.s + o.ph) % 5) * 1.0, 0.9); });
    hemi.color.setHex(0xa8d8ff); hemi.groundColor.setHex(0x2a4a5a); hemi.intensity = 1.0;
    const k = ease(t / 8.7); camera.position.set(lerp(0.0, 0.3, k), lerp(2.4, 2.0, k), lerp(15.5, 12.4, k)); camera.lookAt(lerp(0.0, 0.1, k), 1.6, 0); camera.rotateZ(0.015);
    return 12;
  }
});

// ============ 2: nobody understood ============
addScene({
  bg: 0xd9c9a0, fog: [0xd9c9a0, 18, 50],
  build(g) {
    plane(40, 16, 0xdccfa8, g).position.set(0, 5, -4); floorP(g, 0x8a7050); for (const x of [-3.4, 3.4]) { const c = column(6.6, 0.4); c.position.set(x, 0, -3.5); g.add(c); }
    const tb = mesh(box(2.6, 0.2, 1.3), 0x6a4a2a, { parent: g, o: 0.02 }); tb.position.set(0, 1.2, -0.4); for (const x of [-1.1, 1.1]) mesh(box(0.16, 1.2, 0.16), 0x5a3a20, { parent: g, o: 0.015 }).position.set(x, 0.6, -0.5);
    this.l = lump(); this.l.position.set(0, 1.55, -0.4); g.add(this.l);
    this.a = hero({ body: 0x6a4a2a, glasses: true, beard: 0xefefef }, g); this.a.position.set(-1.25, 0, 0.4); this.b = hero({ body: 0x2a4a6a, mustache: true, hat: 'fedora', hatColor: 0x3a3a42 }, g); this.b.position.set(1.25, 0, 0.4);
    this.q = [0, 1, 2].map(() => { const q = qMark(); g.add(q); return q; });
  },
  update(t) {
    const a = this.a, b = this.b, au = a.userData, bu = b.userData; idle(a, t); idle(b, t + 1); setMouth(a, 'flat'); setMouth(b, 'frown');
    au.arms[1].rotation.set(-2.3 + Math.sin(t * 6) * 0.25, 0, 0.5); au.arms[0].rotation.set(-0.4, 0, -0.3); au.head.rotation.y = 0.5; au.head.rotation.x = 0.2;
    bu.arms[0].rotation.set(-1.9, 0, -0.9 + Math.sin(t * 2) * 0.1); bu.arms[1].rotation.set(-0.4, 0, 0.3); bu.head.rotation.y = -0.5; bu.head.rotation.x = 0.2; this.l.rotation.y = t * 0.6;
    this.q.forEach((q, i) => { const k = back((t - 0.3 - i * 0.5) / 0.4); q.scale.setScalar(Math.max(0.001, k)); q.position.set([-1.25, 0.0, 1.25][i], [4.4, 3.6, 4.4][i] + 0.1 * Math.sin(t * 3 + i), 0.8); q.rotation.z = Math.sin(t * 2 + i) * 0.15; });
    const k = ease(t / 3); camera.position.set(0, lerp(2.8, 2.6, k), lerp(16.0, 13.6, k)); camera.lookAt(0, 2.6, 0); camera.rotateZ(-0.01);
    return 12;
  }
});

// ============ 3: decades of research — the scan reveals gears ============
addScene({
  bg: 0xcfd8e0, fog: [0xcfd8e0, 18, 50],
  build(g) {
    plane(40, 16, 0xdde5ec, g).position.set(0, 5, -4); floorP(g, 0x9aa5b0);
    this.cv = document.createElement('canvas'); this.cv.width = 512; this.cv.height = 400; this.stex = new THREE.CanvasTexture(this.cv); this.stex.colorSpace = THREE.SRGBColorSpace;
    mesh(box(3.9, 3.1, 0.2), 0x23232b, { parent: g, o: 0.03 }).position.set(0.3, 4.2, -3.3); texPlane(3.6, 2.8, this.stex, g).position.set(0.3, 4.2, -3.18);
    const tb = mesh(box(2.2, 0.2, 1.3), 0x7a7f88, { parent: g, o: 0.02 }); tb.position.set(-0.4, 1.1, -0.2); mesh(cyl(0.12, 1.1, 10), 0x5a5f68, { parent: g, o: 0.015 }).position.set(-0.4, 0.55, -0.2);
    this.l = lump(); this.l.position.set(-0.4, 1.5, -0.2); g.add(this.l); this.l.scale.setScalar(1.15);
    this.m = mechanism(1.6, 1.3); this.m.position.set(-0.4, 2.0, -0.1); g.add(this.m); this.m.scale.setScalar(0.001);
    this.beam = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.12), new THREE.MeshBasicMaterial({ color: 0x5affff, transparent: true, opacity: 0.85 })); this.beam.position.set(-0.4, 1.5, 0.5); g.add(this.beam);
    this.sci = hero({ body: COAT, glasses: true, mustache: true }, g); this.sci.position.set(1.5, 0, 0.5); this.sp = sparkle(g, 18, 0x7affff);
  },
  update(t) {
    const C = cue(3, 'chime'), sci = this.sci, su = sci.userData; idle(sci, t); su.arms[1].rotation.set(-2.2, 0, 0.5 + Math.sin(t * 3) * 0.1); su.arms[0].rotation.set(0, 0, -0.3); su.head.rotation.y = -0.5; setMouth(sci, t > C ? 'open' : 'flat'); if (t > C) fear(sci);
    const sy = 1.0 + 0.7 * (0.5 + 0.5 * Math.sin(t * 3.2)); this.beam.position.y = sy; this.beam.visible = t < C + 0.3;
    const rv = clamp01((t - C) / 0.5); this.l.scale.setScalar(Math.max(0.001, 1.15 * (1 - ease(rv)))); this.m.scale.setScalar(Math.max(0.001, 1.0 * back((t - C) / 0.6))); spinGears(this.m, t); this.l.rotation.y = t * 0.8;
    updSparkle(this.sp, t, { x: -0.4, y: 2.0, z: 0.4 }, clamp01((t - C) / 0.6) * 1.5);
    const x = this.cv.getContext('2d'); x.fillStyle = '#06222c'; x.fillRect(0, 0, 512, 400); x.strokeStyle = '#1e5a6a'; x.lineWidth = 1; for (let i = 0; i < 20; i++) { x.beginPath(); x.moveTo(i * 26, 0); x.lineTo(i * 26, 400); x.moveTo(0, i * 22); x.lineTo(512, i * 22); x.stroke(); }
    const pr = clamp01((t - 0.2) / (C - 0.2)); x.strokeStyle = `rgba(90,255,255,${0.2 + 0.8 * pr})`; x.lineWidth = 6;
    [[150, 130, 70], [290, 160, 54], [390, 110, 44], [230, 290, 62], [380, 290, 50]].forEach(([cx, cy, r], i) => { if (pr > i / 6) { x.beginPath(); x.arc(cx, cy, r, 0, 2 * PI * clamp01(pr * 1.4 - i * 0.15)); x.stroke(); for (let k = 0; k < 14; k++) { const a = k / 14 * 2 * PI + t * (i % 2 ? -0.3 : 0.3); x.beginPath(); x.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); x.lineTo(cx + Math.cos(a) * (r + 12), cy + Math.sin(a) * (r + 12)); x.stroke(); } } });
    this.stex.needsUpdate = true;
    const k = ease(t / 3.6); camera.position.set(lerp(0.3, 0.4, k), 2.8, lerp(15.8, 13.2, k)); camera.lookAt(0.3, 2.6, 0); camera.rotateZ(0.01);
    return 12;
  }
});

// ============ 4: the Antikythera Mechanism ============
addScene({
  bg: 0x2a2018, fog: [0x2a2018, 14, 40],
  build(g) {
    plane(40, 16, 0x3a2c20, g).position.set(0, 5, -4); floorP(g, 0x241a14);
    const cone = new THREE.Mesh(new THREE.ConeGeometry(2.8, 9, 32, 1, true), new THREE.MeshBasicMaterial({ color: 0xffe9b0, transparent: true, opacity: 0.1, side: THREE.DoubleSide, depthWrite: false })); cone.position.set(0.2, 4.6, -0.5); g.add(cone);
    this.m = mechanism(3.3, 2.7); this.m.position.set(0.2, 3.2, -0.4); g.add(this.m);
    mesh(box(1.4, 1.6, 0.9), 0x5a4a38, { parent: g, o: 0.03 }).position.set(0.2, 0.8, -0.4);
    this.sign = signBoard([['ANTIKYTHERA', '#ffd23f'], ['MECHANISM', '#fff3d0']], { w: 3.6, h: 1.5, bg: '#2a1a0e', hl: '#c98a3a' }); this.sign.position.set(0.2, 6.2, -0.2); g.add(this.sign);
    this.h = hero({ body: COAT, glasses: true, beard: 0xefefef }, g); this.h.position.set(-1.35, 0, 0.5); this.h.scale.setScalar(0.9); this.sp = sparkle(g, 22);
  },
  update(t) {
    const h = this.h, u = h.userData, D = cue(4, 'ding'), C = cue(4, 'chime'); idle(h, t); setMouth(h, 'smile'); u.arms[0].rotation.set(-2.6, 0, -0.5); u.arms[1].rotation.set(-2.6, 0, 0.5); u.head.rotation.x = -0.25; u.head.rotation.y = 0.3; fear(h, 1.15);
    spinGears(this.m, t * 1.3); this.m.rotation.y = Math.sin(t * 0.8) * 0.12;
    const p = back((t - D + 0.05) / 0.5); this.sign.scale.setScalar(Math.max(0.001, p)); this.sign.rotation.z = (1 - clamp01(p)) * 0.4 + Math.sin(t * 1.6) * 0.012;
    updSparkle(this.sp, t, { x: 0.2, y: 3.2, z: 0.2 }, clamp01((t - C + 0.2) / 0.6) * 1.9 * (1 - 0.5 * clamp01(t - C - 1.5)));
    const k = ease(t / 6.8); camera.position.set(lerp(0.3, 0.2, k), lerp(3.0, 3.5, k), lerp(16.0, 13.0, k)); camera.lookAt(0.2, lerp(3.2, 3.6, k), 0); camera.rotateZ(-0.01);
    return 12;
  }
});

// ============ 5: Sun, Moon, eclipses, cycles ============
addScene({
  bg: 0x6fb4ee, fog: [0x6fb4ee, 30, 80],
  build(g) {
    this.sk = skyPlane('#4fa8f0', '#cfe9ff', g, -20); floorP(g, 0x8a7a5a);
    this.stars = []; for (let i = 0; i < 40; i++) { const s = new THREE.Mesh(box(0.08, 0.08, 0.02), basic(0xffffff)); s.position.set((rnd() - 0.5) * 12, 3.5 + rnd() * 8, -10); g.add(s); this.stars.push(s); }
    this.sun = new THREE.Group(); g.add(this.sun); const sd = mesh(cyl(1.2, 0.1, 40), 0xffd23f, { parent: this.sun, o: 0.03, mat: basic(0xffd23f) }); sd.rotation.x = PI / 2; for (let i = 0; i < 12; i++) { const r = mesh(box(0.14, 0.7, 0.04), 0xffb020, { parent: this.sun, o: 0, mat: basic(0xffb020) }); const a = i / 12 * 2 * PI; r.position.set(Math.sin(a) * 1.8, Math.cos(a) * 1.8, 0); r.rotation.z = -a; }
    this.sun.position.set(0, 7.2, -8); this.corona = new THREE.Mesh(new THREE.TorusGeometry(1.45, 0.14, 12, 48), new THREE.MeshBasicMaterial({ color: 0xfff0a0 })); this.corona.position.set(0, 7.2, -7.8); g.add(this.corona);
    this.moon = mesh(cyl(1.25, 0.1, 40), 0xb8bcc6, { parent: g, o: 0.03 }); this.moon.rotation.x = PI / 2; this.moon.position.set(-6, 7.2, -7.7);
    mesh(sphere(0.2), 0x8a8e98, { parent: this.moon, o: 0 }).position.set(0.4, 0.3, 0.2);
    this.dial = new THREE.Group(); g.add(this.dial); this.dial.position.set(0, 2.4, -1);
    const face = mesh(cyl(1.9, 0.2, 48), 0xa77a3c, { parent: this.dial, o: 0.03 }); face.rotation.x = PI / 2; this.ticks = [];
    for (let i = 0; i < 60; i++) { const a = i / 60 * 2 * PI, tk = mesh(box(0.05, i % 5 ? 0.14 : 0.3, 0.04), 0x3a2410, { parent: this.dial, o: 0 }); tk.position.set(Math.sin(a) * 1.65, Math.cos(a) * 1.65, 0.12); tk.rotation.z = -a; }
    this.hand1 = mesh(box(0.1, 1.4, 0.05), 0x14101c, { parent: this.dial, o: 0 }); this.hand2 = mesh(box(0.07, 1.0, 0.05), 0x8a1a1a, { parent: this.dial, o: 0 }); this.hand1.position.z = this.hand2.position.z = 0.16;
    this.dial.userData.g2 = gear(0.6, 12); this.dial.add(this.dial.userData.g2); this.dial.userData.g2.position.set(1.2, -0.9, 0.2);
    this.sci = hero({ body: COAT, glasses: true, beard: 0xefefef }, g); this.sci.position.set(-1.9, 0, 0.9); this.dayCol = new THREE.Color(0x6fb4ee); this.nightCol = new THREE.Color(0x0a1230);
  },
  update(t) {
    const E = cue(5, 'ding'); const mx = lerp(-6, 6, clamp01(t / (2 * E))); this.moon.position.x = mx; const ov = clamp01(1 - Math.abs(mx) / 1.3), dk = ov * ov;
    this.sk.material.color.setRGB(lerp(1, 0.18, dk), lerp(1, 0.2, dk), lerp(1, 0.36, dk)); scene.background = new THREE.Color().lerpColors(this.dayCol, this.nightCol, dk); scene.fog.color.copy(scene.background);
    this.sun.rotation.z = t * 0.3; this.corona.visible = ov > 0.55; this.corona.scale.setScalar(1 + 0.04 * Math.sin(t * 9)); this.stars.forEach(s => s.visible = dk > 0.45); hemi.intensity = lerp(1.1, 0.5, dk);
    this.hand1.position.set(0, 0, 0.16); this.hand1.rotation.z = -t * 0.5; this.hand1.position.set(Math.sin(t * 0.5) * 0.7, Math.cos(t * 0.5) * 0.7, 0.16); this.hand2.rotation.z = -t * 0.12 + 1; this.hand2.position.set(Math.sin(t * 0.12 - 1) * 0.5, Math.cos(t * 0.12 - 1) * 0.5, 0.17);
    this.dial.userData.g2.rotation.z = t * 1.3; this.dial.rotation.z = 0;
    const h = this.sci, u = h.userData; idle(h, t); u.arms[1].rotation.set(-2.6, 0, 0.4); u.arms[0].rotation.set(0, 0, -0.3); u.head.rotation.x = -0.35; setMouth(h, 'open'); fear(h, 1.2);
    const k = ease(t / 9); camera.position.set(0, lerp(3.4, 3.8, k), lerp(16.0, 14.0, k)); camera.lookAt(0, 4.8, 0); camera.rotateZ(0.008);
    return 14;
  }
});

// ============ 6: 100 BC — an ancient mechanical computer ============
addScene({
  bg: 0xf3b575, fog: [0xf3b575, 18, 56], flashIn: 0.2,
  build(g) {
    skyPlane('#ff9a5a', '#ffe8a8', g); floorP(g, 0xe0c898);
    for (const x of [-4, 4]) { const c = column(7, 0.45); c.position.set(x, 0, -4); g.add(c); }
    mesh(cyl(0.9, 1.2, 24), 0xe8dcc0, { parent: g, o: 0.03 }).position.set(-1.35, 0.6, 0); this.m = mechanism(1.7, 1.35); this.m.position.set(-1.35, 2.2, 0.1); g.add(this.m);
    mesh(cyl(0.9, 1.2, 24), 0xcfd5de, { parent: g, o: 0.03 }).position.set(1.35, 0.6, 0);
    const lap = new THREE.Group(); g.add(lap); lap.position.set(1.35, 1.25, 0.1); mesh(box(1.5, 0.1, 1.0), 0x9aa5b0, { parent: lap, o: 0.02 }); const scr = new THREE.Group(); lap.add(scr); scr.position.set(0, 0.05, -0.5); scr.rotation.x = -0.2; mesh(box(1.5, 1.0, 0.06), 0x3a3f4a, { parent: scr, o: 0.02 }).position.y = 0.5;
    const stex = canvasTex(256, 170, (x, w, h) => { x.fillStyle = '#0a2a40'; x.fillRect(0, 0, w, h); x.fillStyle = '#5affb0'; x.font = `900 22px ${FONT}`; x.textAlign = 'left'; ['> SUN: OK', '> MOON: OK', '> ECLIPSE: 2026', '> _'].forEach((s, i) => x.fillText(s, 18, 40 + i * 32)); }); texPlane(1.36, 0.9, stex, scr).position.set(0, 0.5, 0.04);
    this.eq = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.2), new THREE.MeshBasicMaterial({ map: canvasTex(128, 128, (x, w, h) => { x.font = `900 120px ${FONT}`; x.textAlign = 'center'; x.lineWidth = 16; x.strokeStyle = '#14101c'; x.strokeText('=', w / 2, 100); x.fillStyle = '#ffd23f'; x.fillText('=', w / 2, 100); }), transparent: true })); this.eq.position.set(0, 2.2, 0.6); g.add(this.eq);
    this.h = hero({ body: TOGA, tie: 0xb03a2e, hat: 'laurel' }, g); this.h.position.set(0, 0, 1.6); this.h.scale.setScalar(0.9);
  },
  update(t) {
    const h = this.h, u = h.userData, D = cue(6, 'ding'); idle(h, t); setMouth(h, 'smile'); u.arms[0].rotation.set(-0.5, 0, -1.3); u.arms[1].rotation.set(-0.5, 0, 1.3); u.head.rotation.y = Math.sin(t * 1.4) * 0.5;
    spinGears(this.m, t * 1.2); this.m.rotation.y = 0.2 + Math.sin(t) * 0.1; const p = back((t - D + 1.2) / 0.5); this.eq.scale.setScalar(Math.max(0.001, p) * (1 + 0.06 * Math.sin(t * 6)));
    const k = ease(t / 5.7); camera.position.set(0, lerp(2.6, 3.0, k), lerp(16.5, 14.2, k)); camera.lookAt(0, 2.4, 0); camera.rotateZ(0.012);
    return 13;
  }
});

// ============ 7: historians struggle ============
addScene({
  bg: 0x3a5a46, fog: [0x3a5a46, 18, 50],
  build(g) {
    plane(40, 16, 0x6a5a40, g).position.set(0, 5, -4); floorP(g, 0x7a6040);
    mesh(box(5.0, 3.0, 0.2), 0x6a4a28, { parent: g, o: 0.03 }).position.set(0, 4.2, -3.5);
    const tex = canvasTex(768, 440, (x, w, h) => { x.fillStyle = '#23402f'; x.fillRect(0, 0, w, h); x.strokeStyle = '#e8f0e0'; x.lineWidth = 5; x.fillStyle = '#e8f0e0'; for (const [cx, cy, r] of [[120, 120, 60], [250, 170, 44], [360, 100, 38], [600, 150, 70]]) { x.beginPath(); x.arc(cx, cy, r, 0, 2 * PI); x.stroke(); for (let k = 0; k < 12; k++) { const a = k / 12 * 2 * PI; x.beginPath(); x.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); x.lineTo(cx + Math.cos(a) * (r + 12), cy + Math.sin(a) * (r + 12)); x.stroke(); } } x.font = `900 80px ${FONT}`; x.textAlign = 'center'; x.fillText('E = ???', 220, 340); x.fillText('HOW??', 560, 380); x.beginPath(); x.moveTo(60, 230); x.bezierCurveTo(200, 200, 300, 280, 440, 240); x.stroke(); });
    texPlane(4.8, 2.8, tex, g).position.set(0, 4.2, -3.38);
    this.s = [hero({ body: 0x6a4a2a, glasses: true, beard: 0xefefef }, g), hero({ body: 0x2a4a6a, mustache: true, hat: 'fedora', hatColor: 0x3a3a42 }, g), hero({ body: 0x5a2a3a, glasses: true }, g)]; [-1.4, 0, 1.4].forEach((x, i) => this.s[i].position.set(x, 0, 0.6 - (i === 1 ? 0.4 : 0)));
    this.puffs = []; for (let i = 0; i < 18; i++) { const m = mesh(sphere(0.3), 0xf4f4f8, { parent: g, o: 0.02 }); this.puffs.push({ m, i }); }
    this.q = [0, 1, 2].map(() => { const q = qMark(); g.add(q); return q; });
  },
  update(t) {
    this.s.forEach((h, i) => { const u = h.userData; idle(h, t + i); u.arms[i % 2].rotation.set(-2.8 + Math.sin(t * 7 + i) * 0.3, 0, (i % 2 ? -1 : 1) * 0.4); u.arms[(i + 1) % 2].rotation.set(-0.4, 0, (i % 2 ? 1 : -1) * 0.3); u.head.rotation.y = Math.sin(t * 2 + i) * 0.4; u.head.rotation.x = 0.1; setMouth(h, i === 1 ? 'open' : 'frown'); fear(h, 1.25); });
    this.puffs.forEach(({ m, i }) => { const who = i % 3, k = ((t * 0.7 + i / 18) % 1); m.position.set(this.s[who].position.x + Math.sin(k * 8 + i) * 0.25, 3.2 + k * 2.4, this.s[who].position.z); m.scale.setScalar(0.3 + k * 0.7); m.visible = t > 0.8; });
    this.q.forEach((q, i) => { const k = back((t - 0.4 - i * 0.6) / 0.4); q.scale.setScalar(Math.max(0.001, k)); q.position.set([-1.4, 0, 1.4][i], 5.3 + 0.1 * Math.sin(t * 3 + i), 0.9); q.rotation.z = Math.sin(t * 2 + i) * 0.15; });
    const k = ease(t / 7.8); camera.position.set(0, lerp(2.8, 3.0, k), lerp(15.0, 12.6, k)); camera.lookAt(0, 3.0, 0); camera.rotateZ(-0.01);
    return 13;
  }
});

// ============ 8: no other machine like it ============
addScene({
  bg: 0x0d0b16, fog: [0x0d0b16, 10, 34],
  build(g) {
    plane(40, 16, 0x15122a, g).position.set(0, 5, -5); floorP(g, 0x1c1830);
    this.peds = []; [-2.6, -1.3, 0, 1.3, 2.6].forEach((x, i) => { const p = mesh(cyl(0.55, 1.4, 20), i === 2 ? 0xe8dcc0 : 0x3a3550, { parent: g, o: 0.03 }); p.position.set(x, 0.7, -2.2 - (i === 2 ? 0 : 0.4)); this.peds.push(p); });
    this.m = mechanism(1.3, 1.1); this.m.position.set(0, 2.2, -2.2); g.add(this.m);
    const cone = new THREE.Mesh(new THREE.ConeGeometry(1.6, 9, 32, 1, true), new THREE.MeshBasicMaterial({ color: 0xffe9b0, transparent: true, opacity: 0.13, side: THREE.DoubleSide, depthWrite: false })); cone.position.set(0, 4.6, -2.2); g.add(cone);
    this.q = [-2.6, -1.3, 1.3, 2.6].map(x => { const q = qMark('#8a7aff'); q.position.set(x, 2.1, -2.5); g.add(q); return q; });
    this.h = hero({ body: 0x6a4a2a, glasses: true, beard: 0xefefef }, g); this.h.position.set(-1.7, 0, 0.3); this.h.scale.setScalar(0.85); this.fl = new THREE.Mesh(new THREE.ConeGeometry(1.0, 3.5, 24, 1, true), new THREE.MeshBasicMaterial({ color: 0xfff1c0, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false })); this.fl.rotation.z = -PI / 2 + 0.3; g.add(this.fl);
  },
  update(t) {
    const h = this.h, u = h.userData; idle(h, t); u.arms[1].rotation.set(-1.4, 0, 0.3); u.arms[0].rotation.set(0, 0, -0.3); u.head.rotation.y = 0.5; setMouth(h, 'flat'); u.head.rotation.x = 0.05; this.fl.position.set(-0.6, 1.5, 0.5);
    spinGears(this.m, t); this.m.rotation.y = Math.sin(t * 0.7) * 0.12; hemi.intensity = 0.55; sun.intensity = 0.7; hemi.color.setHex(0x9aa0ff);
    const tn = wordT(8, 'surviving'); this.q.forEach((q, i) => { const k = back((t - tn - i * 0.35) / 0.4); q.scale.setScalar(Math.max(0.001, k)); q.position.y = 2.1 + 0.1 * Math.sin(t * 3 + i); });
    const k = ease(t / 6.4); camera.position.set(0, lerp(2.4, 2.6, k), lerp(15.0, 12.4, k)); camera.lookAt(0, 1.9, -1); camera.rotateZ(0.01);
    return 12;
  }
});

// ============ 9: who built it? ============
addScene({
  bg: 0x2a1a4a, fog: [0x2a1a4a, 20, 70],
  build(g) {
    skyPlane('#1a1040', '#ff8a5a', g); this.st = []; for (let i = 0; i < 50; i++) { const s = new THREE.Mesh(box(0.08, 0.08, 0.02), basic(0xffffff)); s.position.set((rnd() - 0.5) * 22, 3.5 + rnd() * 12, -14); g.add(s); this.st.push(s); }
    floorP(g, 0x2a1a3a); for (let i = 0; i < 7; i++) { const c = column(2.0 + rnd() * 3.2, 0.34); c.position.set(-6 + i * 2.0, 0, -5 - (i % 2) * 1.2); c.rotation.z = (rnd() - 0.5) * 0.12; g.add(c); c.children.forEach(ch => { if (ch.material) ch.material.color && ch.material.color.setHex(0x4a2e5a); }); }
    this.h = hero({ body: TOGA, tie: 0xb03a2e, hat: 'laurel' }, g); this.h.position.set(0, 0, 1.0); this.q = qMark('#ffd23f'); this.q.scale.setScalar(2.6); g.add(this.q); this.q.position.set(0, 5.6, 0.2);
    this.gs = [0, 1, 2, 3].map(i => { const ge = gear(0.35 + i * 0.05, 10 + i); g.add(ge); return ge; }); this.sign = signBoard([['WHO BUILT IT?', '#ffd23f']], { w: 3.6, h: 1.1, bg: '#2a1a4a', hl: '#ffd23f' }); this.sign.position.set(0, 3.8, 0.4); g.add(this.sign);
  },
  update(t) {
    const h = this.h, u = h.userData, D = cue(9, 'ding'); idle(h, t, { sway: 0.6 }); u.arms[0].rotation.set(0, 0, -0.3); u.arms[1].rotation.set(-0.8, 0, 0.5); u.head.rotation.x = -0.35; setMouth(h, 'flat'); u.eyes.forEach(e => e.scale.y *= 0.8);
    this.q.position.y = 5.8 + 0.12 * Math.sin(t * 1.8); this.q.scale.setScalar(2.6 * (0.9 + 0.1 * Math.sin(t * 3)));
    this.gs.forEach((g2, i) => { const a = t * 0.7 + i * PI / 2; g2.position.set(Math.cos(a) * 2.3, 5.6 + Math.sin(a) * 1.3, 0); g2.rotation.z = t * (i % 2 ? -1 : 1); });
    const p = back((t - D + 0.05) / 0.5); this.sign.scale.setScalar(Math.max(0.001, p)); this.sign.rotation.z = (1 - clamp01(p)) * 0.4 + Math.sin(t * 1.6) * 0.012; this.st.forEach((s, i) => s.scale.setScalar(0.6 + 0.5 * Math.sin(t * 3 + i)));
    hemi.color.setHex(0xffb890); hemi.groundColor.setHex(0x3a2a5a); hemi.intensity = 0.9;
    const k = ease(t / 5.5); camera.position.set(0, lerp(2.6, 3.4, k), lerp(12.0, 14.5, k)); camera.lookAt(0, lerp(3.2, 4.2, k), 0); camera.rotateZ(-0.01);
    return 13;
  }
});

// ================= overlays =================
const $ = id => document.getElementById(id);
const capEl = $('cap'), stampEl = $('stamp'), flashEl = $('flash'), badgeEl = $('badge'), fadeEl = $('fade');
const EMPH = /^(computer|future|1901|mysterious|extraordinary|antikythera|mechanism|gears|eclipses|bc|mystery|who|lost|history|sophisticated|advanced)/i;
function caption(t, si) {
  const T = T_(si), words = T.words; let cur = null;
  for (const w of words) if (t >= w.s) cur = w;
  if (!cur || (si === SCENES.length - 1 ? false : t > T.dur - 0.12)) { capEl.style.opacity = 0; return; }
  capEl.textContent = cur.w; capEl.style.opacity = 1;
  const big = EMPH.test(norm(cur.w)); capEl.style.color = big ? '#ffd23f' : '#fff';
  capEl.style.transform = `scale(${(0.6 + 0.4 * back((t - cur.s) / 0.16)) * (big ? 1.12 : 1)})`;
  capEl.style.fontSize = (cur.w.length > 12 ? 84 : 112) + 'px';
}
const BADGES = {
  4: [['DOZENS OF GEARS', () => cue(4, 'chime') - 0.2, '#ffd23f']],
  5: [['SUN + MOON', () => wordT(5, 'sun') - 0.1, '#ffd23f'], ['ECLIPSES', () => cue(5, 'ding'), '#ffffff'], ['COSMIC CYCLES', () => wordT(5, 'astronomical'), '#7affff']],
  6: [['ANCIENT COMPUTER', () => cue(6, 'ding'), '#7dff6a']],
  8: [['NOTHING ELSE FOUND', () => cue(8, 'ding'), '#ff8a6a']],
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
  if (toEnd < 0.08 && si !== SCENES.length - 1) fl = Math.max(fl, (1 - toEnd / 0.08) * 0.85);
  flashEl.style.opacity = Math.min(1, fl);
  const st = T.stamp; stampEl.textContent = st; stampEl.style.fontSize = Math.min(140, 900 / (Math.max(st.length, 4) * 0.8)) + 'px';
  stampEl.style.opacity = st && toEnd > 0.2 ? 1 : 0;
  stampEl.style.transform = `translateX(${(1 - ease((lt - 0.1) / 0.4)) * -700}px) rotate(-4deg) scale(${0.9 + 0.1 * back((lt - 0.1) / 0.4)})`;
  const bl = (BADGES[si] || []).filter(b => lt >= b[1]()).pop();
  if (bl) { badgeEl.style.top = si === 4 ? '660px' : '330px'; badgeEl.style.opacity = toEnd > 0.2 ? 1 : 0; badgeEl.textContent = bl[0]; badgeEl.style.color = bl[2]; badgeEl.style.fontSize = (bl[0].length > 12 ? 84 : 120) + 'px'; badgeEl.style.transform = `scale(${0.5 + 0.5 * back((lt - bl[1]()) / 0.25)}) rotate(3deg)`; } else badgeEl.style.opacity = 0;
  fadeEl.style.opacity = si === SCENES.length - 1 ? clamp01(1 - (toEnd - 0.1) / 0.9) : 0;
  caption(lt, si);
  composer.render();
};
window.TOTAL = TIMING.total;
window.ready = true;
