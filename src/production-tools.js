import {duration} from './model.js';

/**
 * Pure project analysis and export utilities. No AI calls and no media uploads.
 * Reports only what the saved metadata can prove; they are NOT rendered-video QA.
 */
export function projectAudit(project) {
  const assets = Array.isArray(project?.assets) ? project.assets : [];
  const clips = Array.isArray(project?.segments) ? project.segments : [];
  const tracks = Array.isArray(project?.audio) ? project.audio : [];
  const words = Array.isArray(project?.words) ? project.words : [];
  const length = duration({...project,segments:clips});
  const sources = new Map(assets.map(a=>[a.id,a]));
  const issues = [];
  const issue=(severity,title,detail,sourceId=null)=>issues.push({severity,title,detail,sourceId});
  if(!clips.length) issue('warning','Empty timeline','Insert a video excerpt before exporting.');
  const duplicates = new Map();
  for(const a of assets) {
    if(!a.url) issue('warning','Media needs relinking',a.name||a.id,a.id);
    const key=[String(a.name||'').toLocaleLowerCase(),Number(a.size)||0].join('|');
    if(a.name && a.size>0) {
      const arr=duplicates.get(key)||[];
      arr.push(a);duplicates.set(key,arr);
    }
  }
  for(const group of duplicates.values()) if(group.length>1)
    issue('info','Possible duplicate imports',group.map(a=>a.name).join(', '));
  let cursor=0;
  for(const [i,c] of clips.entries()) {
    const a=sources.get(c.assetId), speed=Number(c.speed||1);
    const span=Number(c.end)-Number(c.start);
    if(!a) issue('error',`Cut ${i+1} has no source`,String(c.assetId));
    if(!Number.isFinite(span)||span<=0||!Number.isFinite(speed)||speed<=0)
      issue('error',`Cut ${i+1} has invalid timing`,'Review source In/Out and playback speed.');
    if(a?.duration>0&&c.end>a.duration+.1)
      issue('error',`Cut ${i+1} extends beyond source`,a.name,a.id);
    if(span>0&&span/speed<.35)
      issue('warning',`Cut ${i+1} is very short`,`${(span/speed).toFixed(2)} seconds`,a?.id);
    if(i>0&&c.assetId===clips[i-1].assetId&&c.start+1<clips[i-1].start)
      issue('info',`Cut ${i+1} moves backward in source time`,'Verify the chronology is intentional.',a?.id);
    cursor+=span/Math.max(.25,speed);
  }
  for(const [i,a] of tracks.entries()) {
    if(!sources.has(a.assetId)) issue('error',`Audio ${i+1} source unavailable`,String(a.assetId));
    if(a.start<0||a.duration<=0) issue('error',`Audio ${i+1} has invalid placement`,'Review audio start and duration.');
    if(a.start+a.duration>length+.2)
      issue('info',`Audio ${i+1} extends beyond output`,'The extra portion may be truncated.');
  }
  const approx=words.filter(w=>w.timing==='estimated').length;
  if(approx) issue('warning','Approximate transcript timing',`${approx} words need timing review.`);
  let gaps=0;
  for(const value of Object.values(project?.transcriptGaps||{})) if(Array.isArray(value)) gaps+=value.length;
  if(gaps) issue('warning','Unresolved possible transcription gaps',`${gaps} intervals require review.`);
  const markerList=Array.isArray(project?.markers)?project.markers:[];
  for(const m of markerList) if(!Number.isFinite(Number(m.time))||m.time<0||m.time>length)
    issue('warning','Marker outside timeline',String(m.label||'Unnamed marker'));
  return {
    generatedAt:new Date().toISOString(),
    projectId:String(project?.id||''),
    projectName:String(project?.name||'Untitled Project'),
    stats:{
      sourceCount:assets.length,videoClips:clips.length,audioOverlays:tracks.length,
      durationSeconds:Number(length.toFixed(3)),transcriptWords:words.length,
      estimatedTimestampWords:approx,unresolvedGapCount:gaps,
      markerCount:markerList.length,sourceBytes:assets.reduce((n,a)=>n+(Number(a.size)||0),0),
      sceneSamples:Object.values(project?.sceneTracks||{}).reduce((n,x)=>n+(Array.isArray(x)?x.length:0),0),
      faceSamples:Object.values(project?.faceTracks||{}).reduce((n,x)=>n+(Array.isArray(x)?x.length:0),0)
    },
    issues,
    note:'Metadata-only audit. This cannot verify actual video frames, speech content, codecs, final render, or story quality.'
  };
}
export function csvCell(value) {
  let s=String(value??'');
  // Prevent interpreting imported source names/titles as spreadsheet formulas.
  if(/^[\s]*[=+@\-]/.test(s)) s="'"+s;
  return '"'+s.replace(/"/g,'""')+'"';
}
export function cutSheetCSV(project){
  const assets=new Map((project.assets||[]).map(a=>[a.id,a]));
  const rows=[['cut','timeline_start_s','timeline_end_s','source_name','source_in_s','source_out_s','speed','title','notes','source_id']];
  let cursor=0;
  for(const [i,s] of (project.segments||[]).entries()){
    const end=cursor+(s.end-s.start)/Math.max(.25,Number(s.speed)||1);
    rows.push([i+1,cursor.toFixed(3),end.toFixed(3),assets.get(s.assetId)?.name||'Missing source',Number(s.start).toFixed(3),Number(s.end).toFixed(3),s.speed||1,s.title||'',s.notes||'',s.assetId]);
    cursor=end;
  }
  return '\ufeff'+rows.map(row=>row.map(csvCell).join(',')).join('\r\n')+'\r\n';
}
export function markerTime(time) {
  const t=Math.max(0,Math.floor(Number(time)||0));
  return `${Math.floor(t/3600)}:${String(Math.floor(t%3600/60)).padStart(2,'0')}:${String(t%60).padStart(2,'0')}`;
}
export function cleanMarkers(markers, timelineDuration) {
  const max=Math.max(0,Number(timelineDuration)||0);
  return (Array.isArray(markers)?markers:[])
    .filter(m=>m&&typeof m.id==='string'&&Number.isFinite(Number(m.time))&&Number(m.time)>=0&&Number(m.time)<=max)
    .map(m=>({id:m.id,time:Number(m.time),label:String(m.label||'Marker').slice(0,120),kind:['chapter','note','review','todo'].includes(m.kind)?m.kind:'note'}))
    .sort((a,b)=>a.time-b.time);
}
export function chaptersText(project) {
  const marks=cleanMarkers(project.markers,duration(project)).filter(m=>m.kind==='chapter');
  if(!marks.length)return '# No chapter markers set. Add chapter markers in Production Tools.\n';
  const chapters=[...marks];
  if(chapters[0].time>.5)chapters.unshift({time:0,label:'Start'});
  return chapters.map(m=>`${markerTime(m.time)} ${m.label.replace(/[\r\n]+/g,' ').trim()||'Chapter'}`).join('\n')+'\n';
}
export function createSnapshot(project,name,id,when=Date.now()) {
  if(!project?.id||!id)throw Error('Snapshot requires a valid project and ID.');
  const metadata=structuredClone(project);
  metadata.assets=(metadata.assets||[]).map(({file,url,...asset})=>asset);
  return {id,projectId:project.id,name:String(name||'Untitled snapshot').trim().slice(0,100)||'Untitled snapshot',createdAt:when,project:metadata};
}
export function sourceMatch(project,query,limit=50) {
  const needle=String(query||'').trim().toLowerCase();
  if(!needle)return [];
  const sources=new Map((project.assets||[]).map(a=>[a.id,a]));
  return (project.words||[])
    .filter(w=>String(w.text||'').toLowerCase().includes(needle))
    .sort((a,b)=>a.start-b.start)
    .slice(0,limit)
    .map(w=>({assetId:w.assetId,sourceName:sources.get(w.assetId)?.name||'Missing source',start:w.start,end:w.end,text:w.text,speaker:w.speaker||''}));
}
