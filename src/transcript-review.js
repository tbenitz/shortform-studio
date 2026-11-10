/**
 * Source-grounded caption proofreading and timestamp repair.
 * Do not call a guessed duration "speech" or change original media.
 */
import {transcriptCoverage} from './source-health.js';
const html = v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const finite = n=>Number.isFinite(Number(n));
const round = n=>Math.round(Number(n)*1000)/1000;
const sourceWords=(p,id)=>(p?.words||[]).filter(w=>w?.assetId===id&&finite(w.start)&&finite(w.end))
  .sort((a,b)=>a.start-b.start||a.end-b.end);
export function reviewWordRows(project,assetId,{query='',onlyFlagged=true,limit=80}={}){
 const text=String(query||'').toLocaleLowerCase().trim(),list=sourceWords(project,assetId),asset=(project.assets||[]).find(a=>a.id===assetId);
 return list.filter(w=>{
  const flagged=!['model-word','manual-reviewed'].includes(w.timing)||w.confidence!=null&&Number(w.confidence)<.6||w.reviewNeeded||
   Number(w.start)<0||Number(w.end)<=Number(w.start)||!!(asset?.duration&&Number(w.end)>asset.duration+.1);
  return (!onlyFlagged||flagged)&&(!text||[w.text,w.speaker,w.timing].some(v=>String(v||'').toLocaleLowerCase().includes(text)));
 }).slice(0,Math.max(1,Math.min(200,limit))).map(w=>({...w,reviewNeeded:!!w.reviewNeeded}));
}
export function repairTimedWord(project,wordId,patch){
 const p=structuredClone(project);
 const w=p.words.find(x=>x.id===wordId);if(!w)throw Error('Source transcript word not found; reselect it.');
 const asset=p.assets.find(x=>x.id===w.assetId);if(!asset)throw Error('Original transcript source is missing.');
 const text=String(patch.text??w.text).replace(/[\r\n]+/g,' ').trim().slice(0,160);
 const speaker=String(patch.speaker??w.speaker??'Speaker 1').replace(/[\r\n]+/g,' ').trim().slice(0,70);
 const start=Number(patch.start??w.start),end=Number(patch.end??w.end);
 if(!text||!speaker)throw Error('Dialogue and speaker name must not be blank.');
 if(!Number.isFinite(start)||!Number.isFinite(end)||start<0||end<=start)
  throw Error('Use valid original-source start/end timestamps, with end after start.');
 if(asset.duration>0&&end>asset.duration+.1)throw Error('Word is past the original source duration.');
 w.text=text;w.speaker=speaker;w.start=round(start);w.end=round(end);
 w.reviewNeeded=false;w.timing='manual-reviewed';w.reviewedAt=Date.now();
 return p;
}
export function splitTimedWord(project,id){
 const p=structuredClone(project),at=p.words.findIndex(w=>w.id===id);if(at<0)throw Error('Timed word no longer exists.');
 const w=p.words[at],tokens=String(w.text||'').split(/\s+/).filter(Boolean);
 if(tokens.length!==2)throw Error('Split requires a two-word caption. Edit the phrase first if necessary.');
 const split=round((Number(w.start)+Number(w.end))/2);
 if(!(split>w.start&&w.end>split))throw Error('Clip is too short to split at this timestamp.');
 const first={...w,text:tokens[0],end:split,timing:'manual-reviewed',reviewNeeded:false};
 const second={...w,id:'manual-'+(globalThis.crypto?.randomUUID?.()||(''+Date.now()+'-'+Math.round(Math.random()*1e9))),text:tokens[1],start:split,timing:'manual-reviewed',reviewNeeded:false};
 p.words.splice(at,1,first,second);
 return p;
}
export function mergeTimedWord(project,id){
 const p=structuredClone(project),w=p.words.find(x=>x.id===id);
 if(!w)throw Error('Caption word not found.');
 const next=sourceWords(p,w.assetId).find(x=>x.id!==id&&x.start>=w.end-.05);
 if(!next||next.start-w.end>1||String(next.speaker||'')!==String(w.speaker||''))
  throw Error('No adjacent word from the same speaker within one second.');
 w.text=String(w.text||'').trim()+' '+String(next.text||'').trim();
 w.end=round(next.end);w.timing='manual-reviewed';w.reviewNeeded=false;
 p.words=p.words.filter(x=>x.id!==next.id);
 return p;
}
export function transcriptReviewHTML(project,assetId,{query='',onlyFlagged=true}={}){
 const a=(project.assets||[]).find(x=>x.id===assetId),report=transcriptCoverage(project).sources.find(x=>x.assetId===assetId);
 const rows=reviewWordRows(project,assetId,{query,onlyFlagged,limit:65});
 const intervals=report?.recognizedIntervals||[],length=Math.max(.01,Number(a?.duration)||0);
 const bars=intervals.slice(0,300).map(({start,end})=>'<i title="Timed transcript from '+round(start)+'s to '+round(end)+'s" style="position:absolute;top:0;bottom:0;left:'+Math.max(0,Math.min(100,100*start/length))+'%;width:'+Math.max(.1,Math.min(100,100*(end-start)/length))+'%;background:#53bba2"></i>').join('');
 return '<details id="transcriptReviewPanel" class="story-workbench"><summary>Transcript coverage & word proofreading · '+(report?.estimatedTimingWords||0)+' estimated timestamps</summary>'+
 '<p class="tiny muted">Green = original-source intervals containing timed words. Empty = no timed transcript; this is NOT evidence of silence. Time correction changes captions only, never original recordings.</p>'+
 '<div role="img" aria-label="Timed transcript intervals" style="height:16px;border:1px solid #48536c;border-radius:4px;position:relative;overflow:hidden;background:#212d3a">'+bars+'</div>'+
 '<p class="tiny muted">'+(report?.wordCount||0)+' timed words · '+(report?.missingTranscriptIntervals.length||0)+' long gaps · '+(report?.invalidTimingWords||0)+' invalid timestamps</p>'+
 '<label class="field">Find caption text or speaker<input id="reviewWordSearch" value="'+html(query)+'" placeholder="Search original words…"></label>'+
 '<label class="checkrow"><input id="reviewOnlyFlagged" type="checkbox" '+(onlyFlagged?'checked':'')+'>Show only uncertain or unreviewed timings</label>'+
 '<p class="tiny muted">The first '+rows.length+' matching items are shown; choose a source, search or uncheck the filter to review other words. A model-word timestamp is not proof of correctness.</p>'+
 '<div id="reviewWordList" class="production-list">'+(rows.length?rows.map(w=>
 '<article class="review-word-row" data-review-word="'+html(w.id)+'">'+
 '<label class="field">Dialogue<input data-word-text maxlength="160" value="'+html(w.text)+'"></label>'+
 '<div class="row wrap"><label class="field">Start (source s)<input data-word-start type="number" min="0" step="0.001" value="'+round(w.start)+'"></label>'+
 '<label class="field">End (source s)<input data-word-end type="number" min="0" step="0.001" value="'+round(w.end)+'"></label></div>'+
 '<label class="field">Speaker<input data-word-speaker maxlength="70" value="'+html(w.speaker||'Speaker 1')+'"></label>'+
 '<small class="muted">Timing: '+html(w.timing||'unverified')+' · confidence '+(w.confidence==null?'not provided':html(w.confidence))+'</small>'+
 '<div class="row wrap"><button class="small primary" data-word-save="'+html(w.id)+'">Save correction</button><button class="small" data-word-split="'+html(w.id)+'">Split two words</button><button class="small" data-word-merge="'+html(w.id)+'">Merge next</button></div>'+
 '</article>').join(''):'<p class="tiny muted">No matching caption words. The source may not have a transcript yet.</p>')+'</div></details>';
}
