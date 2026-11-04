import http from 'node:http';
import {storeMedia,serveMedia} from './media.mjs';
import {generateVoice} from './voice.mjs';
import {mkdir,writeFile,readFile,rm,stat} from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import {randomUUID,randomBytes,createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {bundle} from '@remotion/bundler';
import {selectComposition,renderMedia} from '@remotion/renderer';
import {authorized,validateProject,alignScenes,encrypt,decrypt,validJobId} from './core.mjs';
const ROOT=path.dirname(fileURLToPath(import.meta.url)),DATA=process.env.DATA_DIR||path.join(ROOT,'data');
const SECRET=process.env.API_TOKEN||'',ENC=process.env.SESSION_ENCRYPTION_KEY||'';
if(SECRET.length<32||ENC.length<32)throw Error('Set API_TOKEN and SESSION_ENCRYPTION_KEY to separate random secrets of at least 32 characters.');
const ORIGIN=process.env.DASHBOARD_ORIGIN||'',PUBLIC=process.env.PUBLIC_URL||'';
if(!ORIGIN.startsWith('https://')||!PUBLIC.startsWith('https://'))throw Error('DASHBOARD_ORIGIN and PUBLIC_URL must be HTTPS origins.');
async function oauthConfig(){try{return decrypt(await readFile(path.join(DATA,'google-client.enc'),'utf8'),ENC)}catch{return {clientId:process.env.GOOGLE_CLIENT_ID||'',clientSecret:process.env.GOOGLE_CLIENT_SECRET||''}}}
async function oauthReady(){const c=await oauthConfig();return Boolean(c.clientId&&c.clientSecret)}
const jobs=new Map(),states=new Map();let running=false,bundlePromise,voiceBusy=false;
await mkdir(DATA,{recursive:true});await mkdir(path.join(DATA,'jobs'),{recursive:true});
function json(res,status,value){res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(value))}
async function body(req,limit=24*1024*1024){let n=0;const parts=[];for await(const c of req){n+=c.length;if(n>limit)throw Error('حجم الطلب أكبر من المسموح.');parts.push(c)}return Buffer.concat(parts)}
async function tokens(){try{return decrypt(await readFile(path.join(DATA,'youtube.enc'),'utf8'),ENC)}catch{return null}}
async function saveTokens(t){await writeFile(path.join(DATA,'youtube.enc'),encrypt(t,ENC),{mode:0o600})}
async function accessToken(){const config=await oauthConfig();let t=await tokens();if(!t)throw Error('اربط حساب يوتيوب أولًا.');if(Date.now()<t.expiry-60000)return t.access_token;if(!t.refresh_token)throw Error('أعد ربط حساب Google لتجديد التفويض.');const r=await fetch('https://oauth2.googleapis.com/token',{method:'POST',body:new URLSearchParams({client_id:config.clientId,client_secret:config.clientSecret,refresh_token:t.refresh_token,grant_type:'refresh_token'})});const d=await r.json();if(!r.ok)throw Error('انتهى تفويض Google. أعد الربط.');t={...t,...d,expiry:Date.now()+d.expires_in*1000};await saveTokens(t);return t.access_token}
async function channel(){try{const token=await accessToken();const r=await fetch('https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true',{headers:{Authorization:'Bearer '+token}});const d=await r.json();const c=d.items?.[0];return c?{id:c.id,title:c.snippet.title}:null}catch{return null}}
async function processJob(job){running=true;job.status='rendering';try{const probe=await promisify(execFile)('ffprobe',['-v','error','-show_entries','format=duration','-of','json',job.audio]);const duration=Number(JSON.parse(probe.stdout).format.duration);const scenes=alignScenes(job.project.scenes,duration);const props={title:job.project.title,scenes,audio:'http://127.0.0.1:'+server.address().port+'/internal/audio/'+job.id+'/'+job.audioNonce,durationInFrames:Math.ceil(duration*30)};bundlePromise??=process.env.REMOTION_BUNDLE_DIR?Promise.resolve(process.env.REMOTION_BUNDLE_DIR):bundle({entryPoint:path.join(ROOT,'src/index.tsx'),publicDir:null});const serveUrl=await bundlePromise;const composition=await selectComposition({serveUrl,id:'Episode',inputProps:props,browserExecutable:process.env.CHROME_PATH||undefined});await renderMedia({serveUrl,composition,inputProps:props,codec:'h264',outputLocation:job.video,concurrency:1,disableSharedMemoryCapture:true,x264Preset:'veryfast',ffmpegOverride:({args})=>{const safe=[...args];safe.splice(-1,0,'-threads','1');return safe},browserExecutable:process.env.CHROME_PATH||undefined,onProgress:({progress})=>{job.progress=progress}});job.status='ready';job.progress=1}catch(error){console.error('Render job failed',job.id,String(error?.message||error).replace(/http:\/\/127\.0\.0\.1[^\s]*/g,'[internal-audio]').slice(0,3000));job.status='failed';job.error='تعذّر تصدير الفيديو. افحص ملف الصوت وإعداد المتصفح على الخادم.'}finally{running=false;const next=[...jobs.values()].find(j=>j.status==='queued');if(next)void processJob(next)}}
const server=http.createServer(async(req,res)=>{const url=new URL(req.url,PUBLIC);const origin=req.headers.origin;
 res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');
 if(origin===ORIGIN){res.setHeader('Access-Control-Allow-Origin',ORIGIN);res.setHeader('Vary','Origin');res.setHeader('Access-Control-Allow-Headers','Authorization,Content-Type');res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS')}
 if(req.method==='OPTIONS'){res.writeHead(origin===ORIGIN?204:403);res.end();return}
 try{
 if(await serveMedia(req,res,url.pathname,DATA))return;
 if(url.pathname==='/health'){json(res,200,{ok:true});return}
 if(url.pathname.startsWith('/internal/audio/')){const [, , ,id,nonce]=url.pathname.split('/');const j=jobs.get(id);if(!j||nonce!==j.audioNonce||req.socket.remoteAddress!=='127.0.0.1'&&req.socket.remoteAddress!=='::ffff:127.0.0.1'&&req.socket.remoteAddress!=='::1'){json(res,404,{error:'غير موجود'});return}res.setHeader('Content-Type','application/octet-stream');createReadStream(j.audio).pipe(res);return}
 if(url.pathname==='/oauth/google/callback'){const config=await oauthConfig();
 const state=states.get(url.searchParams.get('state'));states.delete(url.searchParams.get('state'));
 if(!state||state.expires<Date.now())throw Error('جلسة الربط انتهت. ارجع للوحة وابدأ الربط من جديد.');
 if(url.searchParams.has('error'))throw Error('لم يتم منح صلاحية Google.');
 const r=await fetch('https://oauth2.googleapis.com/token',{method:'POST',body:new URLSearchParams({client_id:config.clientId,client_secret:config.clientSecret,code:url.searchParams.get('code')||'',grant_type:'authorization_code',redirect_uri:PUBLIC+'/oauth/google/callback',code_verifier:state.verifier})});const d=await r.json();if(!r.ok)throw Error('تعذّر إكمال ربط Google.');await saveTokens({...d,expiry:Date.now()+d.expires_in*1000});res.writeHead(303,{Location:ORIGIN});res.end();return;
 }
 if(origin&&origin!==ORIGIN){json(res,403,{error:'مصدر الطلب غير مسموح.'});return}
 if(!authorized(req.headers.authorization,SECRET)){json(res,401,{error:'مفتاح خدمة التصدير غير صحيح.'});return}
 if(req.method==='GET'&&url.pathname==='/api/status'){json(res,200,{ok:true,geminiConfigured:Boolean(process.env.GEMINI_API_KEY),voice:'Charon',youtubeConfigured:await oauthReady(),channel:await channel(),redirectUri:PUBLIC+'/oauth/google/callback'});return}
 if(req.method==='POST'&&url.pathname==='/api/media'){const bytes=await body(req);json(res,201,await storeMedia(bytes,DATA,PUBLIC));return}
 if(req.method==='POST'&&url.pathname==='/api/voice'){
 if(voiceBusy){json(res,429,{error:'توليد صوت آخر جارٍ الآن. انتظر قليلًا.'});return}
 const input=JSON.parse((await body(req,20000)).toString());voiceBusy=true;
 try{const wav=await generateVoice(input,process.env.GEMINI_API_KEY);res.writeHead(200,{'Content-Type':'audio/wav','Content-Length':wav.length,'Cache-Control':'no-store'});res.end(wav)}finally{voiceBusy=false}return
 }
 if(req.method==='POST'&&url.pathname==='/api/youtube/connect'){
 const config=await oauthConfig();if(!await oauthReady())throw Error('أكمل إعداد تطبيق Google في قسم الربط أولًا.');
 const state=randomBytes(24).toString('hex'),verifier=randomBytes(32).toString('base64url');states.set(state,{verifier,expires:Date.now()+600000});
 const u=new URL('https://accounts.google.com/o/oauth2/v2/auth');u.search=new URLSearchParams({client_id:config.clientId,redirect_uri:PUBLIC+'/oauth/google/callback',response_type:'code',scope:'https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly',access_type:'offline',prompt:'consent',state,code_challenge:createHash('sha256').update(verifier).digest('base64url'),code_challenge_method:'S256'});json(res,200,{url:u.toString()});return}
 if(req.method==='POST'&&url.pathname==='/api/youtube/configure'){
 const p=JSON.parse((await body(req,10000)).toString());
 if(typeof p.clientId!=='string'||!/^[-A-Za-z0-9.]+\.apps\.googleusercontent\.com$/.test(p.clientId)||typeof p.clientSecret!=='string'||p.clientSecret.length<8||p.clientSecret.length>500)throw Error('بيانات تطبيق Google غير صالحة.');
 const previous=await oauthConfig();if(previous.clientId&&previous.clientId!==p.clientId&&await tokens())throw Error('يوجد حساب يوتيوب مرتبط بتطبيق آخر. لا يمكن استبدال التطبيق أثناء ارتباط الحساب.');
 await writeFile(path.join(DATA,'google-client.enc'),encrypt({clientId:p.clientId,clientSecret:p.clientSecret},ENC),{mode:0o600});json(res,200,{configured:true,redirectUri:PUBLIC+'/oauth/google/callback'});return
 }
 if(req.method==='POST'&&url.pathname==='/api/render'){
 if([...jobs.values()].filter(j=>j.status==='queued'||j.status==='rendering').length>=3){json(res,429,{error:'انتظر انتهاء المهام الحالية.'});return}
 const bytes=await body(req);const web=new Request('http://local',{method:'POST',headers:{'Content-Type':req.headers['content-type']||''},body:bytes});const form=await web.formData();const project=validateProject(JSON.parse(form.get('project'))),audio=form.get('audio');if(!audio||typeof audio==='string'||audio.size>20*1024*1024||!audio.size)throw Error('ارفع ملف صوت صالح بحجم لا يزيد عن 20 ميجابايت.');
 const id=randomUUID(),dir=path.join(DATA,'jobs',id);await mkdir(dir);const j={id,dir,project,audio:path.join(dir,'voice'),video:path.join(dir,'video.mp4'),audioNonce:randomBytes(24).toString('hex'),status:'queued',progress:0,created:Date.now()};await writeFile(j.audio,Buffer.from(await audio.arrayBuffer()));jobs.set(id,j);json(res,202,{id});if(!running)void processJob(j);return}
 const match=url.pathname.match(/^\/api\/jobs\/([^/]+)(\/video)?$/);
 if(req.method==='GET'&&match){const id=match[1];if(!validJobId(id)||!jobs.has(id)){json(res,404,{error:'المهمة غير موجودة أو انتهت صلاحيتها.'});return}const j=jobs.get(id);if(match[2]){if(j.status!=='ready')throw Error('الفيديو لم يجهز بعد.');res.writeHead(200,{'Content-Type':'video/mp4','Content-Length':(await stat(j.video)).size,'Cache-Control':'no-store'});createReadStream(j.video).pipe(res)}else json(res,200,{id:j.id,status:j.status,progress:j.progress,error:j.error});return}
 if(req.method==='POST'&&url.pathname==='/api/youtube/upload'){
 const p=JSON.parse((await body(req,20000)).toString());const j=validJobId(p.jobId)?jobs.get(p.jobId):null;if(!j||j.status!=='ready')throw Error('الفيديو غير جاهز.');if(j.uploading){json(res,409,{error:'الرفع جاري بالفعل.'});return}if(j.published){json(res,200,{url:j.published});return}if(typeof p.title!=='string'||!p.title.trim()||p.title.length>100||typeof p.description!=='string'||p.description.length>5000||!['private','unlisted','public'].includes(p.privacy)||typeof p.madeForKids!=='boolean')throw Error('راجع بيانات النشر.');
 const access=await accessToken();j.uploading=true;try{
 const metadata={snippet:{title:p.title,description:p.description,categoryId:'27',defaultLanguage:'ar'},status:{privacyStatus:p.privacy,selfDeclaredMadeForKids:p.madeForKids,containsSyntheticMedia:true}};
 const r=await fetch('https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status',{method:'POST',headers:{Authorization:'Bearer '+access,'Content-Type':'application/json','X-Upload-Content-Type':'video/mp4','X-Upload-Content-Length':String((await stat(j.video)).size)},body:JSON.stringify(metadata)});const location=r.headers.get('location');if(!r.ok||!location)throw Error('يوتيوب رفض بدء الرفع. راجع صلاحيات الحساب وحدود الاستخدام.');const uploadURL=new URL(location);if(uploadURL.protocol!=='https:'||!(uploadURL.hostname==='www.googleapis.com'||uploadURL.hostname.endsWith('.googleapis.com')))throw Error('عنوان رفع غير متوقع.');
 const response=await fetch(location,{method:'PUT',headers:{'Content-Type':'video/mp4'},body:await readFile(j.video)});const result=await response.json();if(!response.ok||!result.id)throw Error('لم يؤكد يوتيوب اكتمال الرفع. افحص YouTube Studio قبل إعادة المحاولة.');j.published='https://www.youtube.com/watch?v='+encodeURIComponent(result.id);json(res,200,{url:j.published});return
 }finally{j.uploading=false}}
 json(res,404,{error:'المسار غير موجود.'});
 }catch(e){json(res,400,{error:e.message||'تعذّر تنفيذ الطلب.'})}
});
server.listen(Number(process.env.PORT||8080),'0.0.0.0',()=>console.log('Nafhamha render service ready'));
setInterval(()=>{for(const [key,value]of states)if(value.expires<Date.now())states.delete(key);for(const[id,j]of jobs)if(j.created<Date.now()-86400000&&!j.uploading&&['ready','failed'].includes(j.status)){jobs.delete(id);void rm(j.dir,{recursive:true,force:true})}},60000).unref();
