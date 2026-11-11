/** Review automatic camera changes on the ORIGINAL synchronized match clock.
 * PLAN-060/061/062: report uncertain switches and decline angles with no
 * local corroborating audio + decoded motion evidence. This does NOT identify
 * the shooter, weapon, kill, face or action from frames.
 */
import {alignmentAt} from './pov-sync.js';
import {pointOfViewScore} from './pov-director.js';
const validEvent=e=>e&&Number.isFinite(e.globalTime)&&e.assetId;
const near=(events,id,t,kind,radius)=>events.filter(e=>e.assetId===id&&e.kind===kind&&Math.abs(e.globalTime-t)<=radius);
function matchedEvidence(events,id,at,radius){
 const audios=near(events,id,at,'audio',radius).filter(e=>(e.score||0)>=.38);
 const motions=near(events,id,at,'motion',radius).filter(e=>(e.score||0)>=.23);
 const pairs=[];
 for(const a of audios){
  const b=motions.find(m=>Math.abs(m.globalTime-a.globalTime)<=6);
  if(b)pairs.push({audioTime:a.globalTime,frameTime:b.globalTime,score:+(Math.min(1,((a.score||0)+(b.score||0))/2)).toFixed(2)});
 }
 return pairs;
}
export function auditPovSwitches(segments,events,sync,{radius=8,improvement=4}={}){
 const e=(events||[]).filter(validEvent),clips=(segments||[]),switches=[];
 if(!sync?.referenceId||!sync?.targetId)return {status:'unverified',switches:[],issues:['No saved synchronization verified for both cameras.'],safeToAutoUse:false};
 for(let i=1;i<clips.length;i++){
  const prior=clips[i-1],next=clips[i];
  if(!prior?.assetId||!next?.assetId||prior.assetId===next.assetId)continue;
  if(![sync.referenceId,sync.targetId].includes(next.assetId)||![sync.referenceId,sync.targetId].includes(prior.assetId)){
   switches.push({index:i,time:null,from:prior.assetId,to:next.assetId,status:'unsupported',reason:'Source not in synchronized POV pair',pairs:[]});
   continue;
  }
  const at=Number.isFinite(next.storyGlobalStart)?next.storyGlobalStart:alignmentAt(sync,next.assetId,next.start);
  if(!Number.isFinite(at)){
   switches.push({index:i,time:null,from:prior.assetId,to:next.assetId,status:'unsupported',reason:'Cannot map new camera to shared clock',pairs:[]});continue;
  }
  const pairs=matchedEvidence(e,next.assetId,at,radius);
  const priorScore=pointOfViewScore(e,prior.assetId,at-5,at+5).value;
  const nextScore=pointOfViewScore(e,next.assetId,at-5,at+5).value;
  const advantage=+(nextScore-priorScore).toFixed(1);
  const status=!pairs.length?'unsupported':advantage<improvement?'uncertain':'supported';
  const reason=!pairs.length?'No paired source audio and actual decoded motion around this switch':
   status==='uncertain'?'New camera has real activity, but not a clearly stronger local evidence score':
   'New camera has paired local audio/motion and stronger interval evidence';
  switches.push({index:i,time:+at.toFixed(3),from:prior.assetId,to:next.assetId,status,reason,advantage,pairs:pairs.slice(0,4)});
 }
 const issues=switches.filter(s=>s.status!=='supported').map(s=>'POV change '+s.index+' at '+(s.time??'unknown')+': '+s.reason);
 const unsupported=switches.filter(s=>s.status==='unsupported').length;
 return {status:unsupported?'unsafe':issues.length?'review':switches.length?'supported':'no-switches',
  switches,issues,supportedSwitches:switches.filter(s=>s.status==='supported').length,
  unsupportedSwitches:unsupported,
  safeToAutoUse:switches.length>0&&unsupported===0};
}
