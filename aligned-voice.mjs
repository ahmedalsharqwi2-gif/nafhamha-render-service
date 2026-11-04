// Generate each sentence separately: timestamps come from its actual WAV duration.
import {mkdtemp,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';import path from 'node:path';import {execFile} from 'node:child_process';import {promisify} from 'node:util';
const run=promisify(execFile);
export async function alignedVoice(project,synthesize){
 const dir=await mkdtemp(path.join(tmpdir(),'nafhamha-align-'));let elapsed=0;const scenes=[],files=[];
 try{for(const scene of project.scenes){const start=elapsed,captions=[];
 const sentences=scene.text.split(/(?<=[.؟!؛])\s+/u).filter(x=>x.trim());
 for(const text of sentences){const bytes=await synthesize(text);const file=path.join(dir,`${files.length}.wav`);await writeFile(file,bytes);files.push(file);
 const {stdout}=await run('ffprobe',['-v','error','-show_entries','format=duration','-of','csv=p=0',file]);const duration=Number(stdout.trim());if(!Number.isFinite(duration)||duration<=0)throw Error('Invalid synthesized duration');
 captions.push({text,start:Math.round((elapsed-start)*30),end:Math.round((elapsed-start+duration)*30)});elapsed+=duration;
 }scenes.push({...scene,from:Math.round(start*30),duration:Math.round(elapsed*30)-Math.round(start*30),seconds:elapsed-start,captions});}
 await writeFile(path.join(dir,'concat.txt'),files.map(f=>`file '${f}'`).join('\n'));
 await run('ffmpeg',['-v','error','-y','-f','concat','-safe','0','-i',path.join(dir,'concat.txt'),'-ar','24000','-ac','1',path.join(dir,'aligned.wav')]);
 return {audio:await readFile(path.join(dir,'aligned.wav')),project:{...project,scenes,durationInFrames:Math.ceil(elapsed*30)},duration:elapsed,alignment:'measured-sentence-audio'};
 }finally{await rm(dir,{recursive:true,force:true})}
}
