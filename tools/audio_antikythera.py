"""Antikythera short: uses the supplied narration mp3 (audio/source/antikythera_narration.mp3).
Word timing = narration speech segments (silence detection) + weighted word spread + snap to energy dips.
Adds a mysterious score and sfx cued to words -> audio/antikythera_mix.wav, src/antikythera.timing.json, out/antikythera_captions.srt"""
import json, os, re, subprocess, numpy as np, wave

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SR = 24000
raw = subprocess.run(['ffmpeg', '-loglevel', 'error', '-i', os.path.join(ROOT, 'audio/source/antikythera_narration.mp3'), '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True, check=True).stdout
orig = np.frombuffer(raw, np.float32).copy(); narr = orig / (max(1e-6, np.abs(orig).max()) / 0.9)
dur_n = len(narr) / SR
# ---- speech segments (RMS in 20 ms frames, bridge pauses < 160 ms) ----
hop = int(0.02 * SR); nf = len(narr) // hop
db = np.array([20 * np.log10(np.sqrt(np.mean(orig[i * hop:(i + 1) * hop] ** 2)) + 1e-7) for i in range(nf)])
sp = db > -45  # on the original (un-normalized) levels
segs, i = [], 0
while i < nf:
  if sp[i]:
    j = i
    while j < nf and (sp[j] or sp[j:j + 8].any()): j += 1
    segs.append((i * 0.02, j * 0.02)); i = j
  else: i += 1
assert len(segs) == 23, (len(segs), segs)
# phrase = (caption text, [segment indices])
PH = [
 ("What if I told you the ancient Greeks built a computer over 2,000 years ago…", [0]), ("and it could predict the future?", [1, 2]),
 ("In 1901, divers exploring a shipwreck near the Greek island of Antikythera", [3, 4]), ("discovered a mysterious, heavily corroded object.", [5]),
 ("At first, nobody understood what it was.", [6, 7]), ("But decades of research revealed something extraordinary.", [8]),
 ("It was the Antikythera Mechanism,", [9]), ("an intricate device containing dozens of interlocking bronze gears.", [10]),
 ("This ancient machine could calculate the movements of the Sun and Moon,", [11]), ("predict eclipses,", [12]), ("and track astronomical cycles with astonishing precision.", [13]),
 ("Dating back to around 100 BC,", [14]), ("it was essentially an ancient mechanical computer.", [15]),
 ("The technology was so sophisticated", [16]), ("that historians struggled to understand how people of that era could have built something so advanced.", [17]),
 ("And here's the real mystery…", [18]), ("We have no surviving evidence of another machine", [19]), ("quite like it from that period.", [20]),
 ("So who built it…", [21]), ("and what other ancient technologies have we lost to history?", [22]),
]
# scene = phrases, stamp, mood, cues {sfx: caption word (alnum lowercase)}
SC = [
 dict(ph=[0, 1], stamp='', cues={'ding': 'computer', 'chime': 'future'}),
 dict(ph=[2, 3], stamp='1901', cues={'ding': 'discovered', 'bubbles': 'divers'}),
 dict(ph=[4], stamp='', cues={}),
 dict(ph=[5], stamp='DECADES LATER', cues={'chime': 'extraordinary'}),
 dict(ph=[6, 7], stamp='', cues={'ding': 'antikythera', 'chime': 'dozens'}),
 dict(ph=[8, 9, 10], stamp='', cues={'ding': 'eclipses'}),
 dict(ph=[11, 12], stamp='100 BC', cues={'ding': 'computer'}),
 dict(ph=[13, 14], stamp='', cues={}),
 dict(ph=[15, 16, 17], stamp='', cues={'ding': 'another'}),
 dict(ph=[18, 19], stamp='', cues={'ding': 'who'}),
]
norm = lambda w: re.sub(r'[^a-z0-9]', '', w.lower())
mids = [0] + [(segs[k][1] + segs[k + 1][0]) / 2 for k in (2, 5, 7, 8, 10, 13, 15, 17, 20)]
total = dur_n + 0.6
def spread(text, idxs):
  ws = text.split(); wt = [len(re.sub(r'\W', '', w)) + 1.5 + (2.5 if w.endswith(',') else 0) for w in ws]
  ivs = [segs[k] for k in idxs]; T = sum(e - s for s, e in ivs); cum = np.concatenate([[0], np.cumsum(wt)]) / sum(wt); out = []
  for c in cum[:-1]:
    x = c * T
    for s, e in ivs:
      if x <= e - s + 1e-9: out.append(s + x); break
      x -= e - s
    else: out.append(ivs[-1][1])
  # snap to nearest energy dip (±80 ms) except the first word of each segment
  for n in range(1, len(out)):
    if any(abs(out[n] - s) < 0.05 for s, _ in ivs): continue
    f0 = int((out[n] - 0.08) / 0.02); f1 = int((out[n] + 0.08) / 0.02) + 1
    out[n] = (f0 + int(np.argmin(db[f0:f1]))) * 0.02 + 0.01
  for n in range(1, len(out)): out[n] = max(out[n], out[n - 1] + 0.07)
  return list(zip(ws, out))
scenes = []
for si, sc in enumerate(SC):
  a = mids[si]; b = mids[si + 1] if si + 1 < len(mids) else total; words = []
  for p in sc['ph']: words += [{'w': w, 's': round(t - a, 3)} for w, t in spread(PH[p][0], PH[p][1])]
  cues = {}
  for name, trig in sc['cues'].items():
    hit = next((x for x in words if norm(x['w']) == trig), None); assert hit, (name, trig); cues[name] = hit['s']
  scenes.append({'start': round(a, 3), 'dur': round(b - a, 3), 'stamp': sc['stamp'], 'words': words, 'cues': cues})
N = int(total * SR) + SR
nar = np.zeros(N, np.float32); nar[:len(narr)] = narr
rng = np.random.default_rng(21); mus = np.zeros(N, np.float32); sfx = np.zeros(N, np.float32)
mid = lambda m: 440 * 2 ** ((m - 69) / 12)
def env(n, d): return np.exp(-np.arange(n) / SR / d)
def put(buf, sig, at, g=1.0):
  k = int(at * SR)
  if k >= N or k < 0: return
  e = min(N, k + len(sig)); buf[k:e] += sig[:e - k] * g
def lp(x, n): return np.convolve(x, np.ones(n) / n, 'same')
# mysterious score: Dm - Bb - Gm - A pads, low drone, sparse bells with echo
prog = [[50, 57, 62, 65], [46, 53, 58, 62], [43, 50, 55, 58], [45, 52, 57, 61]]; CH = 4.0
for c in range(int(total / CH) + 2):
  st = c * CH; n = int((CH + 1.5) * SR); x = np.arange(n) / SR; win = np.minimum(1, np.minimum(x / 1.6, (CH + 1.5 - x) / 1.6)) ** 2
  put(mus, sum(np.sin(2 * np.pi * mid(m) * x) + 0.5 * np.sin(2 * np.pi * mid(m) * 1.005 * x) + 0.2 * np.sin(2 * np.pi * mid(m) * 2 * x) for m in prog[c % 4]) * win / 4, st, 0.1)
  put(mus, np.sin(2 * np.pi * mid(prog[c % 4][0] - 24) * x) * win, st, 0.16)
  for j in range(3):
    if rng.random() < 0.8:
      m = [74, 77, 79, 81, 84, 86][rng.integers(0, 6)]; n2 = int(2.4 * SR); x2 = np.arange(n2) / SR
      bell = (np.sin(2 * np.pi * mid(m) * x2) + 0.35 * np.sin(2 * np.pi * mid(m) * 2.76 * x2)) * env(n2, 0.8) * np.minimum(1, x2 / 0.004)
      t0 = st + j * 1.33 + rng.random() * 0.4; put(mus, bell, t0, 0.05); put(mus, bell, t0 + 0.37, 0.022)
def ding(at): n = int(1.1 * SR); x = np.arange(n) / SR; put(sfx, (np.sin(2 * np.pi * 1175 * x) + 0.45 * np.sin(2 * np.pi * 2349 * x) + 0.2 * np.sin(2 * np.pi * 3520 * x)) * env(n, 0.35), at, 0.2)
def chime(at):
  for k, m in enumerate([81, 86, 90, 93]): n = int(1.2 * SR); x = np.arange(n) / SR; put(sfx, np.sin(2 * np.pi * mid(m) * x) * env(n, 0.4), at + k * 0.09, 0.1)
def bubbles(at, dur=7.5):
  for _ in range(int(dur * 9)):
    n = int(0.09 * SR); x = np.arange(n) / SR; f0 = 500 + rng.random() * 700
    put(sfx, np.sin(2 * np.pi * np.cumsum(np.linspace(f0, f0 * 1.7, n)) / SR) * env(n, 0.03), at + rng.random() * dur, 0.07)
  n = int(dur * SR); put(sfx, lp(rng.standard_normal(n), 60) * 2, at, 0.06)
def tick(at): n = int(0.04 * SR); put(sfx, np.diff(rng.standard_normal(n), prepend=0) * env(n, 0.006), at, 0.16)
def whoosh(at): n = int(0.45 * SR); put(sfx, lp(rng.standard_normal(n), 22) * np.hanning(n), at, 0.45)
def stamp_tick(at): n = int(.1 * SR); x = np.arange(n) / SR; put(sfx, np.sin(2 * np.pi * np.linspace(700, 280, n) * x) * env(n, .03), at, 0.16)
FN = {'ding': ding, 'chime': chime, 'bubbles': lambda a: bubbles(a, min(9.0, 15.0))}
for s in scenes:
  for name, ct in s['cues'].items(): FN[name](s['start'] + ct)
  if s['stamp']: stamp_tick(s['start'] + 0.1)
for si in (4, 5, 6, 8):  # ticking mechanism
  s = scenes[si]; k = 0
  while k * 0.25 < s['dur'] - 0.2: tick(s['start'] + 0.2 + k * 0.25 + (0.012 if k % 2 else 0)); k += 1
for s in scenes[1:]: whoosh(s['start'] - 0.25)
venv = lp(np.abs(nar), 6000); duck = 1 - 0.55 * np.clip(venv * 18, 0, 1)
mix = nar + mus * duck + sfx * 0.8
mix = mix[:int(total * SR)]; fade = int(1.6 * SR); mix[-fade:] *= np.linspace(1, 0, fade); mix /= max(1, np.abs(mix).max() / 0.93)
os.makedirs(os.path.join(ROOT, 'audio'), exist_ok=True); os.makedirs(os.path.join(ROOT, 'out'), exist_ok=True)
with wave.open(os.path.join(ROOT, 'audio', 'antikythera_mix.wav'), 'w') as w:
  w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((mix * 32767).astype(np.int16).tobytes())
json.dump({'total': round(total, 3), 'scenes': scenes}, open(os.path.join(ROOT, 'src', 'antikythera.timing.json'), 'w'), indent=1)
def ts(x): h = int(x // 3600); m = int(x % 3600 // 60); s = x % 60; return f'{h:02d}:{m:02d}:{int(s):02d},{int(round((s % 1) * 1000)):03d}'
srt, i = [], 1
for s in scenes:
  ws = s['words']; k = 0
  while k < len(ws):
    grp = ws[k:k + 5]; nxt = ws[k + 5]['s'] if k + 5 < len(ws) else None
    srt.append(f"{i}\n{ts(s['start'] + grp[0]['s'])} --> {ts(s['start'] + nxt - 0.02 if nxt else s['start'] + s['dur'] - 0.4)}\n{' '.join(x['w'] for x in grp)}\n"); i += 1; k += 5
open(os.path.join(ROOT, 'out', 'antikythera_captions.srt'), 'w').write('\n'.join(srt))
print('total', round(total, 2), [(s['start'], s['dur']) for s in scenes])
