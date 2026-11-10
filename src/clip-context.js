/**
 * Keep the punchline: source-boundary-safe, non-destructive extensions.
 * No fixed clip duration limit; only the one-click AUTO context search is bounded,
 * so a continuous hour-long transcription cannot swallow the project by accident.
 */
import {clipStartTime} from './timeline-workbench.js';
const round=n=>Math.round(n*1000)/1000;
const finite=n=>typeof n==='number'&&Number.isFinite(n);
const safeDuration=(assets,id)=>{const a=(assets||[]).find(a=>a.id===id);return finite(a?.duration)&&a.duration>0?a.duration:null};
const wordsFor=(words,id)=>(words||[]).filter(w=>w.assetId===id&&finite(w.start)&&finite(w.end)&&w.end>w.start&&w.start>=0).sort((a,b)=>a.start-b.start);
function safeCut(cut,assets){
 if(!cut||!finite(cut.start)||!finite(cut.end)||cut.start<0||cut.end<=cut.start)throw Error('Select a valid original video clip first.');
 const duration=safeDuration(assets,cut.assetId);
 if(duration===null)throw Error('Original source duration is unavailable. Relink the source and retry.');
 if(cut.end>duration+.1)throw Error('The clip goes past its original recording. Relink the correct source.');
 return duration;
}
/** Return a proposed original-source range, never touching transcript or media files. */
export function extendSourceRange(cut,assets,{side='both',seconds=5}={}){
 const duration=safeCut(cut,assets),amount=Number(seconds);
 if(!Number.isFinite(amount)||amount<=0||amount>21600)throw Error('Choose a positive extension in seconds (up to six hours per click).');
 if(!['before','after','both'].includes(side))throw Error('Choose before, after or both.');
 const start=side==='after'?cut.start:Math.max(0,cut.start-amount);
 const end=side==='before'?cut.end:Math.min(duration,cut.end+amount);
 if(start===cut.start&&end===cut.end)throw Error('The original recording begins or ends here; no more footage exists on that side.');
 return {...cut,start:round(start),end:round(end)};
}
/** Automatic helper: seek previous setup and following answer/reaction in actual
 * contiguous transcript words. Empty transcript is NOT treated as silence.
 * The automatic reach is maxExtra per side; +5 / +15 controls remain unlimited
 * up to the original source duration.
 */
export function completeExchangeRange(cut,words,assets,{maxGap=3.75,maxExtra=50,padBefore=1.2,padAfter=1.8}={}){
 const duration=safeCut(cut,assets),list=wordsFor(words,cut.assetId);
 if(!list.length)throw Error('No timed dialogue is available. Use +5s / +15s to extend real source footage manually.');
 const hits=list.reduce((out,w,i)=>{if(w.end>=cut.start-.15&&w.start<=cut.end+.15)out.push(i);return out},[]);
 if(!hits.length)throw Error('No timed dialogue overlaps this clip. You can still extend it with +5s / +15s.');
 let left=hits[0],right=hits.at(-1);
 // The automatic finder may look past the first/last word, but cannot jump over a big pause.
 while(left>0&&list[left].start-list[left-1].end<=maxGap&&cut.start-list[left-1].start<=maxExtra)left--;
 while(right<list.length-1&&list[right+1].start-list[right].end<=maxGap&&list[right+1].end-cut.end<=maxExtra)right++;
 const start=Math.max(0,Math.min(cut.start,list[left].start-Math.max(0,padBefore)));
 const end=Math.min(duration,Math.max(cut.end,list[right].end+Math.max(0,padAfter)));
 if(start===cut.start&&end===cut.end)throw Error('The selected clip already contains the connected timed dialogue. Use +5s for more footage.');
 return {...cut,start:round(start),end:round(end)};
}
/** Applies a source-bound correction and ripples downstream audio/markers.
 * The caller makes the undo checkpoint before invoking this mutation. */
export function applyClipExtension(project,clipId,next){
 const cuts=project?.segments||[],index=cuts.findIndex(s=>s.id===clipId),clip=cuts[index];
 if(!clip)throw Error('Select an existing timeline clip.');
 const assets=project.assets||[];safeCut(next,assets);
 if(next.assetId!==clip.assetId||next.id!==clip.id||next.start>clip.start||next.end<clip.end)
  throw Error('An extension cannot shrink a clip or change its source. Use trim for shorter cuts.');
 const speed=Math.max(.25,Number(clip.speed)||1);
 const before=round((clip.start-next.start)/speed),after=round((next.end-clip.end)/speed),total=before+after;
 if(total<.001)throw Error('No additional original source footage can be added.');
 const at=clipStartTime(cuts,clipId),oldEnd=at+(clip.end-clip.start)/speed;
 for(const obj of [...(project.audio||[]),...(project.markers||[])]){
  if(!finite(obj.start)&&!finite(obj.time))continue;
  const key=finite(obj.start)?'start':'time',pos=obj[key];
  let delta=0;
  if(pos>=at-.0001)delta+=before;
  if(pos>=oldEnd-.0001)delta+=after;
  if(delta)obj[key]=round(Math.max(0,pos+delta));
 }
 clip.start=next.start;clip.end=next.end;
 return {before,after,addedSeconds:round(total),newSourceIn:next.start,newSourceOut:next.end,programStart:at};
}
/** One-click remedy for a candidate before it is sent to the editor.
 * Only single original-source intervals are extended; multi-POV edits retain
 * their verified synchronization and must be adjusted per cut in the editor. */
export function extendCandidateCut(candidate,assets,words,{seconds=5,side='both',dialogue=false}={}){
 if(!candidate||!Array.isArray(candidate.segments)||candidate.segments.length!==1)
  throw Error('Open this multi-cut story in the editor to extend individual original footage without breaking synchronization.');
 const clip=candidate.segments[0],next=dialogue?completeExchangeRange(clip,words,assets):extendSourceRange(clip,assets,{side,seconds});
 const oldDuration=(clip.end-clip.start)/Math.max(.25,clip.speed||1),newDuration=(next.end-next.start)/Math.max(.25,clip.speed||1);
 return {...candidate,segments:[next],duration:round((Number(candidate.duration)||oldDuration)+(newDuration-oldDuration)),
  reason:String(candidate.reason||'')+' Extended source range by '+round(newDuration-oldDuration)+' seconds; listen for a complete setup, payoff and reaction.'};
}
