export function validateCycle({repo,cycle,due,episodeDir,compositionId}){
 if(repo!=='ahmedalsharqwi2-gif/nafhamha-render-service'||!Number.isFinite(Date.parse(due)))throw Error('AUTHORIZED_NAFHAMHA_REPO_AND_TIME_REQUIRED');
 const f=new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Cairo',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});const p=Object.fromEntries(f.formatToParts(new Date(due)).map(x=>[x.type,x.value]));const date=`${p.year}-${p.month}-${p.day}`;const days=(Date.parse(date+'T00:00:00Z')-Date.parse('2026-11-10T00:00:00Z'))/86400000;
 if(p.hour!=='12'||p.minute!=='00'||p.second!=='00'||days<0||days%3!==0||cycle!==`nafhamha-${date}-noon`)throw Error('EXACT_CAIRO_NOON_THREE_DAY_CADENCE_REQUIRED');
 if(!new RegExp('^episodes/'+date+'-[a-z0-9-]+$').test(episodeDir||'')||!/^Nafhamha[A-Za-z0-9]+$/.test(compositionId||''))throw Error('BOUND_EPISODE_DIRECTORY_AND_COMPOSITION_REQUIRED');return date;
}
