export async function generateVoice({text,style}, apiKey, fetcher=fetch){
 if(typeof text!=='string'||text.trim().length<3||text.length>4000)throw Error('اكتب نصًا بين ٣ و٤٠٠٠ حرف.');
 if(style!==undefined&&(typeof style!=='string'||style.length>1500))throw Error('تعليمات الصوت أطول من المسموح.');
 if(!apiKey)throw Error('مفتاح Gemini غير محفوظ في الخدمة.');
 const r=await fetcher('https://generativelanguage.googleapis.com/v1beta/interactions',{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':apiKey},body:JSON.stringify({model:'gemini-3.8-flash-tts',input:[{type:'user_input',content:[{type:'text',text,annotations:[{type:'speech_metadata',style:style||'Speak naturally in Egyptian Arabic, informative and friendly male delivery, clear pronunciation, moderate pace. Read only the provided transcript.'}]}]}],response_format:{type:'audio'},generation_config:{speech_config:[{voice:'Charon'}]}}),signal:AbortSignal.timeout(120000)});
 if(!r.ok)throw Error(r.status===429?'تم بلوغ حد الاستخدام أو الرصيد في Gemini.':r.status===401||r.status===403?'مفتاح Gemini أو صلاحياته غير صالحة.':`تعذّر توليد الصوت من Gemini (${r.status}).`);
 const d=await r.json();const audio=(d.steps||[]).filter(s=>s.type==='model_output').flatMap(s=>s.content||[]).filter(p=>p.type==='audio'&&p.data).at(-1)||d.output_audio;
 if(!audio?.data)throw Error('لم يرجع Gemini ملفًا صوتيًا.');
 const bytes=Buffer.from(audio.data,'base64');
 if(bytes.length<44||bytes.length>20*1024*1024||bytes.toString('ascii',0,4)!=='RIFF'||bytes.toString('ascii',8,12)!=='WAVE')throw Error('صيغة الصوت غير متوقعة من Gemini.');
 return bytes;
}
