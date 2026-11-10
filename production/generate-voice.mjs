/** One exact original Charon request, after an exact-slot live preflight. No Sites session. */
import {mkdir,readFile,writeFile,rename,open} from 'node:fs/promises';
import path from 'node:path';import {createHash} from 'node:crypto';import {pathToFileURL} from 'node:url';
import {generateVoice} from '../voice.mjs';import {requireFresh} from './preflight.mjs';
const digest=x=>createHash('sha256').update(x).digest('hex');
export async function produce({request,env=process.env,generator=generateVoice,now=new Date()}){
 const {text,dueAt,preflightReport,outputDir}=request;
 if(typeof text!=='string'||text.trim().length<3||text.length>4000||!outputDir||!preflightReport)throw Error('INVALID_VOICE_REQUEST');
 const proof=JSON.parse(await readFile(preflightReport,'utf8'));requireFresh(proof,{dueAt,now});
 if(!env.GEMINI_API_KEY)throw Error('MISSING_GEMINI_API_KEY');
 const hash=digest(text),intentPath=path.join(outputDir,'voice-request.json'),audioPath=path.join(outputDir,'narration.wav');await mkdir(outputDir,{recursive:true});
 async function save(value){const temp=intentPath+'.tmp';await writeFile(temp,JSON.stringify(value,null,2)+'\n');await rename(temp,intentPath)}
 let previous;try{previous=JSON.parse(await readFile(intentPath,'utf8'))}catch(e){if(e.code!=='ENOENT')throw e}
 if(previous){
  if(previous.text_sha256!==hash||previous.due_at!==dueAt)throw Error('EXISTING_VOICE_INTENT_DIFFERS');
  if(previous.phase!=='complete')throw Error('VOICE_REQUEST_UNRESOLVED_DO_NOT_RETRY');
  const audio=await readFile(audioPath);if(digest(audio)!==previous.audio_sha256)throw Error('CACHED_VOICE_HASH_DIFFERS');return {...previous,reused:true};
 }
 const intent={version:1,phase:'intent',voice:'Charon',text_sha256:hash,due_at:dueAt,created_at:now.toISOString(),generation_requests:1};
 // Atomic claim: concurrent workers must not both pass an earlier ENOENT read.
 let claim;try{claim=await open(intentPath,'wx')}catch(error){if(error.code==='EEXIST')throw Error('VOICE_REQUEST_UNRESOLVED_DO_NOT_RETRY');throw error}
 try{await claim.writeFile(JSON.stringify(intent,null,2)+'\n');await claim.sync()}finally{await claim.close()}
 try{const audio=await generator({text,style:'Natural Egyptian Arabic male educational delivery. Clear and friendly, at a natural measured pace. Read only the exact supplied transcript.'},env.GEMINI_API_KEY);await writeFile(audioPath,audio);Object.assign(intent,{phase:'complete',audio_sha256:digest(audio),bytes:audio.length});await save(intent);return {...intent,reused:false}}
 catch(error){await save({...intent,phase:'uncertain',error:'Provider or persistence failure; reconcile retained intent before any further request.'});throw Error('VOICE_REQUEST_UNRESOLVED_DO_NOT_RETRY')}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){let input='';for await(const chunk of process.stdin)input+=chunk;const result=await produce({request:JSON.parse(input)});console.log(JSON.stringify(result))}
