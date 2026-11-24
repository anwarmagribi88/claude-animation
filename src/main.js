import * as THREE from 'three';
const W=1080,H=1920;
const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});
renderer.setSize(W,H);renderer.setPixelRatio(1);
document.getElementById('stage').prepend(renderer.domElement);
const scene=new THREE.Scene();
const camera=new THREE.PerspectiveCamera(32,W/H,0.1,100);

// ---------- toon helpers ----------
const grad=new THREE.DataTexture(new Uint8Array([90,90,90,255, 170,170,170,255, 255,255,255,255]),3,1,THREE.RGBAFormat);
grad.minFilter=grad.magFilter=THREE.NearestFilter;grad.needsUpdate=true;
const toon=c=>new THREE.MeshToonMaterial({color:c,gradientMap:grad});
const outlineMat=t=>new THREE.ShaderMaterial({side:THREE.BackSide,uniforms:{t:{value:t}},
 vertexShader:'uniform float t;void main(){gl_Position=projectionMatrix*modelViewMatrix*vec4(position+normal*t,1.);}',
 fragmentShader:'void main(){gl_FragColor=vec4(.07,.04,.12,1.);}'});
function mesh(geo,color,{o=0.02,parent}={}){
 const m=new THREE.Mesh(geo,toon(color));
 if(o>0){m.add(new THREE.Mesh(geo,outlineMat(o)));}
 if(parent)parent.add(m);return m;}
const sphere=(r)=>new THREE.SphereGeometry(r,32,24);
const lights=()=>{scene.add(new THREE.HemisphereLight(0xfff1d6,0x6a4a7a,1.1));
 const d=new THREE.DirectionalLight(0xffffff,2.2);d.position.set(-3,6,5);scene.add(d);};
lights();

// ---------- stickman ----------
function makeStick({body=0x1c1c24,shoe=0x5a3320,hat=null}={}){
 const g=new THREE.Group();
 const torso=mesh(sphere(0.5),body,{parent:g,o:0.025});torso.scale.set(1,1.25,0.9);torso.position.y=1.0;
 const head=new THREE.Group();head.position.y=2.0;g.add(head);
 const skull=mesh(sphere(0.62),0xf4f4fb,{parent:head,o:0.035});skull.scale.set(1,1.04,0.96);
 // eyes: heavy-lidded
 const eyes=[];
 for(const s of [-1,1]){
  const e=new THREE.Group();e.position.set(s*0.22,0.04,0.58);e.rotation.y=s*0.35;head.add(e);
  const eye=new THREE.Mesh(new THREE.CircleGeometry(0.1,24,Math.PI,Math.PI),new THREE.MeshBasicMaterial({color:0x14101c}));
  eye.position.y=-0.01;e.add(eye);
  const lid=new THREE.Mesh(new THREE.PlaneGeometry(0.27,0.045),new THREE.MeshBasicMaterial({color:0x14101c}));
  lid.position.y=0.005;lid.rotation.z=s*-0.08;e.add(lid);eyes.push(e);}
 // grin
 const c=document.createElement('canvas');c.width=256;c.height=128;const x=c.getContext('2d');
 x.fillStyle='#fff';x.strokeStyle='#14101c';x.lineWidth=12;x.lineJoin='round';
 x.beginPath();x.roundRect(20,22,216,84,26);x.fill();x.stroke();
 x.lineWidth=7;x.beginPath();x.moveTo(20,64);x.lineTo(236,64);for(let i=1;i<6;i++){x.moveTo(20+i*36,22);x.lineTo(20+i*36,106);}x.stroke();
 const tex=new THREE.CanvasTexture(c);
 const mouth=new THREE.Mesh(new THREE.PlaneGeometry(0.42,0.21),new THREE.MeshBasicMaterial({map:tex,transparent:true}));
 mouth.position.set(0,-0.27,0.585);head.add(mouth);
 // limbs
 const limb=(len,r)=>{const p=new THREE.Group();const m=mesh(new THREE.CylinderGeometry(r,r,len,10),0x14101c,{parent:p,o:0.012});m.position.y=-len/2;return p;};
 const arms=[],legs=[];
 for(const s of [-1,1]){
  const a=limb(0.6,0.045);a.position.set(s*0.46,1.25,0);g.add(a);
  const hand=mesh(sphere(0.1),body,{parent:a,o:0.02});hand.position.y=-0.62;arms.push(a);
  const l=limb(0.75,0.045);l.position.set(s*0.2,0.55,0);g.add(l);
  const sh=mesh(sphere(0.14),shoe,{parent:l,o:0.02});sh.scale.set(1,0.7,1.5);sh.position.set(0,-0.78,0.07);legs.push(l);}
 g.userData={head,eyes,arms,legs,torso};
 return g;}

// ---------- 1970s set ----------
const set70=new THREE.Group();scene.add(set70);
const wall=mesh(new THREE.PlaneGeometry(30,16),0xe0a63a,{o:0,parent:set70});wall.position.set(0,5,-5);
const floor=mesh(new THREE.PlaneGeometry(30,30),0xb85a2e,{o:0,parent:set70});floor.rotation.x=-Math.PI/2;
// wood panel stripes
for(let i=-8;i<=8;i++){const s=mesh(new THREE.BoxGeometry(0.08,16,0.05),0xb47a24,{o:0,parent:set70});s.position.set(i*1.2,5,-4.95);}
// pegboard + hanging tools
const peg=mesh(new THREE.BoxGeometry(5,3,0.1),0x8a5a3a,{parent:set70,o:0.02});peg.position.set(2.6,3.4,-4.8);
const clock=mesh(new THREE.CylinderGeometry(0.6,0.6,0.1,28),0xf1e6c8,{parent:set70});clock.rotation.x=Math.PI/2;clock.position.set(-2.4,4.2,-4.8);
for(let i=0;i<5;i++){const tl=mesh(new THREE.BoxGeometry(0.12,0.9+i*0.1,0.08),[0xc9c9d4,0xd8342e,0x2f6fb0,0xe8e0cc,0x3a3a44][i],{parent:set70,o:0.012});tl.position.set(0.9+i*0.9,3.5,-4.7);}
// workbench
const bench=mesh(new THREE.BoxGeometry(5.2,0.25,1.6),0x7a4a28,{parent:set70});bench.position.set(0.9,1.2,-2.8);
for(const x of [-1.6,3.4])for(const z of [-3.4,-2.2]){const l=mesh(new THREE.BoxGeometry(0.2,1.15,0.2),0x5e3a20,{parent:set70});l.position.set(x-0.4,0.6,z);}
// circuit board with chips on bench
const pcb=mesh(new THREE.BoxGeometry(1.6,0.06,1.1),0x1f7a3c,{parent:set70});pcb.position.set(1.7,1.36,-2.7);
for(let i=0;i<9;i++){const ch=mesh(new THREE.BoxGeometry(0.18+Math.random()*0,0.07,0.12),0x2a2a30,{parent:set70,o:0.01});ch.position.set(1.1+(i%3)*0.45,1.43,-3.0+Math.floor(i/3)*0.3);}
const bigChip=mesh(new THREE.BoxGeometry(0.55,0.1,0.35),0x2a2a30,{parent:set70,o:0.012});bigChip.position.set(2.1,1.45,-2.55);
// ---------- phone ----------
const phone=new THREE.Group();
const pbody=mesh(new THREE.BoxGeometry(0.32,1.0,0.2),0x3a3a44,{parent:phone,o:0.015});
const pscr=mesh(new THREE.BoxGeometry(0.24,0.1,0.02),0x9bd37a,{parent:phone,o:0.004});pscr.position.set(0,0.3,0.11);
const keys=new THREE.Group();phone.add(keys);
for(let r=0;r<4;r++)for(let c2=0;c2<3;c2++){const k=mesh(new THREE.BoxGeometry(0.065,0.06,0.03),0xe8e0cc,{o:0.003,parent:keys});k.position.set(-0.09+c2*0.09,0.1-r*0.09,0.11);}
const ant=mesh(new THREE.CylinderGeometry(0.018,0.018,0.5,8),0x14101c,{parent:phone,o:0.006});ant.position.set(0.1,0.74,0);
const antTip=mesh(sphere(0.03),0xd8342e,{parent:phone,o:0.006});antTip.position.set(0.1,1.0,0);
scene.add(phone);

const hero=makeStick({body:0x1c1c24});hero.position.set(0.1,0,0.6);scene.add(hero);

// ---------- captions ----------
const NARRATION=[ ['In',0.3],['the',0.55],['1970s,',0.8],['phones',1.5],['were',1.95],['bricks...',2.3],
 ['and',3.4],['their',3.65],['brains',3.95],['were',4.4],['tiny',4.7],['circuits.',5.1] ];
const capEl=document.getElementById('cap'),yearEl=document.getElementById('year');
const ease=(x)=>x<0?0:x>1?1:1-Math.pow(1-x,3);
const back=(x)=>{x=Math.min(Math.max(x,0),1);const c1=2.2,c3=c1+1;return 1+c3*Math.pow(x-1,3)+c1*Math.pow(x-1,2);};
function caption(t){let cur=null;for(const [w,s] of NARRATION)if(t>=s)cur=[w,s];
 if(!cur||t>6.6){capEl.style.opacity=0;return;}
 capEl.textContent=cur[0];capEl.style.opacity=1;
 capEl.style.transform=`scale(${0.6+0.4*back((t-cur[1])/0.18)})`;}

// ---------- frame ----------
window.renderFrame=(t)=>{
 const u=hero.userData;
 const bob=Math.sin(t*3.2)*0.03;
 hero.position.y=bob;
 u.head.rotation.z=Math.sin(t*2.1)*0.06;u.head.rotation.y=Math.sin(t*1.3)*0.15;
 const blink=(t%2.6)>2.5?0.15:1;u.eyes.forEach(e=>e.scale.y=blink);
 // right arm presents phone, raises at ~2.2s
 const lift=ease((t-2.0)/0.8)-ease((t-4.6)/0.8)*0.6;
 u.arms[1].rotation.z=0.25+lift*0.2;u.arms[1].rotation.x=-0.6-lift*1.1;
 u.arms[0].rotation.z=-0.35+Math.sin(t*3.2)*0.05;
 u.legs[0].rotation.x=Math.sin(t*3.2)*0.03;u.legs[1].rotation.x=-Math.sin(t*3.2)*0.03;
 // attach phone to right hand
 const hand=new THREE.Vector3(0,-0.62,0);u.arms[1].localToWorld(hand);
 phone.position.copy(hand).add(new THREE.Vector3(0.05,0.42,0.08));
 phone.rotation.set(0,-0.3,-0.12+lift*0.1);
 // chip pulse
 bigChip.scale.setScalar(1+0.06*Math.sin(t*6));
 // camera: slow push in with dutch tilt
 const k=ease(t/7.5);
 camera.position.set(0.3+k*0.2,2.1+k*0.1,13-k*3.0);
 camera.lookAt(0.65,1.45,0);camera.rotateZ(0.03*Math.sin(t*0.6)+0.02);
 // title
 const yt=t-0.1;yearEl.textContent='1970s';yearEl.style.opacity=t<6.6?1:0;
 yearEl.style.transform=`translateX(${(1-ease(yt/0.45))*-500}px) rotate(-4deg)`;
 caption(t);
 renderer.render(scene,camera);};
window.ready=true;
