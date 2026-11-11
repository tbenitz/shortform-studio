/** Durable, source-specific local transcription checkpoints.
 * Evidence is committed to IndexedDB after each completed ASR window. These
 * metadata signatures prevent accidental resume on a different relinked file;
 * they are NOT cryptographic proofs of full-media identity.
 */
const finite=x=>typeof x==='number'&&Number.isFinite(x);
export function transcriptionSourceSignature(asset,file){
 if(!asset||!file||!finite(file.size)||file.size<=0)throw Error('Relink a real original media file to verify the transcription source.');
 return {name:String(file.name||asset.name||''),bytes:file.size,
  modified:Number.isFinite(file.lastModified)?file.lastModified:null,
  duration:Math.round(Number(asset.duration||0)*1000)/1000};
}
const equalSignature=(a,b)=>a&&b&&a.name===b.name&&a.bytes===b.bytes&&a.modified===b.modified&&a.duration===b.duration;
export function checkTranscriptionResume(saved,asset,file,{model}={}){
 if(!saved||!(saved.nextAt>0)||saved.status==='complete')return {allowed:false,restart:true,reason:'There is no incomplete transcription checkpoint to resume.'};
 let signature;try{signature=transcriptionSourceSignature(asset,file)}catch(error){return {allowed:false,restart:false,reason:error.message}}
 if(!saved.sourceSignature||!equalSignature(saved.sourceSignature,signature))
  return {allowed:false,restart:true,reason:!saved.sourceSignature?'Older transcription progress has no verified source signature. Restart from the beginning to avoid skipping audio.':'The relinked recording differs in name, bytes, modified date or duration. Restart on this file; do not combine two transcripts.'};
 if(saved.model&&model&&saved.model!==model)
  return {allowed:false,restart:true,reason:'The Whisper model changed since this run. Restart to avoid mixing incompatible recognition checkpoints.'};
 const windows=saved.windows;
 if(!Array.isArray(windows)||!windows.length)
  return {allowed:false,restart:true,reason:'The saved checkpoint has no completed source-window ledger. Restart to avoid skipping unverified audio.'};
 let reached=0;
 for(const [index,win] of windows.entries()){
  if(!finite(win.from)||!finite(win.to)||win.from<0||win.to<=win.from||Math.abs(win.from-reached)>.06)
   return {allowed:false,restart:true,reason:'Saved audio-window ledger has a gap or overlap at entry '+(index+1)+'. Restart safely.'};
  reached=win.to;
 }
 if(Math.abs(reached-saved.nextAt)>.06||!finite(saved.total)||Math.abs(saved.total-asset.duration)>.3)
  return {allowed:false,restart:true,reason:'Saved checkpoint time does not match verified audio windows or recording duration. Restart safely.'};
 return {allowed:true,startAt:reached,completedWindows:windows.length,signature,reason:'Verified '+windows.length+' consecutively saved audio windows through '+reached.toFixed(1)+'s.'};
}
/** Advance ONLY after the caller has received a fully processed, source-bound window. */
export function nextTranscriptionCheckpoint(previous,chunk,{signature,model,now=Date.now()}={}){
 if(!signature||!finite(chunk?.from)||!finite(chunk?.to)||!finite(chunk?.total))
  throw Error('Transcription checkpoint lacks verified source or window bounds.');
 if(!(chunk.to>chunk.from)||chunk.from<0||chunk.to>chunk.total+.06)
  throw Error('Transcription window has invalid original recording bounds.');
 const windows=Array.isArray(previous?.windows)?previous.windows.slice():[];
 const expected=windows.length?windows.at(-1).to:0;
 if(Math.abs(chunk.from-expected)>.06)throw Error('Transcript checkpoint is non-contiguous; refusing to skip original audio.');
 const entry={from:chunk.from,to:chunk.to,words:(chunk.words||[]).length,gaps:(chunk.gaps||[]).length};
 windows.push(entry);
 return {status:'paused',nextAt:chunk.to,total:chunk.total,sourceSignature:signature,model:model||'',
  windows,verifiedWindows:windows.length,savedAt:now};
}
/** A retry plan uses a stable snapshot of flagged intervals. Recomputed plans
 * cannot accidentally reuse progress from a different set of gap windows. */
export function gapRetryPlan(gaps,asset,file,model=''){
 const signature=transcriptionSourceSignature(asset,file);
 const intervals=(gaps||[]).filter(g=>finite(g.start)&&finite(g.end)&&g.start>=0&&g.end>g.start)
  .map(g=>[Math.round(g.start*1000)/1000,Math.round(g.end*1000)/1000]);
 const key=JSON.stringify([signature,model,intervals]);
 return {key,sourceSignature:signature,intervals};
}
export function gapReviewKey(gap){return Math.round(gap.start*1000)+'-'+Math.round(gap.end*1000)}
