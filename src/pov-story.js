/** Story-oriented montage builder for two synchronized Call of Duty recordings.
 * Timeline is the shared A/source-reference clock, while every segment stores
 * its own ORIGINAL video timestamps. No event classification is a confirmed kill.
 */
import {makeSegment,clamp,fmt} from './model.js';
import {alignedPovEvents,pointOfViewScore} from './pov-director.js';
import {checkSynchronization,sourceAtAlignment} from './pov-sync.js';
import {selectDiverseCandidates} from './director-coverage.js';

const PAYOFF=new Set(['down','revive','clutch','laugh','trash','troll']);
const ENGAGEMENT=new Set(['combat','down','spotted','clutch','possible-action']);
const relevant=e=>e.kind==='audio'||e.kind==='motion'&&e.score>=.25||
  e.kind==='dialogue'&&(e.tags||[]).some(t=>['spotted','combat','down','revive','clutch','laugh','trash','troll','enemychat','squadbanter'].includes(t));
const strength=e=>{
 const tags=new Set(e.tags||[]);
 let result=e.kind==='audio'?12+Math.max(0,e.score||0)*25:
  e.kind==='motion'?Math.max(0,e.score||0)*18:5;
 if(tags.has('spotted'))result+=8;
 if(tags.has('combat'))result+=13;
 if(tags.has('down'))result+=19;
 if(tags.has('revive'))result+=19;
 if(tags.has('clutch'))result+=22;
 if(tags.has('trash')||tags.has('troll'))result+=13;
 if(tags.has('laugh'))result+=12;
 return result;
};
/** Group events from nearby firefight/voice sequences; never combine hours apart. */
export function groupStoryEncounters(events,{maxGap=48,maxSpan=175}={}){
 const groups=[];let current=null;
 for(const e of events.filter(relevant).sort((a,b)=>a.globalTime-b.globalTime)){
  if(!Number.isFinite(e.globalTime))continue;
  if(!current||e.globalStart-current.end>maxGap||e.globalEnd-current.start>maxSpan){
   if(current)groups.push(current);
   current={start:e.globalStart,end:e.globalEnd,events:[e]};
  }else{
   current.end=Math.max(current.end,e.globalEnd);
   current.start=Math.min(current.start,e.globalStart);
   current.events.push(e);
  }
 }
 if(current)groups.push(current);
 return groups;
}
export function storyMoments(group,{bucketSeconds=6}={}){
 const buckets=new Map();
 for(const e of group.events){
  // Long sustained firefights get multiple distinct narrative opportunities.
  const times=[e.globalTime];
  if(e.kind==='audio'&&e.globalEnd-e.globalStart>12){
   times.push(e.globalStart+2,e.globalEnd-3);
  }
  for(const time of times){
   const key=Math.floor(time/bucketSeconds);
   if(!buckets.has(key))buckets.set(key,{start:Infinity,end:-Infinity,time,events:[],quality:0});
   const b=buckets.get(key);
   b.start=Math.min(b.start,e.globalStart);b.end=Math.max(b.end,e.globalEnd);
   if(!b.events.includes(e))b.events.push(e);
   const quality=strength(e);
   if(quality>b.quality){b.quality=quality;b.time=time}
  }
 }
 return [...buckets.values()].sort((a,b)=>a.time-b.time);
}
function pickMoments(moments,maxCount){
 if(moments.length<=maxCount)return moments;
 const earliest=moments[0],latest=moments.at(-1),chosen=[earliest,latest];
 const payoff=moments.filter(m=>m.events.some(e=>(e.tags||[]).some(t=>PAYOFF.has(t))));
 const action=moments.filter(m=>m.events.some(e=>e.kind==='audio'||(e.tags||[]).some(t=>ENGAGEMENT.has(t))));
 const insert=list=>{
  for(const m of list){
   if(chosen.length>=maxCount)break;
   if(chosen.includes(m)||chosen.some(c=>Math.abs(c.time-m.time)<7))continue;
   chosen.push(m);
  }
 };
 insert(payoff.sort((a,b)=>b.time-a.time));
 insert(action.sort((a,b)=>b.quality-a.quality));
 insert(moments.slice().sort((a,b)=>b.quality-a.quality));
 return chosen.sort((a,b)=>a.time-b.time);
}
function roleFor(moment,index,length){
 const tags=new Set(moment.events.flatMap(e=>e.tags||[]));
 if(index===0)return 'Hook / setup';
 if(index===length-1)return tags.has('laugh')||tags.has('trash')||tags.has('troll')?'Reaction / trash talk':
  tags.has('revive')?'Rescue / aftermath':tags.has('down')?'Down callout / aftermath':'Payoff / context';
 if(tags.has('revive'))return 'Rescue / revive';
 if(tags.has('down'))return 'Down / elimination callout';
 if(tags.has('clutch'))return 'Clutch callout';
 if(tags.has('spotted'))return 'Spotting / approach';
 if(moment.events.some(e=>e.kind==='audio'))return 'Engagement / combat audio';
 return 'Alternate angle / context';
}
function beatBounds(moment,role,limits){
 let lead=3.1,tail=3.5;
 if(role.includes('Engagement')){lead=4;tail=5}
 if(role.startsWith('Hook')){lead=3.5;tail=3}
 if(role.includes('Reaction')){lead=2.2;tail=4.6}
 return {start:Math.max(limits.commonStart,moment.time-lead),end:Math.min(limits.commonEnd,moment.time+tail)};
}
function segmentFromBeat(sync,beat){
 const a=sourceAtAlignment(sync,beat.assetId,beat.start);
 const b=sourceAtAlignment(sync,beat.assetId,beat.end);
 if(!(Number.isFinite(a)&&Number.isFinite(b)&&b-a>.6))return null;
 const seg=makeSegment(beat.assetId,+a.toFixed(3),+b.toFixed(3));
 seg.speed=beat.assetId===sync.referenceId?1:sync.scale;
 seg.storyRole=beat.role;
 seg.storyGlobalStart=+beat.start.toFixed(3);
 seg.storyGlobalEnd=+beat.end.toFixed(3);
 seg.title=beat.role+' · '+(beat.assetId===sync.referenceId?'POV A':'POV B');
 seg.transition='cut';
 return seg;
}
function chooseBeatPov(events,sync,beat,previous){
 const ids=[sync.referenceId,sync.targetId];
 const score=id=>pointOfViewScore(events,id,beat.start,beat.end).value+
   beat.moment.events.filter(e=>e.assetId===id).reduce((acc,e)=>acc+Math.min(12,strength(e)*.45),0);
 const scores=ids.map(id=>({id,score:score(id)})).sort((a,b)=>b.score-a.score);
 const prior=scores.find(x=>x.id===previous);
 if(prior&&scores[0].score-prior.score<5)return {assetId:previous,score:prior.score};
 return {assetId:scores[0].id,score:scores[0].score};
}
/** Draft a story using distinct temporal beats, not a continuous 7-second grid.
 * Require both POVs to appear. When second-POV evidence is weak, label it as an
 * alternate synchronized angle, NOT the killer's view.
 */
export function composePovStory(events,sync,group,limits,options={}){
 const maxCuts=clamp(options.storyMaxCuts??6,4,9);
 const moments=pickMoments(storyMoments(group),maxCuts);
 if(moments.length<3||moments.at(-1).time-moments[0].time<11)return null;
 let beats=[];
 for(let index=0;index<moments.length;index++){
  const moment=moments[index],role=roleFor(moment,index,moments.length);
  const bounds=beatBounds(moment,role,limits);
  if(bounds.end-bounds.start<2)continue;
  // Short, intentional jump cuts remove time between narrative beats.
  const last=beats.at(-1);
  if(last&&bounds.start<last.end+1){
   bounds.start=last.end+.5;
   if(bounds.end-bounds.start<2.6)continue;
  }
  const view=chooseBeatPov(group.events,sync,{...bounds,moment},last?.assetId);
  beats.push({...bounds,moment,assetId:view.assetId,viewScore:view.score,role,evidence:moment.events.map(e=>e.kind)});
 }
 if(beats.length<3)return null;
 const ids=[sync.referenceId,sync.targetId],used=new Set(beats.map(b=>b.assetId));
 if(used.size<2){
  const missing=ids.find(id=>!used.has(id));
  // Place the other synchronized camera in the middle, never just repeat
  // the same file while labeling the result as a multi-POV highlight.
  const candidates=beats.map((b,i)=>{
   const alt=pointOfViewScore(group.events,missing,b.start,b.end);
   const original=pointOfViewScore(group.events,b.assetId,b.start,b.end);
   return {i,alt:alt.value,diff:original.value-alt.value};
  }).filter(x=>x.i>0&&x.i<beats.length-1)
   .sort((a,b)=>(b.alt-a.alt)||a.diff-b.diff);
  if(!candidates.length)return null;
  const best=candidates[0];
  beats[best.i]={...beats[best.i],assetId:missing,
   role:best.alt>2?beats[best.i].role+' · alternate POV':'Alternate POV · context only (unverified)',
   alternateEvidence:best.alt>2?'activity':'none'};
 }
 // A single source still must never leave this function as a completed story.
 if(new Set(beats.map(b=>b.assetId)).size!==2)return null;
 const minSeconds=clamp(options.storyMinSeconds??Math.max(17,options.clipMin||20),12,150);
 const maxSeconds=clamp(options.storyMaxSeconds??Math.max(minSeconds+5,options.clipMax||75),minSeconds+3,150);
 // Keep the key setup/action/payoff beats while respecting target short duration.
 const length=()=>beats.reduce((sum,b)=>sum+b.end-b.start,0);
 while(beats.length>3&&length()>maxSeconds){
  const interior=beats.slice(1,-1);
  const removable=interior.reduce((a,b)=>b.moment.quality<a.moment.quality?b:a);
  beats=beats.filter(b=>b!==removable);
 }
 if(length()>maxSeconds){
  // Trim around the moment rather than letting the short expand uncontrollably.
  const factor=maxSeconds/length();
  beats=beats.map(b=>{
   const center=b.moment.time,w=(b.end-b.start)*factor;
   const start=Math.max(b.start,Math.min(center-w/2,b.end-w));
   return {...b,start,end:start+w};
  });
 }
 if(length()<Math.min(12,minSeconds*.55))return null;
 const segments=beats.map(b=>segmentFromBeat(sync,b));
 if(segments.some(s=>!s))return null;
 let jumpCuts=0;
 for(let i=1;i<segments.length;i++){
  if(beats[i].start-beats[i-1].end>1.2)jumpCuts++;
 }
 if(jumpCuts===0){
  // The request is a montage; do not publish a single uninterrupted block.
  return null;
 }
 const sourceIds=new Set(segments.map(s=>s.assetId));
 const storyBeats=beats.map((b,i)=>({
  order:i+1,role:b.role,sourceId:b.assetId,
  sharedStart:+b.start.toFixed(3),sharedEnd:+b.end.toFixed(3),
  evidence:b.alternateEvidence||b.evidence.join(', ')
 }));
 const starts=segments.map(s=>s.storyGlobalStart);
 const total=segments.reduce((sum,s)=>sum+(s.end-s.start)/s.speed,0);
 return {segments,duration:total,sourceIds:[...sourceIds],jumpCuts,
  storyBeats,globalStart:Math.min(...starts),globalEnd:beats.at(-1).end,
  storySpan:beats.at(-1).end-beats[0].start};
}
export function buildMultiPovStories(words,assets,tracks,sync,settings={},onProgress=()=>{}){
 const byId=new Map((assets||[]).filter(a=>a.type==='video').map(a=>[a.id,a]));
 const A=byId.get(sync?.referenceId),B=byId.get(sync?.targetId);
 if(!A||!B||A.id===B.id)throw Error('Select two different original video recordings.');
 const limits=checkSynchronization(sync,A.duration,B.duration);
 if(!limits.valid)throw Error(limits.reason);
 const events=alignedPovEvents(words,tracks,sync)
  .filter(e=>e.globalEnd>limits.commonStart&&e.globalStart<limits.commonEnd);
 const groups=groupStoryEncounters(events),candidates=[];
 for(const group of groups){
  const totalActions=group.events.filter(e=>e.kind==='audio'||(e.tags||[]).some(t=>ENGAGEMENT.has(t))).length;
  if(totalActions<1)continue;
  const story=composePovStory(events,sync,group,limits,settings);
  if(!story||story.segments.length<3||story.sourceIds.length!==2||story.jumpCuts<1)continue;
  const tags=new Set(group.events.flatMap(e=>e.tags||[]));
  const title=(tags.has('clutch')?'Clutch story':tags.has('revive')?'Rescue story':
   tags.has('trash')||tags.has('troll')?'Banter & fight story':'Gunfight story')+
   ' · '+story.segments.length+' edits · A+B · '+fmt(story.globalStart);
  const score=clamp(40+story.segments.length*3+story.jumpCuts*4+Math.min(20,totalActions*2)+
   (tags.has('clutch')||tags.has('revive')?9:0),0,99);
  candidates.push({
   id:'pov-story-'+A.id+'-'+B.id+'-'+Math.round(story.globalStart*10),
   mode:'multi-pov-story',source:'multi-pov-story',title,
   anchorAssetId:A.id,anchorTime:story.globalStart,
   segments:story.segments,duration:story.duration,score,
   pov:{referenceId:A.id,targetId:B.id,sourceCount:2,
    cutCount:story.segments.length,jumpCuts:story.jumpCuts,storyBeats:story.storyBeats,
    globalStart:story.globalStart,globalEnd:story.globalEnd,confidence:sync.confidence||'manual'},
   reason:'EDITED STORY, not a single source clip: '+story.segments.length+
    ' separate cuts from '+A.name+' and '+B.name+' across '+fmt(story.storySpan)+
    ' of source action. Story beats: '+story.storyBeats.map(b=>b.order+'. '+b.role+' ('+(b.sourceId===A.id?'A':'B')+')').join(' → ')+
    '. Skips '+story.jumpCuts+' gaps and switches between both POVs. A reaction, knock, revive, or kill is NOT visually confirmed; review the exact scenes and audio.'
  });
 }
 onProgress(1,'Built '+candidates.length+' cut-together two-POV stories from '+groups.length+' possible encounter arcs');
 return selectDiverseCandidates(candidates,settings)
  .sort((a,b)=>b.score-a.score||a.anchorTime-b.anchorTime);
}
