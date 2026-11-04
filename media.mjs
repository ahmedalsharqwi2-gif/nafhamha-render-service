import {mkdir,writeFile,stat,rm} from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import {randomBytes} from 'node:crypto';
import path from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
export async function storeMedia(bytes,data,publicUrl){
 if(bytes.length<12||bytes.length>24*1024*1024||bytes.toString('ascii',4,8)!=='ftyp')throw Error('ارفع فيديو MP4 صالحًا بحجم لا يزيد عن 24 ميجابايت.');
 const dir=path.join(data,'media');await mkdir(dir,{recursive:true});const name=randomBytes(32).toString('hex')+'.mp4',file=path.join(dir,name);
 await writeFile(file,bytes,{mode:0o600});
 try{const {stdout}=await promisify(execFile)('ffprobe',['-v','error','-show_entries','stream=codec_type,width,height','-show_entries','format=duration','-of','json',file]);const d=JSON.parse(stdout);if(!d.streams?.some(s=>s.codec_type==='video')||!d.streams?.some(s=>s.codec_type==='audio')||!(Number(d.format?.duration)>=2&&Number(d.format.duration)<=240))throw Error('الفيديو يحتاج صورة وصوت ومدة بين ثانيتين و4 دقائق.')}catch{await rm(file,{force:true});throw Error('ملف الفيديو غير صالح أو لا يحتوي على صوت.');}
 return {url:publicUrl+'/media/'+name,size:bytes.length};
}
export async function serveMedia(req,res,pathname,data){
 const m=pathname.match(/^\/media\/([a-f0-9]{64}\.mp4)$/);if(!m||!['GET','HEAD'].includes(req.method))return false;
 let s;const file=path.join(data,'media',m[1]);try{s=await stat(file)}catch{res.writeHead(404);res.end();return true}
 const headers={'Content-Type':'video/mp4','Accept-Ranges':'bytes','Cache-Control':'public, max-age=3600','X-Content-Type-Options':'nosniff'};
 let start=0,end=s.size-1,status=200;
 if(req.headers.range){const r=req.headers.range.match(/^bytes=(\d+)-(\d*)$/);if(!r||Number(r[1])>=s.size||r[2]&&Number(r[2])<Number(r[1])){res.writeHead(416,{'Content-Range':'bytes */'+s.size});res.end();return true}start=Number(r[1]);end=r[2]?Math.min(Number(r[2]),end):end;status=206;headers['Content-Range']=`bytes ${start}-${end}/${s.size}`}
 headers['Content-Length']=end-start+1;res.writeHead(status,headers);if(req.method==='HEAD')res.end();else createReadStream(file,{start,end}).on('error',()=>res.destroy()).pipe(res);return true;
}
