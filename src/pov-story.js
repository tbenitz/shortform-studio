/** Coherent two-camera edits built on a single synchronized match clock.
 * Audio intensity and frame movement are supporting signals, not proof of a
 * visible firearm, a kill, or a particular player's identity.
 */
import {makeSegment,clamp,fmt} from './model.js';
import {alignedPovEvents,pointOfViewScore} from './pov-director.js';
import {checkSynchronization,sourceAtAlignment} from './pov-sync.js';
import {selectDiverseCandidates} from './director-coverage.js';
import {parseEditorialDirection,matchEditorialDirection} from './director-intent.js';

const ACTION_TAGS=new Set(['combat','down','revive','clutch','spotted']);
const PAYOFF_TAGS=new Set(['down','revive','clutch','laugh','trash','troll']);
const hasTag=(e,t)=>Array.isArray(e.tags)&&e.tags.includes(t);
const actionDialogue=e=>e.kind==='dialogue'&&(e.tags||[]).some(t=>ACTION_TAGS.has(t));
const relevant=e=>e.kind==='audio'&&(e.score||0)>=.32||
  e.kind==='motion'&&(e.score||0)>=.22||
  e.kind==='dialogue'&&(e.tags||[]).some(t=>ACTION_TAGS.has(t)||PAYOFF_TAGS.has(t));
const strength=e=>{
  let n=e.kind==='audio'?14+(e.score||0)*20:
    e.kind==='motion'?(e.score||0)*18:5;
  for(const t of e.tags||[]){
    if(t==='combat'||t==='spotted')n+=8;
    if(t==='down'||t==='revive'||t==='clutch')n+=14;
    if(t==='trash'||t==='troll'||t==='laugh')n+=6;
  }
  return n;
};
/** No montage can bridge unrelated fights or jump several minutes forward. */
export function groupStoryEncounters(events,{maxGap=14,maxSpan=85}={}){
  const groups=[];let group=null;
  for(const e of (events||[]).filter(relevant).sort((a,b)=>a.globalStart-b.globalStart)){
    if(!Number.isFinite(e.globalStart)||!Number.isFinite(e.globalEnd))continue;
    if(!group||e.globalStart-group.end>maxGap||Math.max(e.globalEnd,group.end)-group.start>maxSpan){
      if(group)groups.push(group);
      group={start:e.globalStart,end:e.globalEnd,events:[e]};
    }else{
      group.start=Math.min(group.start,e.globalStart);
      group.end=Math.max(group.end,e.globalEnd);
      group.events.push(e);
    }
  }
  if(group)groups.push(group);
  return groups;
}
/** Find action-like sound with matching *actual decoded* visual movement.
 * Loud voice alone, transcript keywords alone, and unrelated motion do not pass.
 */
export function pairedActionEvidence(events,{start=-Infinity,end=Infinity,assetId=null}={}){
  const scoped=(events||[]).filter(e=>
    (!assetId||e.assetId===assetId)&&e.globalEnd>=start&&e.globalStart<=end);
  const audio=scoped.filter(e=>e.kind==='audio'&&(e.score||0)>=.38);
  const motion=scoped.filter(e=>e.kind==='motion'&&(e.score||0)>=.23);
  const pairs=[];
  for(const a of audio){
    const near=motion.filter(m=>Math.abs(m.globalTime-a.globalTime)<=6||
      m.globalTime>=a.globalStart-2&&m.globalTime<=a.globalEnd+2)
      .sort((x,y)=>Math.abs(x.globalTime-a.globalTime)-Math.abs(y.globalTime-a.globalTime))[0];
    if(near)pairs.push({assetId:a.assetId,time:a.globalTime,
      score:Math.min(1,(a.score||0)*.65+(near.score||0)*.35),
      audio:a,motion:near});
  }
  return pairs.sort((a,b)=>a.time-b.time);
}
export function storyMoments(group,{bucketSeconds=5}={}){
  const buckets=new Map();
  for(const e of group.events){
    const times=[e.globalTime];
    if(e.kind==='audio'&&e.globalEnd-e.globalStart>11)
      times.push(e.globalStart+2,e.globalEnd-2);
    for(const time of times){
      if(!Number.isFinite(time))continue;
      const key=Math.floor(time/bucketSeconds);
      if(!buckets.has(key))buckets.set(key,{time,start:time,end:time,events:[],quality:0});
      const b=buckets.get(key);
      b.start=Math.min(b.start,e.globalStart);
      b.end=Math.max(b.end,e.globalEnd);
      if(!b.events.includes(e))b.events.push(e);
      if(strength(e)>b.quality){b.quality=strength(e);b.time=time}
    }
  }
  return [...buckets.values()].sort((a,b)=>a.time-b.time);
}
function pickMoments(moments,maxCount,pairs){
  if(moments.length<=maxCount)return moments;
  const selected=[moments[0],moments.at(-1)];
  const peaks=moments.slice(1,-1).sort((a,b)=>{
    const p=m=>pairs.some(e=>Math.abs(e.time-m.time)<6)?20:0;
    return (b.quality+p(b))-(a.quality+p(a));
  });
  for(const m of peaks){
    if(selected.length>=maxCount)break;
    if(selected.some(x=>Math.abs(x.time-m.time)<5.5))continue;
    selected.push(m);
  }
  return selected.sort((a,b)=>a.time-b.time);
}
function roleFor(moment,index,length){
  const tags=new Set(moment.events.flatMap(e=>e.tags||[]));
  if(index===0)return 'Hook / setup';
  if(index===length-1)return tags.has('laugh')||tags.has('trash')||tags.has('troll')?
    'Reaction / aftermath':tags.has('revive')?'Rescue / aftermath':'Payoff / context';
  if(tags.has('revive'))return 'Revive callout (unverified)';
  if(tags.has('down'))return 'Down callout (unverified)';
  if(tags.has('clutch'))return 'Clutch callout (unverified)';
  if(moment.events.some(e=>e.kind==='audio'))return 'Action audio + gameplay';
  if(tags.has('spotted'))return 'Enemy callout / approach';
  return 'Synchronized alternate angle';
}
function beatBounds(moment,role,limits){
  const local=moment.events.filter(e=>e.kind==='audio'&&
    e.globalStart<=(moment.time+4)&&e.globalEnd>=moment.time-4);
  let start=moment.time-(role.startsWith('Hook')?5:3);
  let end=moment.time+(role.startsWith('Reaction')?7:5);
  if(local.length){
    start=Math.min(start,...local.map(e=>e.globalStart-2.5));
    end=Math.max(end,...local.map(e=>e.globalEnd+3.5));
    if(end-start>27){start=Math.max(start,moment.time-10);end=Math.min(end,start+27)}
  }
  return {start:Math.max(limits.commonStart,start),end:Math.min(limits.commonEnd,end)};
}
function segmentFromBeat(sync,beat){
  const start=sourceAtAlignment(sync,beat.assetId,beat.start);
  const end=sourceAtAlignment(sync,beat.assetId,beat.end);
  if(!(Number.isFinite(start)&&Number.isFinite(end)&&end-start>=2))return null;
  const seg=makeSegment(beat.assetId,+start.toFixed(3),+end.toFixed(3));
  seg.speed=beat.assetId===sync.referenceId?1:sync.scale;
  seg.storyRole=beat.role;
  seg.storyGlobalStart=+beat.start.toFixed(3);
  seg.storyGlobalEnd=+beat.end.toFixed(3);
  seg.title=beat.role+' · '+(beat.assetId===sync.referenceId?'POV A':'POV B');
  seg.transition='cut';
  return seg;
}
function beatPov(group,sync,bounds,previous,pairs){
  const ids=[sync.referenceId,sync.targetId];
  const ranked=ids.map(assetId=>{
    const nearby=pairs.filter(x=>x.assetId===assetId&&
      x.time>=bounds.start-5&&x.time<=bounds.end+5);
    const action=nearby.length>0;
    const views=group.events.filter(e=>e.assetId===assetId&&
      e.globalTime>=bounds.start-4&&e.globalTime<=bounds.end+4);
    // Allow a real setup or reaction callout just before/after the
    // paired action, even if that exact speech frame is visually quiet.
    // The callout must still belong to the SAME camera's nearby encounter.
    const contextual=views.some(e=>e.kind==='dialogue'&&
      (e.tags||[]).some(t=>ACTION_TAGS.has(t)||PAYOFF_TAGS.has(t)))&&
      pairs.some(p=>p.assetId===assetId&&p.time>=bounds.start-14&&p.time<=bounds.end+14);
    const interest=action||contextual;
    const score=pointOfViewScore(group.events,assetId,bounds.start,bounds.end).value+
      nearby.reduce((sum,e)=>sum+e.score*23,0);
    return {assetId,score,interest,action};
  }).filter(x=>x.interest).sort((a,b)=>b.score-a.score);
  if(!ranked.length)return null;
  const prior=ranked.find(x=>x.assetId===previous);
  if(prior&&prior.score>=ranked[0].score-4)return prior;
  return ranked[0];
}
function rescueRequested(text){
  return /\b(?:save(?:s|d)? the day|saves? (?:his|her|their|the) teammate|other teammate saves?|teammate (?:gets? )?downed|gets? downed and (?:then )?saves?|downs? (?:an? )?enemy.*(?:downed|saves?))\b/i.test(text||'');
}
function hasRescueSequence(events){
  const sorted=events.filter(e=>e.kind==='dialogue').sort((a,b)=>a.globalTime-b.globalTime);
  const down=sorted.filter(e=>hasTag(e,'down'));
  const save=sorted.filter(e=>hasTag(e,'revive')||hasTag(e,'clutch'));
  return down.some(d=>save.some(s=>s.globalTime>d.globalTime+1&&s.globalTime<d.globalTime+42));
}
/** A story is one incident in chronological order. Neither source may be forced
 * into the edit merely to manufacture the appearance of multi-camera action.
 */
export function composePovStory(events,sync,group,limits,options={}){
  const ids=[sync.referenceId,sync.targetId];
  const pairs=pairedActionEvidence(group.events);
  if(pairs.length<2||ids.some(id=>!pairs.some(p=>p.assetId===id)))return null;
  // Both perspectives must depict the action at approximately the same time.
  if(!pairs.some(a=>a.assetId===ids[0]&&pairs.some(b=>b.assetId===ids[1]&&
    Math.abs(a.time-b.time)<=12)))return null;
  const tags=new Set(group.events.flatMap(e=>e.tags||[]));
  if(![...tags].some(t=>ACTION_TAGS.has(t))&&pairs.length<3)return null;
  if(rescueRequested(options.storyEditorialDirection)&&!hasRescueSequence(group.events))return null;
  const maxCuts=clamp(options.storyMaxCuts??7,3,9);
  const moments=pickMoments(storyMoments(group),maxCuts,pairs);
  if(moments.length<3||moments.at(-1).time-moments[0].time<9)return null;
  let beats=[];
  for(let i=0;i<moments.length;i++){
    const moment=moments[i],role=roleFor(moment,i,moments.length);
    const bounds=beatBounds(moment,role,limits);
    const prev=beats.at(-1);
    if(prev&&bounds.start<prev.end+.25)bounds.start=prev.end+.25;
    if(bounds.end-bounds.start<2.6)continue;
    if(prev&&bounds.start-prev.end>14)return null;
    const pov=beatPov(group,sync,bounds,prev?.assetId,pairs);
    if(!pov)continue;
    beats.push({...bounds,moment,role,assetId:pov.assetId,
      evidence:pov.action?'paired audio + video movement':'spoken callout + video movement'});
  }
  if(beats.length<3)return null;
  const missing=ids.find(id=>!beats.some(b=>b.assetId===id));
  if(missing){
    // Only move a cut to B when B actually shows synchronized gameplay
    // evidence at that *exact* beat. Never inject an arbitrary context shot.
    const alternate=beats.map((beat,i)=>({beat,i,
      pairs:pairs.filter(p=>p.assetId===missing&&p.time>=beat.start-3&&p.time<=beat.end+3),
      original:pointOfViewScore(group.events,beat.assetId,beat.start,beat.end).value,
      score:pointOfViewScore(group.events,missing,beat.start,beat.end).value}))
      .filter(x=>x.i>0&&x.i<beats.length-1&&x.pairs.length)
      .sort((a,b)=>b.score-a.score);
    if(!alternate.length)return null;
    beats[alternate[0].i]={...alternate[0].beat,assetId:missing,
      role:'Same fight · other POV',evidence:'paired audio + frame motion'};
  }
  if(new Set(beats.map(b=>b.assetId)).size!==2)return null;
  const minSeconds=clamp(options.storyMinSeconds??options.clipMin??20,12,150);
  const maxSeconds=clamp(options.storyMaxSeconds??options.clipMax??75,minSeconds+3,210);
  const length=()=>beats.reduce((sum,b)=>sum+b.end-b.start,0);
  while(beats.length>3&&length()>maxSeconds){
    const interior=beats.slice(1,-1);
    const weakest=interior.reduce((a,b)=>b.moment.quality<a.moment.quality?b:a);
    const next=beats.filter(x=>x!==weakest);
    if(new Set(next.map(x=>x.assetId)).size!==2)break;
    beats=next;
  }
  if(length()>maxSeconds){
    const factor=maxSeconds/length();
    if(factor<.34)return null;
    beats=beats.map(b=>{
      const t=Math.max(2.6,(b.end-b.start)*factor);
      const center=Math.min(b.end-t/2,Math.max(b.start+t/2,b.moment.time));
      return {...b,start:center-t/2,end:center+t/2};
    });
  }
  if(beats.length<3||length()<Math.min(14,minSeconds*.65))return null;
  if(beats.some((b,i)=>i&&b.start-beats[i-1].end>14))return null;
  const segments=beats.map(b=>segmentFromBeat(sync,b));
  if(segments.some(x=>!x))return null;
  const jumpCuts=beats.reduce((n,b,i)=>n+(i&&b.start-beats[i-1].end>1.1?1:0),0);
  const povSwitches=beats.reduce((n,b,i)=>n+(i&&b.assetId!==beats[i-1].assetId?1:0),0);
  if(!povSwitches)return null; // A+B really cut between cameras.
  const storyBeats=beats.map((b,i)=>({order:i+1,role:b.role,sourceId:b.assetId,
    sharedStart:+b.start.toFixed(3),sharedEnd:+b.end.toFixed(3),evidence:b.evidence}));
  return {segments,duration:segments.reduce((sum,s)=>sum+(s.end-s.start)/s.speed,0),
    sourceIds:ids,jumpCuts,povSwitches,storyBeats,pairCount:pairs.length,
    globalStart:beats[0].start,globalEnd:beats.at(-1).end,
    storySpan:beats.at(-1).end-beats[0].start};
}
export function buildMultiPovStories(words,assets,tracks,sync,settings={},onProgress=()=>{}){
  const byId=new Map((assets||[]).filter(a=>a.type==='video').map(a=>[a.id,a]));
  const A=byId.get(sync?.referenceId),B=byId.get(sync?.targetId);
  if(!A||!B||A.id===B.id)throw Error('Select two distinct video recordings.');
  const limits=checkSynchronization(sync,A.duration,B.duration);
  if(!limits.valid)throw Error(limits.reason);
  // An older transcript-only or full-VOD analysis cannot serve as visual
  // evidence of this synchronized overlap.
  const hasVideo=id=>tracks?.[id]?.status==='complete'&&Array.isArray(tracks[id].motion)&&tracks[id].motion.length>0;
  if(!hasVideo(A.id)||!hasVideo(B.id)){
    onProgress(1,'Both synchronized POVs need real decoded video frames inside their shared time range');
    return [];
  }
  const events=alignedPovEvents(words,tracks,sync)
    .filter(e=>e.globalEnd>limits.commonStart&&e.globalStart<limits.commonEnd);
  const groups=groupStoryEncounters(events),candidates=[];
  const editorial=parseEditorialDirection(settings.storyEditorialDirection||'');
  for(const group of groups){
    const pairs=pairedActionEvidence(group.events);
    if(pairs.length<2||new Set(pairs.map(x=>x.assetId)).size<2)continue;
    const tags=new Set(group.events.flatMap(e=>e.tags||[]));
    const match=matchEditorialDirection(editorial,tags);
    if(!match.eligible)continue;
    const story=composePovStory(events,sync,group,limits,settings);
    if(!story)continue;
    const kind=tags.has('revive')?'Possible rescue sequence':
      tags.has('clutch')?'Possible clutch sequence':
      tags.has('down')?'Down callout + engagement':'Possible combat encounter';
    const title=kind+' · '+story.segments.length+' cuts · '+fmt(story.globalStart);
    const score=clamp(Math.round(30+Math.min(24,story.pairCount*6)+
      Math.min(12,story.povSwitches*4)+
      (tags.has('down')||tags.has('revive')||tags.has('clutch')?12:0)+
      match.scoreDelta*.35),0,92);
    candidates.push({
      id:'pov-story-v4-'+A.id+'-'+B.id+'-'+Math.round(story.globalStart*10),
      mode:'multi-pov-story',source:'multi-pov-story',title,
      anchorAssetId:A.id,anchorTime:story.globalStart,
      segments:story.segments,duration:story.duration,score,
      pov:{referenceId:A.id,targetId:B.id,sourceCount:2,
        cutCount:story.segments.length,jumpCuts:story.jumpCuts,povSwitches:story.povSwitches,
        storyBeats:story.storyBeats,globalStart:story.globalStart,globalEnd:story.globalEnd,
        actionEvidencePairs:story.pairCount,confidence:sync.confidence||'manual',directionMatch:match},
      reason:'One synchronized encounter ('+fmt(story.globalStart)+'–'+fmt(story.globalEnd)+
        ') with '+story.pairCount+' nearby audio/decoded-frame activity pairs. Cut order: '+
        story.storyBeats.map(b=>b.order+'. '+b.role+' ('+(b.sourceId===A.id?'A':'B')+')').join(' → ')+
        '. '+match.reason+'. The footage was not visually classified as a gunfight: a kill, gun, revive or player identity is NOT visually confirmed. Check the exact frames before export.'
    });
  }
  onProgress(1,'Found '+candidates.length+' coherent shared encounters from '+groups.length+
    ' local clusters; no forced alternate angles or unrelated timestamps');
  return selectDiverseCandidates(candidates,settings)
    .sort((a,b)=>b.score-a.score||a.anchorTime-b.anchorTime);
}
