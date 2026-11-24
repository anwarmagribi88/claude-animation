"""Narration (Piper TTS) + synth music bed -> audio/mix.wav and src/timing.json"""
import json, subprocess, wave, os, sys, numpy as np
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SR=22050
# (caption text, spoken text, min scene seconds, year stamp)
SCRIPT=[
 ("In the 1970s, phones were bricks... and their brains were tiny circuits.",
  "In the nineteen seventies, phones were bricks... and their brains were tiny circuits.",8.0,"1970s"),
 ("By the 1990s, tiny ARM chips gave pocket phones a real brain.",
  "By the nineties, tiny ARM chips gave pocket phones a real brain.",7.0,"1990s"),
 ("The 2000s added color screens, cameras, and music.",
  "The two thousands added color screens, cameras, and music.",7.0,"2000s"),
 ("In 2007, touchscreens arrived, and chips had to run whole computers.",
  "In two thousand seven, touchscreens arrived, and chips had to run whole computers.",7.5,"2007"),
 ("So the core wars began: two cores, four cores, eight cores!",
  "So the core wars began: two cores, four cores, eight cores!",8.0,"2010s"),
 ("Today's chips pack billions of transistors and their own AI brain.",
  "Today's chips pack billions of transistors, and their own A I brain.",8.0,"TODAY"),
 ("From bricks... to supercomputers in your pocket.",
  "From bricks... to supercomputers in your pocket.",6.0,""),
]
LEAD,TAIL=0.45,0.75
model=os.path.join(ROOT,'voice','en-us-ryan-high.onnx')
def tts(text,path):
  subprocess.run([sys.executable,'-m','piper','-m',model,'-f',path,'--length_scale','1.08','--sentence_silence','0'],input=text.encode(),check=True,capture_output=True)
  with wave.open(path) as w: a=np.frombuffer(w.readframes(w.getnframes()),np.int16).astype(np.float32)/32768
  # trim silence
  idx=np.where(np.abs(a)>0.01)[0]; return a[max(idx[0]-200,0):idx[-1]+400]
def word_times(cap,s,e):
  ws=cap.split(); wt=[len(w)+2+(5 if w[-1] in ',.!:' else 0)+(3 if w.endswith('...') else 0) for w in ws]
  # a pause-weight belongs after the word: word i starts after cumulative weights of 0..i-1
  tot=sum(wt); out=[]; acc=0
  for w,k in zip(ws,wt): out.append({'w':w,'s':round(s+(e-s)*acc/tot,3)}); acc+=k
  return out
scenes=[]; t=0; voice=[]
for i,(cap,spk,mn,yr) in enumerate(SCRIPT):
  a=tts(spk,f'/tmp/_l{i}.wav'); d=len(a)/SR
  dur=max(mn,LEAD+d+TAIL)
  scenes.append({'start':round(t,3),'dur':round(dur,3),'year':yr,'words':word_times(cap,t+LEAD,t+LEAD+d)})
  voice.append((t+LEAD,a)); t+=dur
total=t; N=int(total*SR)+SR
narr=np.zeros(N,np.float32)
for st,a in voice: k=int(st*SR); narr[k:k+len(a)]+=a
# ---- music bed ----
rng=np.random.default_rng(3); tt=np.arange(N)/SR; mus=np.zeros(N,np.float32)
bpm=104; beat=60/bpm
def env(n,dec): return np.exp(-np.arange(n)/SR/dec)
def add(sig,at,gain):
  k=int(at*SR); e=min(N,k+len(sig)); mus[k:e]+=sig[:e-k]*gain
kick=np.sin(2*np.pi*np.cumsum(np.linspace(130,45,int(.25*SR)))/SR)*env(int(.25*SR),.09)
hat=rng.standard_normal(int(.05*SR)); hat=np.diff(hat,prepend=0)*env(len(hat),.012)
roots=[45,45,41,43]  # A F G midi-ish bass (A2=45)
mid=lambda m:440*2**((m-69)/12)
b=0
while b*beat<total:
  at=b*beat; bar=(b//4)%4
  add(kick,at,0.55 if b%4 in (0,2) else 0.35)
  add(hat,at+beat/2,0.18)
  f=mid(roots[bar]); n=int(beat*0.9*SR); x=np.arange(n)/SR
  add(np.sign(np.sin(2*np.pi*f*x))*0.5*env(n,.18),at,0.10)
  for j,iv in enumerate([12,16,19,24] if bar!=1 else [12,15,19,24]):
    n2=int(beat/4*SR); x2=np.arange(n2)/SR
    add(np.sin(2*np.pi*mid(roots[bar]+iv)*x2)*env(n2,.07),at+j*beat/4,0.07)
  b+=1
# whoosh at scene cuts, pop at year stamps
for s in scenes[1:]:
  n=int(.5*SR); w=rng.standard_normal(n)*np.hanning(n); w=np.convolve(w,np.ones(18)/18,'same'); add(w,s['start']-0.3,0.35)
for s in scenes:
  if s['year']:
    n=int(.12*SR); x=np.arange(n)/SR; add(np.sin(2*np.pi*np.linspace(900,300,n)*x)*env(n,.04),s['start']+0.1,0.3)
# duck music under voice
venv=np.convolve(np.abs(narr),np.ones(4000)/4000,'same'); duck=1-0.55*np.clip(venv*25,0,1)
mix=narr*0.95+mus*duck*0.8
fade=int(1.2*SR); mix[int(total*SR)-fade:int(total*SR)]*=np.linspace(1,0,fade); mix=mix[:int(total*SR)]
mix/=max(1,np.abs(mix).max()/0.95)
with wave.open(os.path.join(ROOT,'audio','mix.wav'),'w') as w:
  w.setnchannels(1);w.setsampwidth(2);w.setframerate(SR);w.writeframes((mix*32767).astype(np.int16).tobytes())
json.dump({'total':round(total,3),'scenes':scenes},open(os.path.join(ROOT,'src','timing.json'),'w'),indent=1)
print('total',round(total,2),[s['dur'] for s in scenes])
