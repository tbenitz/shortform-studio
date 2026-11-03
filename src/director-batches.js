import {editorialDirectionKey} from './director-intent.js';
/** A new creative direction re-reviews the same source, NOT just unused time.
 * Old proposals remain saved but don't leak into the new editorial result list.
 */
export function planDirectorBatch(project,options,{id='new-run'}={}){
 const key=editorialDirectionKey(options);
 const current=(project?.directorBatches||[]).find(b=>b.id===project.directorActiveBatchId);
 const fresh=!current||current.key!==key;
 const batch=fresh?{id,key,mode:options.mode,direction:String(options.directorInstructions||'').trim(),createdAt:Date.now(),count:0,provider:options.provider}:current;
 const prior=fresh?[]:(project?.candidates||[]).filter(c=>c.directorBatchId===current.id);
 const history=fresh?[]:(project?.directorHistory||[]).filter(h=>h.directorBatchId===current.id);
 return {batch,newBatch:fresh,existingCandidates:prior,history};
}
export function directorViewCandidates(project,viewId){
 const id=viewId||project?.directorActiveBatchId||'all';
 if(id==='all')return project?.candidates||[];
 if(id==='legacy')return (project?.candidates||[]).filter(c=>!c.directorBatchId);
 return (project?.candidates||[]).filter(c=>c.directorBatchId===id);
}
export function assignDirectorBatch(candidates,batch){
 return (candidates||[]).map((candidate,i)=>({
  ...candidate,
  id:String(candidate.id||'candidate')+'-batch-'+batch.id+'-'+i,
  originalCandidateId:String(candidate.id||'candidate'),
  directorBatchId:batch.id,
  direction:batch.direction
 }));
}
