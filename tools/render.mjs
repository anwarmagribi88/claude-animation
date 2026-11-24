import http from 'http';import fs from 'fs';import path from 'path';import {spawn} from 'child_process';
import {createRequire} from 'module';const require=createRequire(import.meta.url);
const {chromium}=require('playwright');
const root=path.resolve(import.meta.dirname,'..');
const [,, outFile='out/test.mp4', durS='8', fps='30', frameOnly]=process.argv;
const mime={'.html':'text/html','.js':'text/javascript'};
const srv=http.createServer((q,r)=>{let p=q.url.split('?')[0];
 const f=p.startsWith('/three/')?path.join(root,'node_modules/three/build',p.slice(7)):path.join(root,'src',p==='/'?'index.html':p);
 fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);r.end();return;}r.writeHead(200,{'content-type':mime[path.extname(f)]||'application/octet-stream'});r.end(d);});}).listen(0);
const port=srv.address().port;
const br=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const pg=await br.newPage({viewport:{width:1080,height:1920},deviceScaleFactor:1});
pg.on('pageerror',e=>console.error('PAGEERR',e.message));pg.on('console',m=>m.type()==='error'&&console.error(m.text()));
await pg.addInitScript(()=>{});
await pg.route('**/*',r=>r.continue());
// importmap
await pg.goto(`http://localhost:${port}/`);
await pg.waitForFunction('window.ready',null,{timeout:60000});
if(frameOnly){await pg.evaluate(t=>renderFrame(t),+frameOnly);await pg.screenshot({path:outFile});console.log('frame',outFile);process.exit(0);}
const n=Math.round(+durS*+fps);
const ff=spawn('ffmpeg',['-y','-f','image2pipe','-framerate',fps,'-c:v','mjpeg','-i','-','-c:v','libx264','-pix_fmt','yuv420p','-crf','16','-r',fps,path.join(root,outFile)],{stdio:['pipe','inherit','inherit']});
for(let i=0;i<n;i++){await pg.evaluate(t=>renderFrame(t),i/+fps);
 const b=await pg.screenshot({type:'jpeg',quality:95});if(!ff.stdin.write(b))await new Promise(r=>ff.stdin.once('drain',r));
 if(i%30==0)console.log('frame',i,'/',n);}
ff.stdin.end();await new Promise(r=>ff.on('close',r));await br.close();srv.close();console.log('done',outFile);
