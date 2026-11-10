/** Owner-controlled source-grounded humor review.
 * Ratings belong to the editor, NOT automatic claims that AI understood a joke.
 */
export function rejectedMatch(moment,rejected){
 if(!moment||!Array.isArray(rejected))return false;
 return rejected.some(r=>{
  if(!r||r.assetId!==moment.assetId)return false;
  if(r.id===moment.id)return true;
  if(![r.start,r.end,moment.start,moment.end].every(Number.isFinite))return false;
  const shared=Math.max(0,Math.min(r.end,moment.end)-Math.max(r.start,moment.start));
  const shorter=Math.min(r.end-r.start,moment.end-moment.start);
  return shorter>0&&shared/shorter>=.7;
 });
}
export function humorReviewCounts(project){
 const rejected=Array.isArray(project?.humorRejected)?project.humorRejected:[];
 const all=Array.isArray(project?.humorMoments)?project.humorMoments:[];
 return {total:all.length,rejected:all.filter(m=>rejectedMatch(m,rejected)).length,
  visible:all.filter(m=>!rejectedMatch(m,rejected)).length,storedRejections:rejected.length};
}
export function addHumorRejection(project,moment,{reason='Not funny'}={}){
 if(!moment?.id||!moment.assetId||!Number.isFinite(moment.start)||!Number.isFinite(moment.end))
  throw Error('Cannot reject a moment without real source times.');
 const list=Array.isArray(project.humorRejected)?project.humorRejected:[];
 if(!rejectedMatch(moment,list)){
  project.humorRejected=[...list,{id:moment.id,assetId:moment.assetId,start:moment.start,end:moment.end,
   dialogue:String(moment.dialogue||'').slice(0,300),reason:String(reason).slice(0,100),
   rejectedAt:Date.now()}].slice(-2000);
 }
 project.compilationOrder=(project.compilationOrder||[]).filter(id=>id!==moment.id);
 return project.humorRejected;
}
export function restoreHumorRejection(project,rejectionId){
 const before=Array.isArray(project?.humorRejected)?project.humorRejected:[];
 project.humorRejected=before.filter(x=>x.id!==rejectionId);
 return before.length-project.humorRejected.length;
}
export function viewableHumorMoments(project,{includeRejected=false,scope='all'}={}){
 const rows=(project?.humorMoments||[]).filter(m=>scope==='all'||m.assetId===scope);
 return rows.filter(m=>includeRejected||!rejectedMatch(m,project?.humorRejected)).slice()
   .sort((a,b)=>a.start-b.start||a.assetId.localeCompare(b.assetId));
}
export function humorEvidence(moment,asset){
 const source=moment?.source||'unknown';
 const ai=/ai/i.test(source);
 const info={
  mode:ai?'AI transcript proposal':source==='transcript'?'Transcript heuristic':'Source-transcript proposal',
  sourceName:asset?.name||'Missing original',
  sourceTime:[Number(moment?.start)||0,Number(moment?.end)||0],
  dialogue:String(moment?.dialogue||''),
  warning:ai?'AI has only reviewed timed transcript text. It has not watched or listened to the actual footage.':'Word patterns are not proof a clip is funny. Preview the original footage.',
  mediaReady:!!asset?.url,
  hasOriginalWords:!!String(moment?.dialogue||'').trim()
 };
 return info;
}
