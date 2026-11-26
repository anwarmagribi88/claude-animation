import {
  THREE, PI, scene, camera, composer, bokeh, hemi, sun, mesh, sphere, box, cyl, basic, outlineMat, ease, inout, back, lerp, clamp01,
  canvasTex, texPlane, FONT, fitText, sky, hero, idle, hold, walk, setMouth
} from './toon.js';

const TIMING = await (await fetch('beer.timing.json')).json();
const SCENES = [];
const T_ = si => TIMING.scenes[si];
const norm = w => w.toLowerCase().replace(/[^a-z0-9]/g, '');
const wordT = (si, word) => { const w = T_(si).words.find(o => norm(o.w) === word); return w ? w.s : 0; };
const cue = (si, name) => T_(si).cues[name] ?? 0;
const rnd = (seed => () => (seed = (seed * 9301 + 49297) % 233280) / 233280)(9);
const INK = 0x14101c, AMBER = 0xe9a31c, FOAM = 0xfff3d0, BRICK = 0xb5533c;
function addScene(def) { const g = new THREE.Group(); g.visible = false; scene.add(g); def.root = g; def.i = SCENES.length; def.build(g); SCENES.push(def); }
const plane = (w, h, color, parent) => mesh(new THREE.PlaneGeometry(w, h), color, { o: 0, parent });
const skyPlane = (top, bot, parent, z = -26) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(120, 60), new THREE.MeshBasicMaterial({ map: sky(top, bot) })); m.position.set(0, 12, z); parent.add(m); return m; };
const ground = (parent, color) => { const f = plane(100, 60, color, parent); f.rotation.x = -PI / 2; f.position.z = -20; return f; };
const brickTex = canvasTex(256, 256, (x, w, h) => { x.fillStyle = '#b5533c'; x.fillRect(0, 0, w, h); x.strokeStyle = '#7a3524'; x.lineWidth = 5; for (let r = 0; r < 8; r++) { x.beginPath(); x.moveTo(0, r * 32); x.lineTo(w, r * 32); x.stroke(); for (let c = 0; c < 4; c++) { const o = (r % 2) * 32; x.beginPath(); x.moveTo(c * 64 + o, r * 32); x.lineTo(c * 64 + o, r * 32 + 32); x.stroke(); } } });
brickTex.wrapS = brickTex.wrapT = THREE.RepeatWrapping;
const brickWall = (w, h, parent) => { const t = brickTex.clone(); t.needsUpdate = true; t.repeat.set(w / 2, h / 2); const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: t })); parent.add(m); return m; };
function terrace(w = 1.6, h = 2.0, d = 1.4, color = BRICK) {  // georgian brick house, flat slate roof, chimney, windows
  const g = new THREE.Group();
  mesh(box(w, h, d), color, { parent: g, o: 0.02 }).position.y = h / 2;
  const rf = mesh(box(w * 1.06, 0.16, d * 1.06), 0x3a3f4a, { parent: g, o: 0.015 }); rf.position.y = h + 0.08;
  const ch = mesh(box(0.28, 0.5, 0.28), 0x7a3524, { parent: g, o: 0.015 }); ch.position.set(w * 0.28, h + 0.4, 0);
  for (const r of [0.3, 0.68]) for (const s of [-1, 1]) { const wn = mesh(box(w * 0.2, h * 0.2, 0.03), 0xf6ecd0, { parent: g, o: 0.008 }); wn.position.set(s * w * 0.25, h * (0.28 + r * 0.7), d / 2 + 0.01); const gl = mesh(box(w * 0.14, h * 0.15, 0.04), 0x2b3a55, { parent: g, o: 0 }); gl.position.copy(wn.position); gl.position.z += 0.01; }
  const dr = mesh(box(w * 0.2, h * 0.34, 0.03), 0x2a5a4a, { parent: g, o: 0.008 }); dr.position.set(0, h * 0.17, d / 2 + 0.01);
  return g;
}
function lamp() { const g = new THREE.Group(); mesh(cyl(0.06, 3.4, 8), 0x2b2b35, { parent: g, o: 0.012 }).position.y = 1.7; const l = mesh(box(0.34, 0.44, 0.34), 0xffe08a, { parent: g, o: 0.02, mat: basic(0xffe08a) }); l.position.y = 3.6; mesh(cyl(0.02, 0.05, 6), INK, { parent: g, o: 0 }).position.y = 3.9; return g; }
function mugObj() { const g = new THREE.Group(); mesh(cyl(0.17, 0.3, 16), AMBER, { parent: g, o: 0.014 }); const f = mesh(sphere(0.18), FOAM, { parent: g, o: 0.012 }); f.position.y = 0.17; f.scale.y = 0.6; const hd = mesh(new THREE.TorusGeometry(0.1, 0.03, 8, 16), 0xdddddd, { parent: g, o: 0.006 }); hd.position.x = 0.22; const w = new THREE.Group(); g.position.y = -0.12; w.add(g); return w; }
function barrel(r = 0.5, h = 0.9) { const g = new THREE.Group(); mesh(cyl(r, h, 18), 0x9a6a38, { parent: g, o: 0.02 }); for (const y of [-h * 0.3, h * 0.3]) { const t = mesh(new THREE.TorusGeometry(r + 0.01, 0.035, 8, 24), 0x2b2b35, { parent: g, o: 0.006 }); t.rotation.x = PI / 2; t.position.y = y; } return g; }
function waveObj(width = 6, depth = 1.6) { // beer slab with foam
  const g = new THREE.Group(); const body = mesh(box(width, 1, depth), AMBER, { parent: g, o: 0.035 }); const foam = [], n = Math.round(width / 0.8);
  for (let i = 0; i < n; i++) { const f = mesh(sphere(0.5), FOAM, { parent: g, o: 0.025 }); f.userData.x = -width / 2 + (i + 0.5) * width / n; foam.push(f); }
  g.userData = { body, foam, depth }; return g;
}
function setWave(g, h, t) { const u = g.userData; u.body.scale.y = Math.max(0.01, h); u.body.position.y = h / 2; u.foam.forEach((f, i) => { f.position.set(f.userData.x, h + 0.05 + 0.1 * Math.sin(t * 5 + i), (i % 2 - 0.5) * u.depth * 0.5); f.scale.setScalar(0.85 + 0.2 * Math.sin(t * 4 + i * 1.7)); }); }
function drops(parent, n, color = AMBER) { const a = []; for (let i = 0; i < n; i++) { const m = mesh(sphere(0.1 + rnd() * 0.12), i % 4 ? color : FOAM, { parent, o: 0.01 }); a.push({ m, vx: (rnd() - 0.5) * 9, vy: 3 + rnd() * 7, vz: 1 + rnd() * 5 }); } return a; }
function updDrops(arr, at, o, show) { arr.forEach(d => { const k = Math.max(0, at); d.m.visible = show && k > 0 && k < 2.6; d.m.position.set(o.x + d.vx * k, o.y + d.vy * k - 7 * k * k, o.z + d.vz * k); }); }
const fear = (h, k = 1.35) => h.userData.eyes.forEach(e => e.scale.set(k, k, 1));
const shakeCam = (amp, t) => { camera.position.x += Math.sin(t * 61) * amp; camera.position.y += Math.cos(t * 53) * amp; };
const wetBody = 0xb98a2a;

// ============ 0: wake up to a wave of beer ============
addScene({
  bg: 0xcdb089, fog: [0xcdb089, 18, 50],
  build(g) {
    const wp = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: canvasTex(128, 128, (x, w, h) => { x.fillStyle = '#e8d6a8'; x.fillRect(0, 0, w, h); x.fillStyle = '#d3b878'; for (let i = 0; i < 8; i++) x.fillRect(i * 16 + 4, 0, 6, h); }) }));
    const wall = (x0, x1, y0, y1) => { const m = wp.clone(); m.scale.set(x1 - x0, y1 - y0, 1); m.position.set((x0 + x1) / 2, (y0 + y1) / 2, -4); g.add(m); };
    wall(-14, -0.2, 0, 11); wall(2.0, 14, 0, 11); wall(-0.2, 2.0, 0, 2.0); wall(-0.2, 2.0, 4.4, 11);
    const fl = plane(40, 30, 0x8a5a3a, g); fl.rotation.x = -PI / 2; fl.position.z = 4;
    skyPlane('#9ab8e0', '#e8f0ff', g, -9).scale.setScalar(0.4);
    for (let i = 0; i < 3; i++) { const h = terrace(1.6, 1.6 + i * 0.4, 1.4, [BRICK, 0xc9a070, 0xa8503a][i]); h.position.set(-0.1 + i * 1.1, 0, -8.6); g.add(h); h.scale.setScalar(0.9); }
    this.wv = waveObj(2.6, 1.5); this.wv.position.set(0.9, 0.2, -6.0); g.add(this.wv);
    for (const [x, y, w, h] of [[0.9, 4.5, 2.5, 0.14], [0.9, 1.93, 2.5, 0.14], [-0.28, 3.2, 0.14, 2.6], [2.08, 3.2, 0.14, 2.6], [0.9, 3.2, 0.08, 2.4]]) mesh(box(w, h, 0.14), 0x6a4630, { parent: g, o: 0.015 }).position.set(x, y, -3.9);
    const bed = new THREE.Group(); g.add(bed); bed.position.set(-2.4, 0, -1.4);
    mesh(box(2.4, 0.5, 2.2), 0x6a4630, { parent: bed, o: 0.02 }).position.y = 0.25; mesh(box(2.2, 0.35, 2.0), 0xdfe8ff, { parent: bed, o: 0.02 }).position.y = 0.65; mesh(box(0.8, 0.22, 0.6), 0xffffff, { parent: bed, o: 0.015 }).position.set(0, 0.92, -0.7); mesh(box(2.4, 1.5, 0.15), 0x6a4630, { parent: bed, o: 0.02 }).position.set(0, 0.9, -1.1);
    this.h = hero({ body: 0xf0ece0, hat: 'nightcap' }, g); this.h.position.set(0.25, 0, 0.9);
  },
  update(t) {
    const h = this.h, u = h.userData, B = cue(0, 'rush'); idle(h, t);
    const wake = ease((t - B + 0.3) / 0.35);
    u.arms[0].rotation.set(lerp(-0.2, -2.6, wake), 0, lerp(-0.3, 0.5, wake)); u.arms[1].rotation.set(lerp(-1.6, -2.6, wake), 0, lerp(0.4, -0.5, wake));
    u.eyes.forEach(e => e.scale.set(1, lerp(0.45, 1.5, wake), 1)); u.eyes.forEach(e => e.scale.x = lerp(1, 1.4, wake)); setMouth(h, wake > 0.3 ? 'open' : 'flat');
    u.head.rotation.y = lerp(0.2, 0.6, ease(t / 1.5)); u.head.rotation.x = 0;
    setWave(this.wv, 0.3 + ease((t - 0.5) / 3.6) * 3.2, t);
    const k = ease(t / 4.8); camera.position.set(lerp(1.0, 0.4, k), lerp(2.6, 2.7, k), lerp(12.5, 9.8, k)); camera.lookAt(lerp(0.5, 0.4, k), 2.5, 0); camera.rotateZ(0.02);
    if (t > B) shakeCam(0.03, t);
    return camera.position.distanceTo(h.position);
  }
});

// ============ 1: London 1814, the drunk's nightmare ============
addScene({
  bg: 0xa9b8c8, fog: [0xb9c6d4, 14, 46],
  build(g) {
    skyPlane('#8fa3bd', '#dfe6ee', g); ground(g, 0x8a8a90);
    this.world = new THREE.Group(); g.add(this.world);
    for (let i = 0; i < 14; i++) { const h = terrace(1.7, 2.0 + (i % 3) * 0.5, 1.4, [BRICK, 0xa8503a, 0xc9a070][i % 3]); h.position.set(-5 + i * 1.75, 0, -4.2); this.world.add(h); }
    for (let i = 0; i < 5; i++) { const l = lamp(); l.position.set(-3 + i * 4.2, 0, -2.4); this.world.add(l); }
    this.h = hero({ body: 0x6a2a3a, tie: 0xf6ecd0, hat: 'top', hatColor: 0x1c1c24 }, g); this.h.position.set(0, 0, 0.5); this.mug = mugObj();
    this.pub = new THREE.Group(); this.world.add(this.pub);
    this.fog1 = []; for (let i = 0; i < 6; i++) { const m = mesh(sphere(1), 0xdfe6ee, { parent: g, o: 0 }); m.scale.set(2.5, 0.5, 1); m.position.set(-4 + i * 2.2, 0.3, -1 - (i % 3)); this.fog1.push(m); }
  },
  update(t) {
    const h = this.h, u = h.userData; idle(h, t); walk(h, t, 6.2, 0.45);
    h.rotation.z = Math.sin(t * 2.4) * 0.16; h.position.x = Math.sin(t * 1.2) * 0.35; u.head.rotation.z = Math.sin(t * 2.4 + 1) * 0.2; u.head.rotation.y = Math.sin(t * 1.7) * 0.3;
    u.eyes.forEach((e, i) => e.scale.y = 0.55 + 0.1 * Math.sin(t * 3 + i)); setMouth(h, 'smile');
    u.arms[1].rotation.set(-1.1 + Math.sin(t * 2.4) * 0.15, 0, 0.35); hold(h, this.mug, 1, { x: 0.04, y: -0.5, z: 0.12 });
    this.world.position.x = -1.3 * t; this.fog1.forEach((m, i) => m.position.x = ((m.position.x + 6 - t * 0.003) % 14) - 6);
    camera.position.set(0.5, 2.0, 10.8 - t * 0.12); camera.lookAt(0.2, 1.9, 0); camera.rotateZ(-0.02);
    return 10.5;
  }
});

// ============ 2: the vat bursts ============
addScene({
  bg: 0x3a2a24, fog: [0x3a2a24, 16, 44], flashIn: 0.18,
  build(g) {
    brickWall(40, 14, g).position.set(0, 5, -6); const fl = plane(40, 30, 0x6a4a30, g); fl.rotation.x = -PI / 2; fl.position.z = 4;
    for (let i = -4; i <= 4; i++) { const b = mesh(box(0.3, 9, 0.3), 0x4a3320, { parent: g, o: 0.02 }); b.position.set(i * 2.6, 4.5, -5.6); }
    this.vat = new THREE.Group(); g.add(this.vat); this.vat.position.set(0.3, 0, -2.4);
    mesh(cyl(1.6, 4.0, 28), 0x9a6a38, { parent: this.vat, o: 0.03 }).position.y = 2.0;
    this.hoops = [0.6, 1.5, 2.5, 3.4].map(y => { const t = mesh(new THREE.TorusGeometry(1.62, 0.07, 10, 36), 0x2b2b35, { parent: this.vat, o: 0.01 }); t.rotation.x = PI / 2; t.position.y = y; return t; });
    this.staves = []; for (let i = 0; i < 12; i++) { const s = mesh(box(0.28, 3.8, 0.1), 0x9a6a38, { parent: g, o: 0.015 }); this.staves.push({ s, a: i / 12 * 2 * PI }); }
    this.blob = mesh(sphere(1), AMBER, { parent: g, o: 0.04 }); this.dr = drops(g, 46);
    this.h = hero({ body: 0x7a5a3a, hat: 'fedora', hatColor: 0x5a4a3a, mustache: true }, g); this.h.position.set(-1.1, 0, 0.7);
    this.hoopFly = this.hoops[3];
  },
  update(t) {
    const B = cue(2, 'crack'), a = t - B, pre = a < 0, h = this.h, u = h.userData; idle(h, t);
    const tens = clamp01(t / B);
    this.vat.visible = pre; this.vat.scale.set(1 + 0.05 * tens + Math.sin(t * 40) * 0.006 * tens, 1, 1 + 0.05 * tens); this.hoops.forEach((hp, i) => hp.position.y = [0.6, 1.5, 2.5, 3.4][i] + Math.sin(t * 50 + i) * 0.015 * tens);
    this.staves.forEach(({ s, a: ang }) => { s.visible = !pre; const k = Math.max(0, a); s.position.set(0.3 + Math.sin(ang) * (1.6 + k * 5), 2.0 + Math.sin(ang * 2) * 1 * k + 3 * k - 7 * k * k, -2.4 + Math.cos(ang) * (1.6 + k * 5)); s.rotation.set(k * 4 * Math.sin(ang), ang, k * 5); });
    this.blob.visible = !pre; const k = ease(a / 0.5); this.blob.position.set(0.3, 1.5 + 0.1 * a, -2.6 + a * 1.2); this.blob.scale.set(Math.max(0.01, 1.7 * k + a * 0.35), Math.max(0.01, 1.4 * k * (1 - 0.4 * clamp01(a - 0.5))), Math.max(0.01, 1.7 * k + a * 0.5));
    updDrops(this.dr, a, { x: 0.3, y: 1.8, z: -2 }, !pre);
    // worker: panics as tension builds, then thrown back
    u.arms[1].rotation.set(-2.3, 0, 0.4 + Math.sin(t * 9) * 0.2 * (pre ? 1 : 0)); u.arms[0].rotation.set(-0.3, 0, -0.3); u.head.rotation.y = 0.55; u.head.rotation.x = -0.25; fear(h, lerp(1, 1.45, pre ? tens : 1)); setMouth(h, pre ? 'frown' : 'open');
    if (!pre) { h.rotation.x = -0.25 * ease(a / 0.5); h.position.z = 0.7 - 0.4 * ease(a / 1.2); u.arms[0].rotation.set(-2.6, 0, 0.4); u.arms[1].rotation.set(-2.6, 0, -0.4); }
    this.dummyFlash = pre ? 0 : Math.max(0, 1 - a / 0.5) * 0.55;
    const c = ease(t / 5.6); camera.position.set(lerp(0.0, 0.5, c), 2.7, lerp(13.6, 11.4, c)); camera.lookAt(-0.1, 2.3, -1); camera.rotateZ(0.015);
    if (!pre) shakeCam(0.2 * Math.exp(-a * 1.5), t); else shakeCam(0.012 * tens, t);
    return 12 + (pre ? 0 : 2);
  },
  flash() { return this.dummyFlash || 0; }
});

// ============ 3: chain reaction, the wave bursts out ============
addScene({
  bg: 0x5a463a, fog: [0x5a463a, 16, 50], flashIn: 0.15,
  build(g) {
    brickWall(36, 12, g).position.set(0, 4, -6); const fl = plane(60, 40, 0x7a7a82, g); fl.rotation.x = -PI / 2; fl.position.z = 6;
    this.vats = [-4, -2, 0, 2, 4].map((x, i) => { const v = barrel(0.8, 2.6); v.scale.set(1, 1, 1); v.position.set(x, 1.3, -5.2); g.add(v); return v; });
    this.pops = this.vats.map(v => { const b = mesh(sphere(1), AMBER, { parent: g, o: 0.03 }); b.position.copy(v.position); b.visible = false; return b; });
    this.dr = drops(g, 40); this.wv = waveObj(11, 2.0); g.add(this.wv);
    this.bricks = []; for (let i = 0; i < 26; i++) { const b = mesh(box(0.4, 0.2, 0.2), BRICK, { parent: g, o: 0.012 }); this.bricks.push({ b, x: (rnd() - 0.5) * 9, y: 1 + rnd() * 3, vz: 3 + rnd() * 6 }); }
    this.barrels = []; for (let i = 0; i < 9; i++) { const b = barrel(0.4, 0.7); g.add(b); this.barrels.push({ b, x: (i - 4) * 1.0 + (rnd() - 0.5), ph: rnd() * 6 }); }
  },
  update(t) {
    const tw = 1.9, w = t - tw;
    this.vats.forEach((v, i) => { const tb = 0.4 + i * 0.28, a = t - tb; v.visible = a < 0; v.position.x += 0; v.rotation.z = a < 0 ? Math.sin(t * 40 + i) * 0.03 * clamp01(t / tb) : 0; const p = this.pops[i]; p.visible = a > 0 && a < 0.9; p.scale.setScalar(Math.max(0.01, 1.2 * ease(a / 0.35) * (1 - clamp01((a - 0.5) / 0.4)))); });
    updDrops(this.dr, t - 0.4, { x: 0, y: 2, z: -5 }, true);
    const wz = lerp(-5.0, 2.6, ease(w / 3.2)); const hgt = lerp(0.8, 2.6, ease(w / 3.2)); this.wv.visible = w > 0; this.wv.position.set(0, 0.05, wz); setWave(this.wv, hgt, t);
    this.bricks.forEach(o => { o.b.visible = w > 0; const k = Math.max(0, w); o.b.position.set(o.x * (1 + k * 0.4), o.y + k * 2 - 4 * k * k * 0.3, -6 + k * o.vz); o.b.rotation.set(k * 5, k * 3, 0); });
    this.barrels.forEach(o => { o.b.visible = w > 0.2; o.b.position.set(o.x, hgt + 0.3 + 0.2 * Math.sin(t * 4 + o.ph), wz + 0.5); o.b.rotation.set(t * 2 + o.ph, t, 0); });
    const f = ease(t / 5.2); camera.position.set(0, lerp(3.8, 3.4, f), lerp(17.5, 15.0, f)); camera.lookAt(0, 2.4, -2); shakeCam(0.05 * clamp01(w / 0.6), t);
    return 13;
  }
});

// ============ 4: the wave smashes through the street (side view) ============
addScene({
  bg: 0xa9b8c8, fog: [0xb9c6d4, 18, 50],
  build(g) {
    skyPlane('#8fa3bd', '#dfe6ee', g); ground(g, 0x8a8a90);
    this.houses = [-1.9, 0.0, 1.9].map((x, i) => { const h = terrace(1.7, 2.2 + i * 0.3, 1.5, [BRICK, 0xc9a070, 0xa8503a][i]); h.position.set(x, 0, -3); g.add(h); return h; });
    this.wv = waveObj(4.2, 1.8); this.wv.rotation.y = PI / 2; g.add(this.wv);
    this.p = [hero({ body: 0x2a5a8a, hat: 'top', hatColor: 0x1c1c24 }, g), hero({ body: 0xc0322e }, g)]; this.p[0].position.set(-0.9, 0, 0.6); this.p[1].position.set(0.9, 0, 1.0);
    this.bricks = []; for (let i = 0; i < 30; i++) { const b = mesh(box(0.3, 0.18, 0.18), [BRICK, 0xc9a070, 0x3a3f4a][i % 3], { parent: g, o: 0.012 }); this.bricks.push({ b, hi: i % 3, vx: 1 + rnd() * 2.4, vy: 2.5 + rnd() * 3.5, vz: rnd() * 2 }); }
    this.dr = drops(g, 36);
  },
  update(t) {
    const v = 1.5, wx = -7.5 + v * (t - 0.2); this.wv.position.set(wx, 0.02, -0.2); setWave(this.wv, 2.5 + 0.2 * Math.sin(t * 2), t);
    this.houses.forEach((h, i) => { const hx = h.position.x, k = clamp01((wx - hx + 0.3) / 1.4), e = ease(k); h.rotation.set(0, 0, -0.55 * e); h.position.y = -0.7 * e; h.scale.y = 1 - 0.45 * e; h.position.z = -3 - 0.4 * e; });
    this.bricks.forEach((o, i) => { const hx = this.houses[o.hi].position.x, k = wx - hx + 0.3; const a = Math.max(0, k) / v; o.b.visible = k > 0 && a < 2.4; o.b.position.set(hx + o.vx * a - 0.4, 1.0 + o.vy * a - 4.2 * a * a, -3 + o.vz * a); o.b.rotation.set(a * 5, a * 3, a * 4); });
    this.p.forEach((h, i) => { const u = h.userData; idle(h, t + i); const px = [-0.9, 0.9][i], k = clamp01((wx - px + 0.6) / 1.2), e = ease(k), a = Math.max(0, wx - px + 0.6) / v;
      h.position.set(px + a * v * 0.85 * (k > 0), e * 3.4 + (k > 0 ? Math.sin(a * 3 + i) * 0.3 : 0) - (k > 0 ? 0.5 * a * a : 0), (i ? 1.0 : 0.6) - e * 0.4); h.position.y = Math.max(h.position.y, k > 0 ? 2.8 + Math.sin(a * 4) * 0.3 : 0);
      h.rotation.z = k > 0 ? -a * 5.5 * (i ? -1 : 1) : 0; if (k > 0) { u.arms.forEach((ar, j) => ar.rotation.set(-2.7, 0, (j ? -1 : 1) * 0.6)); fear(h); setMouth(h, 'open'); } else { fear(h, 1.3); setMouth(h, 'open'); u.arms[0].rotation.set(-2.4, 0, 0.3); u.arms[1].rotation.set(-2.4, 0, -0.3); u.head.rotation.y = -0.5 + (i ? 0.2 : 0); } });
    updDrops(this.dr, wx + 2.5, { x: 0, y: 0, z: 0 }, false);
    camera.position.set(0.2, 2.5, 14.5 - t * 0.12); camera.lookAt(0.0, 2.3, 0); camera.rotateZ(0.015); shakeCam(0.02 * (wx > -2.5 && wx < 3 ? 1 : 0), t);
    return 14;
  }
});

// ============ 5: the loss (somber) ============
addScene({
  bg: 0x8a8f98, fog: [0x8a8f98, 12, 40],
  build(g) {
    skyPlane('#6e7480', '#b8bcc4', g); ground(g, 0x6a6a70);
    for (let i = 0; i < 9; i++) { const w = 1.2 + rnd(), h = 1 + rnd() * 2.4; const b = mesh(box(w, h, 1.4), [0x7a4a40, 0x6a5a58, 0x8a6a58][i % 3], { parent: g, o: 0.03 }); b.position.set(-8 + i * 2.0 + rnd(), h / 2, -6 - rnd() * 2); b.rotation.z = (rnd() - 0.5) * 0.35; const t = mesh(box(w * 0.5, 0.6, 1.0), 0x6a5a58, { parent: g, o: 0.02 }); t.position.set(b.position.x + 0.1, h + 0.2, b.position.z); t.rotation.z = (rnd() - 0.5) * 0.8; }
    for (let i = 0; i < 18; i++) { const b = mesh(box(0.2 + rnd() * 0.4, 0.15 + rnd() * 0.2, 0.2 + rnd() * 0.3), [BRICK, 0x6a5a58, 0x3a3f4a][i % 3], { parent: g, o: 0.012 }); b.position.set(-4 + rnd() * 8, 0.1, -4 + rnd() * 6); b.rotation.set(rnd(), rnd(), rnd()); }
    for (const [x, z, r] of [[-1.8, -1.2, 1.6], [1.8, -0.4, 1.1], [0.2, 2.0, 1.3]]) { const p = mesh(cyl(r, 0.03, 32), 0xb98a2a, { parent: g, o: 0 }); p.position.set(x, 0.02, z); p.scale.z = 0.55; }
    this.hat = new THREE.Group(); g.add(this.hat); mesh(cyl(0.3, 0.45, 20), 0x1c1c24, { parent: this.hat, o: 0.02 }).position.y = 0.25; mesh(cyl(0.5, 0.04, 24), 0x1c1c24, { parent: this.hat, o: 0.015 }); this.hat.position.set(1.7, 0.05, -0.2);
    this.h = hero({ body: 0x3a3f4a }, g); this.h.position.set(-0.2, 0, 0.9); this.hh = new THREE.Group(); mesh(cyl(0.28, 0.4, 20), 0x1c1c24, { parent: this.hh, o: 0.02 }).position.y = 0.2; mesh(cyl(0.46, 0.04, 24), 0x1c1c24, { parent: this.hh, o: 0.015 });
    this.drip = []; for (let i = 0; i < 24; i++) { const d = new THREE.Mesh(box(0.02, 0.5, 0.02), basic(0xb8c4d8)); g.add(d); this.drip.push({ d, x: -5 + rnd() * 10, z: -3 + rnd() * 6, s: 6 + rnd() * 3, ph: rnd() * 6 }); }
  },
  update(t) {
    const h = this.h, u = h.userData; idle(h, t * 0.6, { bob: 0.4, sway: 0.3 }); hemi.intensity = 0.75; hemi.color.setHex(0xbfc8d8); sun.intensity = 0.8;
    u.arms[1].rotation.set(-0.75, 0, 0.15); u.arms[0].rotation.set(0, 0, -0.2); hold(h, this.hh, 1, { x: 0.0, y: -0.6, z: 0.15 }); this.hh.rotation.x = -1.2;
    u.head.rotation.x = 0.4; u.head.rotation.y = 0; setMouth(h, 'frown'); u.eyes.forEach(e => e.scale.y *= 0.6);
    this.hat.position.y = 0.05 + Math.sin(t * 1.5) * 0.02; this.hat.rotation.z = Math.sin(t) * 0.05;
    this.drip.forEach(o => { o.d.position.set(o.x, ((8 - (t * o.s + o.ph * 3) % 8)), o.z); });
    const k = ease(t / 5.4); camera.position.set(lerp(0.6, 0.1, k), lerp(2.2, 1.7, k), lerp(13.5, 9.8, k)); camera.lookAt(-0.1, lerp(2.0, 1.8, k), 0); camera.rotateZ(-0.01);
    return camera.position.distanceTo(h.position);
  }
});

// ============ 6: title, "The London Beer Flood" ============
addScene({
  bg: 0xffd27a, fog: [0xffd27a, 18, 50], flashIn: 0.2,
  build(g) {
    skyPlane('#ff9a5a', '#ffe8a8', g);
    const sunD = mesh(cyl(4.2, 0.1, 48), 0xfff3c8, { parent: g, o: 0, mat: basic(0xffe9a8) }); sunD.rotation.x = PI / 2; sunD.position.set(0, 4.5, -22);
    ground(g, 0xc9a070);
    this.sign = (() => { const gg = new THREE.Group(); const tex = canvasTex(1024, 420, (x, w, h) => { x.fillStyle = '#7a1e22'; x.fillRect(0, 0, w, h); x.strokeStyle = '#ffd23f'; x.lineWidth = 14; x.strokeRect(16, 16, w - 32, h - 32); x.fillStyle = '#fff3d0'; x.font = `900 100px ${FONT}`; x.textAlign = 'center'; x.fillText('THE LONDON', w / 2, 170); x.fillStyle = '#ffd23f'; x.font = `900 130px ${FONT}`; x.fillText('BEER FLOOD', w / 2, 310); }); mesh(box(3.6, 1.5, 0.15), 0x2b2b35, { parent: gg, o: 0.02 }); texPlane(3.5, 1.42, tex, gg).position.z = 0.09; return gg; })();
    this.sign.position.set(0, 4.6, -1.0); g.add(this.sign);
    this.mug = new THREE.Group(); g.add(this.mug); mesh(cyl(0.7, 1.4, 28), AMBER, { parent: this.mug, o: 0.04 }).position.y = 0.7; const hd = mesh(new THREE.TorusGeometry(0.4, 0.1, 10, 24), 0xdddddd, { parent: this.mug, o: 0.02 }); hd.position.set(0.85, 0.7, 0);
    this.foam = []; for (let i = 0; i < 8; i++) { const f = mesh(sphere(0.38), FOAM, { parent: this.mug, o: 0.03 }); f.position.set(Math.cos(i / 8 * 2 * PI) * 0.45, 1.5, Math.sin(i / 8 * 2 * PI) * 0.4); this.foam.push(f); }
    this.mug.position.set(1.0, 0, 0.3); this.mug.scale.setScalar(1.15);
    this.h = hero({ body: 0x2a5a8a, hat: 'top', hatColor: 0x1c1c24 }, g); this.h.position.set(-0.8, 0, 0.7);
  },
  update(t) {
    const h = this.h, u = h.userData, tp = cue(6, 'ding'); idle(h, t); u.arms[0].rotation.set(-2.5, 0, -0.5 + Math.sin(t * 6) * 0.1); u.arms[1].rotation.set(-2.5, 0, 0.5 + Math.sin(t * 6) * 0.1); setMouth(h, 'smile');
    const p = back((t - tp + 0.05) / 0.5); this.sign.scale.setScalar(Math.max(0.001, p)); this.sign.rotation.z = (1 - clamp01(p)) * 0.4 + Math.sin(t * 1.6) * 0.015;
    this.foam.forEach((f, i) => { f.position.y = 1.5 + 0.18 * Math.abs(Math.sin(t * 3 + i)) + 0.1 * clamp01(t * 0.5); f.scale.setScalar(0.9 + 0.2 * Math.sin(t * 4 + i)); }); this.mug.rotation.y = Math.sin(t * 1.4) * 0.2;
    const k = ease(t / 4); camera.position.set(0.2, lerp(2.6, 3.0, k), lerp(11.0, 12.8, k)); camera.lookAt(0.0, lerp(2.5, 3.0, k), 0); camera.rotateZ(0.015);
    return 12;
  }
});

// ============ 7: court, "unavoidable accident" ============
addScene({
  bg: 0x5a3f2a, fog: [0x5a3f2a, 18, 50],
  build(g) {
    plane(40, 16, 0x7a5a3a, g).position.set(0, 5, -5); const fl = plane(40, 30, 0x4a3320, g); fl.rotation.x = -PI / 2; fl.position.z = 4;
    for (const x of [-3.2, 3.2]) { const c = mesh(cyl(0.3, 8, 20), 0xe8dcc0, { parent: g, o: 0.03 }); c.position.set(x, 4, -4.6); }
    const seal = mesh(cyl(0.8, 0.1, 28), 0xffd23f, { parent: g, o: 0.03 }); seal.rotation.x = PI / 2; seal.position.set(0, 4.6, -4.8);
    const bench = mesh(box(2.8, 1.5, 0.9), 0x6a3f20, { parent: g, o: 0.03 }); bench.position.set(0, 0.75, -2.2);
    this.judge = hero({ body: 0x23232b, hat: 'wig', mustache: false }, g); this.judge.position.set(0, 0.55, -2.6); this.judge.userData.legs.forEach(l => l.visible = false);
    this.gavel = new THREE.Group(); mesh(cyl(0.04, 0.5, 8), 0x5a3a20, { parent: this.gavel, o: 0.006 }).position.y = -0.25; const hd = mesh(cyl(0.12, 0.3, 14), 0x5a3a20, { parent: this.gavel, o: 0.008 }); hd.rotation.z = PI / 2; hd.position.y = -0.5;
    this.owner = hero({ body: 0x4a2a5a, belly: 1.45, tie: 0xffd23f, hat: 'top', hatColor: 0x1c1c24, mustache: true }, g); this.owner.position.set(-1.0, 0, 0.5);
    this.bag = new THREE.Group(); mesh(sphere(0.34), 0x6a4a2a, { parent: this.bag, o: 0.02 }); const kn = mesh(sphere(0.12), 0x6a4a2a, { parent: this.bag, o: 0.015 }); kn.position.y = 0.36; this.bag.position.y = -0.3;
    this.vic = hero({ body: 0x2a5a8a }, g); this.vic.position.set(1.25, 0, 0.7);
    this.coins = []; for (let i = 0; i < 10; i++) { const c = mesh(cyl(0.1, 0.03, 12), 0xffd23f, { parent: g, o: 0.008 }); this.coins.push({ c, ph: rnd() * 6 }); }
  },
  update(t) {
    const G = cue(7, 'gavel'), tc = wordT(7, 'paying'), j = this.judge, ju = j.userData, o = this.owner, ou = o.userData, v = this.vic, vu = v.userData; idle(j, t, { sway: 0.4 }); idle(o, t + 1, { sway: 0.5 }); idle(v, t + 2, { sway: 0.4 });
    const raise = ease((t - G + 0.5) / 0.5), slam = clamp01((t - G + 0.04) / 0.08);
    ju.arms[1].rotation.set(lerp(-0.6, -2.7, raise) + slam * 2.6 * (t > G - 0.04 ? 1 : 0), 0, 0.2); ju.arms[0].rotation.set(-0.6, 0, -0.2); ju.head.rotation.x = 0.1; hold(j, this.gavel, 1, { x: 0.05, y: -0.65, z: 0.1 }); this.gavel.rotation.z = 0.2;
    setMouth(j, 'flat'); ju.eyes.forEach(e => e.scale.y *= 0.8);
    // owner: smug, rich; coins rain at "compensation"
    ou.arms[1].rotation.set(-0.6, 0, 0.5); ou.arms[0].rotation.set(-1.0, 0, -0.6); hold(o, this.bag, 1, { x: 0.05, y: -0.5, z: 0.1 }); setMouth(o, 'grin'); ou.head.rotation.y = 0.4; ou.head.rotation.z = Math.sin(t * 3) * 0.08;
    this.coins.forEach((c, i) => { const k = Math.max(0, t - tc - i * 0.12); c.c.visible = k > 0 && k < 2.0; c.c.position.set(-1.3 + 0.9 * Math.sin(c.ph + i), 4.0 - k * 2.0, 0.6 + 0.3 * Math.cos(i)); c.c.rotation.set(k * 6, 0, k * 4); });
    vu.arms[0].rotation.set(-0.3, 0, -0.9); vu.arms[1].rotation.set(-0.3, 0, 0.9); vu.head.rotation.y = -0.4; setMouth(v, 'frown'); vu.eyes.forEach(e => e.scale.y *= 0.8); if (t > G) fear(v, 1.3);
    const k = inout(t / 3), z = inout((t - G + 0.5) / 1.0);
    camera.position.set(lerp(0.0, 0.2, z), lerp(2.6, 2.9, z), lerp(15.5, 11.8, z) + k * -0.6); camera.lookAt(lerp(0, 0.0, z), lerp(2.3, 2.9, z), -1); camera.rotateZ(0.01); if (t > G) shakeCam(0.1 * Math.exp(-(t - G) * 5), t);
    return 12;
  }
});

// ============ 8: the insurance call, punchline ============
addScene({
  bg: 0xe8dcc0, fog: [0xe8dcc0, 18, 50],
  build(g) {
    plane(40, 16, 0xe6dcc0, g).position.set(0, 5, -4); const fl = plane(40, 30, 0x8a5a3a, g); fl.rotation.x = -PI / 2; fl.position.z = 4;
    const sg = new THREE.Group(); const tex = canvasTex(1024, 300, (x, w, h) => { x.fillStyle = '#1d3f7a'; x.fillRect(0, 0, w, h); x.strokeStyle = '#ffd23f'; x.lineWidth = 12; x.strokeRect(14, 14, w - 28, h - 28); fitText(x, 'INSURANCE CO.', w, h, 150, '#fff'); }); mesh(box(3.2, 0.95, 0.12), 0x2b2b35, { parent: sg, o: 0.02 }); texPlane(3.1, 0.88, tex, sg).position.z = 0.07; sg.position.set(0, 5.0, -3.9); g.add(sg);
    const desk = mesh(box(3.2, 0.2, 1.2), 0x7a4a28, { parent: g, o: 0.02 }); desk.position.set(0.3, 1.25, -1.0); const fr = mesh(box(3.2, 1.2, 0.1), 0x6a3f20, { parent: g, o: 0.02 }); fr.position.set(0.3, 0.65, -0.45);
    this.paper = mesh(box(0.8, 0.02, 0.55), 0xffffff, { parent: g, o: 0.006 }); this.paper.position.set(0.3, 1.36, -0.85);
    this.stamp = mesh(cyl(0.18, 0.3, 14), 0xc0322e, { parent: g, o: 0.012 });
    this.agent = hero({ body: 0x5a5f6a, tie: 0x1d3f7a, glasses: true, mustache: true, hat: null }, g); this.agent.position.set(0.8, 0.0, -1.7); this.agent.userData.legs.forEach(l => l.visible = false);
    this.h = hero({ body: wetBody, hat: 'top', hatColor: 0x3a2a14, tie: 0xf6ecd0 }, g); this.h.position.set(-0.85, 0, 0.6); this.mug = mugObj();
    this.drip = []; for (let i = 0; i < 12; i++) { const d = mesh(sphere(0.07), AMBER, { parent: g, o: 0.006 }); this.drip.push({ d, ph: rnd() * 3, x: (rnd() - 0.5) * 0.9 }); }
  },
  update(t) {
    const R = cue(8, 'rim'), h = this.h, u = h.userData, a = this.agent, au = a.userData; idle(h, t); idle(a, t + 1, { sway: 0.1, bob: 0.3 });
    u.arms[1].rotation.set(-1.0, 0, 0.5); hold(h, this.mug, 1, { x: 0.05, y: -0.45, z: 0.1 }); u.arms[0].rotation.set(-1.2 + Math.sin(t * 5) * 0.25, 0, -0.7); u.head.rotation.y = 0.45; setMouth(h, t > R ? 'frown' : 'open'); fear(h, 1.2);
    this.drip.forEach((o, i) => { const k = ((t * 1.2 + o.ph) % 1.4); o.d.position.set(-0.85 + o.x, 3.9 - k * 3.6, 0.8); o.d.scale.y = 1.4; });
    // agent: deadpan, then STAMP on the claim
    const s = clamp01((t - R + 0.15) / 0.12); au.arms[1].rotation.set(lerp(-1.2, -0.7, s) + (t < R - 0.4 ? 0 : 0), 0, 0.15); au.arms[0].rotation.set(-0.5, 0, -0.4); au.head.rotation.y = -0.35; au.eyes.forEach(e => e.scale.y *= 0.55); setMouth(a, 'flat');
    const sp = t < R - 0.5 ? 0 : ease((t - R + 0.5) / 0.35); const down = t < R - 0.15 ? 0 : clamp01((t - R + 0.15) / 0.1); this.stamp.position.set(0.3, 1.34 + 0.9 * (sp - down * sp) + 0.1, -0.85); this.stamp.visible = t > R - 0.5;
    this.paper.material.color.setHex(down > 0.9 ? 0xffd9d4 : 0xffffff);
    const c = ease(t / 5); camera.position.set(lerp(0.2, 0.0, c), lerp(2.9, 2.6, c), lerp(15.0, 12.0, c)); camera.lookAt(0.0, 2.4, -0.8); camera.rotateZ(0.01); if (t > R) shakeCam(0.05 * Math.exp(-(t - R) * 6), t);
    return 12;
  }
});

// ================= overlays =================
const $ = id => document.getElementById(id);
const capEl = $('cap'), stampEl = $('stamp'), flashEl = $('flash'), badgeEl = $('badge'), fadeEl = $('fade');
const EMPH = /^(beer|burst|flooding|smashed|collapsed|tragically|flood|accident|insurance|nightmare|million|compensation|strangest)/i;
function caption(t, si) {
  const T = T_(si), words = T.words; let cur = null;
  for (const w of words) if (t >= w.s) cur = w;
  if (!cur || t > T.dur - 0.15) { capEl.style.opacity = 0; return; }
  capEl.textContent = cur.w; capEl.style.opacity = 1;
  const big = EMPH.test(norm(cur.w)); capEl.style.color = big ? '#ffd23f' : '#fff';
  capEl.style.transform = `scale(${(0.6 + 0.4 * back((t - cur.s) / 0.16)) * (big ? 1.12 : 1)})`;
  capEl.style.fontSize = (cur.w.length > 12 ? 90 : 112) + 'px';
}
const BADGES = { // scene -> [[text, time, color]]
  4: [['1,000,000+ LITRES', () => wordT(4, 'million') - 0.3, '#ffd23f']],
  5: [],
  7: [['NO PAYOUT', () => wordT(7, 'paying'), '#ff5a4a'], ['ACCIDENT!', () => cue(7, 'gavel'), '#ff5a4a']],
  8: [['CLAIM DENIED', () => cue(8, 'rim'), '#ff5a4a']],
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
  if (S.flash) fl = Math.max(fl, S.flash());
  if (toEnd < 0.08 && si !== SCENES.length - 1) fl = Math.max(fl, (1 - toEnd / 0.08) * 0.85);
  flashEl.style.opacity = Math.min(1, fl);
  const st = T.stamp; stampEl.textContent = st; stampEl.style.fontSize = Math.min(140, 900 / (Math.max(st.length, 4) * 0.8)) + 'px';
  stampEl.style.opacity = st && toEnd > 0.2 ? 1 : 0;
  stampEl.style.transform = `translateX(${(1 - ease((lt - 0.1) / 0.4)) * -700}px) rotate(-4deg) scale(${0.9 + 0.1 * back((lt - 0.1) / 0.4)})`;
  const bl = (BADGES[si] || []).filter(b => lt >= b[1]()).pop();
  if (bl) { badgeEl.style.opacity = toEnd > 0.2 ? 1 : 0; badgeEl.textContent = bl[0]; badgeEl.style.color = bl[2]; badgeEl.style.fontSize = (bl[0].length > 12 ? 92 : 120) + 'px'; badgeEl.style.transform = `scale(${0.5 + 0.5 * back((lt - bl[1]()) / 0.25)}) rotate(3deg)`; } else badgeEl.style.opacity = 0;
  fadeEl.style.opacity = si === SCENES.length - 1 ? clamp01(1 - (toEnd - 0.1) / 0.9) : 0;
  caption(lt, si);
  composer.render();
};
window.TOTAL = TIMING.total;
window.ready = true;
