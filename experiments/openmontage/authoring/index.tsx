import React from 'react';
import {AbsoluteFill,Audio,Composition,Sequence,interpolate,interpolateColors,registerRoot,staticFile,useCurrentFrame,spring,delayRender,continueRender,cancelRender} from 'remotion';
import {ThreeCanvas} from '@remotion/three';

if(typeof document!=='undefined'){
 const h=delayRender('Arabic typography');
 const font=new FontFace('Cairo',`url(${staticFile('Cairo.ttf')})`,{weight:'100 900'});
 font.load().then(f=>{document.fonts.add(f);continueRender(h)}).catch(cancelRender);
}
const clamp={extrapolateLeft:'clamp',extrapolateRight:'clamp'} as const;
const mix=(f:number,a:number,b:number,x=0,y=1)=>interpolate(f,[a,b],[x,y],clamp);
const ease=(v:number)=>{const x=Math.max(0,Math.min(1,v));return x*x*(3-2*x)};
const range=(n:number)=>Array.from({length:n},(_,i)=>i);
const colours=['#ae7ff0','#7c8cf2','#45bce6','#66c69a','#eddb8b','#f4a561','#eb7666'];
const palette=[['#cce6df','#efd3b1','#3a4e4a','#b44835'],['#181d2a','#41343e','#fff3d9','#f7d18f'],['#12332e','#274d40','#eff5db','#a7d9bc'],['#d8eae7','#c1d4ba','#274b4d','#2b737b'],['#eee0d5','#c9b4c9','#4c3248','#874d67'],['#53334b','#d17a56','#fff1d3','#f4ba77'],['#42465c','#e9a36e','#fff0d5','#f0bd82'],['#151f26','#354b48','#fff0d0','#b6dbc1']];
const norm=(s:string)=>s.replace(/[أإآ]/g,'ا').replace(/ة/g,'ه').replace(/[^ء-ي]/g,'');
const cue=(s:any,w:string,fallback:number)=>s.words?.find((x:any)=>norm(x.text).includes(norm(w)))?.start??fallback;
const svgText=(x:number,y:number,t:string,fill='#fff0d0',size=25,weight=600)=><text x={x} y={y} fill={fill} textAnchor="middle" fontSize={size} fontWeight={weight} fontFamily="Cairo">{t}</text>;

function Sky({f,sunset=0,clouds=0}:any){const t=ease(sunset);return <>
 <defs><linearGradient id="skyFull" x2="0" y2="1"><stop stopColor={interpolateColors(t,[0,1],['#acd0d6','#3e3d5b'])}/><stop offset=".5" stopColor={interpolateColors(t,[0,1],['#e4eee2','#cc8b86'])}/><stop offset=".78" stopColor={interpolateColors(t,[0,1],['#ffedc9','#f5b974'])}/><stop offset="1" stopColor="#5a6a58"/></linearGradient></defs>
 <rect width="720" height="1280" fill="url(#skyFull)"/>
 <circle cx={480-t*70} cy={400+t*240} r={72-t*10} fill="#fff0bc"/>
 <circle cx={480-t*70} cy={400+t*240} r={126+Math.sin(f/60)*5} fill="url(#solarGlow)" opacity=".65"/>
 {range(8).map(k=><path key={k} d={`M${-150+k*140} ${360+(k%3)*75}q45 -30 85 0t110 0`} fill="none" stroke={t>.5?'#efd9b2':'#f2f0dc'} strokeWidth={20+clouds*16} opacity={.10+clouds*.16} strokeLinecap="round" transform={`translate(${Math.sin(f/140+k)*25},0)`}/>)}
 <path d="M0 855 Q150 760 320 842 T720 820V1280H0Z" fill={t>.5?'#5c4650':'#6c897b'}/>
 <path d="M0 925 Q240 805 450 922 T720 885V1280H0Z" fill={t>.5?'#343f41':'#476b62'}/>
 <path d="M0 1000 Q190 890 350 1005 T720 965V1280H0Z" fill={t>.5?'#233638':'#30564f'}/>
 </>}
function Globe({cx=360,cy=675,r=220,f=0}:any){return <g>
 <defs><radialGradient id="earthBody" cx="30%" cy="20%"><stop stopColor="#68867c"/><stop offset=".55" stopColor="#254f53"/><stop offset="1" stopColor="#152c36"/></radialGradient><clipPath id="earthClip"><circle cx={cx} cy={cy} r={r}/></clipPath></defs>
 <circle cx={cx} cy={cy} r={r+29} fill="none" stroke="#e9bca0" strokeWidth="30" opacity=".16"/>
 <circle cx={cx} cy={cy} r={r+15} fill="none" stroke="#b5d0c4" strokeWidth="2" opacity=".5"/>
 <circle cx={cx} cy={cy} r={r} fill="url(#earthBody)"/>
 <g clipPath="url(#earthClip)" transform={`rotate(${Math.sin(f/300)*2} ${cx} ${cy})`}>
 <path d={`M${cx-r*.85} ${cy-r*.5}l${r*.35} ${-r*.2} ${r*.28} ${r*.12} ${r*.02} ${r*.27} ${r*.25} ${r*.1} ${-r*.11} ${r*.28} ${-r*.25} ${r*.05} ${-r*.12} ${r*.46} ${-r*.13} ${r*.1} ${-r*.15} ${-r*.51} ${-r*.24} ${-r*.12}Z`} fill="#819e7d" opacity=".65"/>
 <path d={`M${cx+r*.1} ${cy-r*.75}l${r*.5} ${r*.17} ${r*.2} ${r*.4} ${-r*.16} ${r*.17} ${-r*.16} ${-r*.05} ${-r*.06} ${r*.32} ${-r*.22} ${r*.22} ${-r*.2} ${-r*.4} ${r*.1} ${-r*.27} ${-r*.17} ${-r*.16}Z`} fill="#a3af82" opacity=".58"/>
 {range(5).map(k=><ellipse key={k} cx={cx} cy={cy} rx={r*(.25+k*.18)} ry={r} fill="none" stroke="#d5e4ce" strokeWidth="1" opacity=".07"/>)}
 <ellipse cx={cx} cy={cy} rx={r} ry={r*.3} fill="none" stroke="#d5e4ce" opacity=".12"/>
 </g><circle cx={cx} cy={cy} r={r} fill="none" stroke="#c9dbbf" strokeWidth="1.5" opacity=".5"/>
 </g>}
function Molecular({f,duration}:any){const p=ease(f/duration);const travel=mix(f,0,90,-1.8,0);const scatter=mix(f,98,122);return <ThreeCanvas width={720} height={850} camera={{position:[Math.sin(f/220)*.35,Math.sin(f/280)*.2,8.5-p*1.1],fov:44}} style={{position:'absolute',top:130,left:0}}>
 <ambientLight intensity={.6}/><directionalLight position={[-4,5,6]} intensity={2.5} color="#f5e5c0"/><pointLight position={[3,-2,3]} intensity={8} color="#98d8cb"/><pointLight position={[-3,0,-1]} intensity={5} color="#d4adcf"/>
 <group position={[-p*.5,0,0]} rotation={[.06,Math.sin(f/240)*.14,0]}>
 {range(14).map(i=>{const x=((i*7)%5-2)*1.5;const y=((i*3)%7-3)*.65;const z=(i%3-1)*1.5;return <group key={i} position={[x+Math.sin(f/170+i)*.1,y+Math.cos(f/190+i)*.12,z]} rotation={[f/250+i,f/210+i,f/310]}>{[-1,1].map(k=><mesh key={k} position={[k*.2,0,0]}><sphereGeometry args={[.28,20,20]}/><meshPhysicalMaterial color={i%4?'#9dd9c2':'#c8acd3'} roughness={.18} metalness={.15} clearcoat={.8}/></mesh>)}<mesh rotation={[0,0,Math.PI/2]}><cylinderGeometry args={[.075,.075,.4,12]}/><meshStandardMaterial color="#d2d6c0" roughness={.4}/></mesh></group>})}
 </group>
 {range(9).map(k=><mesh key={'p'+k} position={[((f*0.035+k*.8)%8)-4,0,1.8]}><sphereGeometry args={[k===0?.07:.045,10,10]}/><meshBasicMaterial color="#ffe2a1" transparent opacity={.3+k/16}/></mesh>)}
 {[1,-1].map(k=><mesh key={'s'+k} position={[scatter*2,scatter*k*2,1.8]}><sphereGeometry args={[.08,12,12]}/><meshBasicMaterial color="#7dd7f4"/></mesh>)}
 </ThreeCanvas>}
function World({i,f,s,hideText=false}:any){const txt=(...args:Parameters<typeof svgText>)=><g opacity={hideText?0:(i===0?1:mix(f,24,38))}>{svgText(...args)}</g>;const [a,b,ink,accent]=palette[i];const p=f/s.duration;const e=ease(mix(f,0,40));const wave=(cy:number,amp:number,period:number,from=80,to=610)=>{let d='';for(let x=from;x<=to;x+=4)d+=(x===from?'M':'L')+x+' '+(cy+Math.sin(x/period-f*.055)*amp);return d};
 return <AbsoluteFill style={{overflow:'hidden',transform:i===0||i===6?'none':'scale(0.65)',transformOrigin:'360px 210px'}}>{i===2&&<Molecular f={f} duration={s.duration}/>}<svg width="720" height="1280" viewBox="0 0 720 1280" style={{position:'absolute',inset:0}}><defs>
 <radialGradient id="solarGlow"><stop stopColor="#ffe7aa" stopOpacity=".65"/><stop offset="1" stopColor="#ffc779" stopOpacity="0"/></radialGradient>
 <linearGradient id="glass" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#fff6d8" stopOpacity=".30"/><stop offset=".35" stopColor="#e7e8ef" stopOpacity=".03"/><stop offset=".7" stopColor="#cbdddc" stopOpacity=".2"/><stop offset="1" stopColor="#fff" stopOpacity=".45"/></linearGradient>
 <radialGradient id="lens"><stop stopColor="#d8c2ca" stopOpacity=".25"/><stop offset=".8" stopColor="#6d486b" stopOpacity=".15"/><stop offset="1" stopColor="#fff4e6" stopOpacity=".7"/></radialGradient>
 <filter id="glow"><feGaussianBlur stdDeviation="7"/></filter>
 </defs>
 {i===0&&<g transform={`translate(${mix(f,330,s.duration,0,-90)},${mix(f,330,s.duration,0,30)}) scale(${mix(f,330,s.duration,1,1.22)})`}>
 <Sky f={f} sunset={mix(f,45,110)} />
 <g opacity={mix(f,0,30)*mix(f,270,320,1,0)}>{txt(340,240,f<65?'نفس السما…':'نفس الشمس…',f<65?'#345c5a':'#fff0cc',46,800)}{txt(340,300,f<65?'ليه لونها بيتغيّر؟':'لونين مختلفين',f<65?'#345c5a':'#fff0cc',35,700)}</g>
 <path d={`M410 740Q350 610 ${300+mix(f,274,440,0,90)} ${400-mix(f,274,440,0,100)}`} stroke="#ffe8a2" strokeWidth="3" fill="none" strokeDasharray="8 10" strokeDashoffset={-f} opacity={mix(f,274,310)}/><circle cx={410-mix(f,274,440,0,30)} cy={740-mix(f,274,440,0,400)} r="9" fill="#fff0bb" opacity={mix(f,274,310)}/>
 </g>}
 {i===1&&<g transform={`translate(${Math.sin(f/200)*5},0)`}>
 <path d="M-50 560H290" stroke="#fff1c9" strokeWidth="18" opacity=".12" filter="url(#glow)"/><path d="M-50 560H300" stroke="#fff1c9" strokeWidth="5" strokeDasharray="30 7" strokeDashoffset={-f*3}/>
 <g transform={`rotate(${mix(f,0,70,-6,0)} 345 530)`}><path d="M235 720L350 365L490 720Z" fill="url(#glass)" stroke="#eee6d0" strokeWidth="2"/><path d="M350 365L375 695L490 720" fill="none" stroke="#fff4db" opacity=".38"/><path d="M235 720L375 695L350 365" fill="#fff9e6" opacity=".04"/></g>
 {colours.map((c,k)=><g key={c} opacity={mix(f,35+k*6,60+k*6)}><path d={`M365 560Q475 ${480+k*32} 760 ${290+k*85}`} stroke={c} strokeWidth="8" fill="none" opacity=".8"/><circle cx={365+((f*2+k*22)%380)} cy={560+((290+k*85-560)*((f*2+k*22)%380)/380)} r="4" fill={c}/></g>)}
 <g opacity={mix(f,115,150)}><path d={wave(790,12,10,80,300)} stroke="#7dd4ed" strokeWidth="3" fill="none"/><path d={wave(790,12,24,420,610)} stroke="#ed9981" strokeWidth="3" fill="none"/>{txt(190,850,'موجة أقصر','#a9dce5',23)}{txt(510,850,'موجة أطول','#f0c3b2',23)}</g>
 <g opacity={mix(f,290,340)}>{range(10).map(k=><circle key={k} cx={80+(k*97)%550} cy={350+(k*61)%360} r="9" fill="#a0d8c5" opacity=".4"/>)}{txt(350,310,'نقرّب أكتر…',ink,25)}</g>
 </g>}
 {i===2&&<g>
 <path d="M40 555H590" fill="none" stroke="#e9d496" strokeWidth="2" opacity=".25"/>
 <g opacity={mix(f,cue(s,'تشتّت',98)-14,cue(s,'تشتّت',98)+10)}>{[-1,1].map(k=><g key={k}><path d={`M360 555Q430 ${555+k*60} 560 ${555+k*185}`} stroke="#71cbef" strokeWidth="3" fill="none" opacity=".7"/><circle cx={360+((f-98+300)%110)/110*200} cy={555+k*((f-98+300)%110)/110*185} r="5" fill="#aee9ef"/></g>)}</g>
 <g opacity={mix(f,155,180)*mix(f,350,380,1,0)}>{txt(340,800,'الأقصر بيتشتّت أكتر',ink,35,800)}<path d={wave(855,10,10,180,500)} fill="none" stroke="#71cdec" strokeWidth="3"/></g>
 <g opacity={mix(f,360,400)}>{txt(350,800,'جزيئات الهواء',ink,26)}{txt(350,842,'نموذج مبسّط؛ مش بالحجم الحقيقي',ink,20)}</g>
 </g>}
 {i===3&&<g>
 <ellipse cx="345" cy="870" rx="295" ry="75" fill="#a19f73" opacity=".20"/>
 <ellipse cx="345" cy="900" rx="260" ry="35" fill="#7c896d" opacity=".18"/>
 <path d="M55 720Q340 190 635 720" fill="none" stroke="#4f999c" strokeWidth="3" strokeDasharray="6 9"/>
 {range(7).map(k=>{const a=Math.PI+k*Math.PI/6;const x=345+278*Math.cos(a),y=705+310*Math.sin(a);const q=((f+k*13)%100)/100;return <g key={k} opacity={mix(f,20+k*4,45+k*4)}><circle cx={x} cy={y} r="10" fill="#529ba7"/><path d={`M${x} ${y}Q${(x+340)/2} ${(y+790)/2-30} 340 790`} stroke="#62a4ae" strokeWidth="2" fill="none" opacity=".5"/><circle cx={x+(340-x)*q} cy={y+(790-y)*q} r="4" fill="#2b829d"/></g>})}
 <path d="M255 790Q340 700 425 790Q340 880 255 790Z" fill="#faf0d2" stroke="#39747a" strokeWidth="3"/><circle cx="340" cy="790" r="32" fill="#588f8d"/><circle cx="340" cy="790" r="14" fill="#2a4246"/><circle cx="332" cy="781" r="5" fill="#fff6d3"/>
 <g opacity={mix(f,221,250)*mix(f,290,315,1,0)}><path d={wave(585,8,17,130,550)} stroke="#6194a2" strokeWidth="3" fill="none" opacity=".7"/><path d="M285 535L385 630M385 535L285 630" stroke="#b96551" strokeWidth="6" strokeLinecap="round"/>{txt(340,670,'مش انعكاس البحر',ink,28,800)}</g>
 {txt(345,350,'من السما… لعينيك',ink,32,800)}
 </g>}
 {i===4&&<g transform={`translate(0,${Math.sin(f/150)*4})`}>
 <circle cx="345" cy="570" r="186" fill="url(#lens)" stroke="#a48b9f" strokeWidth="2"/><circle cx="345" cy="570" r="160" fill="none" stroke="#e9d9d6" opacity=".6"/>
 {colours.map((c,k)=><path key={c} d={`M20 ${395+k*42}Q170 ${395+k*42} 345 570Q460 570 625 ${560+(k-3)*7}`} stroke={c} strokeWidth="5" opacity={mix(f,15+k*4,50+k*4,.15,.65)} fill="none"/>)}
 <path d="M270 570Q345 490 420 570Q345 650 270 570Z" fill="#f7e9d8" stroke="#87637a" strokeWidth="2"/><circle cx="345" cy="570" r="30" fill="#8c708c"/><circle cx="345" cy="570" r="12" fill="#4f3b52"/>
 <g opacity={mix(f,150,180)}>{txt(345,345,'اللون = ضوء + عين',ink,36,800)}{txt(345,805,f<260?'التشتّت مش العامل الوحيد':'عيننا جزء من الحكاية',ink,29,700)}</g>
 <g opacity={mix(f,245,280)}>{['#be7a7c','#8aaa88','#7f9fb3'].map((c,k)=><g key={c}><circle cx={245+k*100} cy="875" r="22" fill={c}/><circle cx={245+k*100} cy="875" r={29+Math.sin(f/35+k)*3} fill="none" stroke={c} opacity=".4"/></g>)}</g>
 </g>}
 {i===5&&<g transform={`translate(0,${mix(f,0,50,35,0)})`}>
 <Globe cx={360} cy={665} r={205} f={f}/>
 <path d="M360 275V460" stroke="#ffe9b1" strokeWidth="4" opacity={mix(f,10,40,1,.35)}/>
 <path d="M-40 460H360" stroke="#f5b16c" strokeWidth="6" opacity={mix(f,50,100)}/>
 <path d="M235 460H360" stroke="#ffb97b" strokeWidth="15" opacity={mix(f,50,100,0,.16)}/>
 {range(7).map(k=><circle key={k} cx={((f*2.4+k*60)%400)-40} cy="460" r="4" fill="#fff2c2" opacity={mix(f,50,95)}/>)}
 <g opacity={mix(f,210,250)}>{[0,1,2].map(k=><g key={k}><path d={`M${245+k*35} 460Q${230+k*35} 400 ${200+k*35} ${330-k*20}`} fill="none" stroke="#88cddc" strokeWidth="3" strokeDasharray="7 9" strokeDashoffset={-f}/></g>)}</g>
 <circle cx="360" cy="460" r="9" fill="#fff3cb"/>
 <g>{txt(465,335,'نهار',ink,25)}{txt(470,375,'مسار أقصر',ink,22)}{txt(145,540,'غروب',ink,25)}{txt(145,580,'مسار أطول',ink,22)}</g>
 <g opacity={mix(f,315,355)}>{txt(360,920,'المباشر يبقى أدفى',ink,32,800)}<path d="M240 950H480" stroke="#ffc07e" strokeWidth="4"/></g>
 </g>}
 {i===6&&<g>
 <Sky f={f} sunset={.93} clouds={mix(f,100,220,.05,1)}/>
 {range(20).map(k=><circle key={k} cx={(k*83+f*.35)%720} cy={340+(k*69)%480+Math.sin(f/70+k)*10} r={1.5+k%3} fill="#f9d3a6" opacity={mix(f,140,190,0,.22)}/>)}
 <g opacity={mix(f,0,30)*mix(f,120,150,1,0)}>{txt(340,570,'السما مش لون واحد',ink,38,800)}</g>
 <g opacity={mix(f,150,185)}>{txt(340,460,f<285?'السحب والجسيمات':'كل غروب… له مشهده',ink,35,800)}<path d="M250 490H430" stroke="#f0c28a" strokeWidth="2"/></g>
 </g>}
 {i===7&&<g>
 <g transform={`translate(${mix(f,0,180,-80,0)},${mix(f,0,180,-130,0)}) translate(360 610) scale(${mix(f,0,180,1.45,.9)}) translate(-360 -610)`}><Globe cx={360} cy={610} r={205} f={f}/>
 <path d="M-100 500Q190 410 360 405" stroke="#f8d5a1" strokeWidth="5" fill="none" opacity=".75"/>
 {range(7).map(k=><circle key={k} cx={50+(f*1.6+k*55)%310} cy={420+Math.sin(k)*20} r="4" fill={k%2?'#8dd3dc':'#f1b485'}/>)}
 <path d="M360 405Q490 270 650 360" stroke="#7fc9e0" strokeWidth="3" fill="none" opacity=".7"/>
 </g>
 <g opacity={mix(f,0,20)*mix(f,330,360,1,0)}>{txt(340,880,f<115?'ضوء واحد':f<224?'اتجاهات مختلفة':'رحلة أطول… لون أدفى',ink,32,800)}</g>
 <g opacity={mix(f,355,410)}>{txt(340,340,'المرة الجاية تشوف الغروب…',ink,30,700)}{txt(340,390,'افتكر رحلة الضوء',ink,38,800)}</g>
 <g opacity={mix(f,470,500)}>{txt(340,855,'نفهمها',ink,57,900)}{txt(340,904,'كل معلومة تستاهل شرح حلو',ink,21)}</g>
 </g>}
 </svg></AbsoluteFill>}
function Caption({s,f,ink}:any){const c=s.captions.find((c:any)=>f>=c.start&&f<c.end);if(!c)return null;return <div style={{position:'absolute',top:704,left:124,right:124,minHeight:92,padding:'12px 16px',boxSizing:'border-box',borderRadius:18,background:'#132b2bed',border:'1px solid #c7dfc52a',boxShadow:'0 10px 28px #10222220',color:'#fff5df',fontWeight:650,fontSize:c.text.length>40?28:30,lineHeight:1.55,textAlign:'center',direction:'rtl'}}><span>{c.words.map((w:any,k:number)=><React.Fragment key={k}><span style={{color:f>=w.start&&f<w.end?'#c6ebcb':'#fff5df',fontWeight:f>=w.start&&f<w.end?800:650}}>{w.text}</span>{' '}</React.Fragment>)}</span></div>}
function Film(p:any){const f=useCurrentFrame();let i=p.scenes.findIndex((s:any)=>f>=s.from&&f<s.from+s.duration);if(i<0)i=p.scenes.length-1;const s=p.scenes[i];const lf=f-s.from;const blend=i?ease(lf/24):1;const [a,b,ink,accent]=palette[i];const pa=palette[Math.max(0,i-1)];return <AbsoluteFill style={{direction:'rtl',fontFamily:'Cairo, sans-serif',background:`radial-gradient(ellipse at 35% 30%,${interpolateColors(blend,[0,1],[pa[0],a])},${interpolateColors(blend,[0,1],[pa[1],b])})`,color:ink,overflow:'hidden'}}>
 {i>0&&lf<24&&<div style={{position:'absolute',inset:0,opacity:1-blend,transform:`scale(${1+blend*.1})`,filter:`blur(${blend*3}px)`}}><World i={i-1} f={p.scenes[i-1].duration-24+lf} s={p.scenes[i-1]} hideText/></div>}
 <div style={{position:'absolute',inset:0,opacity:blend,transform:`translateY(${(1-blend)*18}px) scale(${1.015-blend*.015})`}}><World i={i} f={lf} s={s}/></div>
 {/* Shared trace is a visual continuity device, not a physical scale model. */}
 <svg width="720" height="1280" style={{position:'absolute',inset:0,pointerEvents:'none'}}><path d="M50 1140Q340 1110 596 1140" stroke={ink} strokeWidth="1" opacity=".14" fill="none"/><circle cx={50+546*f/p.durationInFrames} cy={1140-30*Math.sin(Math.PI*f/p.durationInFrames)} r="3" fill={accent}/></svg>
 <div style={{position:'absolute',top:80,left:52,right:124,display:'flex',justifyContent:'space-between',alignItems:'center',fontSize:21,fontWeight:800,color:i===0&&lf<100?'#294c4a':i===0||i===6?'#fff4d8':ink,textShadow:i===0||i===6?'0 1px 5px #19363866':'none'}}><span>نفهمها ✦</span><span style={{fontSize:16,fontWeight:600,opacity:.8}}>رحلة الضوء · {i+1}/8</span></div>
 {i!==0&&<div style={{position:'absolute',top:156,left:52,right:124,opacity:mix(lf,0,16)*mix(lf,105,140,1,0),transform:`translateY(${mix(lf,0,24,14,0)}px)`,fontSize:41,fontWeight:850,lineHeight:1.55,color:i===6?'#fff3d6':ink}}>{s.title}</div>}
 <Caption s={s} f={lf} ink={ink}/>
 <div style={{position:'absolute',top:120,left:124,right:124,fontSize:14,lineHeight:'20px',textAlign:'center',opacity:.7,color:i===0||i===6?'#f1ead4':ink}}>رسوم مبسّطة · الأحجام والمسافات غير مقيّسة</div>
 {p.scenes.map((s:any,j:number)=><Sequence key={j} from={s.from} durationInFrames={s.duration}><Audio src={staticFile(s.audio)}/></Sequence>)}
 <Audio src={staticFile(p.soundtrack)} volume={1}/>
 </AbsoluteFill>}
registerRoot(()=> <Composition id="Sky" component={Film} width={720} height={1280} fps={30} durationInFrames={300} defaultProps={{scenes:[],durationInFrames:300,soundtrack:'sound-design-v3.wav'}} calculateMetadata={({props})=>({durationInFrames:props.durationInFrames})}/>);
