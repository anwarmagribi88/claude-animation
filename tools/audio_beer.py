"""London Beer Flood short: Kokoro TTS narration + oompah score (somber dip for the casualties) + sfx
 -> audio/beer_mix.wav, src/beer.timing.json, out/beer_captions.srt   (see audio_yamaguchi.py for model setup)"""
import json, os, re, numpy as np, wave
from kokoro_onnx import Kokoro

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
KDIR = os.environ.get('KOKORO_DIR', os.path.join(ROOT, 'voice'))
SR = 24000
VOICE, SPEED = 'am_michael', 1.0

# mood: 'fun' (oompah) or 'sad' (quiet pad). cues: sfx name -> caption word (letters/digits only, lowercase)
SCRIPT = [
 dict(stamp='', min=4.6, mood='fun', cues={'rush': 'beer'}, phrases=[
   ("Imagine waking up to find a giant wave of beer", "Imagine waking up to find a giant wave of beer"),
   ("rushing through your streets!", "rushing through your streets!")]),
 dict(stamp='LONDON · 1814', min=5.4, mood='fun', cues={}, phrases=[
   ("In 1814, something extraordinary happened in London", "In eighteen fourteen, something extraordinary happened in London"),
   ("that sounds like a drunk man's nightmare.", "that sounds like a drunk man's nightmare.")]),
 dict(stamp='MEUX BREWERY', min=5.6, mood='fun', cues={'crack': 'burst'}, phrases=[
   ("At the Meux and Company Brewery,", "At the Mewks and Company Brewery,"),
   ("a massive wooden beer vat suddenly burst,", "a massive wooden beer vat suddenly burst,")]),
 dict(stamp='', min=5.2, mood='fun', cues={'rush': 'flooding'}, phrases=[
   ("triggering a chain reaction", "triggering a chain reaction"),
   ("that sent thousands of barrels of beer", "that sent thousands of barrels of beer"),
   ("flooding into the streets.", "flooding into the streets.")]),
 dict(stamp='', min=8.0, mood='fun', cues={'rush': 'smashed', 'crash': 'destroyed'}, phrases=[
   ("A wave estimated at over a million litres", "A wave estimated at over a million litres"),
   ("smashed through buildings,", "smashed through buildings,"),
   ("destroyed homes", "destroyed homes"),
   ("and swept people off their feet.", "and swept people off their feet.")]),
 dict(stamp='8 LIVES LOST', min=5.4, mood='sad', cues={'crash': 'collapsed'}, phrases=[
   ("Several buildings collapsed,", "Several buildings collapsed,"),
   ("and tragically, eight people lost their lives.", "and tragically, eight people lost their lives.")]),
 dict(stamp='1814', min=4.0, mood='fun', cues={'ding': 'london'}, phrases=[
   ("The disaster became known as", "The disaster became known as"),
   ("the London Beer Flood.", "the London Beer Flood.")]),
 dict(stamp='', min=9.0, mood='fun', cues={'gavel': 'accident'}, phrases=[
   ("And here's the strangest part:", "And here's the strangest part:"),
   ("the brewery reportedly avoided paying compensation", "the brewery reportedly avoided paying compensation"),
   ("because the disaster was treated as an unavoidable accident.", "because the disaster was treated as an unavoidable accident.")]),
 dict(stamp='', min=5.0, mood='fun', cues={'rim': 'company'}, phrases=[
   ("Imagine explaining that", "Imagine explaining that"),
   ("to your insurance company!", "to your insurance company!")]),
]
LEAD, TAIL = 0.3, 0.45
kok = Kokoro(os.path.join(KDIR, 'kokoro-v1.0.onnx'), os.path.join(KDIR, 'voices-v1.0.bin'))
def tts(text):
  a, sr = kok.create(text, voice=VOICE, speed=SPEED, lang='en-us'); assert sr == SR
  idx = np.where(np.abs(a) > 0.012)[0]
  return a[max(idx[0] - 240, 0):idx[-1] + 480].astype(np.float32)
def gap_after(text):
  return 0.4 if text.endswith('...') else 0.26 if text.endswith(('.', '?', '!')) else 0.2 if text.endswith((',', ':')) else 0.1
norm = lambda w: re.sub(r'[^a-z0-9]', '', w.lower())

scenes, voice, t = [], [], 0.0
for sc in SCRIPT:
  cur = LEAD; words = []
  for cap, spk in sc['phrases']:
    a = tts(spk); d = len(a) / SR
    ws = cap.split(); wt = [len(re.sub(r'\W', '', w)) + 1.5 for w in ws]; tot = sum(wt); acc = 0
    for w, k in zip(ws, wt): words.append({'w': w, 's': round(cur + d * acc / tot, 3)}); acc += k
    voice.append((t + cur, a)); cur += d + gap_after(cap)
  dur = max(sc['min'], cur - gap_after(sc['phrases'][-1][0]) + TAIL)
  cues = {}
  for name, trig in sc['cues'].items():
    hit = next((x for x in words if norm(x['w']) == trig), None); assert hit, (name, trig); cues[name] = hit['s']
  scenes.append({'start': round(t, 3), 'dur': round(dur, 3), 'stamp': sc['stamp'], 'mood': sc['mood'], 'words': words, 'cues': cues}); t += dur
total = t; N = int(total * SR) + SR
narr = np.zeros(N, np.float32)
for st, a in voice: k = int(st * SR); narr[k:k + len(a)] += a

rng = np.random.default_rng(7); mus = np.zeros(N, np.float32); sfx = np.zeros(N, np.float32)
mid = lambda m: 440 * 2 ** ((m - 69) / 12)
def env(n, dec): return np.exp(-np.arange(n) / SR / dec)
def put(buf, sig, at, g=1.0):
  k = int(at * SR)
  if k >= N or k < 0: return
  e = min(N, k + len(sig)); buf[k:e] += sig[:e - k] * g
def lp(x, n): return np.convolve(x, np.ones(n) / n, 'same')
def mood_at(x):
  for s in scenes:
    if s['start'] <= x < s['start'] + s['dur']: return s['mood']
  return 'fun'
# oompah: bass on 1&3, chord stabs on 2&4. C - F - G - C
BPM = 116; beat = 60 / BPM
prog = [(36, [60, 64, 67]), (41, [60, 65, 69]), (43, [59, 62, 67]), (36, [60, 64, 67])]
b = 0
while b * beat < total:
  at = b * beat; bar = (b // 4) % 4; root, ch = prog[bar]; m = mood_at(at)
  if m == 'fun':
    if b % 2 == 0:
      n = int(beat * 0.8 * SR); x = np.arange(n) / SR; f = mid(root + (0 if b % 4 == 0 else 7))
      put(mus, lp(np.sign(np.sin(2 * np.pi * f * x)), 6) * env(n, 0.2), at, 0.22)
    else:
      n = int(beat * 0.45 * SR); x = np.arange(n) / SR
      sig = sum(np.sin(2 * np.pi * mid(c) * x) + 0.5 * np.sin(2 * np.pi * mid(c) * 2 * x) + 0.25 * np.sin(2 * np.pi * mid(c) * 3 * x) for c in ch)
      put(mus, sig * env(n, 0.13) * np.minimum(1, x / 0.004), at, 0.07)
    if b % 4 == 3:  # little walking pickup
      n = int(beat * 0.3 * SR); x = np.arange(n) / SR
      put(mus, np.sin(2 * np.pi * mid(root + 24 + [0, 4, 7, 12][bar]) * x) * env(n, 0.1), at + beat / 2, 0.07)
  elif b % 4 == 0:  # sad: slow minor pad
    cm = [57, 60, 64] if bar % 2 == 0 else [53, 57, 60]; n = int(4 * beat * 1.1 * SR); x = np.arange(n) / SR
    win = np.minimum(1, np.minimum(x / 1.2, (4 * beat * 1.1 - x) / 1.2)) ** 2
    put(mus, sum(np.sin(2 * np.pi * mid(c) * x) + 0.4 * np.sin(2 * np.pi * mid(c) * 1.004 * x) for c in cm) * win / 3, at, 0.1)
  b += 1
def crack(at):
  n = int(0.5 * SR); x = np.arange(n) / SR
  put(sfx, np.diff(rng.standard_normal(n), prepend=0) * env(n, 0.05), at, 0.4)
  put(sfx, np.sin(2 * np.pi * np.cumsum(120 * np.exp(-x * 7) + 35) / SR) * env(n, 0.25), at, 0.9)
  r = int(1.4 * SR); put(sfx, lp(rng.standard_normal(r), 40) * env(r, 0.5) * 4, at, 0.5)
def rush(at, dur=2.4):
  n = int(dur * SR); x = np.arange(n) / SR; sh = np.sin(np.pi * np.clip(x / dur, 0, 1)) ** 1.5
  put(sfx, lp(rng.standard_normal(n), 28) * sh * 6, at, 0.55); put(sfx, lp(rng.standard_normal(n), 140) * sh * 8, at, 0.45)
def crash(at):
  n = int(0.9 * SR); put(sfx, rng.standard_normal(n) * env(n, 0.12) * np.minimum(1, np.arange(n) / 80), at, 0.35)
  for k in range(7): put(sfx, np.sin(2 * np.pi * (180 + 90 * k) * np.arange(2000) / SR) * env(2000, 0.02), at + k * 0.07, 0.25)
def ding(at):
  n = int(1.0 * SR); x = np.arange(n) / SR; put(sfx, (np.sin(2 * np.pi * 1318 * x) + 0.4 * np.sin(2 * np.pi * 2637 * x)) * env(n, 0.3), at, 0.17)
def gavel(at):
  for k in (0, 0.2):
    n = int(0.25 * SR); x = np.arange(n) / SR; put(sfx, np.sin(2 * np.pi * np.cumsum(260 * np.exp(-x * 25) + 90) / SR) * env(n, 0.05), at + k, 0.9)
    put(sfx, rng.standard_normal(600) * env(600, 0.004), at + k, 0.5)
def rim(at):  # ba-dum-tss
  n = int(0.3 * SR); x = np.arange(n) / SR; put(sfx, np.sin(2 * np.pi * np.cumsum(120 * np.exp(-x * 20) + 45) / SR) * env(n, 0.12), at, 0.9)
  put(sfx, np.diff(rng.standard_normal(n), prepend=0) * env(n, 0.07), at + 0.2, 0.5); put(sfx, np.sin(2 * np.pi * np.cumsum(120 * np.exp(-x * 20) + 45) / SR) * env(n, 0.12), at + 0.2, 0.9)
  c = int(1.2 * SR); put(sfx, np.diff(rng.standard_normal(c), prepend=0) * env(c, 0.35), at + 0.55, 0.45)
def whoosh(at): n = int(0.4 * SR); put(sfx, lp(rng.standard_normal(n), 22) * np.hanning(n), at, 0.5)
def tick(at): n = int(.1 * SR); x = np.arange(n) / SR; put(sfx, np.sin(2 * np.pi * np.linspace(700, 280, n) * x) * env(n, .03), at, 0.18)
FN = {'crack': crack, 'rush': rush, 'crash': crash, 'ding': ding, 'gavel': gavel, 'rim': rim}
for s in scenes:
  for name, ct in s['cues'].items(): FN[name](s['start'] + ct)
  if s['stamp']: tick(s['start'] + 0.1)
for s in scenes[1:]: whoosh(s['start'] - 0.25)
venv = lp(np.abs(narr), 5000); duck = 1 - 0.6 * np.clip(venv * 22, 0, 1)
mix = narr + mus * duck + sfx * 0.9
mix = mix[:int(total * SR)]; fade = int(1.4 * SR); mix[-fade:] *= np.linspace(1, 0, fade); mix /= max(1, np.abs(mix).max() / 0.93)
os.makedirs(os.path.join(ROOT, 'audio'), exist_ok=True); os.makedirs(os.path.join(ROOT, 'out'), exist_ok=True)
with wave.open(os.path.join(ROOT, 'audio', 'beer_mix.wav'), 'w') as w:
  w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((mix * 32767).astype(np.int16).tobytes())
json.dump({'total': round(total, 3), 'scenes': scenes}, open(os.path.join(ROOT, 'src', 'beer.timing.json'), 'w'), indent=1)
def ts(x): h = int(x // 3600); m = int(x % 3600 // 60); s = x % 60; return f'{h:02d}:{m:02d}:{int(s):02d},{int(round((s % 1) * 1000)):03d}'
srt, i = [], 1
for s in scenes:
  ws = s['words']; end = s['start'] + s['dur'] - TAIL + 0.1; k = 0
  while k < len(ws):
    grp = ws[k:k + 5]; nxt = ws[k + 5]['s'] if k + 5 < len(ws) else None
    srt.append(f"{i}\n{ts(s['start'] + grp[0]['s'])} --> {ts(s['start'] + nxt - 0.02 if nxt else end)}\n{' '.join(x['w'] for x in grp)}\n"); i += 1; k += 5
open(os.path.join(ROOT, 'out', 'beer_captions.srt'), 'w').write('\n'.join(srt))
print('total', round(total, 2), [s['dur'] for s in scenes])
