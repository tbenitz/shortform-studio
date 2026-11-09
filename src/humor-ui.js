import {escapeHTML as esc,fmt} from './model.js';
import {DEFAULT_HUMOR_INSTRUCTIONS} from './humor-studio.js';

export function humorStudioHTML(p,{status='',busy=false,scope='all',minScore=50,maxCalls=16,displayLimit=100,instructions=null}={}){
 const assets=(p.assets||[]).filter(a=>a.type==='video'||a.type==='audio');
 const moments=(p.humorMoments||[]).filter(m=>scope==='all'||m.assetId===scope).slice().sort((a,b)=>a.start-b.start||a.assetId.localeCompare(b.assetId));
 const shown=moments.slice(0,displayLimit);
 const order=Array.isArray(p.compilationOrder)?p.compilationOrder:[];
 const byId=new Map((p.humorMoments||[]).map(m=>[m.id,m]));
 const chosen=order.map(id=>byId.get(id)).filter(Boolean);
 const totals=chosen.reduce((n,m)=>n+(m.end-m.start),0);
 const lookup=new Map(assets.map(a=>[a.id,a]));
 const options=assets.map(a=>'<option value="'+esc(a.id)+'" '+(scope===a.id?'selected':'')+'>'+esc(a.name)+'</option>').join('');
 const rows=shown.map(m=>{
  const a=lookup.get(m.assetId),checked=order.includes(m.id);
  const missing=!a?.url;
  return '<article class="humor-card '+(checked?'chosen':'')+'"><div class="row between wrap"><b>'+esc(a?.name||'Missing source')+' · '+fmt(m.start)+'–'+fmt(m.end)+'</b><small>'+Math.round(m.score||0)+'/100 · '+esc(m.source||'transcript')+'</small></div>'+
   '<p class="tiny muted">'+esc(m.reason||'Review the original footage')+'</p><details><summary>Read original dialogue</summary><pre class="humor-dialogue">'+esc(m.dialogue||'')+'</pre></details>'+
   '<div class="row wrap"><button class="small" data-humor-preview="'+esc(m.id)+'">▶ Preview original clip</button>'+
   '<button class="small '+(checked?'primary':'')+'" data-humor-toggle="'+esc(m.id)+'" aria-pressed="'+checked+'">'+(checked?'✓ In compilation':'＋ Add to compilation')+'</button>'+
   (missing?'<small class="warning">Original file needs reconnecting</small>':'')+'</div></article>';
 }).join('')||'<p class="muted tiny">No funny dialogue candidates yet. Import a timed transcript, run Find possible jokes, or use optional AI review. The app does not invent clips when the transcript has no matches.</p>';
 const chosenRows=chosen.map((m,i)=>'<article><div class="row between wrap"><span><b>'+(i+1)+'.</b> '+esc(lookup.get(m.assetId)?.name||'Missing source')+' · '+fmt(m.start)+'–'+fmt(m.end)+'</span><span class="row tight"><button class="small" data-compilation-up="'+esc(m.id)+'" '+(i===0?'disabled':'')+' title="Move earlier">↑</button><button class="small" data-compilation-down="'+esc(m.id)+'" '+(i===chosen.length-1?'disabled':'')+' title="Move later">↓</button><button class="small danger" data-humor-toggle="'+esc(m.id)+'" title="Remove from compilation">×</button></span></div></article>').join('')||'<p class="tiny muted">Choose clips above to populate this compilation. It will not change your current timeline until you click Build.</p>';
 return '<div class="info"><b>Humor Finder + Compilation Builder</b><br>Find real transcript moments containing funny banter, jokes and group reactions. Local keyword scanning gives rough candidates; optional AI reads actual SRT words for more nuanced humor. Both need your review of the original footage.</div>'+
 '<div class="separator"></div><h3>1. Find funny dialogue</h3>'+
 '<p class="tiny muted">Import a source video plus its timed SRT in Transcript first. The time-coded transcript provides exact source links. Original words are retained; no AI dialogue rewrites.</p>'+
 '<label class="field">Recordings to search<select id="humorScope"><option value="all" '+(scope==='all'?'selected':'')+'>All source transcripts</option>'+options+'</select></label>'+
 '<label class="field">Local filter strictness (0 to 100)<input type="number" min="0" max="100" id="humorMinScore" value="'+Number(minScore)+'"></label>'+
 '<label class="field">Humor extraction instructions<textarea rows="4" id="humorInstructions">'+esc(instructions===null?(p.humorInstructions||DEFAULT_HUMOR_INSTRUCTIONS):instructions)+'</textarea></label>'+
 '<button class="primary full" id="humorFindLocal" '+(busy?'disabled':'')+'>Find possible jokes (local, no API)</button>'+
 '<p class="tiny muted">Local mode searches dialogue wording, laughter and conversational exchanges. It cannot reliably understand sarcasm or hidden humor. For contextual judgment use the real AI review below.</p>'+
 '<label class="field">Maximum AI requests (1–150; each may cost money)<input id="humorMaxCalls" type="number" value="'+Number(maxCalls)+'" min="1" max="150"></label>'+
 '<button class="full" id="humorFindAI" '+(busy?'disabled':'')+'>Review transcript with configured AI Director provider</button>'+
 '<button class="small danger full" id="humorCancel" '+(busy?'':'disabled')+'>Cancel AI humor scan</button>'+
 '<p class="tiny muted">AI sends the selected timed transcript text to your configured HTTPS provider after a confirmation. It processes real transcript chunks, not video frames. Each AI output is checked against actual transcript indices. Partial scans explicitly report incomplete coverage; do not treat the results as exhaustive until all windows are processed.</p>'+
 '<div id="humorStatus" class="tiny muted" role="status">'+esc(status||((p.humorScanInfo?.totalBatches)?'AI scan: '+p.humorScanInfo.processedBatches+'/'+p.humorScanInfo.totalBatches+' source windows processed'+(p.humorScanInfo.complete?' (complete)':' (INCOMPLETE)'):'Ready to find funny dialogue'))+'</div>'+
 '<div class="separator"></div><h3>2. Review original moments ('+moments.length+')</h3>'+
 '<p class="tiny muted">Use Preview to hear/watch the real recording before choosing; false positives should be skipped. The order shown is source chronology, not a pre-selected montage.</p>'+
 '<div class="row wrap"><button id="humorDownloadAll" class="small" '+(moments.length?'':'disabled')+'>Download ALL raw dialogue (.txt)</button><button id="humorDownloadSelected" class="small" '+(chosen.length?'':'disabled')+'>Download SELECTED raw dialogue (.txt)</button></div>'+
 '<div class="humor-list">'+rows+'</div>'+
 (shown.length<moments.length?'<button class="full" id="humorMore">Show more moments ('+(moments.length-shown.length)+' remaining)</button>':'')+
 '<div class="separator"></div><h3>3. Build your compilation ('+chosen.length+' clips · '+fmt(totals)+')</h3>'+
 '<p class="tiny muted">Click + Add on moments you want. Move the selected clips up/down to choose playback order. This order, not AI confidence or source chronology, controls the compilation.</p>'+
 '<div class="humor-list">'+chosenRows+'</div>'+
 '<label class="field">Where to put your compilation<select id="compilationMode"><option value="replace">Replace current editor timeline after confirmation</option><option value="append">Append selected clips to end of editor timeline</option></select></label>'+
 '<button class="primary full" id="humorBuild" '+(chosen.length&&!busy?'':'disabled')+'>Build compilation in Editor</button>'+
 '<p class="tiny muted">All new cuts reference the original video and keep the project subtitle mapping. Save the project and use Export → Render MP4 to download the finished compilation. Nothing is exported automatically.</p>';
}
