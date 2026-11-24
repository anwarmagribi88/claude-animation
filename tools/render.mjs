// usage: node tools/render.mjs out/video.mp4            -> full video with audio
//        node tools/render.mjs out/sheet 3.5 12 20 ...   -> PNG stills at given seconds
import http from 'http';import fs from 'fs';import path from 'path';import {spawn} from 'child_process';
import {createRequire} from 'module';const require=createRequire(import.meta.url);
const {chromium}=require('playwright');
const root=path.resolve(import.meta.dirname,'..');
const [,, outArg='out/video.mp4', ...stills]=process.argv; const FPS=30;
const mime={'.html':'text/html','.js':'text/javascript','.json':'application/json'};
const srv=http.createServer((q,r)=>{const p=q.url.split('?')[0];
 const f=p.startsWith('/three/')?path.join(root,'node_modules/three/build',p.slice(7)):p.startsWith('/addons/')?path.join(root,'node_modules/three/examples/jsm',p.slice(8)):path.join(root,'src',p==='/'?'index.html':p);
 fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);r.end();return;}r.writeHead(200,{'content-type':mime[path.extname(f)]||'application/octet-stream'});r.end(d);});}).listen(0);
const br=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const pg=await br.newPage({viewport:{width:1080,height:1920},deviceScaleFactor:1});
pg.on('pageerror',e=>console.error('PAGEERR',e.message));pg.on('console',m=>m.type()==='error'&&console.error('CONSOLE',m.text()));
await pg.goto(`http://localhost:${srv.address().port}/`);
await pg.waitForFunction('window.ready',null,{timeout:120000});
if(stills.length){fs.mkdirSync(path.join(root,outArg),{recursive:true});
 for(const s of stills){await pg.evaluate(t=>renderFrame(t),+s);await pg.screenshot({path:path.join(root,outArg,`t${s}.png`)});}
 await br.close();srv.close();console.log('stills done');process.exit(0);}
const total=await pg.evaluate('window.TOTAL');const n=Math.round(total*FPS);
const audio=path.join(root,'audio/mix.wav');
const ff=spawn('ffmpeg',['-y','-loglevel','error','-f','image2pipe','-framerate',String(FPS),'-c:v','mjpeg','-i','-','-i',audio,
 '-c:v','libx264','-preset','medium','-crf','17','-pix_fmt','yuv420p','-r',String(FPS),'-c:a','aac','-b:a','192k','-shortest','-movflags','+faststart',path.join(root,outArg)],{stdio:['pipe','inherit','inherit']});
const t0=Date.now();
for(let i=0;i<n;i++){await pg.evaluate(t=>renderFrame(t),i/FPS);
 const b=await pg.screenshot({type:'jpeg',quality:94});if(!ff.stdin.write(b))await new Promise(r=>ff.stdin.once('drain',r));
 if(i%90==0)console.log(`frame ${i}/${n} ${((Date.now()-t0)/1000).toFixed(0)}s`);}
ff.stdin.end();await new Promise(r=>ff.on('close',r));await br.close();srv.close();console.log('done',outArg);
