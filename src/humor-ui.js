import {escapeHTML as esc,fmt} from './model.js';
import {DEFAULT_HUMOR_INSTRUCTIONS} from './humor-studio.js';
import {findConnectedFunnyStories} from './humor-stories.js';
import {viewableHumorMoments,humorEvidence,humorReviewCounts} from './humor-review.js';
import {sourceStoryWorkbenchHTML,storyDiscoveryFiltersHTML,filterStorySuggestions} from './story-workbench-ui.js';

/** One intent, two actions: user should not configure an AI pipeline. */
export function humorStudioHTML(p,{status='',busy=false,scope='all',minScore=45,maxCalls=48,displayLimit=100,instructions=null,mode='clips',aiConfigured=false,filters={},reviewOpen=false,filterOpen=false,placement='replace'}={}){
 const sources=(p.assets||[]).filter(a=>a.type==='video'||a.type==='audio'),lookup=new Map(sources.map(a=>[a.id,a]));
 const all=viewableHumorMoments(p,{scope});
 const reviewCounts=humorReviewCounts(p);
 const order=Array.isArray(p.compilationOrder)?p.compilationOrder:[],byId=new Map((p.humorMoments||[]).map(m=>[m.id,m]));
 const visibleIds=new Set(all.map(x=>x.id));
 const selected=order.map(id=>byId.get(id)).filter(m=>m&&visibleIds.has(m.id)),selectedDuration=selected.reduce((n,m)=>n+m.end-m.start,0);
 const stories=findConnectedFunnyStories(all),filtered=filterStorySuggestions(all,sources,filters),shown=filtered.slice(0,displayLimit);
 const sourceOptions=sources.map(a=>'<option value="'+esc(a.id)+'" '+(scope===a.id?'selected':'')+'>'+esc(a.name)+'</option>').join('');
 const cards=shown.map(m=>{
  const a=lookup.get(m.assetId),chosen=order.includes(m.id),evidence=humorEvidence(m,a);
  return '<article class="humor-card '+(chosen?'chosen':'')+'">'+
   '<div class="row between wrap"><b>'+esc(a?.name||'Missing source')+' · '+fmt(m.start)+'–'+fmt(m.end)+'</b><small>'+Math.round(m.score||0)+'/100</small></div>'+
   '<details><summary>Read actual dialogue and why it was suggested</summary><pre class="humor-dialogue">'+esc(m.dialogue||'')+'</pre><p class="tiny muted"><b>'+esc(evidence.mode)+'</b> · Original source '+fmt(m.start)+'–'+fmt(m.end)+'<br>'+esc(m.reason||'No reason supplied')+'<br>'+esc(evidence.warning)+'</p></details>'+
   '<div class="row wrap"><button class="small" data-humor-preview="'+esc(m.id)+'">▶ Preview joke</button>'+
   '<button class="small '+(chosen?'primary':'')+'" data-humor-toggle="'+esc(m.id)+'" aria-pressed="'+chosen+'">'+(chosen?'✓ Selected':'＋ Add clip')+'</button><button class="small danger" data-humor-reject="'+esc(m.id)+'" title="Hide this bad suggestion from later scans">Not funny ×</button></div>'+
   (!a?.url?'<small class="warning">Reconnect the original video to preview and export</small>':'')+'</article>';
 }).join('')||'<p class="muted tiny">No matching conversations yet. Import a timed SRT transcript first; without real source dialogue the finder will not invent clips.</p>';
 const storyCards=stories.map((story,i)=>{
  const asset=lookup.get(story.assetId),parts=story.momentIds.map(id=>byId.get(id)).filter(Boolean);
  return '<article class="humor-card story-card"><div class="row between wrap"><b>'+esc(story.title)+'</b><span class="pill">'+story.cutCount+' related cuts · '+fmt(story.duration)+'</span></div>'+
   '<p class="tiny muted">'+esc(story.reason)+'</p><details><summary>Review the actual '+parts.length+' conversations</summary>'+
   parts.map((m,j)=>'<div class="metric"><span>'+(j+1)+'. '+fmt(m.start)+'–'+fmt(m.end)+'</span><button class="small" data-humor-preview="'+esc(m.id)+'">▶ Preview</button></div><pre class="humor-dialogue">'+esc(m.dialogue||'')+'</pre>').join('')+'</details>'+
   '<div class="row wrap"><button class="small" data-story-use="'+esc(story.id)+'">Select these cuts</button><button class="primary small" data-story-build="'+esc(story.id)+'">Build this funny story</button></div>'+
   (!asset?.url?'<small class="warning">Reconnect this source before playback or export</small>':'')+'</article>';
 }).join('')||'<p class="muted tiny">No verified connected storyline yet. We found '+all.length+' joke candidate(s), but not two distinct, non-overlapping exchanges sharing enough source-dialogue topic evidence. We will not paste unrelated jokes together and call them a story. Try a more complete SRT or review individual clips below.</p>';
 const selectedCards=selected.map((m,i)=>'<article><div class="row between wrap"><span><b>'+(i+1)+'.</b> '+esc(lookup.get(m.assetId)?.name||'Missing source')+' · '+fmt(m.start)+'–'+fmt(m.end)+'</span><span class="row tight"><button class="small" data-compilation-up="'+esc(m.id)+'" '+(i===0?'disabled':'')+'>↑</button><button class="small" data-compilation-down="'+esc(m.id)+'" '+(i===selected.length-1?'disabled':'')+'>↓</button><button class="small danger" data-humor-toggle="'+esc(m.id)+'">×</button></span></div></article>').join('')||'<p class="tiny muted">Choose a funny clip or a connected storyline above. Only the selected cuts go into the final compilation.</p>';
 const rejectionRows=(p.humorRejected||[]).slice().sort((a,b)=>(b.rejectedAt||0)-(a.rejectedAt||0)).slice(0,60).map(r=>'<article><div class="row between wrap"><span>'+esc(lookup.get(r.assetId)?.name||r.assetId)+' · '+fmt(r.start)+'–'+fmt(r.end)+'</span><button class="small" data-humor-restore="'+esc(r.id)+'">Restore suggestion</button></div><p class="tiny muted">'+esc(r.dialogue||'')+'</p></article>').join('');
 const rejectionSection='<details class="humor-advanced"><summary>Rejected funny moments ('+reviewCounts.storedRejections+') · undo rejections</summary><p class="tiny muted">Rejected moments remain recoverable in this project, but future scans will not bring back matching source intervals automatically.</p><div class="humor-list">'+(rejectionRows||'<p class="tiny muted">None rejected yet.</p>')+'</div></details>';
 const advanced='<details class="humor-advanced"><summary>Advanced options (optional)</summary>'+
  '<p class="tiny muted">The app automatically uses your configured AI Director key when available, otherwise it uses local transcript matching. Remote AI reads transcript text only and asks permission before sending it.</p>'+
  '<label class="field">Recordings<select id="humorScope"><option value="all" '+(scope==='all'?'selected':'')+'>All recordings</option>'+sourceOptions+'</select></label>'+
  '<label class="field">Custom humor instructions<textarea id="humorInstructions" rows="3">'+esc(instructions===null?(p.humorInstructions||DEFAULT_HUMOR_INSTRUCTIONS):instructions)+'</textarea></label>'+
  '<label class="field">Local matching strictness<input id="humorMinScore" type="number" min="0" max="100" value="'+Number(minScore)+'"></label>'+
  '<label class="field">Maximum paid AI batches<input id="humorMaxCalls" type="number" min="1" max="150" value="'+Number(maxCalls)+'"></label>'+
  '<button id="humorRescan" class="small full" '+(busy?'disabled':'')+'>Rescan transcript (new footage / updated SRT)</button>'+
  '<button id="humorFindAI" class="small full" '+(busy?'disabled':'')+'>Force AI review</button></details>';
 const top='<div class="info"><b>Funny Clips & Stories</b><br>Find real jokes, funny conversations and reactions in your video subtitles. Preview the original footage, then choose individual moments or make a connected story about the same subject.</div>'+
  '<div class="separator"></div><h3>What do you want to make?</h3>'+
  '<div class="humor-choices"><button id="humorFindLocal" class="'+(mode==='clips'?'primary':'')+'" '+(busy?'disabled':'')+'>☺ Find Funny Clips<small>Separate jokes and funny conversations</small></button>'+
  '<button id="humorFindStory" class="'+(mode==='story'?'primary':'')+'" '+(busy?'disabled':'')+'>▥ Make a Funny Story<small>Connect related setup, banter and payoff</small></button></div>'+
  '<p class="tiny muted">SRT is the source of truth · '+(aiConfigured?'AI Director connected — contextual humor review':'No AI key detected — local transcript matching')+'. No random unrelated cuts.</p>'+
  advanced+storyDiscoveryFiltersHTML(all,sources,filters,{open:filterOpen})+
  '<div id="humorStatus" class="tiny muted" role="status">'+esc(status||((p.humorScanInfo?.totalBatches)?'Reviewed '+p.humorScanInfo.processedBatches+'/'+p.humorScanInfo.totalBatches+' transcript batches'+(p.humorScanInfo.complete?'':' — PARTIAL'):'Ready. Import a video and its SRT, then choose a button.'))+'</div>'+
  (busy?'<button id="humorCancel" class="small danger full">Cancel analysis</button>':'');
 const clipsSection='<div class="separator"></div><div class="row between wrap"><h3>Funny clips ('+filtered.length+' shown / '+all.length+' found)</h3><button class="small" id="humorDownloadAll" '+(all.length?'':'disabled')+'>Dialogue TXT</button></div>'+
  '<div class="humor-list">'+cards+'</div>'+
  (shown.length<filtered.length?'<button id="humorMore" class="full">Show more clips ('+(filtered.length-shown.length)+' left)</button>':'');
 const storySection='<div class="separator"></div><h3>Related funny storylines ('+stories.length+')</h3>'+
  '<p class="tiny muted">Every proposed storyline requires two or more non-overlapping clips from the same original recording, linked by actual recurring conversation topics. Stories are suggestions, not proof that every punchline lands.</p>'+
  '<div class="humor-list">'+storyCards+'</div><details><summary>Or choose individual moments manually ('+all.length+')</summary><div class="humor-list">'+cards+'</div></details>';
 const footer='<div class="separator"></div><h3>Your selection · '+selected.length+' cuts · '+fmt(selectedDuration)+'</h3>'+
  '<div class="humor-list">'+selectedCards+'</div>'+
  '<details><summary>How should this affect my current edit?</summary><label class="field">Placement<select id="compilationMode"><option value="replace" '+(placement==='replace'?'selected':'')+'>Replace current timeline (confirmation required)</option><option value="append" '+(placement==='append'?'selected':'')+'>Append to timeline</option></select></label></details>'+
  '<div class="row wrap"><button id="humorDownloadSelected" class="small" '+(selected.length?'':'disabled')+'>Selected dialogue TXT</button>'+
  '<button id="humorBuild" class="primary" '+(selected.length&&!busy?'':'disabled')+'>Build selected '+(selected.length===1?'clip':'compilation')+' in Editor</button></div>'+
  '<p class="tiny muted">The final video uses the selected source footage, not AI-created visuals. Edit the timeline and export to MP4 when ready.</p>';
 return top+(mode==='story'?storySection:clipsSection)+footer+sourceStoryWorkbenchHTML(p,selected,filters,{open:reviewOpen})+rejectionSection;
}
