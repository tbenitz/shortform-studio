/** DeepSeek Flash review of real decoded frames from synchronized POVs. */
import {loadStreamingMedia} from './audio-reader.js';
import {makeSegment,fmt} from './model.js';
import {sourceAtAlignment,checkSynchronization} from './pov-sync.js';

export const VISION_VERSION=1;
const EVIDENCE=new Set(['muzzle_flash','enemy_visible','enemy_shooting','explosion','hit_marker','damage_indicator','down_indicator','revive_ui','active_gunfight','kill_feed']);
export function storyboardTimes(candidate,count=12){
 const a=Number(candidate?.pov?.globalStart),b=Number(candidate?.pov?.globalEnd);
 if(!(Number.isFinite(a)&&Number.isFinite(b)&&b-a>=10))return [];
 return Array.from({length:count},(_,i)=>+(a+Math.min(2,(b-a)*.05)+(b-a-2*Math.min(2,(b-a)*.05))*i/(count-1)).toFixed(2));
}
export async function captureContactSheet(file,sync,id,times,{label,signal,moduleLoader=loadStreamingMedia}={}){
 if(!file)throw Error('Relink original POV video '+label+' before frame inspection');
 const m=await moduleLoader(),input=new m.Input({formats:m.ALL_FORMATS,source:new m.BlobSource(file)});
 try{
  const track=await input.getPrimaryVideoTrack();
  if(!track||!(await track.canDecode()))throw Error('Video codec for POV '+label+' cannot be decoded in Chrome');
  const pair=times.map(shared=>({shared,local:sourceAtAlignment(sync,id,shared)}))
    .filter(x=>Number.isFinite(x.local)&&x.local>=0).sort((a,b)=>a.local-b.local);
  const w=320,h=180,cap=26,cols=3,canvas=document.createElement('canvas');
  canvas.width=w*cols;canvas.height=(h+cap)*Math.ceil(pair.length/cols);
  const ctx=canvas.getContext('2d');if(!ctx)throw Error('Storyboard canvas unavailable');
  ctx.fillStyle='#141414';ctx.fillRect(0,0,canvas.width,canvas.height);
  const sink=new m.CanvasSink(track,{width:w});
  let i=0,decoded=0;
  for await(const frame of sink.canvasesAtTimestamps(pair.map(x=>x.local))){
   if(signal?.aborted)throw Error('Frame review cancelled');
   if(i>=pair.length)break;
   const e=pair[i],x=i%cols*w,y=Math.floor(i/cols)*(h+cap);
   if(frame?.canvas){ctx.drawImage(frame.canvas,x,y,w,h);decoded++}
   ctx.fillStyle='#09111b';ctx.fillRect(x,y+h,w,cap);
   ctx.fillStyle='#fff';ctx.font='bold 14px sans-serif';
   ctx.fillText(label+'  SHARED '+fmt(e.shared)+'  source '+fmt(e.local),x+4,y+h+18);
   i++;
  }
  if(decoded<Math.ceil(pair.length*.7))throw Error('Only '+decoded+' of '+pair.length+' frames decoded for '+label);
  return canvas.toDataURL('image/jpeg',.8);
 }finally{input.dispose()}
}
export function normalizeVision(raw,times){
 const frames=[];
 for(const f of Array.isArray(raw?.frames)?raw.frames:[]){
  const camera=String(f.camera||'').toUpperCase(),time=Number(f.time);
  if((camera!=='A'&&camera!=='B')||!Number.isFinite(time))continue;
  const nearest=times.reduce((a,b)=>Math.abs(b-time)<Math.abs(a-time)?b:a,times[0]);
  if(Math.abs(nearest-time)>2.5)continue;
  const evidence=[...new Set((Array.isArray(f.evidence)?f.evidence:[]).map(x=>String(x).toLowerCase()))].filter(x=>EVIDENCE.has(x));
  if(evidence.length)frames.push({camera,time:nearest,evidence,description:String(f.description||'').slice(0,150)});
 }
 const A=frames.filter(f=>f.camera==='A'),B=frames.filter(f=>f.camera==='B');
 return {frames,A:A.length,B:B.length,
  usable:A.length>0&&B.length>0&&new Set(frames.map(f=>f.time)).size>=3&&
   A.some(a=>B.some(b=>Math.abs(a.time-b.time)<=12)),
  summary:String(raw?.summary||'').slice(0,320)};
}
export function matchRequestedEvent(result,brief=''){
 if(/\b(?:rescu|reviv|save(?:s|d)? (?:the day|a teammate|his teammate|her teammate))\b/i.test(brief)){
  const tags=result.frames.flatMap(x=>x.evidence);
  if(!tags.includes('down_indicator')||!tags.includes('revive_ui'))return false;
 }
 return true;
}
/** Compose new source ranges from verified shared-frame times, NEVER reuse
 * or relabel old heuristic cuts. Camera switching requires cited evidence. */
export function editFromVision(candidate,review,sync,assets){
 if(!review?.usable)return null;
 const A=assets.find(a=>a.id===sync.referenceId),B=assets.find(a=>a.id===sync.targetId);
 if(!A||!B)return null;
 const limits=checkSynchronization(sync,A.duration,B.duration);
 if(!limits.valid)return null;
 const evidence=review.frames.slice().sort((a,b)=>a.time-b.time||a.camera.localeCompare(b.camera));
 const times=[...new Set(evidence.map(x=>x.time))].sort((a,b)=>a-b);
 if(times.length<3)return null;
 const first=times[0],last=times.at(-1);
 if(last-first>90)return null;
 const start=Math.max(limits.commonStart,candidate.pov.globalStart-3,first-6);
 const end=Math.min(limits.commonEnd,candidate.pov.globalEnd+4,last+7);
 if(end-start<16||end-start>125)return null;
 let picks=[],prev=null;
 for(const time of times){
  if(prev&&time-prev.time<4)continue;
  const options=evidence.filter(f=>f.time===time);
  const choice=options.find(f=>f.camera!==prev?.camera)||options[0];
  if(choice){picks.push(choice);prev=choice}
 }
 if(picks.length<3||new Set(picks.map(x=>x.camera)).size!==2)return null;
 // Keep the actual timeline contiguous, preserving shooting sequences.
 if(picks.length>8)picks=picks.filter((e,i)=>i===0||i===picks.length-1||i%2===0).slice(0,8);
 const segments=[];
 for(let i=0;i<picks.length;i++){
  const g0=i===0?start:(picks[i-1].time+picks[i].time)/2;
  const g1=i===picks.length-1?end:(picks[i].time+picks[i+1].time)/2;
  if(g1-g0<1.25)continue;
  const id=picks[i].camera==='A'?A.id:B.id;
  const a=sourceAtAlignment(sync,id,g0),b=sourceAtAlignment(sync,id,g1);
  if(!(a>=0&&b>a&&b<=(id===A.id?A.duration:B.duration)+.1))return null;
  const s=makeSegment(id,+a.toFixed(3),+b.toFixed(3));
  s.speed=id===A.id?1:sync.scale;
  s.storyGlobalStart=+g0.toFixed(3);s.storyGlobalEnd=+g1.toFixed(3);
  s.storyRole='Visual evidence: '+picks[i].evidence.join(', ');
  s.title=picks[i].camera+' · '+fmt(picks[i].time)+' · '+picks[i].evidence.join(', ');
  segments.push(s);
 }
 if(segments.length<3||new Set(segments.map(x=>x.assetId)).size!==2)return null;
 const switches=segments.slice(1).filter((x,i)=>x.assetId!==segments[i].assetId).length;
 if(!switches)return null;
 return {...candidate,id:'vision-v1-'+candidate.id,
  title:'Visually reviewed action · '+fmt(start)+' · '+segments.length+' cuts',
  segments,duration:segments.reduce((sum,s)=>sum+(s.end-s.start)/s.speed,0),
  pov:{...candidate.pov,globalStart:start,globalEnd:end,visionVerified:true,visionVersion:VISION_VERSION,
   visionModel:'deepseek-flash',visionEvidence:review.frames,povSwitches:switches,cutCount:segments.length,jumpCuts:0,
   storyBeats:segments.map((s,i)=>({order:i+1,role:s.storyRole,sourceId:s.assetId,
     sharedStart:s.storyGlobalStart,sharedEnd:s.storyGlobalEnd,evidence:'AI-reviewed decoded video frame'}))},
  reason:'DeepSeek Flash reviewed actual frames from BOTH original viewpoints: '+
   review.A+' POV A and '+review.B+' POV B evidence frames. '+review.summary+
   '. A sampled frame does not prove kill ownership or activity between sampled frames. Verify playback before export.'};
}
export async function reviewWithVision(candidate,{sync,assets,files,key,brief='',signal,
 endpoint='https://api.deepseek.com/chat/completions',capture=captureContactSheet,fetcher=globalThis.fetch}={}){
 if(!key?.trim())throw Error('DeepSeek API key required: transcript keywords cannot verify actual video.');
 if(!/^https:\/\/api\.deepseek\.com\/(?:v1\/)?chat\/completions$/.test(endpoint))
  throw Error('Use the official DeepSeek HTTPS chat completions endpoint for frame review');
 const times=storyboardTimes(candidate);
 if(times.length<6)return {accepted:false,reason:'Insufficient video length'};
 const [imgA,imgB]=await Promise.all([
  capture(files[sync.referenceId],sync,sync.referenceId,times,{label:'A',signal}),
  capture(files[sync.targetId],sync,sync.targetId,times,{label:'B',signal})
 ]);
 const text=[
  'Analyze these TWO chronological contact sheets from separately recorded Call of Duty player POVs.',
  'The tiles share match timestamps. Cite only evidence VISIBLE IN AN INDIVIDUAL labelled tile.',
  'A gun held in hand, lobby, gameplay movement, or voiced callout alone is NOT evidence of combat.',
  'Look for visible enemies, muzzle flashes, enemy shooting, explosions, hit markers, damage, down/revive UI or kill feed.',
  'Do NOT invent kills, a successful rescue, or player identity. Missing visual proof means empty frames array.',
  'Creative request: '+String(brief).slice(0,600),
  'Allowed shared timestamps: '+times.join(', '),
  'Return JSON {"frames":[{"camera":"A","time":123.45,"evidence":["enemy_visible"],"description":"what is visibly shown"}],"summary":"grounded observation"}',
  'Evidence labels MUST be from: '+[...EVIDENCE].join(', '),
  'Return only genuine frame evidence from BOTH sheets; otherwise omit it. JSON only.'
 ].join('\n');
 const res=await fetcher(endpoint,{method:'POST',signal,
  headers:{'content-type':'application/json',authorization:'Bearer '+key.trim()},
  body:JSON.stringify({model:'deepseek-flash',temperature:0,response_format:{type:'json_object'},
   max_tokens:1600,messages:[{role:'user',content:[
    {type:'text',text},
    {type:'image_url',image_url:{url:imgA,detail:'original'}},
    {type:'image_url',image_url:{url:imgB,detail:'original'}}
   ]}]})});
 if(!res.ok)throw Error('DeepSeek vision HTTP '+res.status+': '+(await res.text()).slice(0,230));
 const json=await res.json(),rawText=String(json?.choices?.[0]?.message?.content||'');
 let raw;try{raw=JSON.parse(rawText.replace(/^\x60{3}(?:json)?\s*/,'').replace(/\x60{3}$/,''))}
 catch{throw Error('Vision model returned malformed or empty JSON. No unverified fallback clips will be shown.')}
 const review=normalizeVision(raw,times);
 if(!review.usable)return {accepted:false,reason:'No actual synchronized action demonstrated on both POV frames',review};
 if(!matchRequestedEvent(review,brief))return {accepted:false,reason:'Frames did not verify the requested rescue/revive',review};
 const edited=editFromVision(candidate,review,sync,assets);
 if(!edited)return {accepted:false,reason:'Reviewed action could not support a coherent two-POV edit',review};
 return {accepted:true,candidate:edited,review};
}
