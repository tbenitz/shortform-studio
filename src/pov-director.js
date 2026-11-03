/** Source-grounded multi-POV highlight edits on one shared match clock.
 * Chooses the POV with more local audio/motion/callout evidence; NOT a kill detector.
 */
import {makeSegment,clamp,fmt} from './model.js';
import {extractGameplaySignals} from './gameplay-director.js';
import {alignmentAt,sourceAtAlignment,checkSynchronization} from './pov-sync.js';
import {selectDiverseCandidates} from './director-coverage.js';
export function alignedPovEvents(words,tracks,sync){
 const selected=new Set([sync.referenceId,sync.targetId]);
 const events=extractGameplaySignals(words,tracks).filter(e=>selected.has(e.assetId));
 return events.map(e=>({
  ...e,globalStart:alignmentAt(sync,e.assetId,e.start),
  globalEnd:alignmentAt(sync,e.assetId,e.end),
  globalTime:alignmentAt(sync,e.assetId,e.time),
 })).filter(e=>Number.isFinite(e.globalStart)&&Number.isFinite(e.globalEnd)&&e.globalEnd>e.globalStart)
 .sort((a,b)=>a.globalStart-b.globalStart);
}
export function pointOfViewScore(events,assetId,start,end){
 let value=0,action=0,spoken=0;
 for(const e of events){
  if(e.assetId!==assetId||e.globalEnd<start-2||e.globalStart>end+2)continue;
  const middle=(start+end)/2,dist=Math.abs(e.globalTime-middle),distance=Math.max(.1,1-dist/Math.max(8,end-start+4));
  if(e.kind==='audio'){value+=(e.score||0)*18*distance;action+=(e.score||0)*distance}
  if(e.kind==='motion'){value+=(e.score||0)*21*distance;action+=(e.score||0)*distance}
  if(e.kind==='dialogue'){
   const tag=new Set(e.tags||[]);
   if(tag.has('down')){value+=10*distance;spoken+=1}
   if(tag.has('combat')){value+=8*distance;spoken+=1}
   if(tag.has('clutch')){value+=9*distance;spoken+=1}
   if(tag.has('revive')){value+=7*distance;spoken+=1}
   if(tag.has('spotted')){value+=5*distance;spoken+=1}
   if(tag.has('laugh')||tag.has('troll')||tag.has('trash')){value+=4*distance;spoken+=1}
  }
 }
 return {value,action,spoken};
}
export function choosePovSegments(events,sync,start,end,{chunkSeconds=7,minDwell=5}={}){
 const ids=[sync.referenceId,sync.targetId],decisions=[];
 for(let a=start;a<end-.01;a+=chunkSeconds){
  const b=Math.min(end,a+chunkSeconds);
  const ranked=ids.map(id=>({assetId:id,...pointOfViewScore(events,id,a,b)})).sort((x,y)=>y.value-x.value);
  const chosen=ranked[0];
  // Keep existing POV when the evidence difference is small.
  const prev=decisions.at(-1);
  if(prev){
   const previousScore=ranked.find(r=>r.assetId===prev.assetId)?.value||0;
   const currentDuration=prev.end-prev.start;
   if(currentDuration<minDwell||chosen.value<previousScore+3){prev.end=b;continue}
   if(chosen.assetId===prev.assetId){prev.end=b;continue}
  }
  decisions.push({assetId:chosen.assetId,start:a,end:b,score:chosen.value});
 }
 const parts=[];
 for(const d of decisions){
  const sourceStart=sourceAtAlignment(sync,d.assetId,d.start);
  const sourceEnd=sourceAtAlignment(sync,d.assetId,d.end);
  // Preserve a contiguous match timeline even when VOD clocks have a tiny rate difference.
  const clip=makeSegment(d.assetId,+sourceStart.toFixed(3),+sourceEnd.toFixed(3));
  clip.speed=d.assetId===sync.referenceId?1:sync.scale;
  clip.volume=1;
  clip.title=d.assetId===sync.referenceId?'POV 1':'POV 2';
  parts.push(clip);
 }
 return parts;
}
export function buildMultiPovHighlights(words,assets,tracks,sync,settings={},onProgress=()=>{}){
 const byId=new Map(assets.filter(a=>a.type==='video').map(a=>[a.id,a]));
 const A=byId.get(sync?.referenceId),B=byId.get(sync?.targetId);
 if(!A||!B||A.id===B.id)throw Error('Select two distinct imported video recordings.');
 const valid=checkSynchronization(sync,A.duration,B.duration);
 if(!valid.valid)throw Error(valid.reason);
 const events=alignedPovEvents(words,tracks,sync).filter(e=>e.globalEnd>=valid.commonStart&&e.globalStart<=valid.commonEnd);
 const cues=events.filter(e=>e.kind==='audio'||e.kind==='dialogue'||(e.kind==='motion'&&(e.score||0)>.4));
 if(!cues.length)return [];
 const clusters=[];let active=null;
 for(const e of cues){
  if(!active||e.globalStart-active.end>13||e.globalEnd-active.start>110){
   if(active)clusters.push(active);
   active={start:e.globalStart,end:e.globalEnd,events:[e]};
  }else{active.end=Math.max(active.end,e.globalEnd);active.events.push(e)}
 }
 if(active)clusters.push(active);
 const min=clamp(settings.clipMin??20,10,120),max=clamp(settings.clipMax??75,min+1,150),raw=[];
 for(const cluster of clusters){
  const peak=cluster.events.slice().sort((a,b)=>(b.score||0)-(a.score||0))[0]||cluster.events[0];
  let start=Math.max(valid.commonStart,cluster.start-8),end=Math.min(valid.commonEnd,cluster.end+10);
  if(end-start>max){
   start=Math.max(valid.commonStart,Math.min(peak.globalTime-10,valid.commonEnd-max));
   end=Math.min(valid.commonEnd,start+max);
  }
  if(end-start<min){
   const deficit=min-(end-start);
   start=Math.max(valid.commonStart,start-deficit/2);
   end=Math.min(valid.commonEnd,Math.max(end+deficit/2,start+min));
  }
  if(end-start<10)continue;
  const segments=choosePovSegments(events,sync,start,end,{chunkSeconds:7});
  const involvement=new Set(segments.map(s=>s.assetId));
  const tags=new Set(cluster.events.flatMap(e=>e.tags||[]));
  const interesting=cluster.events.some(e=>e.kind==='audio')||[...tags].some(t=>['down','revive','clutch','trash','troll','spotted','combat'].includes(t));
  if(!interesting)continue;
  let score=35+Math.min(18,cluster.events.length*2)+Math.min(18,cluster.events.filter(e=>e.kind==='audio').length*5);
  if(tags.has('clutch'))score+=10;
  if(tags.has('down'))score+=8;
  if(tags.has('revive'))score+=8;
  if(tags.has('troll')||tags.has('trash'))score+=7;
  if(involvement.size>1)score+=10;
  const switchCount=Math.max(0,segments.length-1);
  const title=(tags.has('clutch')?'Clutch':tags.has('revive')?'Rescue / revive':tags.has('down')?'Down / elimination callout':tags.has('troll')?'Trolling / reaction':'Possible fight')+' · '+(switchCount?switchCount+' POV switches':'best-supported POV')+' · '+fmt(start);
  raw.push({id:'multi-pov-'+A.id+'-'+B.id+'-'+start.toFixed(2),
   mode:'multi-pov',source:'multi-pov-analysis',title,anchorAssetId:A.id,anchorTime:start,
   segments,duration:segments.reduce((sum,s)=>sum+(s.end-s.start)/s.speed,0),
   score:clamp(Math.round(score),0,98),pov:{referenceId:A.id,targetId:B.id,switchCount,syncConfidence:sync.confidence||'manual',globalStart:start,globalEnd:end},
   reason:'Two synchronized original VODs, '+fmt(start)+'–'+fmt(end)+' on the shared match clock. '+switchCount+' evidence-guided POV switches. Activity inferred from speech, combat-like audio and sampled motion; NOT a verified kill feed or shooter identification. Confirm the switch points and sound before export.'});
 }
 onProgress(1,'Evaluated '+clusters.length+' shared match encounters across both POV recordings');
 // Rank and diversify by shared reference timeline; preserve unique source segments.
 return selectDiverseCandidates(raw,settings).sort((a,b)=>b.score-a.score||a.anchorTime-b.anchorTime);
}
