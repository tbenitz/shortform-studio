/** Explicitly separate raw one-camera moments from assembled two-camera stories. */
export const isAssembledPovStory=c=>c?.mode==='multi-pov-story'&&c.pov?.visionVerified===true
 && Array.isArray(c.segments)&&c.segments.length>=3
 && new Set(c.segments.map(s=>s.assetId)).size>=2
 && ((c.pov?.povSwitches||0)>=1||(c.pov?.jumpCuts||0)>=1);
export function directorOutputMode(project,preference='auto'){
 if(preference==='stories'||preference==='raw')return preference;
 return (project?.assets||[]).filter(a=>a.type==='video').length>=2?'stories':'raw';
}
export function visibleDirectorCandidates(project,output='stories',view='active'){
 const all=(project?.candidates||[]).filter(c=>c.mode!=='multi-pov-story'||c.pov?.visionVerified===true),batches=project?.directorBatches||[];
 const story=isAssembledPovStory;
 if(view==='all')return all;
 if(view==='raw')return all.filter(c=>!story(c));
 if(view==='stories')return all.filter(story);
 if(view==='legacy')return all.filter(c=>!c.directorBatchId);
 if(view!=='active')return all.filter(c=>c.directorBatchId===view);
 if(output==='stories'){
  const current=batches.slice().reverse().find(b=>b.mode==='multi-pov-story');
  return current?all.filter(c=>c.directorBatchId===current.id&&story(c)):[];
 }
 const current=batches.slice().reverse().find(b=>b.mode!=='multi-pov-story');
 return current?all.filter(c=>c.directorBatchId===current.id&&!story(c)):all.filter(c=>!story(c));
}
export function directorResultCounts(project){
 const all=(project?.candidates||[]).filter(c=>c.mode!=='multi-pov-story'||c.pov?.visionVerified===true);
 return {raw:all.filter(c=>!isAssembledPovStory(c)).length,
  stories:all.filter(isAssembledPovStory).length};
}
/** Validate evidence-based alignment before selecting cross-camera cuts. */
export function usableAutoSync(sync){
 return sync?.status==='matched'&&Number.isFinite(sync.offset)
  &&Number.isFinite(sync.scale)&&sync.scale>.98&&sync.scale<1.02
  &&sync.inliers>=3&&sync.confidence!=='low';
}
