/**
 * Verifiable project inspection. No synthetic quality scores or cloud calls.
 * Data-flow labels describe implemented paths; they are NOT network firewall claims.
 */
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','"':'&quot;',"'":'&#39;'}[c]));
const signature=x=>JSON.stringify(x??null);
export function compareProjectVersions(before,after){
 if(!before||!after)throw Error('Choose two real saved project states to compare.');
 const from=new Map((before.assets||[]).map(a=>[a.id,a]));
 const to=new Map((after.assets||[]).map(a=>[a.id,a]));
 const a=new Map((before.segments||[]).map(s=>[s.id,s]));
 const b=new Map((after.segments||[]).map(s=>[s.id,s]));
 const added=[...b.keys()].filter(k=>!a.has(k)),removed=[...a.keys()].filter(k=>!b.has(k));
 const moved=[...b.keys()].filter(k=>a.has(k)&&[...a.keys()].indexOf(k)!==[...b.keys()].indexOf(k));
 const changed=[...b.keys()].filter(k=>a.has(k)&&signature(a.get(k))!==signature(b.get(k)));
 const sourceAdded=[...to.keys()].filter(k=>!from.has(k)),sourceRemoved=[...from.keys()].filter(k=>!to.has(k));
 const sourceChanged=[...to.keys()].filter(k=>from.has(k)&&signature(
  {name:from.get(k)?.name,size:from.get(k)?.size,duration:from.get(k)?.duration,fingerprint:from.get(k)?.sourceFingerprint})
  !==signature({name:to.get(k)?.name,size:to.get(k)?.size,duration:to.get(k)?.duration,fingerprint:to.get(k)?.sourceFingerprint}));
 const wordChanged=signature(before.words||[])!==signature(after.words||[]);
 const settingsChanged=Object.keys({...before.settings,...after.settings}).filter(k=>signature(before.settings?.[k])!==signature(after.settings?.[k]));
 return {beforeId:before.id||null,afterId:after.id||null,
  cutCountBefore:a.size,cutCountAfter:b.size,addedCuts:added,removedCuts:removed,movedCuts:moved,changedCuts:changed,
  addedSources:sourceAdded,removedSources:sourceRemoved,changedSources:sourceChanged,
  transcriptChanged:wordChanged,changedSettings:settingsChanged,
  mediaBytesCompared:false,note:'Compares stored project metadata only. Does not compare media content or rendered output.'};
}
export function actualProcessingStates(project,{asrRunning=false,visionRunning=false,rendering=false}={}){
 const rows=[];
 for(const a of project.assets||[]){
  const progress=project.transcriptProgress?.[a.id],total=Number(progress?.total||a.duration)||0;
  const next=Number(progress?.nextAt)||0;
  rows.push({name:a.name,id:a.id,task:'Transcription',
   status:asrRunning&&project.selectedAsset===a.id?'running':progress?.status==='complete'&&next>=total-.5?'complete':
    next>0?(progress?.status==='complete'?'warning':'paused'):'not-started',
   nextAt:next,total,notes:!progress?'No checkpoint on this source; not proof of missing audio.':String(progress.status||'Checkpoint recorded')});
 }
 if(visionRunning)rows.push({name:'Selected source',task:'Visual scan',status:'running',notes:'In-browser progress; uncompleted frames are not verified.'});
 if(rendering)rows.push({name:'Project video',task:'Render',status:'running',notes:'No success state until MP4 finalization returns real bytes.'});
 return rows;
}
export function outboundDataDisclosure(project){
 return [
  {activity:'Local Whisper ASR',transport:'On device',payload:'Decoded original audio windows',trigger:'Run local Whisper',notes:'Model assets may be downloaded. Audio windows are processed in the browser, not uploaded by this feature.'},
  {activity:'Face/scene/visual scan',transport:'On device',payload:'Decoded original video frames',trigger:'Analyze / inspect source',notes:'MediaPipe model files may be downloaded. Decoded video stays local in this implemented path.'},
  {activity:'Remote AI Director',transport:'Optional external HTTPS service',payload:'Timed source dialogue, source names and instructions; optional compressed frame/contact-sheet images for multi-POV visual review',trigger:'Owner selects remote provider and invokes generation',notes:'Text and visual API calls have different payloads. Provider can retain submitted content subject to its own policy.'},
  {activity:'Hosted speaker diarization',transport:'Optional external HTTPS service',payload:'Selected original recording audio/video file',trigger:'Explicit upload confirmation before diarization',notes:'Only run with permission to upload the source.'},
  {activity:'Optional hosted narration/TTS',transport:'Optional external HTTPS service',payload:'Narration text, model and voice settings',trigger:'Explicit voice-generation action',notes:'Narration is sent only when using the hosted provider.'},
  {activity:'Local project backup',transport:'Downloaded file',payload:'Project metadata, cut ranges, captions, notes, reference IDs',trigger:'Owner downloads metadata',notes:'Verified backup does not embed media bytes; project metadata can still contain sensitive text.'}
 ];
}
export function productionReviewHTML(project,snapshots=[],{asrRunning=false,visionRunning=false,rendering=false}={}){
 const statuses=actualProcessingStates(project,{asrRunning,visionRunning,rendering});
 const options=snapshots.map(s=>'<option value="'+esc(s.id)+'">'+esc(s.name)+' · '+new Date(s.createdAt).toLocaleString()+'</option>').join('');
 const tasks=statuses.length?statuses.map(s=>'<article class="tiny"><b>'+esc(s.name)+' · '+esc(s.task)+' · '+esc(s.status)+'</b><small class="muted">'+esc(s.notes)+' '+(s.total?esc(s.nextAt)+'/'+esc(s.total)+' source seconds':'')+'</small></article>').join(''):
  '<p class="tiny muted">No original-source processing checkpoint exists in this empty project.</p>';
 const rows=outboundDataDisclosure(project).map(x=>'<article class="tiny"><b>'+esc(x.activity)+' · '+esc(x.transport)+'</b><p>'+esc(x.payload)+'</p><small class="muted">Triggered by: '+esc(x.trigger)+'. '+esc(x.notes)+'</small></article>').join('');
 return '<div class="separator"></div><details id="productionReviewPanel" class="story-workbench"><summary>Saved-version comparison, real task status & data disclosure</summary>'+
 '<h3>Compare current edit to a saved version</h3><p class="tiny muted">This is read-only. Both states must exist in local project storage. It does not restore the older version or overwrite your working cuts.</p>'+
 '<select id="reviewSnapshotChoice" aria-label="Saved version to compare">'+(options||'<option value="">No saved version</option>')+'</select>'+
 '<button type="button" id="reviewCompareSnapshot" class="full" '+(options?'':'disabled')+'>Compare saved version with current edit</button>'+
 '<div id="reviewVersionResult" class="production-list"></div><div class="separator"></div>'+
 '<h3>Actual processing checkpoints</h3><p class="tiny muted">These are persisted status records, not a synthetic background task queue. A paused browser operation is not complete.</p><div class="production-list">'+tasks+'</div>'+
 '<h3>Where your content goes</h3><p class="tiny muted">Remote processing is opt-in. The following describes known app paths; it is not an audit of third-party browser extensions or network proxies.</p>'+
 '<div class="production-list">'+rows+'</div>'+
 '<p class="tiny muted">Warning: normal project JSON, story notes and even verified metadata backup can contain private words from uploaded transcripts. Export only if the recipient is authorized.</p>'+
 '</details>';
}
