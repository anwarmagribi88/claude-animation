"""Yamaguchi short: Kokoro TTS narration + somber synth score + sfx
 -> audio/yamaguchi_mix.wav, src/yamaguchi.timing.json, out/yamaguchi_captions.srt

Narration is synthesized phrase by phrase, so every caption word is timed against the real
duration of its phrase (not one estimate for a whole scene).
Models (not committed, 350 MB): kokoro-v1.0.onnx + voices-v1.0.bin from
https://github.com/thewh1teagle/kokoro-onnx/releases/tag/model-files-v1.0  -> set KOKORO_DIR (default ./voice)
"""
import json, os, re, numpy as np, wave
from kokoro_onnx import Kokoro

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
KDIR = os.environ.get('KOKORO_DIR', os.path.join(ROOT, 'voice'))
SR = 24000
VOICE, SPEED = 'am_michael', 0.96

# Each scene: stamp text, min seconds, phrases [(caption, spoken)], cues {sfx name: caption word that triggers it}
# Spoken text uses phonetic respellings for Japanese names; captions keep the real spelling.
SCRIPT = [
 dict(stamp='1945', min=4.6, cues={'whistle': 'train'}, phrases=[
   ("He survived an atomic bomb...", "He survived an atomic bomb..."),
   ("and then took a train home.", "and then took a train home.")]),
 dict(stamp='SUMMER 1945', min=5.0, cues={}, phrases=[
   ("Tsutomu Yamaguchi was an engineer", "Tsoo-toh-moo Yah-mah-goo-chee was an engineer"),
   ("on a business trip in Hiroshima.", "on a business trip in Hiroshima.")]),
 dict(stamp='AUG 6 · 8:15 AM', min=6.6, cues={'boom': 'exploded'}, phrases=[
   ("At 8:15 on the morning of August 6th,", "At eight fifteen on the morning of August sixth,"),
   ("the first atomic bomb exploded", "the first atomic bomb exploded"),
   ("just three kilometers away.", "just three kilometers away.")]),
 dict(stamp='', min=4.8, cues={}, phrases=[
   ("Burned, half deaf, and temporarily blind...", "Burned, half deaf, and temporarily blind..."),
   ("but alive.", "but alive.")]),
 dict(stamp='AUG 7', min=5.0, cues={'whistle': 'boarded', 'chug': 'boarded'}, phrases=[
   ("So the next day, he boarded a train...", "So the next day, he boarded a train..."),
   ("and headed home.", "and headed home.")]),
 dict(stamp='', min=3.0, cues={'ding': 'Nagasaki.'}, phrases=[
   ("Home was...", "Home was..."),
   ("Nagasaki.", "Nah-gah-sah-kee.")]),
 dict(stamp='AUG 9', min=8.0, cues={'ding': 'bomb'}, phrases=[
   ("On August 9th, he told his boss what he'd seen.", "On August ninth, he told his boss what he'd seen."),
   ("His boss said:", "His boss said:"),
   ("one bomb can't destroy a whole city.", "one bomb can't destroy a whole city.")]),
 dict(stamp='11:02 AM', min=3.6, cues={'boom': 'again.'}, phrases=[
   ("Then the sky turned white...", "Then the sky turned white..."),
   ("again.", "again.")]),
 dict(stamp='', min=5.2, cues={'ding': 'again.'}, phrases=[
   ("Same man. Same distance.", "Same man. Same distance."),
   ("And somehow, he survived again.", "And somehow, he survived again.")]),
 dict(stamp='1916 – 2010', min=10.0, cues={}, phrases=[
   ("In 2009, Japan officially recognized him", "In two thousand nine, Japan officially recognized him"),
   ("as a double survivor.", "as a double survivor."),
   ("He lived to 93,", "He lived to ninety three,"),
   ("and spent his life speaking out for peace.", "and spent his life speaking out for peace.")]),
]
LEAD, TAIL = 0.35, 0.5

kok = Kokoro(os.path.join(KDIR, 'kokoro-v1.0.onnx'), os.path.join(KDIR, 'voices-v1.0.bin'))
def tts(text):
  a, sr = kok.create(text, voice=VOICE, speed=SPEED, lang='en-us'); assert sr == SR
  idx = np.where(np.abs(a) > 0.012)[0]
  return a[max(idx[0] - 240, 0):idx[-1] + 480].astype(np.float32)
def gap_after(text):
  return 0.42 if text.endswith('...') else 0.28 if text.endswith(('.', '?', '!')) else 0.22 if text.endswith(',') else 0.12
def split_words(cap):
  ws = cap.split(); wt = [len(re.sub(r'\W', '', w)) + 1.5 for w in ws]
  return ws, wt

scenes, voice, t = [], [], 0.0
for sc in SCRIPT:
  cur = LEAD; words = []
  for cap, spk in sc['phrases']:
    a = tts(spk); d = len(a) / SR
    ws, wt = split_words(cap); tot = sum(wt); acc = 0
    for w, k in zip(ws, wt):
      words.append({'w': w, 's': round(cur + d * acc / tot, 3)}); acc += k
    voice.append((t + cur, a)); cur += d + gap_after(cap)
  dur = max(sc['min'], cur - gap_after(sc['phrases'][-1][0]) + TAIL)
  cues = {}
  for name, trig in sc['cues'].items():
    hit = next((x for x in words if x['w'].lower() == trig.lower()), None)
    assert hit, (name, trig); cues[name] = hit['s']
  scenes.append({'start': round(t, 3), 'dur': round(dur, 3), 'stamp': sc['stamp'], 'words': words, 'cues': cues})
  t += dur
total = t
N = int(total * SR) + SR
narr = np.zeros(N, np.float32)
for st, a in voice: k = int(st * SR); narr[k:k + len(a)] += a

# ================= score =================
rng = np.random.default_rng(11); mus = np.zeros(N, np.float32); sfx = np.zeros(N, np.float32)
mid = lambda m: 440 * 2 ** ((m - 69) / 12)
def env(n, dec): return np.exp(-np.arange(n) / SR / dec)
def put(buf, sig, at, g=1.0):
  k = int(at * SR)
  if k >= N: return
  e = min(N, k + len(sig)); buf[k:e] += sig[:e - k] * g
def lp(x, n): return np.convolve(x, np.ones(n) / n, 'same')
# slow chords: sad minor progression, brightening to major for the final scene
sad = [[57, 60, 64], [53, 57, 60], [48, 55, 60], [52, 55, 59]]
hope = [[48, 55, 60, 64], [55, 59, 62, 67], [57, 60, 64], [53, 57, 60, 65]]
CH = 4.0; nch = int(total / CH) + 2; last_start = scenes[-1]['start']
tt = np.arange(N) / SR
for c in range(nch):
  st = c * CH; chord = (hope if st >= last_start - 1 else sad)[c % 4]
  n = int((CH + 1.2) * SR); x = np.arange(n) / SR
  win = np.minimum(1, np.minimum(x / 1.4, (CH + 1.2 - x) / 1.4)); win = np.sin(win * np.pi / 2) ** 2
  pad = sum(np.sin(2 * np.pi * mid(m) * x) + 0.4 * np.sin(2 * np.pi * mid(m) * 2.003 * x) * 0.5 + 0.5 * np.sin(2 * np.pi * mid(m) * 1.004 * x) for m in chord)
  put(mus, pad * win / len(chord), st, 0.075)
  bass = np.sin(2 * np.pi * mid(chord[0] - 12) * x) * win; put(mus, bass, st, 0.11)
  # sparse piano-ish plucks
  pat = [0, 1.5, 2, 3] if st < last_start - 1 else [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5]
  for j, b in enumerate(pat):
    m = chord[(j * 2 + c) % len(chord)] + 12; n2 = int(1.6 * SR); x2 = np.arange(n2) / SR
    sig = (np.sin(2 * np.pi * mid(m) * x2) + 0.3 * np.sin(2 * np.pi * mid(m) * 2 * x2)) * env(n2, 0.55) * np.minimum(1, x2 / 0.005)
    put(mus, sig, st + b, 0.05)
# ----- sfx -----
def boom(at):
  n = int(3.2 * SR); x = np.arange(n) / SR
  f = 95 * np.exp(-x * 1.4) + 24
  body = np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, 0.9)
  rum = lp(rng.standard_normal(n), 60) * env(n, 0.8) * 5
  crack = rng.standard_normal(int(.25 * SR)) * env(int(.25 * SR), 0.05)
  put(sfx, body, at, 0.9); put(sfx, rum, at, 0.55); put(sfx, crack, at, 0.35)
  # ringing ears
  nr = int(4.0 * SR); xr = np.arange(nr) / SR
  put(sfx, np.sin(2 * np.pi * 4200 * xr) * env(nr, 1.4) * np.minimum(1, xr / 0.3), at + 0.15, 0.035)
  # sucked-out silence just before
  m0 = int((at - 0.7) * SR); m1 = int((at + 1.2) * SR)
  if m0 > 0: mus[m0:m1] *= np.concatenate([np.linspace(1, 0.05, int(0.6 * SR)), np.full(m1 - m0 - int(0.6 * SR), 0.05)])[:m1 - m0]
def whistle(at):
  n = int(1.4 * SR); x = np.arange(n) / SR; vib = 1 + 0.01 * np.sin(2 * np.pi * 6 * x)
  e = np.minimum(1, x / 0.08) * np.minimum(1, (1.4 - x) / 0.4)
  put(sfx, (np.sin(2 * np.pi * 523 * x * vib) + np.sin(2 * np.pi * 659 * x * vib)) * e, at, 0.12)
def chug(at, secs):
  step = 0.27; k = 0
  while k * step < secs:
    n = int(0.22 * SR); w = lp(rng.standard_normal(n), 14) * env(n, 0.07) * 4
    put(sfx, w, at + k * step, 0.28 if k % 2 == 0 else 0.2); k += 1
  n = int(secs * SR); put(sfx, lp(rng.standard_normal(n), 90) * 6, at, 0.12)
def ding(at):
  n = int(1.0 * SR); x = np.arange(n) / SR
  put(sfx, (np.sin(2 * np.pi * 1318 * x) + 0.4 * np.sin(2 * np.pi * 2637 * x)) * env(n, 0.3), at, 0.16)
def whoosh(at):
  n = int(0.5 * SR); w = lp(rng.standard_normal(n), 22) * np.hanning(n); put(sfx, w, at, 0.55)
def tick(at):
  n = int(.1 * SR); x = np.arange(n) / SR; put(sfx, np.sin(2 * np.pi * np.linspace(700, 280, n) * x) * env(n, .03), at, 0.18)
for s in scenes:
  a = s['start']
  for name, ct in s['cues'].items():
    {'boom': boom, 'whistle': whistle, 'ding': ding}.get(name, lambda at: None)(a + ct - (0.04 if name == 'boom' else 0))
    if name == 'chug': chug(a + ct, s['dur'] - ct - 0.3)
  if s['stamp']: tick(a + 0.1)
for s in scenes[1:]:
  whoosh(s['start'] - 0.28)
# duck score under voice
venv = lp(np.abs(narr), 5000); duck = 1 - 0.6 * np.clip(venv * 22, 0, 1)
mix = narr * 1.0 + mus * duck * 1.0 + sfx * 0.9
mix = mix[:int(total * SR)]
fade = int(1.8 * SR); mix[-fade:] *= np.linspace(1, 0, fade)
mix /= max(1, np.abs(mix).max() / 0.93)
os.makedirs(os.path.join(ROOT, 'audio'), exist_ok=True)
with wave.open(os.path.join(ROOT, 'audio', 'yamaguchi_mix.wav'), 'w') as w:
  w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((mix * 32767).astype(np.int16).tobytes())
json.dump({'total': round(total, 3), 'scenes': scenes}, open(os.path.join(ROOT, 'src', 'yamaguchi.timing.json'), 'w'), indent=1)

# ----- SRT for upload (phrase-level, in addition to the burned-in word captions) -----
def ts(x): h = int(x // 3600); m = int(x % 3600 // 60); s = x % 60; return f'{h:02d}:{m:02d}:{int(s):02d},{int(round((s % 1) * 1000)):03d}'
srt, i = [], 1
for s in scenes:
  ws = s['words']; end = s['start'] + s['dur'] - TAIL + 0.1; k = 0
  while k < len(ws):
    grp = ws[k:k + 5]; nxt = ws[k + 5]['s'] if k + 5 < len(ws) else None
    st = s['start'] + grp[0]['s']; en = s['start'] + nxt - 0.02 if nxt else end
    srt.append(f"{i}\n{ts(st)} --> {ts(en)}\n{' '.join(x['w'] for x in grp)}\n"); i += 1; k += 5
os.makedirs(os.path.join(ROOT, 'out'), exist_ok=True)
open(os.path.join(ROOT, 'out', 'yamaguchi_captions.srt'), 'w').write('\n'.join(srt))
print('total', round(total, 2), [(s['dur']) for s in scenes])
