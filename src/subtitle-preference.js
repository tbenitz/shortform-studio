/** SRT-first caption provenance. Tracks use ORIGINAL source timestamps;
 * never replace an imported SRT silently while Whisper runs.
 * Active words remain in project.words for every existing editor/export consumer.
 */
const validWord=w=>w&&typeof w.assetId==='string'&&Number.isFinite(w.start)&&Number.isFinite(w.end)&&w.end>w.start&&String(w.text||'').trim();
const filtered=(words,id)=>(words||[]).filter(w=>validWord(w)&&w.assetId===id).map(w=>({...w}));
export function getCaptionTrack(project,assetId){
 const entry=project?.subtitleTracks?.[assetId];
 return {active:entry?.active==='whisper'?'whisper':entry?.active==='srt'?'srt':'none',
  srtCount:entry?.srt?.length||0,whisperCount:entry?.whisper?.length||0,
  activeCount:(project?.words||[]).filter(w=>w.assetId===assetId).length};
}
function ensure(project,id){
 project.subtitleTracks||={};
 project.subtitleTracks[id]||={active:'none',srt:[],whisper:[]};
 return project.subtitleTracks[id];
}
function replaceActiveWords(project,assetId,next){
 project.words=[...(project.words||[]).filter(w=>w.assetId!==assetId),...filtered(next,assetId)].sort((a,b)=>a.assetId.localeCompare(b.assetId)||a.start-b.start||a.end-b.end);
}
export function snapshotActiveTrack(project,assetId){
 const entry=project?.subtitleTracks?.[assetId];
 if(entry?.active==='srt'||entry?.active==='whisper')entry[entry.active]=filtered(project.words,assetId);
}
export function importSrtAsDefault(project,assetId,words){
 const next=filtered(words,assetId);if(!next.length)throw Error('The SRT/VTT file contains no usable timed subtitle words.');
 snapshotActiveTrack(project,assetId);
 const entry=ensure(project,assetId);
 if(entry.active==='none'&&entry.whisper.length===0)entry.whisper=filtered(project.words,assetId);
 entry.srt=next;entry.active='srt';
 replaceActiveWords(project,assetId,next);
 return next.length;
}
/** Start ASR without touching an SRT caption track. */
export function beginWhisperCaptionRun(project,assetId,{resume=false}={}){
 const entry=ensure(project,assetId);
 if(entry.active==='srt'){
  if(!resume)entry.whisper=[];
  return {keptSrt:true};
 }
 if(!resume){entry.whisper=[];replaceActiveWords(project,assetId,[])}
 entry.active='whisper';return {keptSrt:false};
}
export function appendWhisperCaptionWords(project,assetId,words){
 const entry=ensure(project,assetId);
 const incoming=filtered(words,assetId);
 if(entry.active==='srt')entry.whisper.push(...incoming);
 else{project.words.push(...incoming);entry.whisper=filtered(project.words,assetId)}
 return incoming.length;
}
export function finishWhisperCaptionRun(project,assetId,reconcile=x=>x){
 const entry=ensure(project,assetId);
 const next=reconcile(entry.active==='srt'?entry.whisper:filtered(project.words,assetId));
 entry.whisper=filtered(next,assetId);
 if(entry.active==='whisper')replaceActiveWords(project,assetId,entry.whisper);
 return {keptSrt:entry.active==='srt',whisperCount:entry.whisper.length};
}
export function selectCaptionTrack(project,assetId,kind){
 const entry=ensure(project,assetId);
 if(kind!=='srt'&&kind!=='whisper')throw Error('Choose SRT or Whisper.');
 snapshotActiveTrack(project,assetId);
 if(!entry[kind]?.length)throw Error(kind==='srt'?'No original SRT track is available. Import one first.':'No Whisper result is available yet. Transcribe the video first.');
 entry.active=kind;
 replaceActiveWords(project,assetId,entry[kind]);
 return entry[kind].length;
}
/** Legacy projects with imported words but no track metadata remain usable. */
export function captionStatus(project,assetId){
 const t=getCaptionTrack(project,assetId);
 return t.active==='srt'?'SRT active · '+t.srtCount+' timed words · kept during Whisper scans':
  t.active==='whisper'?'Whisper active · '+t.whisperCount+' words · SRT available: '+(t.srtCount>0?'yes':'no'):
  t.activeCount+' existing transcript words · import SRT to make source captions primary';
}
