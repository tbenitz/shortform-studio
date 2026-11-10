import {escapeHTML as esc,fmt} from './model.js';
import {inspectConnectedStory} from './story-proof.js';
const shorten=(value,max=360)=>String(value||'').slice(0,max);
/** Visible only after the editor has selected actual source intervals.
 * Every button in this panel has a corresponding working handler. */
export function sourceStoryWorkbenchHTML(project,moments,{search='',sort='source',speaker='all',onlyPlayable=false}={}, {open=false}={}){
 const allAssets=project.assets||[];
 const m=(moments||[]).filter(x=>x&&x.assetId);
 const audit=inspectConnectedStory(m,project.words,allAssets);
 const options=[...new Set((project.words||[]).map(w=>w.speaker||'Speaker 1'))].sort();
 const problems=audit.cuts.flatMap((c,i)=>c.issues.map(x=>({i,source:c.sourceName||c.assetId,...x})));
 const riskSummary=audit.cutCount+' actual source cut(s) · '+fmt(audit.totalSeconds)+' selected · '+
  audit.issueCounts.error+' source error(s), '+audit.issueCounts.warning+' warning(s), '+audit.issueCounts.review+' context review(s).';
 const details=audit.cuts.map((c,i)=>{
  const actual=(project.assets||[]).find(a=>a.id===c.assetId);
  const dialogue=c.transcript.selected||'(No original-source dialogue is aligned to this cut)';
  return '<article class="story-evidence-card">'+
   '<div class="row between wrap"><strong>Cut '+(i+1)+' · '+esc(actual?.name||'Missing original')+'</strong><span class="pill">'+fmt(c.start)+'–'+fmt(c.end)+'</span></div>'+
   '<p class="tiny muted">Source ID: '+esc(c.assetId)+' · '+fmt(c.duration)+' · '+(c.ready?'Original connected':'Relink / inspect original')+'</p>'+
   '<details><summary>Actual dialogue and surrounding source context</summary>'+
   (c.transcript.before?'<p class="tiny muted"><b>Before:</b> '+esc(shorten(c.transcript.before))+'</p>':'')+
   '<pre class="humor-dialogue">'+esc(shorten(dialogue,1000))+'</pre>'+
   (c.transcript.after?'<p class="tiny muted"><b>After:</b> '+esc(shorten(c.transcript.after))+'</p>':'')+'</details>'+
   '<p class="tiny muted">'+esc(c.evidence.join(' · ')||'No evidence beyond source interval metadata')+'</p>'+
   c.issues.map(issue=>'<p class="tiny"><b>'+esc(issue.kind.toUpperCase())+' — '+esc(issue.code)+'</b> '+esc(issue.why)+'</p>').join('')+'</article>';
 }).join('');
 const selectedCount=m.length;
 return '<details class="story-workbench" id="storyWorkbench" '+(open?'open':'')+'><summary>Review, refine and export selected story ('+selectedCount+' clips)</summary>'+
  '<p class="tiny muted">Real source-backed editorial audit. This checks timed transcript text and edit geometry, NOT actual visual action, tone of voice or whether a joke is funny.</p>'+
  '<p class="tiny"><b>'+esc(riskSummary)+'</b></p>'+
  '<div class="row wrap">'+
   '<button id="humorSelectVisible" class="small">Select all displayed clips</button>'+
   '<button id="humorClearSelection" class="small" '+(selectedCount?'':'disabled')+'>Clear selection</button>'+
   '<button id="humorSortChronological" class="small" '+(selectedCount>1?'':'disabled')+'>Put cuts in source order</button>'+
   '<button id="humorRemoveDuplicates" class="small" '+(selectedCount>1?'':'disabled')+'>Remove repeat footage</button></div>'+
  '<p class="tiny muted">Context changes use actual timed SRT words and never fabricate media. Review adjusted in/out points before exporting.</p>'+
  '<div class="row wrap">'+
   '<button id="humorAddSetup" class="small" '+(selectedCount?'':'disabled')+'>Include earlier dialogue</button>'+
   '<button id="humorAddPayoff" class="small" '+(selectedCount?'':'disabled')+'>Include later reaction</button>'+
   '<button id="humorTrimToWords" class="small" '+(selectedCount?'':'disabled')+'>Trim empty edges</button></div>'+
  '<div class="row wrap"><button id="humorExportEvidence" class="small" '+(selectedCount?'':'disabled')+'>Download source evidence</button>'+
   '<button id="humorExportEditPlan" class="small" '+(selectedCount?'':'disabled')+'>Download detailed edit plan</button></div>'+
  '<div class="stack">'+details+'</div>'+
  (problems.length?'<p class="tiny muted">These findings are review prompts, not proof a proposed joke or action is good. No automatic rejection occurs.</p>':'<p class="tiny muted">No structural issues were detected in these intervals. Watch the actual footage to confirm story quality.</p>')+
  '</details>';
}
export function storyDiscoveryFiltersHTML(moments,assets,{search='',sort='source',speaker='all',onlyPlayable=false}={}, {open=false}={}){
 const names=[...new Set((moments||[]).flatMap(m=>String(m.dialogue||'').split('\n').filter(x=>/^[\w .'-]{2,50}:/.test(x)).map(x=>x.slice(0,x.indexOf(':')))))].slice(0,50);
 const options=[['source','Original source time'],['score','Highest humor match score'],['longest','Longest conversation'],['shortest','Shortest conversation']];
 return '<details class="humor-advanced" id="humorFiltersPanel" '+(open?'open':'')+'><summary>Find a specific joke / filter results</summary>'+
  '<label class="field">Search actual spoken text<input id="humorSearch" value="'+esc(search)+'" placeholder="e.g. helicopter, prank, funny banter"></label>'+
  '<label class="field">Sort clips<select id="humorSort">'+options.map(([v,label])=>'<option value="'+v+'" '+(sort===v?'selected':'')+'>'+label+'</option>').join('')+'</select></label>'+
  '<label class="field">Named speaker<select id="humorSpeaker"><option value="all">All transcript speakers</option>'+names.map(x=>'<option value="'+esc(x)+'" '+(speaker===x?'selected':'')+'>'+esc(x)+'</option>').join('')+'</select></label>'+
  '<label class="checkrow"><input id="humorOnlyPlayable" type="checkbox" '+(onlyPlayable?'checked':'')+'>Show only clips with connected original video</label></details>';
}
export function filterStorySuggestions(moments,assets,{search='',sort='source',speaker='all',onlyPlayable=false}={}){
 const names=new Map((assets||[]).map(a=>[a.id,a]));
 const q=String(search||'').trim().toLocaleLowerCase();
 const list=(moments||[]).filter(m=>
  (!q||[m.dialogue,m.topic,m.reason,names.get(m.assetId)?.name].some(t=>String(t||'').toLocaleLowerCase().includes(q)))&&
  (speaker==='all'||String(m.dialogue||'').includes(speaker+':'))&&
  (!onlyPlayable||!!names.get(m.assetId)?.url));
 if(sort==='score')list.sort((a,b)=>(b.score||0)-(a.score||0)||a.start-b.start);
 else if(sort==='longest')list.sort((a,b)=>(b.end-b.start)-(a.end-a.start));
 else if(sort==='shortest')list.sort((a,b)=>(a.end-a.start)-(b.end-b.start));
 else list.sort((a,b)=>a.start-b.start||a.assetId.localeCompare(b.assetId));
 return list;
}
