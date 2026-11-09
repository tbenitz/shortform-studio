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
 const needle=String(query||'').trim().toLocaleLowerCase();
 if(!needle)return [];
 const words=Array.isArray(project?.words)?project.words:[];
 const sources=new Map((project.assets||[]).map(a=>[a.id,a]));
 const normalize=text=>String(text||'').toLocaleLowerCase().replace(/[^\\p{L}\\p{N}']+/gu,' ').trim();
 const tokens=normalize(needle).split(/\\s+/).filter(Boolean);
 if(!tokens.length)return [];
 const results=[];
 if(tokens.length===1){
  for(const w of words){
   if(!normalize(w.text).includes(tokens[0]))continue;
   results.push({assetId:w.assetId,sourceName:sources.get(w.assetId)?.name||'Missing source',start:w.start,end:w.end,text:w.text,speaker:w.speaker||''});
   if(results.length>=limit)break;
  }
 }else{
  const groups=new Map();
  for(const w of words){if(!groups.has(w.assetId))groups.set(w.assetId,[]);groups.get(w.assetId).push(w)}
  for(const [assetId,entries] of groups){
   entries.sort((a,b)=>a.start-b.start);
   for(let i=0;i<entries.length;i++){
    const first=entries[i];
    if(normalize(first.text)!==tokens[0])continue;
    let end=first.end,matched=1,phrase=[first.text];
    for(let j=i+1;j<entries.length&&matched<tokens.length;j++){
     const next=entries[j];
     if(next.start-end>2.5||next.start<end-1)break;
     if(normalize(next.text)!==tokens[matched])break;
     phrase.push(next.text);end=next.end;matched++;
    }
    if(matched!==tokens.length)continue;
    results.push({assetId,sourceName:sources.get(assetId)?.name||'Missing source',start:first.start,end,text:phrase.join(' '),speaker:first.speaker||''});
    if(results.length>=limit)break;
   }
   if(results.length>=limit)break;
  }
 }
 return results.sort((a,b)=>a.start-b.start).slice(0,limit);
}

const htmlEscape = value => String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function toolSearchResultsHTML(project,query) {
 if(!String(query||'').trim())return '<p class="tiny muted">Type a word to search every imported source transcript.</p>';
 const matches=sourceMatch(project,query,70);
 if(!matches.length)return '<p class="tiny muted">No matching transcript words. This is not visual search.</p>';
 return matches.map(m=>`<button class="small full" data-tool-result="${htmlEscape(m.assetId)}" data-tool-start="${m.start}" data-tool-end="${m.end}" style="white-space:normal;justify-content:flex-start;text-align:left"><span><b>${htmlEscape(m.sourceName)}</b> · ${markerTime(m.start)} · ${htmlEscape(m.speaker)}<br>${htmlEscape(m.text)}</span></button>`).join('');
}
export function productionToolsHTML(project,snapshots=[],search='',atTime=0) {
 const audit=projectAudit(project),s=audit.stats,markers=cleanMarkers(project.markers,duration(project));
 const stats=[['Sources',s.sourceCount],['Video cuts',s.videoClips],['Audio tracks',s.audioOverlays],['Transcript words',s.transcriptWords],['Markers',s.markerCount],['ASR gaps',s.unresolvedGapCount]];
 const cards=stats.map(([label,n])=>`<div class="production-stat"><b>${Number(n).toLocaleString()}</b><small>${htmlEscape(label)}</small></div>`).join('');
 const saved=snapshots.length?snapshots.map(v=>`<article><b>${htmlEscape(v.name)}</b><small class="muted">${new Date(v.createdAt).toLocaleString()} · metadata only</small><div class="row"><button class="small" data-snapshot-restore="${htmlEscape(v.id)}">Restore</button><button class="small danger" data-snapshot-delete="${htmlEscape(v.id)}">Delete</button></div></article>`).join(''):'<p class="tiny muted">No snapshots for this project.</p>';
 const marks=markers.length?markers.map(m=>`<article><div class="row"><input aria-label="Marker label" data-marker-label="${htmlEscape(m.id)}" maxlength="120" value="${htmlEscape(m.label)}" style="flex:1;min-width:100px"><input aria-label="Marker seconds" data-marker-time="${htmlEscape(m.id)}" type="number" min="0" max="${s.durationSeconds}" step="0.01" value="${m.time}" style="max-width:86px"></div><div class="row"><select aria-label="Marker type" data-marker-kind="${htmlEscape(m.id)}">${['chapter','note','review','todo'].map(k=>`<option value="${k}" ${k===m.kind?'selected':''}>${k}</option>`).join('')}</select><button class="small" data-marker-save="${htmlEscape(m.id)}">Save</button><button class="small" data-marker-jump="${htmlEscape(m.id)}">Jump</button><button class="small danger" data-marker-remove="${htmlEscape(m.id)}">×</button></div></article>`).join(''):'<p class="tiny muted">No markers. Add one at the playhead.</p>';
 const issues=audit.issues.length?audit.issues.map(i=>`<div class="production-issue tiny" data-severity="${htmlEscape(i.severity)}"><b>${htmlEscape(i.severity.toUpperCase())}: ${htmlEscape(i.title)}</b>${htmlEscape(i.detail)}</div>`).join(''):'<p class="tiny success">No metadata warnings. This does not verify rendered media.</p>';
 return `<div class="info"><b>Production Tools</b><br>Local source-aware reports, timeline markers and recoverable project metadata snapshots. This is not a visual AI quality inspection.</div><div class="separator"></div>
 <div class="production-summary">${cards}</div><div class="separator"></div>
 <h3>Project recovery snapshots</h3><p class="tiny muted">Snapshots retain edits, tracks, transcript and settings, not media bytes. Relinking may be required after restore.</p>
 <label class="field">Version name<input id="toolsSnapshotName" maxlength="100" value="Before next edit"></label>
 <button id="toolsCreateSnapshot" class="primary full">Save named snapshot</button><div class="production-list">${saved}</div><div class="separator"></div>
 <h3>Timeline markers and chapters</h3><p class="tiny muted">At playhead ${markerTime(atTime)}. Markers appear above the video track.</p>
 <label class="field">New marker name<input id="toolsMarkerName" maxlength="120" value="New chapter"></label>
 <label class="field">Type<select id="toolsMarkerKind"><option value="chapter">Chapter</option><option value="note">Note</option><option value="review">Review</option><option value="todo">To do</option></select></label>
 <button id="toolsAddMarker" class="full">+ Add at playhead</button><div class="production-list">${marks}</div>
 <button id="toolsExportChapters" class="full" style="margin-top:8px">Download chapter timestamps (.txt)</button><div class="separator"></div>
 <h3>Search all source transcripts</h3><label class="field">Find a word<input id="toolsSearch" value="${htmlEscape(search)}" placeholder="Search recordings…"></label>
 <div id="toolsSearchResults" class="production-list">${toolSearchResultsHTML(project,search)}</div><div class="separator"></div>
 <h3>Project health checks</h3><p class="tiny muted">${audit.issues.length} metadata notice(s). This checks references and timestamps; it cannot inspect the actual decoded video or finished render.</p>
 <div class="production-list">${issues}</div><div class="separator"></div>
 <button id="toolsExportCSV" class="full">Download editable cut sheet (.csv)</button>
 <button id="toolsExportAudit" class="full">Download project audit (.json)</button>`;
}
