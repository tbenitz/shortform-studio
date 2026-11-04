/** Full overlap-wide multi-POV encounter scouting. No synthetic story cuts here.
 * This supplies dynamic source windows for actual decoded-frame vision review.
 */
import {alignedPovEvents} from './pov-director.js';
import {checkSynchronization} from './pov-sync.js';
import {clamp} from './model.js';
import {parseEditorialDirection,matchEditorialDirection} from './director-intent.js';

export function discoverVisionScouts(words,assets,tracks,sync,{direction=''}={}){
 const A=assets.find(a=>a.id===sync?.referenceId),B=assets.find(a=>a.id===sync?.targetId);
 if(!A||!B)return [];
 const limits=checkSynchronization(sync,A.duration,B.duration);
 if(!limits.valid)return [];
 const events=alignedPovEvents(words,tracks,sync)
  .filter(e=>e.globalEnd>limits.commonStart&&e.globalStart<limits.commonEnd);
 // Audio transients and meaningful spoken callouts are used only to identify
 // areas worth a much more expensive actual-frame visual check.
 const cues=events.filter(e=>
  (e.kind==='audio'&&(e.score||0)>=.27)||
  (e.kind==='dialogue'&&(e.tags||[]).some(t=>
   ['combat','down','revive','spotted','clutch','trash','troll'].includes(t))));
 const groups=[];let g;
 for(const cue of cues.sort((a,b)=>a.globalStart-b.globalStart)){
  if(!g||cue.globalStart-g.end>17||cue.globalEnd-g.start>90){
   if(g)groups.push(g);
   g={start:cue.globalStart,end:cue.globalEnd,cues:[cue]};
  }else{g.end=Math.max(g.end,cue.globalEnd);g.cues.push(cue)}
 }
 if(g)groups.push(g);
 const parsed=parseEditorialDirection(direction),result=[];
 for(const [i,group] of groups.entries()){
  const audio=group.cues.filter(x=>x.kind==='audio');
  // Dialogue-only detections are not fights. They do not become AI candidates.
  if(!audio.length)continue;
  const tags=[...new Set(group.cues.flatMap(x=>x.tags||[]))];
  const match=matchEditorialDirection(parsed,new Set(tags));
  const peak=audio.slice().sort((a,b)=>(b.score||0)-(a.score||0))[0];
  const center=peak?.globalTime??(group.start+group.end)/2;
  let start=Math.max(limits.commonStart,group.start-7);
  let end=Math.min(limits.commonEnd,group.end+10);
  if(end-start>95){start=Math.max(limits.commonStart,center-35);end=Math.min(limits.commonEnd,start+85)}
  if(end-start<24){start=Math.max(limits.commonStart,start-(24-(end-start))/2);end=Math.min(limits.commonEnd,Math.max(end+(24-(end-start))/2,start+24))}
  if(end-start<12)continue;
  const cameras=new Set(audio.map(x=>x.assetId));
  const nearby=events.filter(x=>x.globalEnd>=start&&x.globalStart<=end);
  const beats=audio.slice().sort((a,b)=>(b.score||0)-(a.score||0))
   .slice(0,5).sort((a,b)=>a.globalTime-b.globalTime)
   .map(e=>({role:'Action audio evidence · unverified',sourceId:e.assetId,
    sharedStart:Math.max(start,e.globalStart),sharedEnd:Math.min(end,e.globalEnd)}));
  const value=clamp(20+Math.min(30,audio.length*4)+
   Math.min(18,Math.max(...audio.map(e=>e.score||0))*20)+
   (cameras.size===2?20:0)+
   (match.eligible?Math.min(15,match.scoreDelta/3):0),0,99);
  result.push({id:'vision-scout-'+sync.referenceId+'-'+sync.targetId+'-'+Math.round(start*10)+'-'+i,
   source:'overlap-scout',mode:'vision-scout',title:'Unverified local encounter',
   anchorAssetId:sync.referenceId,anchorTime:start,score:value,
   segments:[],duration:end-start,
   pov:{referenceId:sync.referenceId,targetId:sync.targetId,
    globalStart:start,globalEnd:end,storyBeats:beats},
   scouting:{audioCues:audio.length,sourceViews:cameras.size,spokenTags:tags,words:nearby.filter(x=>x.kind==='dialogue').slice(0,5).map(x=>x.text)}});
 }
 return result.sort((a,b)=>b.score-a.score||a.anchorTime-b.anchorTime);
}
/** Round-robin over source-time buckets instead of replaying top-5 scenes.
 * Previously reviewed and successfully edited intervals are skipped on reruns.
 */
export function chooseFreshVisionScouts(pool,{limit=24,previousTimes=[]}={}){
 const excluded=(previousTimes||[]).filter(Number.isFinite),bins=new Map();
 for(const c of pool||[]){
  const t=Number(c.anchorTime);
  if(!Number.isFinite(t)||excluded.some(x=>Math.abs(t-x)<65))continue;
  const k=Math.floor(t/900);
  if(!bins.has(k))bins.set(k,[]);
  bins.get(k).push(c);
 }
 for(const list of bins.values())list.sort((a,b)=>b.score-a.score);
 const keys=[...bins.keys()].sort((a,b)=>a-b);
 const out=[],seen=[];
 while(out.length<limit){
  let found=false;
  for(const k of keys){
   const candidates=bins.get(k);
   while(candidates?.length){
    const x=candidates.shift();
    if(seen.some(t=>Math.abs(x.anchorTime-t)<45))continue;
    seen.push(x.anchorTime);out.push(x);found=true;break;
   }
   if(out.length>=limit)break;
  }
  if(!found)break;
 }
 return out;
}
