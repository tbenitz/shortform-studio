/** Source-video and edited-timeline subtitle synchronization.
 * Stored word timestamps are always ORIGINAL source seconds.
 * Playback offset moves subtitles, never edits the original transcript.
 */
export function subtitleOffset(project,assetId){
 const value=Number(project?.subtitleOffsets?.[assetId]??0);
 return Number.isFinite(value)?Math.max(-3600,Math.min(3600,value)):0;
}
export function mapSubtitleWords(project){
 const wordsByAsset=new Map();
 for(const word of project?.words||[]){
  if(!word?.assetId||!Number.isFinite(word.start)||!Number.isFinite(word.end)||word.end<=word.start)continue;
  if(!wordsByAsset.has(word.assetId))wordsByAsset.set(word.assetId,[]);
  wordsByAsset.get(word.assetId).push(word);
 }
 let position=0;
 const mapped=[];
 for(const segment of project?.segments||[]){
  const speed=Math.max(.25,Number(segment.speed)||1);
  const span=Math.max(0,(segment.end-segment.start)/speed);
  const shift=subtitleOffset(project,segment.assetId);
  for(const word of wordsByAsset.get(segment.assetId)||[]){
   const shiftedStart=word.start+shift,shiftedEnd=word.end+shift;
   if(shiftedEnd<=segment.start||shiftedStart>=segment.end)continue;
   const start=position+(Math.max(shiftedStart,segment.start)-segment.start)/speed;
   const end=position+(Math.min(shiftedEnd,segment.end)-segment.start)/speed;
   if(end<=start)continue;
   mapped.push({...word,projectStart:start,projectEnd:end});
  }
  position+=span;
 }
 return mapped.sort((a,b)=>a.projectStart-b.projectStart||a.projectEnd-b.projectEnd);
}
/** Reinterpret an edited-timeline SRT as original source timings for existing cuts.
 * Kept separate from source-time import to avoid double-applying edited clip offsets.
 */
export function projectSubtitleWordsToSource(imported,project){
 const mapped=[];let position=0;
 for(const segment of project?.segments||[]){
  const speed=Math.max(.25,Number(segment.speed)||1),span=(segment.end-segment.start)/speed;
  const shift=subtitleOffset(project,segment.assetId);
  if(span<=0)continue;
  for(const w of imported||[]){
   if(w.end<=position||w.start>=position+span)continue;
   const st=Math.max(w.start,position),en=Math.min(w.end,position+span);
   if(en<=st)continue;
   const start=segment.start+(st-position)*speed-shift;
   const end=segment.start+(en-position)*speed-shift;
   if(end>start)mapped.push({...w,assetId:segment.assetId,start,end,projectStart:undefined,projectEnd:undefined});
  }
  position+=span;
 }
 return mapped;
}
/** Transcript metadata and video identity have to match. Equal duration is NOT proof. */
export function relinkSynchronizationWarning(previous,replacement,{tolerance=.35}={}){
 if(!previous||!replacement)return null;
 const oldD=Number(previous.duration),newD=Number(replacement.duration);
 if(Number.isFinite(oldD)&&oldD>0&&Number.isFinite(newD)&&newD>0){
  if(Math.abs(oldD-newD)>tolerance)
   return 'Video duration changed by '+Math.abs(oldD-newD).toFixed(2)+'s. Saved source timestamps and subtitles may drift. The relink does NOT retime captions automatically.';
 }
 if(previous.name!==replacement.name||previous.size!==replacement.size)
  return 'This is a different or converted file. It may start at a different offset despite having the same duration. Verify subtitle synchronization; existing timestamps are preserved.';
 return null;
}
/** Use the decoded frame rather than the requested seek time to decide caption alignment. */
export function alignedVideoProjectTime(seg,offset,videoTime,requestedProjectTime,{tolerance=.38}={}){
 if(!seg||!Number.isFinite(videoTime)||!Number.isFinite(requestedProjectTime))return null;
 const speed=Math.max(.25,Number(seg.speed)||1);
 const mapped=offset+(videoTime-seg.start)/speed;
 if(videoTime<seg.start-.15||videoTime>seg.end+.15)return null;
 return Math.abs(mapped-requestedProjectTime)<=tolerance?mapped:null;
}
export function sourceTimestampAtProjectTime(segments,projectTime,assetId=null){
 let at=0;
 for(const s of segments||[]){
  const speed=Math.max(.25,Number(s.speed)||1),length=(s.end-s.start)/speed;
  if(projectTime>=at&&projectTime<at+length+.001&&(!assetId||assetId===s.assetId))
   return {assetId:s.assetId,sourceTime:s.start+(projectTime-at)*speed};
  at+=length;
 }
 return null;
}
