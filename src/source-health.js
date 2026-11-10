/**
 * Source-grounded transcript coverage, edit search and review markers.
 * This file never fetches media or invents speech. Transcript gaps mean
 * "no timed words", NOT silence or missing recorded audio.
 */
const round = n => Math.round(Number(n) * 1000) / 1000;
const finite = n => Number.isFinite(Number(n));
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const durationOf = asset => Math.max(0,Number(asset?.duration)||0);
const sourceWords = (words, id) => (Array.isArray(words)?words:[])
  .filter(w => w?.assetId===id && finite(w.start) && finite(w.end) && Number(w.start)>=0 && Number(w.end)>Number(w.start))
  .sort((a,b)=>Number(a.start)-Number(b.start));
const time = v => {const n=Math.max(0,Math.floor(Number(v)||0));return String(Math.floor(n/3600)).padStart(2,'0')+':'+String(Math.floor(n/60)%60).padStart(2,'0')+':'+String(n%60).padStart(2,'0')};
const validAssets = project => Array.isArray(project?.assets)?project.assets:[];

/** Build source-level intervals from actual imported words only. */
export function transcriptCoverage(project,{gapThreshold=12,mergeTolerance=.4,maxGaps=100}={}){
 const assets=validAssets(project), words=project?.words||[];
 const threshold=Math.max(1,Number(gapThreshold)||12), tolerance=Math.max(0,Number(mergeTolerance)||0);
 const rows=assets.map(a=>{
  const length=durationOf(a), timed=sourceWords(words,a.id);
  const invalid=(Array.isArray(words)?words:[]).filter(w=>w?.assetId===a.id && (!finite(w.start)||!finite(w.end)||Number(w.start)<0||Number(w.end)<=Number(w.start))).length;
  const estimated=timed.filter(w=>w.timing==='estimated').length;
  const outOfRange=timed.filter(w=>length>0&&Number(w.end)>length+.25).length;
  const known=[],gaps=[],duplicated=[],overlaps=[];
  let prev=null;
  for(const w of timed){
   if(prev){
    if(Number(w.start)<Number(prev.end)-.15)overlaps.push({start:round(w.start),end:round(Math.min(w.end,prev.end)),text:String(w.text||'').slice(0,55)});
    if(String(w.text||'').trim().toLocaleLowerCase()===String(prev.text||'').trim().toLocaleLowerCase() &&
       Math.abs(Number(w.start)-Number(prev.start))<.4)
      duplicated.push({start:round(w.start),text:String(w.text||'').slice(0,55)});
   }
   prev=w;
   const lo=Math.max(0,Number(w.start)),hi=length>0?Math.min(length,Number(w.end)):Number(w.end);
   if(hi<=lo)continue;
   const tail=known.at(-1);
   if(tail&&lo<=tail.end+tolerance)tail.end=Math.max(tail.end,hi);
   else known.push({start:lo,end:hi});
  }
  if(length>0){
   let cursor=0;
   for(const part of known){
    if(part.start-cursor>=threshold)gaps.push({start:round(cursor),end:round(part.start),kind:cursor===0?'opening':'internal'});
    cursor=Math.max(cursor,part.end);
   }
   if(length-cursor>=threshold)gaps.push({start:round(cursor),end:round(length),kind:cursor===0?'entire-source':'ending'});
  }
  const covered=known.reduce((n,v)=>n+Math.max(0,v.end-v.start),0);
  const progress=project?.transcriptProgress?.[a.id]||null;
  const recordedGaps=Array.isArray(project?.transcriptGaps?.[a.id])?project.transcriptGaps[a.id]:[];
  return {
   assetId:a.id,sourceName:String(a.name||a.id),sourceType:a.type||'unknown',durationSeconds:round(length),
   wordCount:timed.length,estimatedTimingWords:estimated,invalidTimingWords:invalid,outOfRangeWords:outOfRange,
   coveredTimestampSeconds:round(covered),coverageRatio:length>0?round(Math.min(1,covered/length)):null,
   recognizedIntervals:known.map(x=>({start:round(x.start),end:round(x.end)})),
   missingTranscriptIntervals:gaps.slice(0,Math.min(300,maxGaps)),
   omittedGapCount:Math.max(0,gaps.length-Math.min(300,maxGaps)),
   suspectedRepeatedWords:duplicated.slice(0,40),overlappingWordTimes:overlaps.slice(0,40),
   savedProcessing:progress?{status:String(progress.status||'unknown'),nextAt:finite(progress.nextAt)?Number(progress.nextAt):null,total:finite(progress.total)?Number(progress.total):null}:null,
   previouslyFlaggedGaps:recordedGaps.length,
   disclaimer:'No timed transcript words is not proof of silence or corrupt audio. Covered seconds measure timed word spans, not speech recall.'
  };
 });
 return {schema:'shortform-source-coverage-v1',generatedAt:new Date().toISOString(),sourceCount:rows.length,
  totalWordCount:rows.reduce((n,r)=>n+r.wordCount,0),
  gapCount:rows.reduce((n,r)=>n+r.missingTranscriptIntervals.length+r.omittedGapCount,0),
  invalidTimeCount:rows.reduce((n,r)=>n+r.invalidTimingWords+r.outOfRangeWords,0),
  sources:rows,verifiedSpeechCoverage:false,
  note:'Metadata-only review. The app has not listened to untranscribed intervals or checked actual source frames.'};
}

/** Search project evidence, returning the original source and precise reference. */
export function searchProjectEvidence(project,query,{limit=100}={}){
 const term=String(query||'').trim().toLocaleLowerCase();
 if(!term)return [];
 const results=[],assets=new Map(validAssets(project).map(a=>[a.id,a]));
 const add=row=>{if(results.length<Math.max(1,Math.min(500,limit)))results.push(row)};
 for(const a of validAssets(project)){
  if(String(a.name||'').toLocaleLowerCase().includes(term))
   add({kind:'source',id:a.id,assetId:a.id,start:0,title:String(a.name||''),text:'Original source filename match'});
 }
 let offset=0;
 for(const [i,s] of (project?.segments||[]).entries()){
  if(String(s.title||'').toLocaleLowerCase().includes(term)||String(s.notes||'').toLocaleLowerCase().includes(term)||
      String(s.storyRole||'').toLocaleLowerCase().includes(term)){
   add({kind:'cut',id:s.id,assetId:s.assetId,start:Number(s.start)||0,programTime:round(offset),
    title:'Cut '+(i+1)+' · '+String(assets.get(s.assetId)?.name||'Missing source'),text:String(s.title||s.notes||s.storyRole||'')});
  }
  offset+=(Number(s.end)-Number(s.start))/Math.max(.25,Number(s.speed)||1);
 }
 const grouped=new Map();
 for(const w of project?.words||[]){
  if(!w||!assets.has(w.assetId)||!finite(w.start)||!finite(w.end))continue;
  if(!grouped.has(w.assetId))grouped.set(w.assetId,[]);
  grouped.get(w.assetId).push(w);
 }
 for(const [id,list] of grouped){
  list.sort((a,b)=>Number(a.start)-Number(b.start));
  // Inspect adjacent actual words to support phrase searches without semantic guessing.
  for(let i=0;i<list.length;i++){
   const start=Number(list[i].start),phrase=[String(list[i].text||'')],window=[list[i]];
   for(let j=i+1;j<Math.min(list.length,i+11);j++){
    if(Number(list[j].start)-Number(window.at(-1).end)>2.5)break;
    phrase.push(String(list[j].text||''));window.push(list[j]);
   }
   if(phrase.join(' ').toLocaleLowerCase().includes(term)){
    add({kind:'transcript',id:id+':'+start,assetId:id,start:round(start),
     end:round(Number(window.at(-1).end)),title:String(assets.get(id)?.name||id),
     text:phrase.slice(0,11).join(' ').slice(0,260)});
    i+=Math.max(0,Math.min(4,term.split(/\s+/).length-1));
   }
   if(results.length>=limit)break;
  }
 }
 for(const m of project?.markers||[]){
  if(String(m.label||'').toLocaleLowerCase().includes(term))
   add({kind:'marker',id:m.id,programTime:Number(m.time)||0,title:'Timeline marker',text:String(m.label||'')});
 }
 for(const [i,c] of (project?.candidates||[]).entries()){
  if(String(c.title||'').toLocaleLowerCase().includes(term)||String(c.description||'').toLocaleLowerCase().includes(term))
   add({kind:'candidate',id:c.id,title:'Director proposal '+(i+1),text:String(c.title||c.description||''),assetId:c.segments?.[0]?.assetId,start:Number(c.segments?.[0]?.start)||0});
 }
 return results.slice(0,Math.max(1,Math.min(500,limit)));
}

/** Create timeline bookmarks ONLY where a real edited cut includes a transcript gap. */
export function makeTranscriptReviewMarkers(project,report,{limit=30}={}){
 const chosen=[],existing=new Set((project?.markers||[]).map(m=>String(m.label||'')));
 let offset=0;
 const gapsByAsset=new Map((report?.sources||[]).map(r=>[r.assetId,r.missingTranscriptIntervals]));
 for(const clip of project?.segments||[]){
  const length=(Number(clip.end)-Number(clip.start))/Math.max(.25,Number(clip.speed)||1);
  const gaps=gapsByAsset.get(clip.assetId)||[];
  for(const gap of gaps){
   const lo=Math.max(Number(clip.start),gap.start),hi=Math.min(Number(clip.end),gap.end);
   if(hi-lo<1)continue;
   const t=round(offset+(lo-Number(clip.start))/Math.max(.25,Number(clip.speed)||1));
   const label='Transcript review: '+String(clip.assetId).slice(0,32)+' at '+time(lo);
   if(existing.has(label))continue;
   chosen.push({id:'gap-'+String(clip.id)+'-'+Math.round(lo*1000),time:t,label,kind:'review'});
   existing.add(label);
   if(chosen.length>=Math.max(1,Math.min(100,limit)))return chosen;
  }
  offset+=Math.max(0,length);
 }
 return chosen;
}

export function evidenceSearchHTML(project,query){
 const found=searchProjectEvidence(project,query,{limit:50});
 if(!String(query||'').trim())return '<p class="tiny muted">Search names, original timed speech, cut notes, markers and Director proposal titles.</p>';
 if(!found.length)return '<p class="tiny muted">No literal matches in saved evidence. This does not scan untranscribed audio or video frames.</p>';
 return found.map((r,i)=>'<button type="button" class="small full" data-evidence-index="'+i+'" style="text-align:left;white-space:normal;justify-content:flex-start">'+
  '<span><b>'+escape(r.kind)+' · '+escape(r.title)+'</b> '+(finite(r.start)?time(r.start):'')+'<small class="muted">'+escape(r.text).slice(0,180)+'</small></span></button>').join('');
}
export function sourceHealthHTML(project,search=''){
 const report=transcriptCoverage(project);
 const gaps=report.sources.flatMap(r=>r.missingTranscriptIntervals.map(g=>({...g,name:r.sourceName})));
 const rows=report.sources.map(r=>{
  const status=r.wordCount?(r.missingTranscriptIntervals.length?'Review gaps':'Timed words present'):'No timed transcript';
  return '<article><b>'+escape(r.sourceName)+'</b><p class="tiny muted">'+r.wordCount+' timed words · '+r.estimatedTimingWords+' estimated · '+r.missingTranscriptIntervals.length+' gaps of at least 12s · '+escape(status)+'</p>'+
  (r.invalidTimingWords||r.outOfRangeWords?'<p class="tiny">Invalid/out-of-range timestamps: '+(r.invalidTimingWords+r.outOfRangeWords)+'</p>':'')+
  (r.savedProcessing?'<p class="tiny muted">Saved ASR status: '+escape(r.savedProcessing.status)+' · next at '+time(r.savedProcessing.nextAt)+'</p>':'')+
  '</article>';
 }).join('');
 return '<div class="separator"></div><details id="sourceHealthDetails"><summary><b>Source health & project-wide search</b> · '+report.gapCount+' transcript gaps</summary>'+
  '<p class="tiny muted">These checks use REAL saved original-source timestamps. A blank transcript interval may contain silence, speech, music or gameplay: nothing is labeled silent without listening. Exported reports cannot claim a completed audio/video inspection.</p>'+
  '<p class="tiny muted">'+report.sourceCount+' sources · '+report.totalWordCount+' timed words · '+report.invalidTimeCount+' invalid/out-of-range timestamps · '+gaps.length+' displayed gaps.</p>'+
  '<div class="production-list">'+(rows||'<p>No sources imported yet.</p>')+'</div>'+
  '<button type="button" class="full" id="toolsExportSourceHealth">Download source coverage report (JSON)</button>'+
  '<button type="button" class="full" id="toolsMarkTranscriptGaps" '+(gaps.length?'':'disabled')+'>Bookmark transcript gaps that intersect timeline footage</button>'+
  '<p class="tiny muted">Review bookmarks are placed only where your actual edited source interval covers a transcript gap. No source files or subtitles are rewritten.</p>'+
  '<label class="field">Search project evidence<input id="toolsEvidenceSearch" value="'+escape(search)+'" placeholder="Speaker, quote, source, story, marker..."></label>'+
  '<div id="toolsEvidenceResults" class="production-list">'+evidenceSearchHTML(project,search)+'</div>'+
  '<button type="button" class="full" id="toolsExportEvidenceSearch" '+(String(search||'').trim()?'':'disabled')+'>Download search matches (JSON)</button>'+
  '</details>';
}
