/** Read-only unattended binding checks. No TTS, media uploads or publishing mutations. */
import {pathToFileURL} from 'node:url';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
export const CHANNEL='UCVYe5C8jhHFlKz7UPeVzFCg';
export function serviceOrigin(value){
 let u;try{u=new URL(value)}catch{throw Error('INVALID_SERVICE_URL')}
 if(u.protocol!=='https:'||u.username||u.password||u.search||u.hash||u.pathname!=='/'||(u.port&&u.port!=='443'))throw Error('INVALID_SERVICE_URL');
 if(u.hostname.endsWith('.chatgpt.site'))throw Error('INTERACTIVE_DASHBOARD_IS_NOT_UNATTENDED_SERVICE');
 return u.origin;
}
function issue(report,code){if(!report.errors.includes(code))report.errors.push(code)}
export async function check({env=process.env,fetcher=fetch,now=new Date(),dueAt=env.NAFHAMHA_DUE_AT}={}){
 const report={version:1,checked_at:now.toISOString(),channel_id:CHANNEL,due_at:dueAt||null,passed:false,errors:[],checks:{},generation_calls:0,publication_mutations:0};
 for(const key of ['NAFHAMHA_SERVICE_URL','NAFHAMHA_API_TOKEN','BUFFER_API_KEY','GEMINI_API_KEY'])if(!env[key])issue(report,'MISSING_'+key);
 let origin;if(env.NAFHAMHA_SERVICE_URL)try{origin=serviceOrigin(env.NAFHAMHA_SERVICE_URL);report.service_origin=origin}catch(e){issue(report,e.message)}
 if(!dueAt||!Number.isFinite(Date.parse(dueAt)))issue(report,'MISSING_OR_INVALID_DUE_AT');
 else if(Date.parse(dueAt)<=now.getTime())issue(report,'EXPIRED_EXACT_SLOT');
 if(dueAt&&Number.isFinite(Date.parse(dueAt))){const local=new Intl.DateTimeFormat('en-GB',{timeZone:'Africa/Cairo',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).format(new Date(dueAt));if(local!=='12:00:00')issue(report,'DUE_AT_IS_NOT_CAIRO_NOON')}
 async function get(route,authenticated=false){
  try{const r=await fetcher(origin+route,{redirect:'error',signal:AbortSignal.timeout(30000),headers:authenticated?{Authorization:'Bearer '+env.NAFHAMHA_API_TOKEN}:{}});if(!r.ok)return {ok:false,http_status:r.status};const body=await r.json();return {ok:body.ok===true,body,http_status:r.status}}
  catch{return {ok:false,error:'REQUEST_OR_RESPONSE_FAILED'}}
 }
 if(origin&&env.NAFHAMHA_API_TOKEN){
  const health=await get('/health');report.checks.service_health={ok:health.ok,http_status:health.http_status};if(!health.ok)issue(report,'SERVICE_HEALTH_UNAVAILABLE');
  const status=await get('/api/status',true);report.checks.service_auth={ok:status.ok,http_status:status.http_status};if(!status.ok)issue(report,'SERVICE_AUTH_OR_STATUS_UNAVAILABLE');
  // Buffer is the selected publisher. The service's independent OAuth channel may be absent;
  // if present it must never contradict the explicitly authorized channel.
  const linked=status.body?.channel;if(linked?.id&&linked.id!==CHANNEL)issue(report,'SERVICE_YOUTUBE_CHANNEL_MISMATCH');
 }
 async function gql(query){
  const response=await fetcher('https://api.buffer.com',{method:'POST',redirect:'error',signal:AbortSignal.timeout(30000),headers:{Authorization:'Bearer '+env.BUFFER_API_KEY,'Content-Type':'application/json'},body:JSON.stringify({query})});
  if(!response.ok)throw Error('BUFFER_HTTP_'+response.status);const data=await response.json();if(data.errors||!data.data)throw Error('BUFFER_QUERY_REJECTED');return data.data;
 }
 if(env.BUFFER_API_KEY)try{
  const orgs=(await gql('query {account {organizations {id}}}')).account.organizations;let candidates=[];
  for(const org of orgs){const rows=(await gql('query {channels(input:{organizationId:'+JSON.stringify(org.id)+'}){id organizationId service serviceId isDisconnected isQueuePaused isLocked}}')).channels;for(const row of rows)if(String(row.service).toLowerCase()==='youtube'&&row.serviceId===CHANNEL)candidates.push({...row,organizationId:org.id})}
  if(candidates.length!==1)issue(report,'BUFFER_EXACT_CHANNEL_NOT_UNIQUE_OR_NOT_FOUND');
  else {const c=candidates[0];report.checks.buffer_channel={id:c.id,organization_id:c.organizationId,service_id:c.serviceId,connected:c.isDisconnected===false,queue_running:c.isQueuePaused===false,unlocked:c.isLocked===false};
   if(env.NAFHAMHA_BUFFER_CHANNEL_ID&&env.NAFHAMHA_BUFFER_CHANNEL_ID!==c.id)issue(report,'BUFFER_CONFIGURED_CHANNEL_MISMATCH');
   if(c.isDisconnected!==false||c.isQueuePaused!==false||c.isLocked!==false)issue(report,'BUFFER_CHANNEL_NOT_READY');
   if(dueAt&&Number.isFinite(Date.parse(dueAt))){
    const start=new Date(Date.parse(dueAt)-1000).toISOString(),end=new Date(Date.parse(dueAt)+1000).toISOString();const q='query {posts(first:100,input:{organizationId:'+JSON.stringify(c.organizationId)+',filter:{channelIds:['+JSON.stringify(c.id)+'],dueAt:{start:'+JSON.stringify(start)+',end:'+JSON.stringify(end)+'},status:[scheduled,sending,sent,error]}}){edges{node{id channelId status dueAt}} pageInfo{hasNextPage}}}';
    const rows=(await gql(q)).posts;report.checks.slot={checked:true,post_ids:rows.edges.map(e=>e.node.id),has_more:rows.pageInfo.hasNextPage};if(rows.pageInfo.hasNextPage)issue(report,'QUEUE_INVENTORY_INCOMPLETE');if(rows.edges.length)issue(report,'EXACT_SLOT_OCCUPIED_RECONCILE_BEFORE_GENERATION');
   }
  }
 }catch(e){const code=/^BUFFER_HTTP_\d+$/.test(e.message)?e.message:e.message==='BUFFER_QUERY_REJECTED'?e.message:'BUFFER_CHECK_FAILED';issue(report,code)}
 report.passed=report.errors.length===0;
 report.limit='Preflight proves only the recorded read-only checks, not a finished film, media upload, scheduling receipt or publication.';
 return report;
}
export function requireFresh(report,{dueAt,now=new Date()}={}){
 if(!report?.passed||report.channel_id!==CHANNEL||report.due_at!==dueAt)throw Error('PREFLIGHT_NOT_PASSED_FOR_EXACT_CHANNEL_AND_SLOT');
 const age=now.getTime()-Date.parse(report.checked_at);if(!Number.isFinite(age)||age<0||age>10*60*1000)throw Error('PREFLIGHT_STALE');
 if(Date.parse(dueAt)<=now.getTime())throw Error('EXPIRED_EXACT_SLOT');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const report=await check();const output=process.env.NAFHAMHA_PREFLIGHT_OUTPUT||'preflight-output/report.json';await mkdir(path.dirname(output),{recursive:true});await writeFile(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));if(!report.passed)process.exitCode=2;
}
