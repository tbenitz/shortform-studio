import {uid,fmt,clamp,escapeHTML as esc,defaultSettings,newProject,validateProject,makeSegment,duration,mapWords,parseSRT,toSRT,timeWords,download,segmentAt} from './model.js';
import {saveProject,loadProject,saveMedia,loadMedia,deleteMedia,saveMediaHandle,loadMediaHandle,deleteMediaHandle,quota} from './storage.js';
import {generateCandidates,generateCandidatesBatched,remoteCandidates,semanticCandidates,utterances} from './director.js';
import {sourceCoverage,clipSignature,historyEntries,clipAnchor,MAX_DISCOVERY_CLIPS} from './director-coverage.js';
import {scanGameplay,GAMEPLAY_SCAN_VERSION} from './gameplay-analysis.js';
import {generatePvPHighlights} from './gameplay-director.js';
import {syncFromTranscripts,checkSynchronization} from './pov-sync.js';
import {buildMultiPovHighlights} from './pov-director.js';
import {reviewWithVision} from './pov-vision.js';
import {discoverVisionScouts,chooseFreshVisionScouts} from './pov-scout.js';
import {overlappingPovWindows,scopedScanFingerprint,validScopedScan} from './pov-scan.js';
import {interpretStoryBrief,selectEditorialStories} from './story-brief.js';
import {directorOutputMode,visibleDirectorCandidates as filterDirectorCandidates,directorResultCounts,usableAutoSync,isAssembledPovStory} from './director-mode.js';
import {parseEditorialDirection} from './director-intent.js';
import {planDirectorBatch,directorViewCandidates,assignDirectorBatch} from './director-batches.js';
import {reviewPvPWithAI} from './gameplay-review.js';
import {transcribe,retryGaps,reconcileWords} from './asr.js';
import {sourceToTimelineTime,appendLiveWords} from './live-captions.js';
import {subtitleOffset,projectSubtitleWordsToSource,relinkSynchronizationWarning,sourceTimestampAtProjectTime} from './subtitle-sync.js';
import {loadDirectorKey,saveDirectorKey,clearDirectorKey,directorKeyRemembered} from './credentials.js';
import {Renderer} from './renderer.js';
import {preflight,removeDeadAir} from './quality.js';
import {scanFaces} from './faces.js';
import {analyzeScenes} from './scenes.js';
import {inspectStory,alternateOpener} from './review.js';
import {previewSpeech,stopSpeech,availableVoices,synthesizeSpeech,suggestBridges} from './voice.js';
import {relabelSpeaker,speakerSummary,diarizeWithProvider,applySpeakerSegments} from './speakers.js';
import {entireSourceCut,selectedSourceCut,shouldAutoInsertMedia,sourceSecondsValue,possibleMissingSourceRelink} from './media-workflow.js';
import {projectAudit,cutSheetCSV,chaptersText,createSnapshot,sourceMatch,cleanMarkers,productionToolsHTML,toolSearchResultsHTML} from './production-tools.js';
import {saveSnapshot,loadSnapshot,deleteSnapshot,listSnapshots} from './storage.js';
const $=id=>document.getElementById(id),all=sel=>[...document.querySelectorAll(sel)],toast=(m,error=false)=>{const t=document.createElement('div');t.className='toast'+(error?' error':'');t.textContent=m;$('toastArea').append(t);setTimeout(()=>t.remove(),5000)};
let p=newProject(),tab='media',assets=new Map(),history=[],future=[],selectedUtt=null,searchTerm='',asrStop=false,asrBusy=false,renderBusy=false,providerKey=loadDirectorKey(),followWhisperCaptions=true,audioRecorder=null,audioChunks=[],recordStart=0,recordStartedAt=0,faceBusy=false,faceController=null,sceneBusy=false,sceneController=null,voiceKey='',diarizationKey='',timelinePixelsPerSecond=null,directorShown=48,directorHour='all',directorResultView='active',directorOutputPreference='auto',povReferenceChoice=null,povTargetChoice=null,povSyncStatus='',povStoryPacing='balanced',directorBusy=false,directorAbort=null,directorStatus='',gameplayBusy=false,gameplayAbort=null,gameplayStatus='';
let snapshotRecords=[],toolsSearch='',sessionActive=false,lastSavedInfo=null,sourceFavoritesOnly=false,directorFavoritesOnly=false,savedHandles=new Map(),restoreBusy=false;
const asset=id=>assets.get(id)||p.assets.find(a=>a.id===id);
const media=id=>assets.get(id)?.file;
const engine=new Renderer(p,asset,toast);
engine.onTick=t=>{$('timeDisplay').textContent=`${fmt(t)} / ${fmt(duration(p))}`;$('playhead').max=Math.max(.01,duration(p));$('playhead').value=String(t);$('playButton').textContent=engine.playing?'Ⅱ':'▶';updateTimelineCursor(t)};
const clone=()=>structuredClone(p);
function commit(label='Updated'){sessionActive=true;history.push(clone());if(history.length>60)history.shift();future=[];p.modifiedAt=Date.now();setStatus(label)}
let saving;
function setStatus(label='Saved'){p.modifiedAt=Date.now();$('saveStatus').textContent=label;$('statusLine').textContent=`${p.assets.length} sources · ${p.segments.length} video cuts · ${fmt(duration(p))}`;$('footerInfo').textContent=label;if(sessionActive&&p.settings.autoSave&&!asrBusy){clearTimeout(saving);saving=setTimeout(()=>save(false),1000)}}
async function save(notify=true){try{sessionActive=true;const disk={...p,assets:p.assets.map(({url,file,...rest})=>rest)};await saveProject(disk);lastSavedInfo={id:disk.id,name:disk.name,modifiedAt:disk.modifiedAt,assets:disk.assets.length};refreshLastProjectButton();$('saveStatus').textContent='Saved locally';if(notify)toast('Project metadata saved to IndexedDB')}catch(e){toast(`Save failed: ${e.message}`,true)}}
function draw(){engine.setProject(p);$('previewHint').classList.toggle('hidden',p.segments.length>0);$('projectName').value=p.name;$('aspectSelect').value=p.settings.aspect;$('toggleCaptions').textContent=p.settings.captionOn?'CC On':'CC Off';$('timeDisplay').textContent=`${fmt(engine.time)} / ${fmt(duration(p))}`;$('playhead').max=Math.max(.01,duration(p));$('playhead').value=String(engine.time);renderAssets();renderTimeline();renderInspector();syncSourceRange();setStatus('Ready')}
function update(){engine.setProject(p);$('previewHint').classList.toggle('hidden',p.segments.length>0);engine.onTick(engine.time);renderAssets();renderTimeline();renderInspector();setStatus('Edited')}
function undo(){if(!history.length)return;sessionActive=true;engine.pause();future.push(clone());p=history.pop();update()}
function redo(){if(!future.length)return;sessionActive=true;engine.pause();history.push(clone());p=future.pop();update()}
function renderAssets(){
 const shown=sourceFavoritesOnly?p.assets.filter(a=>a.favorite):p.assets;
 const list=$('assetsList');
 list.innerHTML=shown.length?shown.map(a=>`<div class="asset-entry"><button class="asset ${p.selectedAsset===a.id?'selected':''}" data-asset="${esc(a.id)}" title="${esc(a.name)}"><div class="thumb">${a.type==='video'?'▣':a.type==='audio'?'♫':'▧'}</div><div class="details"><span class="name">${esc(a.name)}</span><span class="sub">${fmt(a.duration)} · ${a.url?'Ready':'Relink file'} · ${(a.size/1048576).toFixed(1)} MB</span></div></button><button class="favorite-toggle small ${a.favorite?'is-favorite':''}" data-source-fav="${esc(a.id)}" aria-pressed="${!!a.favorite}" title="${a.favorite?'Remove source from favorites':'Favorite this source'}">${a.favorite?'★':'☆'}</button></div>`).join(''):sourceFavoritesOnly?'<p class="empty">No favorite source files yet. Show all sources, then click ☆ to save favorites.</p>':'<p class="empty">Your media will appear here.</p>';
 list.querySelectorAll('[data-asset]').forEach(b=>b.onclick=()=>{p.selectedAsset=b.dataset.asset;syncSourceRange();renderAssets();renderInspector()});
 list.querySelectorAll('[data-source-fav]').forEach(b=>b.onclick=()=>{
  const a=p.assets.find(x=>x.id===b.dataset.sourceFav);if(!a)return;
  commit('Updated source favorite');a.favorite=!a.favorite;update();toast(a.favorite?'Source added to favorites':'Source removed from favorites');
 });
 const button=$('favoriteSourcesFilter');
 if(button){button.textContent=(sourceFavoritesOnly?'★ Favorites only':'☆ Favorites')+' ('+p.assets.filter(a=>a.favorite).length+')';button.setAttribute('aria-pressed',String(sourceFavoritesOnly))}
}
function renderTimeline(){const total=duration(p),scroller=$('timelineScroller'),available=Math.max(280,scroller.clientWidth-25),width=Math.max(available,Math.round(total*(timelinePixelsPerSecond??available/Math.max(.01,total))));for(const id of ['videoTrack','captionTrack','audioTrack','ruler'])$(id).style.width=`${width}px`;const video=$('videoTrack');video.innerHTML=p.segments.map((s,i)=>{const a=asset(s.assetId),len=(s.end-s.start)/(s.speed||1),pixel=Math.max(5,(len/Math.max(.01,total))*width),html=`<div class="clip ${p.selectedSegment===s.id?'selected':''}" style="flex:0 0 ${pixel}px;min-width:0" draggable="true" data-seg="${s.id}" title="${esc(a?.name||'Missing source')} ${fmt(s.start)}-${fmt(s.end)}"><span>${i+1} · ${esc(a?.name||'Missing')} · ${fmt(len)}</span></div>`;return html}).join('');video.querySelectorAll('[data-seg]').forEach(b=>{b.onclick=()=>{p.selectedSegment=b.dataset.seg;renderTimeline();renderInspector()};b.ondblclick=()=>engine.seek(offsetOf(b.dataset.seg));b.ondragstart=e=>e.dataTransfer.setData('text/segment',b.dataset.seg);b.ondragover=e=>e.preventDefault();b.ondrop=e=>{e.preventDefault();const sourceId=e.dataTransfer.getData('text/segment'),targetId=b.dataset.seg;if(!sourceId||sourceId===targetId)return;commit('Reordered');const x=p.segments.findIndex(s=>s.id===sourceId),y=p.segments.findIndex(s=>s.id===targetId);if(x<0||y<0)return;const [item]=p.segments.splice(x,1);p.segments.splice(y,0,item);update()}});
 const words=mapWords(p);$('captionTrack').innerHTML=words.length?`<div class="clip caption" style="flex:1"><span>${words.length} timed words</span></div>`:'';$('audioTrack').innerHTML=p.audio.map(a=>`<div class="clip audio ${p.selectedAudio===a.id?'selected':''}" data-audio="${a.id}" style="flex:${Math.max(.3,a.duration)} 1 0"><span>${esc(asset(a.assetId)?.name||'Audio')} · ${fmt(a.start)}</span></div>`).join('');$('audioTrack').querySelectorAll('[data-audio]').forEach(b=>b.onclick=()=>{p.selectedAudio=b.dataset.audio;p.selectedSegment=null;renderTimeline();renderInspector()});$('timelineSummary').textContent=`${p.segments.length} clips · ${fmt(total)} · ${p.audio.length} audio overlays`;const ticks=$('ruler'),count=Math.min(30,Math.max(6,Math.round(width/110)));ticks.innerHTML=Array.from({length:count},(_,i)=>`<span>${fmt(total*i/(count-1))}</span>`).join('')+'<i id="timelineCursor" aria-hidden="true"></i>';ticks.onclick=e=>{if(!total)return;const rect=ticks.getBoundingClientRect();engine.seek(Math.max(0,Math.min(total,(e.clientX-rect.left)/rect.width*total)))};const timelineMarkers=cleanMarkers(p.markers,total);ticks.insertAdjacentHTML('beforeend',timelineMarkers.map(m=>'<button class="timeline-marker" aria-label="'+esc(m.kind+': '+m.label)+'" title="'+esc(m.label)+' · '+fmt(m.time)+'" data-marker-timeline="'+esc(m.id)+'" data-kind="'+esc(m.kind)+'" style="left:'+Math.max(0,Math.min(100,100*m.time/Math.max(.01,total)))+'%"></button>').join(''));ticks.querySelectorAll('[data-marker-timeline]').forEach(b=>b.onclick=e=>{e.stopPropagation();const marker=timelineMarkers.find(m=>m.id===b.dataset.markerTimeline);if(marker)engine.seek(marker.time)});updateTimelineCursor(engine.time)}
function updateTimelineCursor(time){const cur=$('timelineCursor');if(cur)cur.style.left=`${100*time/Math.max(.01,duration(p))}%`;}
const offsetOf=id=>{let t=0;for(const s of p.segments){if(s.id===id)break;t+=(s.end-s.start)/(s.speed||1)}return t};
const field=(label,name,value,type='text',opts=null)=>`<label class="field">${esc(label)}${opts?`<select data-setting="${name}">${opts.map(o=>`<option value="${esc(o[0])}" ${String(value)===String(o[0])?'selected':''}>${esc(o[1])}</option>`).join('')}</select>`:`<input data-setting="${name}" type="${type}" ${type==='range'?(name==='zoom'?'min="0.5" max="3" step="0.05"':name==='captionSize'?'min="16" max="100"':name==='captionPosition'?'min="15" max="95"':'min="0" max="100"'):''} ${type==='checkbox'?(value?'checked':''):`value="${esc(value)}"`}>`}</label>`;
const opts=(...names)=>names.map(v=>[v,v]);
function settingSection(heading,html){return `<h3 class="section-title">${heading}</h3>${html}<div class="separator"></div>`}
function renderInspector(){const target=$('inspectorContent');$('inspectorTitle').textContent=({media:'Media controls',transcript:'Transcription',director:'AI Director',editor:'Clip editor',export:'Export studio',settings:'Studio settings',tools:'Production Tools'})[tab];$('inspectorMode').textContent=tab.toUpperCase();let html='';
 if(tab==='media'){const a=asset(p.selectedAsset);html=`<div class="info">Import several recordings or audio tracks. Files are processed on-device. You can work offline after loading the app and models.</div><div class="separator"></div>`+(a?`<h3>${esc(a.name)}</h3><div class="metric"><span>Duration</span><b>${fmt(a.duration)}</b></div><div class="metric"><span>Dimensions</span><b>${a.width||'—'} × ${a.height||'—'}</b></div><div class="metric"><span>File size</span><b>${(a.size/1048576).toFixed(1)} MB</b></div><div class="metric"><span>Local availability</span><b>${a.url?'Ready':'Missing / relink'}</b></div><div class="separator"></div>${a.type==='video'&&a.url?`<label class="field">Source preview (scrub the entire recording)<video id="sourcePreview" controls playsinline preload="metadata" src="${esc(a.url)}" style="display:block;width:100%;max-height:200px;background:#090d13;margin-top:8px"></video></label><div class="row tight"><button id="markIn" class="small">Set In from preview</button><button id="markOut" class="small">Set Out from preview</button></div><p class="tiny muted" style="margin-top:8px">Mark any range, or add the whole source using the button beside the library.</p><div class="separator"></div>`:''}${a.type==='video'?`<button id="scanFaces" class="full" ${faceBusy?'disabled':''}>${faceBusy?'Scanning frames…':'◎ Analyze faces for smart crop'}</button><p class="tiny muted">${(p.faceTracks?.[a.id]||[]).length} source-frame detections stored. Faces stay on this device.</p><button id="cancelFaceScan" ${faceBusy?'':'disabled'}>Cancel face scan</button><button id="scanScenes" class="full" ${sceneBusy?'disabled':''}>${sceneBusy?'Scanning video…':'◫ Detect scene changes'}</button><p class="tiny muted">${(p.sceneTracks?.[a.id]||[]).length} detected scene boundaries. Select a boundary to set source In/Out.</p><div class="stack" style="max-height:150px;overflow:auto">${(p.sceneTracks?.[a.id]||[]).slice(0,120).map((shot,i,all)=>`<button class="small" data-scene-time="${shot.time}" data-scene-end="${(all[i+1]?.time??a.duration).toFixed(2)}">Shot ${i+1} · ${fmt(shot.time)}</button>`).join('')}</div><button id="cancelSceneScan" ${sceneBusy?'':'disabled'}>Cancel scene scan</button>`:''}<button id="removeAsset" class="danger full">Remove this source</button>`:'<p class="muted">Choose an imported source to inspect its properties.</p>')}
 if(tab==='transcript'){const a=asset(p.selectedAsset);const u=utterances(p.words.filter(w=>w.assetId===p.selectedAsset));const filtered=searchTerm?u.filter(x=>x.text.toLowerCase().includes(searchTerm.toLowerCase())):u;const chosen=u.find(x=>selectedUtt&&x.assetId===selectedUtt.assetId&&Math.abs(x.start-selectedUtt.start)<.02)||u[0];const saved=p.transcriptProgress?.[p.selectedAsset];html=`<div class="info">Transcription feeds every AI Director proposal and subtitle. Use an SRT/VTT file, local Whisper, or paste text manually. Speaker labels are editable. Optional hosted diarization is available; uploading audio requires your explicit action.</div><div class="separator"></div><label class="field">Transcript source<select id="transcriptAsset">${p.assets.map(x=>`<option value="${x.id}" ${x.id===p.selectedAsset?'selected':''}>${esc(x.name)}</option>`).join('')}</select></label><div class="row"><button id="transcribeBtn" class="primary" ${!a||asrBusy?'disabled':''}>${asrBusy?'Processing…':saved?.status!=='complete'&&saved?.nextAt>0?'Resume from '+fmt(saved.nextAt):'Run local Whisper'}</button><button id="cancelAsr" ${!asrBusy?'disabled':''}>Cancel</button></div><div id="asrStatus" class="tiny muted" style="padding:8px 0">${asrBusy?'Processing':saved?.nextAt?`${esc(saved.status||'Paused')} · ${fmt(saved.nextAt)} / ${fmt(saved.total||a?.duration||0)} processed and saved`:'Whisper runs locally; long videos are decoded in small windows, with resumable checkpoints.'}</div>${p.words.filter(w=>w.assetId===p.selectedAsset&&w.timing==='estimated').length?`<div class="info">${p.words.filter(w=>w.assetId===p.selectedAsset&&w.timing==='estimated').length} words have estimated timestamps (the model lacked attention-based alignment). Subtitle timing can be refined manually; wording is transcribed normally.</div>`:''}<div class="progress"><i id="asrProgress"></i></div><div class="info" style="margin-top:8px"><strong>Live Whisper subtitles</strong><div id="liveCaptionPreview" aria-live="polite" style="font-size:14px;margin:8px 0;min-height:24px">${esc(p.words.filter(w=>w.assetId===p.selectedAsset).slice(-12).map(w=>w.text).join(' ')||'Captions will appear as each Whisper chunk completes.')}</div><div class="tiny muted" id="liveTranscriptStream">Chunk-by-chunk recognition updates here while the model runs.</div><label class="checkrow"><input type="checkbox" id="followWhisperCaptions" ${followWhisperCaptions?'checked':''}>Follow newly recognized captions in video preview</label></div><div class="info">${(p.transcriptGaps?.[p.selectedAsset]||[]).length} possible untranscribed audio intervals. These may be speech, music, or other sounds.</div><button id="retryAllGaps" ${!(p.transcriptGaps?.[p.selectedAsset]||[]).length||asrBusy?'disabled':''}>Retry ALL suspected transcript gaps</button><div class="separator"></div><div class="info" id="subtitleSyncControls">
  <b>Subtitle synchronization · ${esc(a?.name||'Select original video')}</b>
  <p class="tiny muted">Subtitles use the original video timestamps. After relinking or converting a recording, verify a spoken phrase at the beginning AND near the end. These controls shift captions without rewriting your saved transcript or changing clip cuts.</p>
  <label class="field">Subtitle offset (seconds: positive = later; negative = earlier)
    <input id="subtitleOffsetInput" type="number" step="0.1" min="-3600" max="3600" value="${subtitleOffset(p,p.selectedAsset)}" ${!a?'disabled':''}>
  </label>
  <div class="row wrap">
    <button id="subtitleEarlier" class="small" ${!a?'disabled':''}>−0.25s earlier</button>
    <button id="subtitleLater" class="small" ${!a?'disabled':''}>+0.25s later</button>
    <button id="subtitleReset" class="small" ${!a?'disabled':''}>Reset to 0</button>
  </div>
  <p class="tiny muted">Precise alignment: click a spoken subtitle line below, pause the video at the moment that line begins, then press Align selected line to video. This aligns that source's subtitles, not just one clip.</p>
  <button id="subtitleAlignSelected" class="small full" ${!a?'disabled':''}>Align selected line to current video frame</button>
  <div class="tiny muted">Current shift: ${subtitleOffset(p,p.selectedAsset)>=0?'+':''}${subtitleOffset(p,p.selectedAsset).toFixed(2)} seconds · Preserved across reloads and exports</div>
</div><div class="separator"></div>
<label class="field">SRT timing refers to<select id="srtTimeBasis"><option value="source">Original, unedited video timeline</option><option value="edited">Edited project timeline (such as SRT exported from ShortForm Studio)</option></select></label>
<label class="btn full" for="srtUpload">Import SRT / VTT</label><input type="file" hidden id="srtUpload" accept=".srt,.vtt,text/plain"><label class="field" style="margin-top:12px">Paste transcript (manual timing)<textarea id="pasteTranscript" rows="3" placeholder="Paste transcript text here…"></textarea></label><button id="insertTranscript">Add pasted transcript</button><div class="separator"></div><label class="field">Find dialogue<input id="transcriptSearch" value="${esc(searchTerm)}" placeholder="Filter by phrase"></label><div class="transcript-list" id="transcriptRows">${filtered.slice(0,120).map(x=>`<div class="utterance" data-utterance="${x.start}" data-source="${x.assetId}"><span class="speaker">${esc(x.speaker)} · ${fmt(x.start)}–${fmt(x.end)}</span>${esc(x.text)}</div>`).join('')||'<p class="muted">No dialogue in the selected source yet.</p>'}${filtered.length>120?`<small>Showing 120 of ${filtered.length}. Use search to find more.</small>`:''}</div><div class="separator"></div><label class="field">Speaker label<input id="speakerEdit" value="${esc(chosen?.speaker||'Speaker 1')}"></label><label class="field">Selected excerpt<textarea rows="4" id="uttText">${esc(chosen?.text||'')}</textarea></label><button id="applyUtt" ${!chosen?'disabled':''}>Save speaker/text changes</button><button id="exportSRT">Export subtitles (SRT)</button><div class="separator"></div><h3>Speaker review</h3><p class="tiny muted">${speakerSummary(p.words,p.selectedAsset).map(x=>`${esc(x.name)} (${x.words} words)`).join(' · ')||'No speakers detected'}</p><label class="field">Merge speaker label<input id="mergeFrom" placeholder="e.g. Speaker 3"></label><label class="field">Into speaker label<input id="mergeTo" placeholder="e.g. Speaker 1"></label><button id="mergeSpeakers">Merge labels</button><div class="separator"></div><label class="field">Optional HTTPS diarization endpoint<input id="diarizationEndpoint" value="${esc(p.settings.diarizationEndpoint||'')}" placeholder="https://your-service/diarize"></label><label class="field">Provider API key (session only)<input type="password" id="diarizationKey" placeholder="Optional"></label><button id="autoDiarize" ${!a?'disabled':''}>Analyze speakers with provider</button>`;
 }
 if(tab==='director'){const coverage=sourceCoverage(p.assets,p.words,p.transcriptProgress,p.candidates);const totalHours=Math.max(1,Math.ceil(Math.max(0,...p.assets.map(a=>Number(a.duration)||0))/3600));
const povAssets=p.assets.filter(a=>a.type==='video');
const outputMode=directorOutputMode(p,directorOutputPreference),outputCounts=directorResultCounts(p);
const viewedCandidates=directorFavoritesOnly?p.candidates.filter(c=>c.favorite):filterDirectorCandidates(p,outputMode,directorResultView);
const currentBatch=(p.directorBatches||[]).slice().reverse().find(b=>outputMode==='stories'?b.mode==='multi-pov-story':b.mode!=='multi-pov-story');
const viewOptions=(p.directorBatches||[]).slice().reverse().map(b=>'<option value="'+esc(b.id)+'" '+(directorResultView===b.id?'selected':'')+'>'+esc((b.mode==='multi-pov-story'?'EDITED A+B: ':'RAW single: ')+(b.direction||'Broad PvP').slice(0,68))+' ('+filterDirectorCandidates(p,outputMode,b.id).length+')</option>').join('');
const previewDirection=parseEditorialDirection(p.settings.directorInstructions||'');
const directionHelp=previewDirection.focus.length?'This direction seeks: '+previewDirection.focus.join(', ')+'. If those signals are absent, no match will be invented.':p.settings.directorInstructions?.trim()?'No recognized local editorial topic: use a Quick PvP focus preset or choose Remote AI for free-form critique.':'No specific editorial topic entered: broad gameplay discovery.';
const hourlyClips=viewedCandidates.filter(c=>directorHour==='all'||Math.floor(clipAnchor(c).time/3600)===Number(directorHour)).sort((a,b)=>Number(b.mode===p.settings.mode)-Number(a.mode===p.settings.mode)||Number(b.score||0)-Number(a.score||0)||clipAnchor(a).time-clipAnchor(b).time);const visibleDirectorCandidates=hourlyClips.slice(0,directorShown);
const povReferenceId=povReferenceChoice||p.povSync?.referenceId||povAssets[0]?.id;
const povTargetId=povTargetChoice||p.povSync?.targetId||povAssets.find(a=>a.id!==povReferenceId)?.id;
const povOptions=(selected)=>povAssets.map(a=>'<option value="'+esc(a.id)+'" '+(selected===a.id?'selected':'')+'>'+esc(a.name)+' ('+fmt(a.duration)+')</option>').join('');
const savedPovSync=p.povSync;
const povStatus=savedPovSync&&savedPovSync.referenceId===povReferenceId&&savedPovSync.targetId===povTargetId?
  'Saved alignment: second POV time = '+savedPovSync.offset.toFixed(2)+'s + '+savedPovSync.scale.toFixed(7)+' × first POV time. '+(savedPovSync.confidence||'manual')+' confidence, '+(savedPovSync.inliers||0)+' independent phrase anchors.':
  'NOT SYNCHRONIZED: Generating an assembled story will automatically search both transcripts for matching speech. If that fails, use Match POVs or manually align a known shared event; raw one-cut results are not multi-POV stories.';
const gameplayStatusText=p.assets.filter(a=>a.type==='video').map(a=>{const t=p.gameplayTracks?.[a.id];return esc(a.name)+': '+(t?.status==='complete'?'scanned '+(t.window?fmt(t.window.start)+'–'+fmt(t.window.end)+' · ':'')+(t.events?.length||0)+' action-like audio bursts · '+(t.motion?.length||0)+' sampled frames':t?.status==='scanning'?'partial scan · '+fmt(t.processed)+' / '+fmt(a.duration):'not scanned')}).join(' | ');const discoveryMap=coverage.sources.map(s=>`<div class="tiny muted" style="margin:8px 0 4px">${esc(s.name)} · ${fmt(s.duration)} · ${s.transcribed.toLocaleString()} recognized words · ${s.coveredBins}/${s.totalBins} text-bearing five-minute sections · ${fmt(s.processed)} transcribed by Whisper</div><div class="row tight" style="gap:2px;flex-wrap:nowrap;overflow:hidden">${s.bins.map((count,i)=>`<span title="${fmt(i*300)}–${fmt(Math.min(s.duration,(i+1)*300))}: ${count} words" style="display:block;flex:1;min-width:2px;height:12px;border-radius:2px;background:${count?'#59ddbe':'#354354'}"></span>`).join('')}</div>`).join('');html=`<div class="info"><b>Director output · choose what gets created</b>
<label class="field">Generate<select id="directorOutputMode">
<option value="stories" ${outputMode==='stories'?'selected':''} ${povAssets.length<2?'disabled':''}>🎬 ASSEMBLED MULTI-POV STORIES — several cuts, both recordings</option>
<option value="raw" ${outputMode==='raw'?'selected':''}>🔎 RAW single-camera moments — one cut each (discovery only)</option>
</select></label>
<p class="tiny muted" id="directorModeNotice">${outputMode==='stories'
?'STORY MODE: Only synchronized overlap is scanned. DeepSeek Flash inspects REAL source frames from both cameras before any new result is shown. Old algorithmic clips are hidden.'
:'RAW MODE: Each result is one original-source excerpt. Select ASSEMBLED MULTI-POV STORIES to create actual edited videos.'}
${povAssets.length>=2&&outputCounts.raw?'<b>'+outputCounts.raw+' earlier raw one-cut results are preserved under RAW single-camera moments — they are NOT assembled stories.</b>':''}
${p.candidates.some(c=>c.mode==='multi-pov-story'&&!c.pov?.visionVerified)?
'<strong>⚠ Old montage cards were made without seeing a gunfight. They are hidden, NOT recycled. Re-run generation for frame-reviewed edits. Existing editor timeline is untouched.</strong>':''}</p>
</div><div class="separator"></div><div class="info"><b>Two-player VOD → multi-POV highlights</b><p class="tiny muted">Upload both original recordings in Media and transcribe both VODs (or import their original-timestamp SRTs). Match the same spoken phrases to align match clocks, then generate a single short that switches sources when their gameplay evidence differs. An offset and optional clock drift are saved; kill ownership is NOT verified without HUD/kill-feed evidence.</p>
 ${povAssets.length>=2?`<div class="row"><label class="field" style="flex:1">POV A (match clock)<select id="povReference">${povOptions(povReferenceId)}</select></label><label class="field" style="flex:1">POV B<select id="povTarget">${povOptions(povTargetId)}</select></label></div>
 <div class="row wrap"><button class="small primary" id="syncPovTranscripts">Match POVs by shared spoken phrases</button><button class="small" id="syncPovManual">Save manual time offset</button></div>
 <div class="row"><label class="field" style="flex:1">Second POV offset (seconds)<input id="povOffset" type="number" step="0.1" value="${savedPovSync?.referenceId===povReferenceId&&savedPovSync?.targetId===povTargetId?savedPovSync.offset:0}"></label><label class="field" style="flex:1">B clock scale (1=normal)<input id="povScale" type="number" step="0.000001" min="0.995" max="1.005" value="${savedPovSync?.referenceId===povReferenceId&&savedPovSync?.targetId===povTargetId?savedPovSync.scale:1}"></label></div>
 <div class="tiny muted" id="povSyncStatus">${esc(povSyncStatus||povStatus)}</div>
 <label class="field">Multi-POV story length<select id="povStoryPacing">
 <option value="punchy" ${povStoryPacing==='punchy'?'selected':''}>Punchy · 20–45 sec · 4–5 cuts</option>
 <option value="balanced" ${povStoryPacing==='balanced'?'selected':''}>Balanced · 25–75 sec · 5–7 cuts</option>
 <option value="extended" ${povStoryPacing==='extended'?'selected':''}>Extended · 40–120 sec · 6–9 cuts</option>
 </select></label>
 <button class="primary full" id="generateMultiPovHighlights" ${directorBusy||gameplayBusy?'disabled':''}>🎬 Find real multi-POV fights (frame-reviewed)</button>
 ${directorBusy?'<button id="cancelVisionReview" class="small danger">Stop reviewing frames</button>':''}
 <p class="tiny muted">Requires Remote AI and a DeepSeek key. One visual-review request sends JPEG contact sheets of real frames from BOTH cameras to DeepSeek and incurs API usage. The Remote AI request limit below caps review attempts (default 8). If the frames do not support a fight, ZERO clips are generated. Check continuous playback before export.</p>
 `:`<p class="tiny muted">Import at least two video recordings first. You can then align them from their transcripts, or enter a manual timestamp offset.</p>`}
 </div><div class="separator"></div><div class="info"><b>Call of Duty PvP:</b> use the gameplay scan below for actual audio activity and visual movement, not just dialogue. Highlights preserve continuous footage before, during and after combat-like events. Spoken callouts can suggest enemy sightings, deaths and revives, but unverified audio or motion cannot prove a kill.</div><div class="info"><b>Gameplay analysis:</b> ${gameplayStatusText||'No video sources yet'}.</div><div class="row"><button id="scanGameplayBtn" class="full" ${gameplayBusy?'disabled':''}>🎮 Analyze actual gameplay audio + video</button><button id="cancelGameplayScan" class="small danger" ${gameplayBusy?'':'disabled'}>Stop scan</button></div><div class="tiny muted" id="gameplayStatus" aria-live="polite">${esc(gameplayStatus||'Multi-POV scans decode audio and sample video frames only inside the aligned shared interval. Raw single-POV mode can scan a full recording.')}</div><button id="generatePvPClips" class="primary full" ${directorBusy||gameplayBusy?'disabled':''}>${outputMode==='stories'?'🎬 Assemble POV A + POV B into MULTI-CUT stories':'🎮 Find RAW PvP moments (one cut)'}</button><p class="tiny muted">If Director engine is Remote, it will also critique titles, humor and payoff using timestamped transcripts. The provider does not see video pixels, so it cannot visually verify a kill or revive.</p><div class="separator"></div><div class="info">Scan EVERY transcribed section of the uploaded recording and generate many distinct short videos—not just the top few highlights. Repeated searches avoid the moments already proposed. Scores are editorial heuristics, not virality predictions.</div><div class="info"><b>Source coverage:</b> ${coverage.wordCount.toLocaleString()} words · ${coverage.coveredBins} of ${coverage.totalBins} five-minute source sections contain transcript · ${coverage.percent}% of media processed by Whisper (or imported manually). ${coverage.coveredBins<coverage.totalBins/3&&coverage.totalBins>3?'<strong>⚠ Much of the recording has no transcript yet. The Director cannot discover dialogue it has not received.</strong>':''}</div>${discoveryMap}<div class="separator"></div>${field('Clip category','mode',p.settings.mode,'text',[['all','All categories / full recording'],['comedy','Comedy & callbacks'],['story','Storytelling'],['educational','Educational'],['debate','Debate'],['dramatic','Dramatic'],['inspiration','Inspirational'],['gaming','Gaming'],['cod-pvp','Call of Duty PvP · fights, reactions and trash talk']])}<div class="row"><div style="flex:1">${field('Minimum seconds','clipMin',p.settings.clipMin,'number')}</div><div style="flex:1">${field('Maximum seconds','clipMax',p.settings.clipMax,'number')}</div></div>${field('Clips to propose (0 = ALL available, up to 500 at once)','clipCount',p.settings.clipCount,'number')}${field('Minimum heuristic score (0 = widest search)','minScore',p.settings.minScore,'number')+field('PvP action quality threshold (25–90)','gameplayMinScore',p.settings.gameplayMinScore??44,'number')}${field('Story creativity (0–100)','creativity',p.settings.creativity,'range')}<label class="checkrow"><input type="checkbox" data-setting="allowNonlinear" ${p.settings.allowNonlinear?'checked':''}>Allow non-adjacent source moments</label>${field('On-device semantic sampling','semanticSamples',p.settings.semanticSamples,'number')}${field('Remote AI request limit','maxAICalls',p.settings.maxAICalls,'number')}${field('Director engine','provider',p.settings.provider,'text',[['heuristic','Quick local topic assembly'],['semantic','Local semantic AI (downloads embeddings model)'],['remote','Remote language-model Director (HTTPS)']])}<label class="field">Quick PvP focus<select id="pvpFocusPreset">
<option value="">Custom directions — type below</option>
<option value="ONLY enemy proximity chat trolling and baiting">Possible opponent proximity-chat trolling</option>
<option value="ONLY teammate trolling and squad banter">Squadmate trolling / banter</option>
<option value="ONLY funny trash talk and reactions during gunfights">Trash talk during gunfights</option>
<option value="ONLY revives and rescues">Downed and revived teammates</option>
<option value="ONLY clutch wins and dramatic last-player gunfights">Clutch wins / endgame</option>
<option value="ONLY action-packed gunfights and combat">Action and gunfights</option>
</select></label>
<label class="field">Creative direction<textarea id="directorPrompt" rows="4" placeholder="Find enemy proximity-chat trolling, or ONLY revives and rescues. Say what you want and don't want.">${esc(p.settings.directorInstructions)}</textarea></label>
<p class="tiny muted" id="directionEvidenceHint">${esc(directionHelp)} Opponent vs teammate identity is inferred from words, not verified from a mixed audio track.</p>
<div class="info warning"><b>Creative direction is NOT an AI editing prompt in Quick local topic assembly.</b>
Local mode can use short topics or interpret a detailed brief as general storytelling goals and timestamp scouting windows.
It does not understand arbitrary instructions, view actual kills, or perform agentic editing.
This story search drafts up to five distinct candidates; you must review them before export. ${esc(interpretStoryBrief(p.settings.directorInstructions||'').windows.length?
'Detected '+interpretStoryBrief(p.settings.directorInstructions||'').windows.length+' POV A scouting time ranges in your brief.':'')}</div>${p.settings.provider==='remote'?`<div class="info warning">API mode sends transcript text to your chosen provider. Enter credentials only for services you trust. This browser stores the key in memory for this tab only. A browser CORS policy or provider requirement may block direct access.</div>${field('API HTTPS endpoint','providerUrl',p.settings.providerUrl)}${field('Model','providerModel',p.settings.providerModel)}<label class="field">AI Director API key<input type="password" id="providerKey" autocomplete="off" value="${esc(providerKey)}" placeholder="Paste your API key"></label><label class="checkrow"><input type="checkbox" id="rememberDirectorKey" ${directorKeyRemembered()?'checked':''}>Remember API key in this browser across sessions</label><p class="tiny muted">Stored unencrypted in this browser only (localStorage); not sent to GitHub or saved in project JSON. Do not enable on shared devices.</p><div class="row"><button id="forgetDirectorKey" class="small">Forget stored key</button></div><p class="tiny muted">If the AI service returns 503 or 429, Director retries automatically and then generates labeled local fallback clips if needed.</p>`:''}<button id="generateAllClips" class="primary full" ${directorBusy?'disabled':''}>${outputMode==='stories'?'🎬 Build multiple-cut stories using BOTH POVs':'🔎 Find RAW one-cut moments across whole recording'}</button><button id="generateClips" class="full" ${directorBusy?'disabled':''}>${outputMode==='stories'?'More assembled A+B stories':'More RAW one-cut moments'}</button><div id="directorStatus" class="tiny muted" style="padding:8px 0">${esc(directorStatus||'Exhaustive search finds up to 500 new clips per batch, evenly across all transcribed hours.')}</div><div class="separator"></div><label class="field">Compare saved creative-direction searches<select id="directorResultsView">
<option value="active" ${directorResultView==='active'?'selected':''}>${outputMode==='stories'?'CURRENT ASSEMBLED STORIES: ':'Current RAW search: '}${esc((currentBatch?.direction||'none generated yet').slice(0,65))}</option>
${viewOptions}
<option value="stories" ${directorResultView==='stories'?'selected':''}>ALL completed multi-POV stories (${outputCounts.stories})</option>
<option value="raw" ${directorResultView==='raw'?'selected':''}>ALL old RAW single-camera moments (${outputCounts.raw})</option>
<option value="legacy" ${directorResultView==='legacy'?'selected':''}>Older / legacy proposals</option>
<option value="all" ${directorResultView==='all'?'selected':''}>All saved clips (mix every direction)</option>
</select></label>
<div class="row between"><h3>${viewedCandidates.length} ${directorFavoritesOnly?'favorite clips':outputMode==='stories'?'assembled stories':'raw proposals'} in this view · ${outputCounts.stories} stories / ${outputCounts.raw} raw saved</h3><button class="small" id="clearCandidates">Clear unstarred</button></div><label class="checkrow"><input id="directorFavoritesOnly" type="checkbox" ${directorFavoritesOnly?'checked':''}>Show ★ favorites from all searches (${p.candidates.filter(c=>c.favorite).length})</label><p class="tiny muted">${(p.directorHistory||[]).length} moments already discovered (not repeated). <button class="small" id="resetDirectorHistory">Reset duplicate history</button></p><label class="field">Show source hour<select id="directorHourFilter"><option value="all" ${directorHour==='all'?'selected':''}>All hours (${viewedCandidates.length})</option>${Array.from({length:totalHours},(_,i)=>`<option value="${i}" ${String(i)===String(directorHour)?'selected':''}>Hour ${i+1} (${viewedCandidates.filter(c=>Math.floor(clipAnchor(c).time/3600)===i).length} clips)</option>`).join('')}</select></label><p class="tiny muted">Showing ${visibleDirectorCandidates.length} of ${hourlyClips.length}. ${outputMode==='stories'?'Each assembled story is an ordered, editable timeline from two synchronized original files.':'These are UNEDITED source moments. One cut does NOT equal a story.'} Open in Editor to preview/export.</p><div class="stack" id="candidateList">${visibleDirectorCandidates.map(c=>`<article class="candidate ${c.favorite?'is-favorite':''}"><div class="row between"><h3>${esc(c.title)}</h3><span class="candidate-score">${c.source==='remote-ai'?'AI':c.score}</span></div><div class="candidate-meta">${c.mode==='multi-pov-story'?'<span class="pill">POV A: '+esc(asset(c.pov?.referenceId)?.name||'video A')+'</span><span class="pill">POV B: '+esc(asset(c.pov?.targetId)?.name||'video B')+'</span><span class="pill">'+(c.pov?.jumpCuts||0)+' jump cuts</span>':`<span class="pill">Source ${fmt(clipAnchor(c).time)} · ${esc(asset(clipAnchor(c).assetId)?.name||'media')}</span>`}<span class="pill">${fmt(c.duration)}</span><span class="pill">${c.segments.length} ${c.segments.length===1?'RAW cut':'timeline cuts'}</span><span class="pill">${c.segments.length===1?'NOT a montage':esc(c.mode)}</span>${c.gameplay?.directionMatch?.matches?.length?'<span class="pill">Matched: '+esc(c.gameplay.directionMatch.matches.join(' + '))+'</span>':''}</div><p>${esc(c.reason)}</p><details class="tiny" ${c.mode==='multi-pov-story'?'open':''}><summary>${c.mode==='multi-pov-story'?'Story storyboard · ordered cuts from BOTH cameras':'Verify source timestamps'}</summary>
${c.segments.map((seg,i)=>`<div class="metric"><span>${i+1}. ${esc(seg.storyRole||seg.title||'Cut')} — ${esc(asset(seg.assetId)?.name||'Missing source')}</span><b>${fmt(seg.start)}–${fmt(seg.end)}</b></div>`).join('')}</details><div class="row wrap"><button class="small favorite-toggle ${c.favorite?'is-favorite':''}" data-candidate-favorite="${c.id}" aria-pressed="${!!c.favorite}" title="Keep this candidate in favorites">${c.favorite?'★ Saved':'☆ Favorite'}</button><button data-candidate-play="${c.id}" class="small">Preview edit</button><button data-candidate-use="${c.id}" class="small primary">Open in editor</button><button data-candidate-review="${c.id}" class="small">Review context</button><button data-candidate-variant="${c.id}" class="small">Alternative opening</button></div></article>`).join('')||'<p class="muted">No proposals for this filter. Generate clips after the full transcript is available.</p>'}</div>${visibleDirectorCandidates.length<hourlyClips.length?`<button id="moreCandidates" class="full">Show 48 more clips (${hourlyClips.length-visibleDirectorCandidates.length} remaining)</button>`:''}`;}
 if(tab==='editor'){const c=p.segments.find(s=>s.id===p.selectedSegment),a=p.audio.find(x=>x.id===p.selectedAudio);html=`<div class="info">Timeline is the master edit. Click a segment to trim it, change playback speed, add fade-in, annotate, or reorder it.</div><div class="separator"></div>`+(c?`<h3>Selected video segment</h3><p class="tiny muted">${esc(asset(c.assetId)?.name||'Media missing')}</p><div class="row"><div style="flex:1">${editField('Source in (s)','start',c.start,'number')}</div><div style="flex:1">${editField('Source out (s)','end',c.end,'number')}</div></div>${editField('Playback speed','speed',c.speed,'number')}${editField('Source volume','volume',c.volume,'number')}${editField('Starting zoom','zoom',c.zoom,'number')}${editField('Ending zoom keyframe','zoomEnd',c.zoomEnd??c.zoom,'number')}${editField('Start horizontal focus (0–1)','focusX',c.focusX??.5,'number')}${editField('End horizontal focus keyframe','focusEndX',c.focusEndX??c.focusX??.5,'number')}${editField('Start vertical focus (0–1)','focusY',c.focusY??.5,'number')}${editField('End vertical focus keyframe','focusEndY',c.focusEndY??c.focusY??.5,'number')}${editField('Transition','transition',c.transition,'select',[['cut','Hard cut'],['fade','Fade in from black'],['dissolve','Dissolve (held frame)'],['wipe','Wipe'],['slide','Slide'],['zoom','Zoom transition']])}${editField('Transition duration','transitionSeconds',c.transitionSeconds,'number')}${editField('On-screen title','title',c.title)}${editField('Private clip notes','notes',c.notes||'')}<div class="row wrap"><button id="duplicateSeg">Duplicate</button><button id="splitSelected">Split at playhead</button><button id="trimStartAtPlayhead">Trim left to playhead</button><button id="trimEndAtPlayhead">Trim right to playhead</button><button id="moveClipEarlier">Move left</button><button id="moveClipLater">Move right</button></div><button id="cleanDeadAir" class="full">✂ Remove long pauses in selected clip</button><button id="removeSeg" class="danger full">Remove selected cut</button>`:a?`<h3>Selected audio overlay</h3><p class="muted">${esc(asset(a.assetId)?.name||'Missing audio')}</p>${editField('Timeline start (s)','audioStart',a.start,'number')}${editField('Duration (s)','audioDuration',a.duration,'number')}${editField('Volume (0–2)','audioVolume',a.volume,'number')}${editField('Role','audioRole',a.role,'select',[['voice','Narration'],['music','Music / effects']])}<button id="removeAudio" class="danger full">Remove overlay</button>`:'<p class="muted">Choose a video segment or an audio overlay on the timeline to edit it.</p>')+`<div class="separator"></div><h3>Audio and narration</h3><p class="tiny muted" style="margin:8px 0">Import any audio source, select it in the library, and insert it as an overlay. Or record narration using your microphone.</p><button id="overlayAudio" class="full">+ Insert selected audio overlay</button><button id="recordVoice" class="full" style="margin-top:8px">● Record voice-over</button><div class="separator"></div><h3>Voice generation</h3><label class="field">Narration script<textarea id="narrationScript" rows="4" placeholder="Explain this next section…">${esc(p.narrationDraft||'')}</textarea></label><button id="suggestBridge">Suggest bridge from source edits</button><label class="field">Local browser preview voice<select id="browserVoiceSelect"><option value="">Default system voice</option>${availableVoices().map(v=>`<option value="${esc(v.name)}" ${p.settings.browserVoiceName===v.name?'selected':''}>${esc(v.name)} (${esc(v.lang)})</option>`).join('')}</select></label><div class="row"><button id="previewVoice">Preview with browser voice</button><button id="stopVoice">Stop</button></div><label class="field">Speech API key (session only)<input id="voiceApiKey" type="password" placeholder="For optional HTTPS TTS provider"></label><button id="generateVoice" class="primary full">Generate spoken audio and add to timeline</button><p class="tiny muted">Browser voice is preview-only. Generation uses your configured external audio/speech endpoint, sends text to that service and produces a real audio overlay.</p><div class="separator"></div><h3>Look and captions</h3>${field('Subtitle preset','captionStyle',p.settings.captionStyle,'text',[['dynamic','Dynamic'],['minimal','Minimal'],['boxed','Boxed']])}${field('Subtitle text size','captionSize',p.settings.captionSize,'range')}${field('Caption vertical position (%)','captionPosition',p.settings.captionPosition,'range')}${field('Zoom multiplier','zoom',p.settings.zoom,'range')}`;
 }
 if(tab==='export'){html=`<div class="info">Browser-only rendering captures the canvas, captions, and Web Audio mix. Exports run in real time and remain local. MP4 availability depends on the browser; WebM is the fallback.</div><div class="separator"></div>${field('Output aspect ratio','aspect',p.settings.aspect,'text',[['9:16','9:16 Vertical'],['16:9','16:9 Wide'],['1:1','1:1 Square'],['4:5','4:5 Portrait']])}${field('Output height (pixels)','outputHeight',p.settings.outputHeight,'number')}${field('Frame rate','fps',p.settings.fps,'number')}${field('Video bitrate (bps)','quality',p.settings.quality,'number')}<div class="metric"><span>Runtime</span><b>${fmt(duration(p))}</b></div><div class="metric"><span>Cut count</span><b>${p.segments.length}</b></div><div class="metric"><span>Timed captions</span><b>${mapWords(p).length}</b></div><div class="separator"></div><h3>Preflight quality inspection</h3><div class="stack" style="margin:9px 0">${preflight(p).map(q=>`<div class="tiny ${q.severity==='error'?'warning':'muted'}"><b>${esc(q.severity.toUpperCase())} · ${esc(q.title)}</b><br>${esc(q.detail)}</div>`).join('')||'<p class="success tiny">No structural issues detected. Manual content review is still required.</p>'}</div><div class="separator"></div><button id="doExport" class="primary full" ${renderBusy||!p.segments.length?'disabled':''}>${renderBusy?'Rendering…':'Render and download'}</button><button id="cancelExport" class="danger full" ${renderBusy?'':'disabled'} style="margin-top:8px">Cancel render</button><div class="progress" style="margin:11px 0"><i id="renderProgress"></i></div><p class="tiny muted" id="renderStatus">Review all cuts and source integrity before publishing.</p><div class="separator"></div><button id="saveSrt" class="full">Download subtitles (SRT)</button><button id="saveEdl" class="full">Download editable cut list (JSON)</button><button id="saveBundle" class="full">Download project (JSON)</button><div class="separator"></div><p class="tiny muted">For long videos and high-resolution production, download Project JSON and run <code>python3 tools/render_project.py project.json --media-dir /media --out output.mp4</code> from the repository with FFmpeg installed.</p><p class="warning tiny">Browser exports are not frame-accurate professional renders. For robust long-form/4K exports, a native FFmpeg renderer is required; the project cut list is ready for an external renderer.</p>`}
 if(tab==='settings'){html=`<div class="info">Settings apply to this project. The default design is local-first. Local face detection, optional hosted speaker diarization, voice preview and optional TTS are available. Truly offline generative voice and automatic identity matching across videos require additional models.</div><div class="separator"></div>`+settingSection('Video and reframing',field('Aspect','aspect',p.settings.aspect,'text',[['9:16','9:16 Vertical'],['16:9','16:9 Wide'],['1:1','Square'],['4:5','4:5']])+field('Zoom / crop','zoom',p.settings.zoom,'range')+field('Brightness (%)','brightness',p.settings.brightness,'number')+field('Contrast (%)','contrast',p.settings.contrast,'number')+field('Saturation (%)','saturation',p.settings.saturation,'number')+field('Visual look','videoFilter',p.settings.videoFilter,'text',[['normal','Natural'],['grayscale','Black and white'],['sepia','Warm sepia'],['vintage','Vintage'],['soft','Soft focus']])+`<label class="checkrow"><input type="checkbox" data-setting="autoFaceFraming" ${p.settings.autoFaceFraming?'checked':''}>Smart face-aware crop (after scanning source faces)</label>`+field('Face tracking strength (0–100)','faceTrackingStrength',p.settings.faceTrackingStrength,'number')+field('Default transition','transition',p.settings.transition,'text',[['cut','Hard cut'],['fade','Fade-in'],['dissolve','Dissolve (still previous frame)'],['wipe','Wipe'],['slide','Slide'],['zoom','Zoom']]))+settingSection('Caption and branding',field('Caption style','captionStyle',p.settings.captionStyle,'text',[['dynamic','Dynamic'],['minimal','Minimal'],['boxed','Boxed']])+field('Caption font size','captionSize',p.settings.captionSize,'number')+field('Caption words per chunk','captionWords',p.settings.captionWords,'number')+field('Caption lines max','captionMaxLines',p.settings.captionMaxLines,'number')+field('Caption vertical placement (%)','captionPosition',p.settings.captionPosition,'number')+field('Caption horizontal placement (%)','captionX',p.settings.captionX??50,'number')+field('Caption font','captionFont',p.settings.captionFont||'system-ui','text',[['system-ui','Modern sans serif'],['Arial','Arial'],['Georgia','Georgia'],['Impact','Impact'],['Verdana','Verdana']])+field('Text color','captionColor',p.settings.captionColor,'color')+field('Active word highlight','captionAccent',p.settings.captionAccent,'color')+field('Outline color','captionOutlineColor',p.settings.captionOutlineColor||'#10151d','color')+field('Outline thickness (0–12)','captionOutlineWidth',p.settings.captionOutlineWidth??5,'number')+field('Background color','captionBackground',p.settings.captionBackground,'color')+`<label class="checkrow"><input type="checkbox" data-setting="captionUppercase" ${p.settings.captionUppercase?'checked':''}>Uppercase captions</label><label class="checkrow"><input type="checkbox" data-setting="captionOn" ${p.settings.captionOn?'checked':''}>Show captions</label>`)+settingSection('Audio',field('Video gain (0–2)','videoVolume',p.settings.videoVolume,'number')+field('Added audio gain (0–2)','audioVolume',p.settings.audioVolume,'number')+`<label class="checkrow"><input type="checkbox" data-setting="duckMusic" ${p.settings.duckMusic?'checked':''}>Lower background music when source dialogue plays</label>`)+settingSection('Transcription',field('ASR model','whisperModel',p.settings.whisperModel,'text',[['onnx-community/whisper-tiny.en','Whisper Tiny English (fastest)'],['onnx-community/whisper-base.en','Whisper Base English (larger)'],['onnx-community/whisper-small.en','Whisper Small English (resource intensive)']])+field('ASR processor','processing',p.settings.processing,'text',[['webgpu','WebGPU preferred / WASM fallback'],['wasm','WASM CPU']])+field('Chunk seconds (8–29)','transcriptionChunk',p.settings.transcriptionChunk,'number')+field('Timestamp compatibility','transcriptionTiming',p.settings.transcriptionTiming||'auto','text',[['auto','Recommended: segment timestamps; plain fallback'],['segment','Segment timestamps; plain fallback'],['plain','Plain transcription; estimated timings'],['word','Advanced: word alignment (attention model required)']]))+settingSection('Voice-over generation',field('HTTPS TTS endpoint','ttsEndpoint',p.settings.ttsEndpoint)+field('TTS model','ttsModel',p.settings.ttsModel)+field('TTS voice','ttsVoice',p.settings.ttsVoice)+field('Voice speed','ttsSpeed',p.settings.ttsSpeed,'number'))+settingSection('Speaker diarization',field('HTTPS diarization endpoint','diarizationEndpoint',p.settings.diarizationEndpoint))+settingSection('Storage and interface',`<label class="checkrow"><input type="checkbox" data-setting="autoInsertMedia" ${p.settings.autoInsertMedia!==false?'checked':''}>Automatically add the full video to the editor on import</label><label class="checkrow"><input type="checkbox" data-setting="autoSave" ${p.settings.autoSave?'checked':''}>Automatic project saves</label><label class="checkrow"><input type="checkbox" data-setting="rememberMedia" ${p.settings.rememberMedia?'checked':''}>Store imported media in browser IndexedDB (quota permitting)</label>`+`<button id="checkStorage">Check browser storage quota</button><button id="clearCachedMedia" class="danger" style="margin-top:8px">Remove cached media files</button><div id="storageInfo" class="tiny muted" style="margin-top:8px"></div>`)+`<p class="tiny muted">Keyboard: Space play/pause · arrows skip 5 seconds · Delete remove cut · Ctrl+Z undo · Ctrl+Shift+Z redo · Ctrl+S save.</p>`;}
 if(tab==='tools')html=productionToolsHTML(p,snapshotRecords,toolsSearch,engine.time);target.innerHTML=html;wireInspector();}
function editField(label,key,value,type='text',options){return `<label class="field">${esc(label)}${type==='select'?`<select data-edit="${key}">${options.map(o=>`<option value="${o[0]}" ${value===o[0]?'selected':''}>${o[1]}</option>`).join('')}</select>`:`<input data-edit="${key}" type="${type}" value="${esc(value)}" step="any">`}</label>`}
function chooseTab(name){tab=name;all('.tab').forEach(x=>x.classList.toggle('active',x.dataset.tab===tab));renderInspector();if(name==='tools')refreshSnapshots()}
async function refreshSnapshots(){try{snapshotRecords=await listSnapshots(p.id);if(tab==='tools')renderInspector()}catch(e){toast('Could not load project snapshots: '+e.message,true)}}
function asrProgress(n,msg){const bar=$('asrProgress');if(bar)bar.style.width=`${Math.floor(n*100)}%`;if($('asrStatus'))$('asrStatus').textContent=msg;setStatus(msg)}
/** Analyze the actual video/audio track. Keep 24-second RAM windows and store progress in project metadata. */
async function runGameplayScan(target=null,{silent=false,windows=null}={}){
 if(gameplayBusy)throw Error('Gameplay analysis is already running');
 const list=target?[target]:p.assets.filter(a=>a.type==='video'&&(!windows||windows[a.id]));
 if(!list.length)throw Error('Import a gameplay recording first');
 gameplayBusy=true;gameplayAbort=new AbortController();
 try{
  for(const a of list){
   const original=asset(a.id);
   const file=original?.file;
   if(!file){gameplayStatus='Original '+a.name+' is not linked. Relink your video to scan its action.';throw Error(gameplayStatus)}
   const window=windows?.[a.id]||null;
   const fingerprint=scopedScanFingerprint(file,GAMEPLAY_SCAN_VERSION,window);
   const previous=p.gameplayTracks?.[a.id];
   if(validScopedScan(previous,fingerprint,window)){
    gameplayStatus='Using existing completed gameplay activity scan for '+a.name;
    continue;
   }
   gameplayStatus='Starting '+a.name+' · '+(window?fmt(window.start)+'–'+fmt(window.end)+' shared footage':'full recording')+'…';
   if($('gameplayStatus'))$('gameplayStatus').textContent=gameplayStatus;
   await scanGameplay(file,{
    durationHint:a.duration,window,signal:gameplayAbort.signal,resume:previous?.fingerprint===fingerprint?previous:null,
    onProgress:(progress,message)=>{
     gameplayStatus=Math.round(progress*100)+'% · '+a.name+' · '+message;
     if($('gameplayStatus'))$('gameplayStatus').textContent=gameplayStatus;
     const dir=$('directorStatus');if(dir&&directorBusy)dir.textContent=gameplayStatus;
    },
    onCheckpoint:async track=>{
     p.gameplayTracks||={};
     p.gameplayTracks[a.id]={...track,fingerprint};
     await saveProject({...p,assets:p.assets.map(({url,file,...rest})=>rest)});
    }
   });
  }
  gameplayStatus='Activity scan saved. Audio and motion are clues, not verified gunfights.';
  if(!silent)toast(gameplayStatus);
 }catch(error){
  gameplayStatus=error.message;
  if(!silent)toast('Gameplay analysis: '+error.message,true);
  throw error;
 }finally{
  gameplayBusy=false;gameplayAbort=null;
  if(tab==='director'&&!directorBusy)renderInspector();
 }
}

/** Align two imported original video source clocks from genuinely shared speech. */
function getPovPair(){
 const referenceId=$('povReference')?.value||povReferenceChoice||p.povSync?.referenceId||p.assets.find(a=>a.type==='video')?.id;
 const targetId=$('povTarget')?.value||povTargetChoice||p.povSync?.targetId||p.assets.find(a=>a.type==='video'&&a.id!==referenceId)?.id;
 if(!referenceId||!targetId||referenceId===targetId)throw Error('Select two different imported video files as POV A and POV B.');
 const reference=p.assets.find(a=>a.id===referenceId),target=p.assets.find(a=>a.id===targetId);
 if(!reference||!target||reference.type!=='video'||target.type!=='video')throw Error('Both POV sources must be imported videos.');
 povReferenceChoice=referenceId;povTargetChoice=targetId;
 return {referenceId,targetId,reference,target};
}
async function synchronizePovBySpeech(){
 try{
  const {referenceId,targetId,reference,target}=getPovPair();
  const countA=p.words.filter(w=>w.assetId===referenceId).length,countB=p.words.filter(w=>w.assetId===targetId).length;
  if(countA<12||countB<12)throw Error('Both recordings need original-time Whisper transcripts or imported SRTs. Found '+countA+' words for POV A and '+countB+' for POV B.');
  const sync=syncFromTranscripts(p.words,referenceId,targetId,{gram:5});
  if(sync.status!=='matched')throw Error(sync.reason||'Not enough shared spoken phrases to synchronize VODs.');
  const map={...sync,referenceId,targetId,referenceSize:reference.size,targetSize:target.size};
  const checked=checkSynchronization(map,reference.duration,target.duration);
  if(!checked.valid)throw Error(checked.reason);
  commit('Synchronized two VODs by transcript');
  p.povSync=map;
  povSyncStatus='Matched '+sync.inliers+' shared voice anchors ('+sync.confidence+' confidence). POV B starts '+map.offset.toFixed(2)+'s relative to POV A and scale '+map.scale.toFixed(7)+'. '+(sync.warning||'Verify a shared event at the beginning and end.');
  update();toast('POV recordings aligned from transcript evidence. Check two moments before export.');
 }catch(e){povSyncStatus='POV matching: '+e.message;renderInspector();toast(povSyncStatus,true)}
}
function synchronizePovManually(){
 try{
  const {referenceId,targetId,reference,target}=getPovPair();
  const offset=Number($('povOffset')?.value),scale=Number($('povScale')?.value);
  if(!Number.isFinite(offset)||!Number.isFinite(scale)||scale<.995||scale>1.005)throw Error('Enter a finite offset and a clock scale between 0.995 and 1.005.');
  const manual={referenceId,targetId,offset,scale,confidence:'manual',method:'manual',inliers:0,referenceSize:reference.size,targetSize:target.size};
  const checked=checkSynchronization(manual,reference.duration,target.duration);
  if(!checked.valid)throw Error(checked.reason);
  commit('Manually aligned POV recordings');
  p.povSync=manual;
  povSyncStatus='Manual clock alignment saved. Overlap '+fmt(checked.overlap)+'. Verify the same gunshot, spoken callout or scoreboard moment in both recordings.';
  update();toast('Manual multi-POV alignment saved; verify before generating edits.');
 }catch(e){povSyncStatus=e.message;renderInspector();toast('POV alignment: '+e.message,true)}
}
async function generateMultiPovDirector(){
 if(directorBusy||gameplayBusy)return;
 if(p.settings.provider!=='remote')return toast('Multi-POV frame verification requires Director engine: Remote language-model Director. Local keywords cannot detect gunfights.',true);
 if(!providerKey?.trim())return toast('Enter a DeepSeek key in AI Director. The vision model inspects real frames. No keyword-only fallback clips.',true);
 const storyFocus=($('directorPrompt')?.value??p.settings.directorInstructions??'').trim();
 const brief=interpretStoryBrief(storyFocus,{defaultTarget:5});
 const pacing=$('povStoryPacing')?.value||povStoryPacing;
 povStoryPacing=pacing;
 const shape=pacing==='punchy'?{clipMin:20,clipMax:45,storyMaxCuts:5}:
  pacing==='extended'?{clipMin:40,clipMax:120,storyMaxCuts:9}:
  {clipMin:25,clipMax:75,storyMaxCuts:7};
 let ref,target,sync;
 try{
  ({referenceId:ref,targetId:target}=getPovPair());
  sync=p.povSync;
  if(!sync||sync.referenceId!==ref||sync.targetId!==target){
   const matches=syncFromTranscripts(p.words,ref,target,{gram:5,maxAnchors:3000});
   if(!usableAutoSync(matches))throw Error(
    'Cannot assemble a real two-POV story: the recordings are NOT synchronized. '+
    (matches.reason||'Only '+(matches.inliers||0)+' shared speech anchors ('+(matches.confidence||'unknown')+' confidence).')+
    ' These videos may contain different matches or voice tracks. Match POVs by shared phrases or manually align the SAME game event, then retry. No 1-cut fallback was produced.'
   );
   const left=p.assets.find(a=>a.id===ref),right=p.assets.find(a=>a.id===target);
   sync={...matches,referenceId:ref,targetId:target,referenceSize:left.size,targetSize:right.size};
   const overlap=checkSynchronization(sync,left.duration,right.duration);
   if(!overlap.valid)throw Error('Automatic speech matching found phrases, but the two recordings have no valid overlapping match clock: '+overlap.reason);
   commit('Automatically synchronized two POV recordings');
   p.povSync=sync;
   povSyncStatus='AUTO-SYNCHRONIZED from '+sync.inliers+' distinct phrases. Offset '+sync.offset.toFixed(2)+'s; '+sync.confidence+' confidence. Verify shared events at both ends before export.';
  }
  const a=p.assets.find(x=>x.id===ref),b=p.assets.find(x=>x.id===target);
  const overlap=checkSynchronization(sync,a.duration,b.duration);
  if(!overlap.valid)throw Error(overlap.reason);
  if((sync.referenceSize!==undefined&&a.size!==sync.referenceSize)||(sync.targetSize!==undefined&&b.size!==sync.targetSize))
   throw Error('One VOD changed since synchronization. Match the two recordings again to avoid incorrect cuts.');
 }catch(e){povSyncStatus=e.message;renderInspector();toast('Multi-POV Director: '+e.message,true);return}
 directorBusy=true;directorStatus='Preparing synchronized multi-POV action scan…';renderInspector();
 try{
  const sourceA=p.assets.find(a=>a.id===ref),sourceB=p.assets.find(a=>a.id===target);
  const windows=overlappingPovWindows(sync,sourceA,sourceB);
  directorStatus='Analyzing only '+fmt(windows[ref].end-windows[ref].start)+' of matching gameplay, not the rest of the VODs…';
  await runGameplayScan(null,{silent:true,windows});
  const dir='Multi-POV FRAME-VERIFIED STORY v5: actual frame evidence, no recycled heuristic clips. '+ref+' → '+target+' offset '+sync.offset+' scale '+sync.scale+' | '+pacing+' | '+storyFocus;
  const options={...p.settings,...shape,mode:'multi-pov-story',directorInstructions:dir,
   storyEditorialDirection:brief.longForm?'':storyFocus,
   storyMaxSeconds:brief.longForm?210:undefined,
   storyTargetCount:brief.targetCount,
   clipCount:0};
  const plan=planDirectorBatch(p,options,{id:uid()});
  options.existingCandidates=plan.existingCandidates;
  options.history=plan.history;
  const pool=discoverVisionScouts(p.words,p.assets,p.gameplayTracks||{},sync,{direction:storyFocus});
  // Search the ENTIRE overlapping match for new action candidates; ignore
  // the old montage builder and skip all previously reviewed source windows.
  const maxChecks=Math.min(pool.length,Math.max(1,Math.min(40,Number(p.settings.maxAICalls)||8)));
  const previousTimes=[...(p.visionAudit||[]).map(x=>x.time),
   ...p.candidates.filter(c=>c.pov?.visionVerified===true).map(c=>c.anchorTime)];
  const scouts=chooseFreshVisionScouts(pool,{limit:maxChecks,previousTimes});
  const inspected=[],rejected=[],reviewed=[],fileMap={};
  for(const id of [ref,target]){
   fileMap[id]=asset(id)?.file;
   if(!fileMap[id])throw Error('Relink original '+p.assets.find(x=>x.id===id)?.name+' before actual frame review.');
  }
  directorAbort=new AbortController();
  for(let i=0;i<scouts.length;i++){
   if(directorAbort.signal.aborted)throw Error('Visual review stopped');
   const candidate=scouts[i];
   directorStatus='Inspecting ACTUAL frames: '+(i+1)+'/'+scouts.length+
    ' shared encounters · '+fmt(candidate.pov.globalStart)+' · '+inspected.length+' accepted, '+rejected.length+' rejected';
   if($('directorStatus'))$('directorStatus').textContent=directorStatus;
   const verdict=await reviewWithVision(candidate,{sync,assets:p.assets,files:fileMap,
    key:providerKey,brief:storyFocus,signal:directorAbort.signal});
   if(verdict.accepted)inspected.push(verdict.candidate);
   else rejected.push({time:candidate.anchorTime,reason:verdict.reason});
   reviewed.push({time:candidate.anchorTime,accepted:verdict.accepted,
    reason:verdict.reason||'Frame evidence accepted',createdAt:Date.now()});
   if(inspected.length>=brief.targetCount)break;
  }
  p.visionAudit=[...(p.visionAudit||[]),...reviewed].slice(-500);
  const suggestions=inspected;
  if(plan.newBatch){
   commit('New multi-POV search');
   p.directorBatches=[...(p.directorBatches||[]),plan.batch].slice(-100);
   p.directorActiveBatchId=plan.batch.id;
  }
  const prior=new Set(plan.existingCandidates.map(clipSignature));
  const fresh=assignDirectorBatch(suggestions.filter(c=>c.pov?.visionVerified===true&&
   isAssembledPovStory(c)&&!prior.has(clipSignature(c))),plan.batch);
  directorResultView='active';directorHour='all';directorShown=48;
  if(!fresh.length){
   directorStatus='No new visually supported multi-POV fights: '+inspected.length+
    ' accepted frame reviews, '+rejected.length+' rejected, '+pool.length+' scouting windows.'+
    ' No old clips or dialogue-only footage were substituted.';
   update();toast(directorStatus,true);return;
  }
  commit('Generated '+fresh.length+' synchronized multi-POV highlights');
  p.candidates.push(...fresh);
  p.directorHistory.push(...historyEntries(fresh).map(h=>({...h,directorBatchId:plan.batch.id})));
  plan.batch.count=(plan.batch.count||0)+fresh.length;
  directorStatus='Built '+fresh.length+' NEW edits from actual source frames; '+rejected.length+' candidates failed visual inspection. Verify continuous action and outcomes in preview before export.';
  if(fresh.length<brief.targetCount)directorStatus+=' Fewer than requested met the candidate requirements; remaining stories were not fabricated.';
  update();toast(directorStatus);
 }catch(e){directorStatus='Multi-POV Director: '+e.message;toast(directorStatus,true)}
 finally{directorBusy=false;directorAbort=null;if(tab==='director')renderInspector()}
}

/** Generate a fresh full-recording batch without replacing or recycling previous proposals. */
async function runDirector(exhaustive=false){
 if(directorBusy)return;
 if(!p.words.length&&p.settings.mode!=='cod-pvp')return toast('Complete Whisper or import an SRT for transcript-based editing; PvP mode can analyze the actual video/audio without spoken words.',true);
 // Capture the user's current input BEFORE any inspector redraw.
 p.settings.directorInstructions=($('directorPrompt')?.value??p.settings.directorInstructions??'').trim();
 const options={...p.settings};
 const requested=parseEditorialDirection(options.directorInstructions);
 if(options.mode==='cod-pvp'&&options.provider!=='remote'&&options.directorInstructions.trim()&&!requested.focus.length){
  return toast('The local PvP detector could not interpret that creative direction. Use a Quick PvP focus (trolling, opponent voice, squad banter, funny, revives, or clutch), or use Remote AI to critique arbitrary directions. No clips were recycled.',true);
 }
 const plan=planDirectorBatch(p,options,{id:uid()});
 options.existingCandidates=plan.existingCandidates;
 options.history=plan.history;
 // Each distinct creative direction re-examines the entire original recording.
 // Previously proposed footage may reappear if relevant to a DIFFERENT goal.
 if(plan.newBatch){
  commit('New creative direction: '+(plan.batch.direction||'broad highlights'));
  p.directorBatches=[...(p.directorBatches||[]),plan.batch].slice(-100);
  p.directorActiveBatchId=plan.batch.id;
 }
 directorResultView='active';directorHour='all';directorShown=48;
 if(exhaustive)Object.assign(options,options.mode==='cod-pvp'?{clipCount:0,discoveryAll:true}:{clipCount:0,mode:'all',minScore:0,discoveryAll:true});
 const cover=sourceCoverage(p.assets,p.words,p.transcriptProgress,p.candidates);
 if(cover.totalBins>3&&cover.coveredBins<cover.totalBins/3){
  toast('Only '+cover.coveredBins+'/'+cover.totalBins+' five-minute source sections contain transcript. Scan and complete the missing sections to find shorts from all hours.',true);
 }
 if(options.provider==='remote'&&options.mode!=='cod-pvp'){
  providerKey=$('providerKey')?.value.trim()||providerKey;
  if(!providerKey)return toast('Enter an AI Director key, or change Director engine to a local mode.',true);
  if(directorKeyRemembered())saveDirectorKey(providerKey,{remember:true});
 }
 directorBusy=true;directorStatus='Reading full recording coverage…';
 renderInspector();
 try{
  const progress=(ratio,message)=>{
   directorStatus=Math.round(Math.max(0,Math.min(1,ratio||0))*100)+'% · '+message;
   const status=$('directorStatus');if(status)status.textContent=directorStatus;
  };
  let added;
  if(options.mode==='cod-pvp'){
   // A fresh scan automatically runs once per linked source, then is reused across searches.
   for(const a of p.assets.filter(x=>x.type==='video')){
    const linked=asset(a.id);
    const fingerprint=linked?.file?linked.file.size+':'+linked.file.lastModified+':'+GAMEPLAY_SCAN_VERSION:'';
    if(linked?.file&&(!p.gameplayTracks?.[a.id]||p.gameplayTracks[a.id].status!=='complete'||p.gameplayTracks[a.id].fingerprint!==fingerprint)){
     await runGameplayScan(a,{silent:true});
    }
   }
   added=generatePvPHighlights(p.words,p.assets,p.gameplayTracks||{},options,progress);
   if(options.provider==='remote'&&added.length){
    providerKey=$('providerKey')?.value.trim()||providerKey;
    if(providerKey){
     if(directorKeyRemembered())saveDirectorKey(providerKey,{remember:true});
     added=await reviewPvPWithAI(added,p.words,options,providerKey,progress);
    }else{
     progress(1,'No remote AI key set: retaining evidence-ranked local PvP clips');
    }
   }
  }else{
   added=options.provider==='remote'
    ?await remoteCandidates(p.words,p.assets,options,providerKey,progress)
    :options.provider==='semantic'
     ?await semanticCandidates(p.words,p.assets,options,progress)
     :await generateCandidatesBatched(p.words,p.assets,options,progress);
  }
  if(!added.length){
   const focus=parseEditorialDirection(options.directorInstructions);
   directorStatus=focus.focus.length
     ?'No transcript-confirmed matches for '+focus.focus.join(' + ')+'. The app will not invent trolling or opponent voice interactions. Try another direction, or add transcription for missing gameplay hours.'
     :'No additional qualifying footage found for this direction. Reduce thresholds or inspect the recording.';
   update();toast(directorStatus,true);return;
  }
  const signatures=new Set(plan.existingCandidates.map(clipSignature));
  const fresh=added.filter(c=>!signatures.has(clipSignature(c)));
  if(!fresh.length){
   directorStatus='All moments for THIS direction were already selected. Change creative directions to reassess the same recording, or lower thresholds.';
   update();toast(directorStatus,true);return;
  }
  commit('Director: '+fresh.length+' clips for '+(plan.batch.direction||'broad discovery'));
  const named=assignDirectorBatch(fresh,plan.batch);
  p.candidates=[...p.candidates,...named];
  p.directorHistory=[...(p.directorHistory||[]),...historyEntries(named).map(h=>({...h,directorBatchId:plan.batch.id}))].slice(-12000);
  plan.batch.count=(plan.batch.count||0)+named.length;
  directorShown=48;directorHour='all';directorResultView='active';
  const spans=new Set(named.map(c=>Math.floor(clipAnchor(c).time/300)));
  directorStatus='Found '+named.length+' clips matching THIS creative direction across '+spans.size+' five-minute source sections. Saved '+p.candidates.length+' total clips across all searches.';
  update();toast(directorStatus);
 }catch(error){directorStatus='Director error: '+error.message;toast(directorStatus,true)}
 finally{directorBusy=false;if(tab==='director')renderInspector()}
}

function wireInspector(){const c=$('inspectorContent');c.querySelectorAll('[data-setting]').forEach(e=>e.onchange=()=>{commit();const key=e.dataset.setting;let val=e.type==='checkbox'?e.checked:e.type==='number'||e.type==='range'?Number(e.value):e.value;if(key==='clipMin'||key==='clipMax'){val=clamp(val,5,600)}if(key==='clipCount')val=clamp(val,0,MAX_DISCOVERY_CLIPS);if(key==='gameplayMinScore')val=clamp(val,25,90);if(key==='semanticSamples')val=clamp(val,40,450);if(key==='maxAICalls')val=clamp(val,1,96);if(key==='captionSize')val=clamp(val,12,120);if(key==='captionWords')val=clamp(val,1,12);if(key==='captionX'||key==='captionPosition')val=clamp(val,5,95);if(key==='captionOutlineWidth')val=clamp(val,0,12);if(key==='captionMaxLines')val=clamp(val,1,3);p.settings[key]=val;if(key==='aspect')$('aspectSelect').value=val;engine.setSize();update()});
 c.querySelectorAll('[data-edit]').forEach(e=>e.onchange=()=>{const key=e.dataset.edit,obj=p.segments.find(s=>s.id===p.selectedSegment)||p.audio.find(a=>a.id===p.selectedAudio);if(!obj)return;commit();const k=key==='audioStart'?'start':key==='audioDuration'?'duration':key==='audioVolume'?'volume':key==='audioRole'?'role':key;let v=e.type==='number'?Number(e.value):e.value;if(k==='speed')v=clamp(v,.25,3);if(k==='start')v=clamp(v,0,obj.end?obj.end-.1:duration(p));if(k==='end')v=clamp(v,(obj.start||0)+.1,asset(obj.assetId)?.duration||Number.MAX_SAFE_INTEGER);if(k==='volume')v=clamp(v,0,2);if(['focusX','focusY','focusEndX','focusEndY'].includes(k))v=clamp(v,0,1);if(k==='zoom'||k==='zoomEnd')v=clamp(v,.5,5);obj[k]=v;update()});
 const on=(id,fn)=>{const e=$(id);if(e)e.onclick=fn};
 on('markIn',()=>{const m=$('sourcePreview');if(m&&Number.isFinite(m.currentTime)){$('sourceIn').value=m.currentTime.toFixed(2);toast(`In set to ${fmt(m.currentTime)}`)}});
 on('markOut',()=>{const m=$('sourcePreview');if(m&&Number.isFinite(m.currentTime)){$('sourceOut').value=m.currentTime.toFixed(2);toast(`Out set to ${fmt(m.currentTime)}`)}});
 c.querySelectorAll('[data-scene-time]').forEach(b=>b.onclick=()=>{$('sourceIn').value=b.dataset.sceneTime;$('sourceOut').value=b.dataset.sceneEnd;toast('Source excerpt selected. Click Add source excerpt to place it on timeline.')});
 on('scanScenes',async()=>{const a=asset(p.selectedAsset);if(!a?.file||a.type!=='video')return toast('Select a playable video source first',true);sceneBusy=true;sceneController=new AbortController();renderInspector();try{const shots=await analyzeScenes(a.file,{step:1,maxSamples:1000,signal:sceneController.signal,onProgress:(n,msg)=>setStatus(`Scene scan ${Math.round(n*100)}% · ${msg}`)});commit();p.sceneTracks||={};p.sceneTracks[a.id]=shots;update();toast(`Found ${shots.length} possible shot boundaries. Review the source before cutting.`)}catch(e){toast(`Scene analysis: ${e.message}`,true)}finally{sceneBusy=false;sceneController=null;renderInspector()}});
 on('cancelSceneScan',()=>sceneController?.abort());
 on('scanFaces',async()=>{const a=asset(p.selectedAsset);if(!a?.file||a.type!=='video')return toast('Select and relink a video first',true);faceController=new AbortController();faceBusy=true;renderInspector();try{const frames=await scanFaces(a.file,{step:2,maxSamples:360,signal:faceController.signal,onProgress:(r,msg)=>{setStatus(`Face scan ${Math.round(r*100)}%: ${msg}`)}});commit('Face scan complete');p.faceTracks||={};p.faceTracks[a.id]=frames;p.settings.autoFaceFraming=true;update();toast(`Face-aware reframing enabled: ${frames.length} frame samples.`)}catch(e){toast(`Face analysis: ${e.message}`,true)}finally{faceBusy=false;faceController=null;renderInspector()}});
 on('cancelFaceScan',()=>faceController?.abort());
 on('mergeSpeakers',()=>{const from=$('mergeFrom')?.value.trim(),to=$('mergeTo')?.value.trim();if(!from||!to)return toast('Enter both speaker labels',true);commit();p.words=relabelSpeaker(p.words,from,to,p.selectedAsset);update();toast(`Merged ${from} into ${to}`)});
 on('autoDiarize',async()=>{const a=asset(p.selectedAsset),endpoint=$('diarizationEndpoint')?.value.trim(),key=$('diarizationKey')?.value||diarizationKey;if(!a?.file)return toast('Relink source audio/video first',true);if(!endpoint)return toast('Enter your HTTPS speaker diarization endpoint',true);if(!confirm('Upload this media file to your specified external diarization service?'))return;diarizationKey=key;p.settings.diarizationEndpoint=endpoint;setStatus('Analyzing speakers…');try{const segments=await diarizeWithProvider(a.file,{endpoint,key});commit();p.words=applySpeakerSegments(p.words,segments,a.id);update();toast(`Applied ${segments.length} speaker intervals. Review and merge mistaken identities.`)}catch(e){toast(`Speaker analysis: ${e.message}`,true)}});
 const draft=$('narrationScript');if(draft)draft.oninput=()=>{p.narrationDraft=draft.value;setStatus('Narration draft saved')};const voiceChoice=$('browserVoiceSelect');if(voiceChoice)voiceChoice.onchange=()=>{p.settings.browserVoiceName=voiceChoice.value;setStatus('Voice preview selected')};
 on('suggestBridge',()=>{const suggestions=suggestBridges(p.segments,p.words);if(!suggestions.length)return toast('No widely separated source moments need a narration bridge',true);$('narrationScript').value=suggestions[0].text;p.narrationDraft=suggestions[0].text;setStatus('Suggested narration');toast(`Suggested bridge before cut ${suggestions[0].beforeIndex+1}. Review wording for accuracy.`)});
 on('previewVoice',()=>{try{previewSpeech($('narrationScript')?.value||'',p.settings.browserVoiceName,p.settings.ttsSpeed)}catch(e){toast(e.message,true)}});
 on('stopVoice',stopSpeech);
 on('generateVoice',async()=>{const script=$('narrationScript')?.value?.trim();if(!script)return toast('Enter narration text first',true);voiceKey=$('voiceApiKey')?.value||voiceKey;if(!confirm('Send this narration text to the configured speech-generation service?'))return;const button=$('generateVoice');button.disabled=true;try{const file=await synthesizeSpeech(script,{endpoint:p.settings.ttsEndpoint,model:p.settings.ttsModel,voice:p.settings.ttsVoice,speed:p.settings.ttsSpeed,apiKey:voiceKey});const at=engine.time;const a=await addFile(file);commit();p.audio.push({id:uid(),assetId:a.id,start:at,sourceStart:0,duration:Math.min(a.duration||duration(p)-at,Math.max(.2,duration(p)-at)),volume:1,role:'voice'});update();toast('Generated speech added as an editable audio overlay')}catch(e){toast(`Voice generation: ${e.message}`,true)}finally{if(button)button.disabled=false}});
 on('removeAsset',async()=>{if(!confirm('Remove source and all its timeline segments?'))return;const id=p.selectedAsset;commit();p.assets=p.assets.filter(x=>x.id!==id);p.words=p.words.filter(w=>w.assetId!==id);p.segments=p.segments.filter(s=>s.assetId!==id);p.audio=p.audio.filter(s=>s.assetId!==id);p.selectedAsset=p.assets[0]?.id||null;assets.get(id)?.url&&URL.revokeObjectURL(assets.get(id).url);assets.delete(id);deleteMedia(id).catch(()=>{});update()});
 on('insertTranscript',()=>{if(!p.selectedAsset)return toast('Select a source first',true);const value=$('pasteTranscript').value.trim();if(!value)return toast('Paste transcript text first',true);commit();const a=asset(p.selectedAsset);p.words.push(...timeWords(value,a.id,0,Math.max(10,a.duration)));update();toast('Transcript text added with approximate timestamps; review alignment')});
 on('transcribeBtn',async()=>{
 const a=asset(p.selectedAsset);
 if(!a?.file)return toast('Relink source media to transcribe',true);
 if(asrBusy)return;
 p.transcriptProgress||={};p.transcriptGaps||={};
 const prev=p.transcriptProgress[a.id];
 const startAt=prev?.status!=='complete'&&Number(prev?.nextAt)>0?Math.min(Number(prev.nextAt),a.duration):0;
 if(!startAt){commit('Starting transcription');p.words=p.words.filter(w=>w.assetId!==a.id);p.transcriptGaps[a.id]=[]}
 p.transcriptProgress[a.id]={nextAt:startAt,total:a.duration,status:'working'};
 asrBusy=true;asrStop=false;renderInspector();
 try{
  const result=await transcribe(a.file,a.id,p.settings,asrProgress,()=>asrStop,{
   durationHint:a.duration,startAt,
   onPartial:async info=>{
    // Keep already completed words visible in CC immediately after every Whisper window.
    p.words=appendLiveWords(p.words,info.words);
    if(p.selectedAsset===a.id){
     const text=info.words.map(w=>w.text).join(' ');
     const live=$('liveCaptionPreview');if(live&&text)live.textContent=text;
     const status=$('liveTranscriptStream');if(status)status.textContent=`Recognized ${fmt(info.from)}–${fmt(info.to)} · ${info.words.length} new words`;
     const last=info.words.at(-1);
     if(followWhisperCaptions&&last&&!engine.playing){
      const target=sourceToTimelineTime(p.segments,a.id,(last.start+last.end)/2);
      if(target!==null)engine.seek(target).catch(()=>{});
     }else engine.draw();
    }
   },
   onCheckpoint:async cp=>{
    // Words were already appended by onPartial; do not double-insert them at save time.
    p.transcriptGaps[a.id].push(...cp.gaps);
    p.transcriptProgress[a.id]={nextAt:cp.nextAt,total:cp.total,status:'paused'};
    await saveProject({...p,assets:p.assets.map(({url,file,...rest})=>rest)});
    asrProgress(cp.nextAt/cp.total,`Saved ${fmt(cp.nextAt)} / ${fmt(cp.total)} · ${p.words.filter(w=>w.assetId===a.id).length} words`);
   }
  });
  const sourceWords=p.words.filter(w=>w.assetId===a.id);
  p.words=p.words.filter(w=>w.assetId!==a.id).concat(reconcileWords(sourceWords));
  p.transcriptProgress[a.id]={nextAt:result.total,total:result.total,status:'complete'};
  await save(false);update();
  toast(`Completed ${fmt(result.total)} of audio. ${sourceWords.length} words saved. Review approximate subtitle timing.`);
 }catch(e){
  const progress=p.transcriptProgress[a.id];if(progress)progress.status='paused';
  await save(false);
  toast(`${asrStop?'Paused':'Transcription stopped'} at ${fmt(progress?.nextAt||0)}. ${e.message}. Use Resume to continue without restarting.`,!asrStop);
 }finally{asrBusy=false;asrStop=false;renderInspector()}
});
 on('retryAllGaps',async()=>{const a=asset(p.selectedAsset),gaps=p.transcriptGaps?.[a?.id]||[];if(!a?.file||!gaps.length)return toast('No gaps to retry or media file missing',true);asrBusy=true;asrStop=false;renderInspector();try{const extra=await retryGaps(a.file,a.id,p.settings,gaps,asrProgress,()=>asrStop,{durationHint:a.duration});commit();p.words=p.words.filter(w=>w.assetId!==a.id).concat(reconcileWords([...p.words.filter(w=>w.assetId===a.id),...extra]));p.transcriptGaps[a.id]=gaps.filter(g=>!extra.some(w=>w.start<g.end&&w.end>g.start));update();toast(`Retried ${gaps.length} flagged intervals; ${p.transcriptGaps[a.id].length} still unresolved. Review every flagged span.`)}catch(e){toast(`Gap retry failed: ${e.message}`,true)}finally{asrBusy=false;renderInspector()}});
 on('cancelAsr',()=>{asrStop=true;toast('Stopping after the current recognition chunk')});
 const srt=$('srtUpload');if(srt)srt.onchange=async()=>{
  if(!p.selectedAsset)return toast('Choose a source',true);
  const file=srt.files?.[0];srt.value='';if(!file)return;
  const words=parseSRT(await file.text(),p.selectedAsset);
  if(!words.length)return toast('No SRT cues were recognized',true);
  const mode=$('srtTimeBasis')?.value||'source';
  if(mode==='edited'){
   const mapped=projectSubtitleWordsToSource(words,p);
   if(!mapped.length)return toast('None of those edited-timeline subtitle times fall inside the current clips.',true);
   const sourceIds=new Set(mapped.map(w=>w.assetId));
   if(!confirm('This SRT uses the EDITED project timeline, not the original video timestamps. Replace transcript words in the affected clip ranges for '+sourceIds.size+' source(s)? Existing words outside those ranges will be preserved.'))return;
   const affected=new Map();
   for(const w of mapped){
    if(!affected.has(w.assetId))affected.set(w.assetId,[]);
    affected.get(w.assetId).push([w.start,w.end]);
   }
   commit('Imported edited-timeline SRT');
   p.words=p.words.filter(w=>!(affected.get(w.assetId)||[]).some(([start,end])=>w.end>start&&w.start<end)).concat(mapped);
   update();toast('Imported '+mapped.length+' edited-timeline words into original source time. Video and captions retain their alignment.');
  }else{
   commit('Imported original-source SRT');
   p.words=p.words.filter(w=>w.assetId!==p.selectedAsset).concat(words);
   update();toast('Imported '+words.length+' words in original-video time for '+(asset(p.selectedAsset)?.name||'selected source'));
  }
 };
 const syncControl=$('subtitleOffsetInput');
 const setSubtitleOffset=raw=>{
  if(!p.selectedAsset)return toast('Select original source first',true);
  const value=Number(raw);
  if(!Number.isFinite(value)||Math.abs(value)>3600)return toast('Subtitle offset must be between −3600 and +3600 seconds',true);
  commit('Aligned subtitles');
  p.subtitleOffsets||={};
  p.subtitleOffsets[p.selectedAsset]=Math.round(value*1000)/1000;
  update();
  toast('Caption shift saved: '+(value>=0?'+':'')+value.toFixed(2)+' seconds for '+(asset(p.selectedAsset)?.name||'original video'));
 };
 if(syncControl)syncControl.onchange=()=>setSubtitleOffset(syncControl.value);
 on('subtitleEarlier',()=>setSubtitleOffset(subtitleOffset(p,p.selectedAsset)-.25));
 on('subtitleLater',()=>setSubtitleOffset(subtitleOffset(p,p.selectedAsset)+.25));
 on('subtitleReset',()=>setSubtitleOffset(0));
 on('subtitleAlignSelected',()=>{
  if(!selectedUtt||selectedUtt.assetId!==p.selectedAsset)return toast('Click the subtitle line you want to align first',true);
  const here=sourceTimestampAtProjectTime(p.segments,engine.time,p.selectedAsset);
  if(!here)return toast('Pause the main video on a clip from the same original source',true);
  if(engine.playing)return toast('Pause playback at the exact start of the spoken phrase first',true);
  const actual=engine.video?.readyState>=2&&!engine.video.seeking&&engine.loadedAsset===p.selectedAsset&&Math.abs(engine.video.currentTime-here.sourceTime)<.4?engine.video.currentTime:here.sourceTime;
  setSubtitleOffset(actual-selectedUtt.start);
 });
 const transcriptAsset=$('transcriptAsset');if(transcriptAsset)transcriptAsset.onchange=()=>{p.selectedAsset=transcriptAsset.value;selectedUtt=null;renderAssets();renderInspector()};const transcriptSearch=$('transcriptSearch');if(transcriptSearch)transcriptSearch.oninput=()=>{searchTerm=transcriptSearch.value;renderInspector();$('transcriptSearch')?.focus()};
 c.querySelectorAll('[data-utterance]').forEach(e=>e.onclick=()=>{const t=Number(e.dataset.utterance);const u=utterances(p.words.filter(w=>w.assetId===p.selectedAsset)).find(x=>Math.abs(x.start-t)<.02);if(!u)return;selectedUtt={assetId:u.assetId,start:u.start,end:u.end};const text=$('uttText'),sp=$('speakerEdit');if(text)text.value=u.text;if(sp)sp.value=u.speaker;toast(`Selected ${fmt(u.start)}–${fmt(u.end)} in source`)});
 on('applyUtt',()=>{if(!selectedUtt)return toast('Choose an excerpt above',true);const match=p.words.filter(w=>w.assetId===selectedUtt.assetId&&w.start>=selectedUtt.start-.02&&w.end<=selectedUtt.end+.02);if(!match.length)return toast('Original words unavailable',true);const text=$('uttText').value,sp=$('speakerEdit').value||'Speaker 1',replacement=timeWords(text,selectedUtt.assetId,selectedUtt.start,selectedUtt.end-selectedUtt.start).map(w=>({...w,speaker:sp}));commit();p.words=p.words.filter(w=>!match.includes(w)).concat(replacement);selectedUtt=null;update();toast('Transcript corrected')});
 on('exportSRT',()=>download(toSRT(mapWords(p)),`${p.name}.srt`,'text/plain'));on('saveSrt',()=>download(toSRT(mapWords(p)),`${p.name}.srt`,'text/plain'));
 const prompt=$('directorPrompt');
 if(prompt)prompt.oninput=()=>{
  p.settings.directorInstructions=prompt.value;
  const hint=$('directionEvidenceHint'),focus=parseEditorialDirection(prompt.value);
  if(hint)hint.textContent=focus.focus.length
   ?'Looking for: '+focus.focus.join(', ')+'. '+(focus.exclude.length?'Avoiding: '+focus.exclude.join(', ')+'. ':'')+'Unverified enemy/teammate voice cues require transcript evidence.'
   :'Broad discovery: no requested content category identified. Specify trolling, revives, gunfights, clutch, or enemy proximity chat.';
  setStatus('Creative direction edited — Generate uses this text');
 };
 const focusPreset=$('pvpFocusPreset');
 if(focusPreset)focusPreset.onchange=()=>{
  if(!focusPreset.value)return;
  if(prompt){prompt.value=focusPreset.value;prompt.oninput?.()}
  else p.settings.directorInstructions=focusPreset.value;
 };
 const rememberKeyBox=$('rememberDirectorKey');
 if(rememberKeyBox)rememberKeyBox.onchange=()=>{
  saveDirectorKey(providerKey,{remember:rememberKeyBox.checked});
  toast(rememberKeyBox.checked?'API key will be kept in this browser until removed':'Stored API key cleared; current session key remains usable');
 };
 const providerInput=$('providerKey');
 if(providerInput)providerInput.oninput=()=>{
  providerKey=providerInput.value.trim();
  if(directorKeyRemembered())saveDirectorKey(providerKey,{remember:true});
 };
 on('forgetDirectorKey',()=>{
  clearDirectorKey();providerKey='';
  if($('providerKey'))$('providerKey').value='';
  toast('Saved Director API key cleared from this browser');
 });
 const followBox=$('followWhisperCaptions');
 if(followBox)followBox.onchange=()=>{followWhisperCaptions=followBox.checked};
 
 const runCurrentDirector=(exhaustive=false)=>{
  if(directorOutputMode(p,directorOutputPreference)==='stories')return generateMultiPovDirector();
  return runDirector(exhaustive);
 };
 on('generateClips',()=>runCurrentDirector(false));
 on('generatePvPClips',()=>{p.settings.directorInstructions=$('directorPrompt')?.value??p.settings.directorInstructions;p.settings.mode='cod-pvp';runCurrentDirector(true)});
 const outputSelect=$('directorOutputMode');if(outputSelect)outputSelect.onchange=()=>{
  directorOutputPreference=outputSelect.value;
  directorResultView='active';directorHour='all';directorShown=48;renderInspector();
 };
 const povReferenceInput=$('povReference');
 if(povReferenceInput)povReferenceInput.onchange=()=>{povReferenceChoice=povReferenceInput.value;povTargetChoice=povTargetChoice===povReferenceChoice?null:povTargetChoice;povSyncStatus='Select POV B, then synchronize this pair of original recordings.';renderInspector()};
 const povTargetInput=$('povTarget');
 if(povTargetInput)povTargetInput.onchange=()=>{povTargetChoice=povTargetInput.value;povSyncStatus='Run transcript matching or enter an offset for the selected POVs.';renderInspector()};
 on('syncPovTranscripts',()=>synchronizePovBySpeech());
 on('syncPovManual',()=>synchronizePovManually());
 const storyPacingSelect=$('povStoryPacing');if(storyPacingSelect)storyPacingSelect.onchange=()=>{povStoryPacing=storyPacingSelect.value};
 on('generateMultiPovHighlights',()=>generateMultiPovDirector());
 on('cancelVisionReview',()=>directorAbort?.abort());
 on('scanGameplayBtn',async()=>{
  try{
   if(directorOutputMode(p,directorOutputPreference)==='stories'){
    const {reference,target}=getPovPair();
    if(!p.povSync||p.povSync.referenceId!==reference.id||p.povSync.targetId!==target.id)
     throw Error('Synchronize the selected POV recordings first to scan only their overlap.');
    await runGameplayScan(null,{windows:overlappingPovWindows(p.povSync,reference,target)});
   }else await runGameplayScan();
  }catch(e){gameplayStatus=e.message;toast('Gameplay scan: '+e.message,true);renderInspector()}
 });
 on('cancelGameplayScan',()=>gameplayAbort?.abort());
 on('generateAllClips',()=>runCurrentDirector(true));
 on('clearCandidates',()=>{commit('Cleared unstarred proposals');const kept=p.candidates.filter(c=>c.favorite);p.candidates=kept;directorShown=48;update();toast('Cleared unstarred cards; '+kept.length+' favorite(s) preserved. Search history is unchanged.')});
 on('resetDirectorHistory',()=>{
  if(!confirm('Reset all previous Director searches and proposed clips? Your video source, transcript and edited timeline will remain unchanged.'))return;
  commit('Reset Director history');const kept=p.candidates.filter(c=>c.favorite);p.directorHistory=[];p.candidates=kept;p.visionAudit=[];p.directorBatches=[];p.directorActiveBatchId=null;directorResultView='active';directorShown=48;directorHour='all';update();toast('Director search history reset without changing the source recording, subtitles or editor cuts.');
 });
 on('moreCandidates',()=>{directorShown+=48;renderInspector()});
 const viewSelect=$('directorResultsView');if(viewSelect)viewSelect.onchange=()=>{directorResultView=viewSelect.value;directorShown=48;directorHour='all';renderInspector()};
 const hourPicker=$('directorHourFilter');
 if(hourPicker)hourPicker.onchange=()=>{directorHour=hourPicker.value;directorShown=48;renderInspector()};

 const favFilter=$('directorFavoritesOnly');
 if(favFilter)favFilter.onchange=()=>{directorFavoritesOnly=favFilter.checked;directorShown=48;directorHour='all';renderInspector()};
 c.querySelectorAll('[data-candidate-favorite]').forEach(b=>b.onclick=()=>{
  const candidate=p.candidates.find(c=>c.id===b.dataset.candidateFavorite);
  if(!candidate)return;commit('Favorite candidate');candidate.favorite=!candidate.favorite;
  update();toast(candidate.favorite?'Candidate saved to favorites':'Candidate removed from favorites');
 });
 c.querySelectorAll('[data-candidate-review]').forEach(e=>e.onclick=()=>{const candidate=p.candidates.find(x=>x.id===e.dataset.candidateReview);if(!candidate)return;const r=inspectStory(candidate.segments,p.words,p.assets);const summary=[`Editorial review: ${r.score}/100 (heuristic, not predictive)`,...r.strengths,...r.issues.map(i=>`${i.level}: ${i.message}`)].join('\n');alert(summary)});
 c.querySelectorAll('[data-candidate-variant]').forEach(e=>e.onclick=()=>{const candidate=p.candidates.find(x=>x.id===e.dataset.candidateVariant);if(!candidate||candidate.segments.length<2)return toast('Need at least two moments for an alternate opening',true);commit();const variant={...candidate,id:uid(),favorite:false,title:`Alternate opening: ${candidate.title}`,segments:alternateOpener(candidate.segments,1).map(s=>({...s,id:uid()})),reason:`Alternate opener based on the same original footage. Chronology and story context need review.`,createdAt:Date.now()};p.candidates.unshift(variant);update();toast('Alternative edit created. Verify it preserves the meaning of source events.')});
 c.querySelectorAll('[data-candidate-use],[data-candidate-play]').forEach(e=>e.onclick=async()=>{const id=e.dataset.candidateUse||e.dataset.candidatePlay,candidate=p.candidates.find(x=>x.id===id);if(!candidate)return;commit();p.segments=candidate.segments.map(s=>({...s,id:uid(),favorite:!!s.favorite||!!candidate.favorite}));p.selectedSegment=p.segments[0]?.id||null;engine.pause();await engine.seek(0);update();const missing=[...new Set(candidate.segments.map(s=>s.assetId))].filter(id=>!asset(id)?.url);if(missing.length)toast('This clip has captions, but the original video file is not linked. Click Relink original video in the preview and select the SAME recording.',true);if(e.dataset.candidatePlay){await engine.play()}else chooseTab('editor');toast(`Opened proposal: ${candidate.title}`)});
 on('removeSeg',removeSelected);on('splitSelected',splitSelected);on('cleanDeadAir',()=>{const segments=removeDeadAir(p,p.selectedSegment,1.2,.16);if(!segments)return toast('No long gaps found, or this clip needs transcript timestamps',true);commit();const i=p.segments.findIndex(s=>s.id===p.selectedSegment);p.segments.splice(i,1,...segments);p.selectedSegment=segments[0].id;update();toast(`Removed long gaps; created ${segments.length} shorter cuts`)});on('duplicateSeg',()=>{const i=p.segments.findIndex(s=>s.id===p.selectedSegment);if(i<0)return;commit();const seg={...p.segments[i],id:uid()};p.segments.splice(i+1,0,seg);p.selectedSegment=seg.id;update()});
 on('overlayAudio',()=>{const a=asset(p.selectedAsset);if(a?.type!=='audio')return toast('Select an audio-only asset in the left library',true);commit();const newA={id:uid(),assetId:a.id,start:engine.time,sourceStart:0,duration:Math.min(a.duration||30,Math.max(1,duration(p)-engine.time)),volume:p.settings.audioVolume,role:'voice'};p.audio.push(newA);p.selectedAudio=newA.id;p.selectedSegment=null;update()});on('removeAudio',()=>{commit();p.audio=p.audio.filter(x=>x.id!==p.selectedAudio);p.selectedAudio=null;update()});
 on('recordVoice',recordVoice);
 on('doExport',doExport);on('cancelExport',()=>engine.cancelRender());on('saveEdl',()=>download(JSON.stringify({version:1,segments:p.segments,audio:p.audio,settings:p.settings},null,2),`${p.name}-cuts.json`,'application/json'));on('saveBundle',()=>download(JSON.stringify({...p,assets:p.assets.map(({file,url,...rest})=>rest)},null,2),`${p.name}-project.json`,'application/json'));

 // Production Tools: metadata reports and user-managed project checkpoints.
 const safeFile=()=>String(p.name||'project').replace(/[\\/:*?"<>|]/g,'-').slice(0,80)||'project';
 on('toolsExportCSV',()=>download(cutSheetCSV(p),safeFile()+'-cuts.csv','text/csv;charset=utf-8'));
 on('toolsExportChapters',()=>download(chaptersText(p),safeFile()+'-chapters.txt','text/plain;charset=utf-8'));
 on('toolsExportAudit',()=>download(JSON.stringify(projectAudit(p),null,2),safeFile()+'-audit.json','application/json'));
 on('toolsAddMarker',()=>{
  if(duration(p)<=0)return toast('Add footage before creating a timeline marker.',true);
  const label=$('toolsMarkerName')?.value.trim()||'Marker',kind=$('toolsMarkerKind')?.value||'note';
  commit('Marker added');p.markers||=[];p.markers.push({id:uid(),time:Number(engine.time.toFixed(3)),label:label.slice(0,120),kind});
  update();toast('Saved timeline marker');
 });
 c.querySelectorAll('[data-marker-jump]').forEach(b=>b.onclick=()=>{
  const marker=(p.markers||[]).find(m=>m.id===b.dataset.markerJump);if(marker)engine.seek(marker.time);
 });
 c.querySelectorAll('[data-marker-save]').forEach(b=>b.onclick=()=>{
  const marker=(p.markers||[]).find(m=>m.id===b.dataset.markerSave);if(!marker)return;
  const row=b.closest('article'),time=Number(row.querySelector('[data-marker-time]')?.value),label=row.querySelector('[data-marker-label]')?.value.trim();
  if(!Number.isFinite(time)||time<0||time>duration(p))return toast('Marker is outside the current timeline.',true);
  if(!label)return toast('Marker name is required.',true);
  commit('Marker edited');marker.time=time;marker.label=label.slice(0,120);marker.kind=row.querySelector('[data-marker-kind]')?.value||'note';update();
 });
 c.querySelectorAll('[data-marker-remove]').forEach(b=>b.onclick=()=>{
  if(!confirm('Remove this timeline marker?'))return;
  commit('Marker removed');p.markers=(p.markers||[]).filter(m=>m.id!==b.dataset.markerRemove);update();
 });
 on('toolsCreateSnapshot',async()=>{
  const button=$('toolsCreateSnapshot');button.disabled=true;
  try{
   const snap=createSnapshot(p,$('toolsSnapshotName')?.value,uid());
   await saveSnapshot(snap);snapshotRecords=await listSnapshots(p.id);
   if(tab==='tools')renderInspector();toast('Named project snapshot saved. Media files are not embedded.');
  }catch(e){toast('Snapshot failed: '+e.message,true)}
  finally{if(button.isConnected)button.disabled=false}
 });
 c.querySelectorAll('[data-snapshot-restore]').forEach(b=>b.onclick=async()=>{
  const record=snapshotRecords.find(x=>x.id===b.dataset.snapshotRestore);
  if(!record)return toast('Snapshot not found.',true);
  if(!confirm('Restore "'+record.name+'"? Current unsaved edits will be replaced. Save a snapshot first if needed.'))return;
  try{
   const saved=await loadSnapshot(record.id);
   if(!saved?.project)throw Error('Snapshot data not found');
   const next=validateProject(saved.project);
   for(const a of next.assets){
    const cached=assets.get(a.id);
    if(cached?.url&&cached.name===a.name&&cached.size===a.size){a.url=cached.url;continue}
    const file=await loadMedia(a.id);
    if(file&&file.name===a.name&&file.size===a.size){
     const url=URL.createObjectURL(file);a.url=url;assets.set(a.id,{...a,file,url});
    }
   }
   engine.pause();clearTimeout(saving);history.push(clone());future=[];p=next;update();
   toast('Snapshot restored. Review any missing source links.');
  }catch(e){toast('Restore failed: '+e.message,true)}
 });
 c.querySelectorAll('[data-snapshot-delete]').forEach(b=>b.onclick=async()=>{
  if(!confirm('Delete this recovery snapshot?'))return;
  try{await deleteSnapshot(b.dataset.snapshotDelete);snapshotRecords=await listSnapshots(p.id);if(tab==='tools')renderInspector();toast('Snapshot deleted')}
  catch(e){toast('Snapshot deletion failed: '+e.message,true)}
 });
 const bindToolSearch=()=>c.querySelectorAll('[data-tool-result]').forEach(b=>b.onclick=()=>{
  const a=asset(b.dataset.toolResult);if(!a)return toast('Source unavailable',true);
  p.selectedAsset=a.id;chooseTab('media');renderAssets();syncSourceRange();
  const start=Math.max(0,Number(b.dataset.toolStart)-1),end=Math.min(Number(a.duration)||0,Number(b.dataset.toolEnd)+2);
  $('sourceIn').value=start.toFixed(2);$('sourceOut').value=end.toFixed(2);
  const vid=$('sourcePreview');
  if(vid){const seek=()=>{try{vid.currentTime=start}catch{}};if(vid.readyState)seek();else vid.addEventListener('loadedmetadata',seek,{once:true})}
  toast('Located source transcript match. Verify the original footage.');
 });
 const searchField=$('toolsSearch');
 if(searchField){searchField.oninput=()=>{
  toolsSearch=searchField.value;
  const result=$('toolsSearchResults');if(result){result.innerHTML=toolSearchResultsHTML(p,toolsSearch);bindToolSearch()}
 };bindToolSearch()}
 // Frame-relative ripple trimming; no content is deleted from the original file.
 const trimToPlayhead=edge=>{
  const loc=segmentAt(p,engine.time),seg=loc?.seg;
  if(!seg||seg.id!==p.selectedSegment)return toast('Select the clip under the playhead first.',true);
  const t=seg.start+loc.local;
  if(t-seg.start<.1||seg.end-t<.1)return toast('Move the playhead inside the clip, away from the edges.',true);
  commit('Clip trimmed');if(edge==='left')seg.start=t;else seg.end=t;update();
 };
 on('trimStartAtPlayhead',()=>trimToPlayhead('left'));
 on('trimEndAtPlayhead',()=>trimToPlayhead('right'));
 const moveSelected=step=>{
  const i=p.segments.findIndex(x=>x.id===p.selectedSegment),j=i+step;
  if(i<0||j<0||j>=p.segments.length)return;
  commit('Reordered cut');const [item]=p.segments.splice(i,1);p.segments.splice(j,0,item);update();
 };
 on('moveClipEarlier',()=>moveSelected(-1));on('moveClipLater',()=>moveSelected(1));
 on('checkStorage',async()=>{const q=await quota();$('storageInfo').textContent=q?`Used: ${(q.usage/1073741824).toFixed(2)} GB, estimated quota: ${(q.quota/1073741824).toFixed(2)} GB`:'Quota information unavailable'});
 on('clearCachedMedia',async()=>{if(!confirm('Delete saved media files from browser storage? Project edits will remain, but you must relink source files.'))return;const {clearMedia}=await import('./storage.js');await clearMedia();toast('Cached files removed; source files remain available until reload')});}
function removeSelected(){const i=p.segments.findIndex(s=>s.id===p.selectedSegment);if(i<0)return;commit();p.segments.splice(i,1);p.selectedSegment=p.segments[Math.min(i,p.segments.length-1)]?.id||null;update()}
function splitSelected(){const loc=segmentAt(p,engine.time),seg=loc?.seg;if(!seg)return toast('Place playhead inside a video segment',true);const splitAt=seg.start+loc.local;if(splitAt-seg.start<.1||seg.end-splitAt<.1)return toast('Move playhead away from segment boundaries',true);commit();const index=p.segments.findIndex(s=>s.id===seg.id),second={...seg,id:uid(),start:splitAt};p.segments[index].end=splitAt;p.segments.splice(index+1,0,second);p.selectedSegment=second.id;update()}
async function recordVoice(){const b=$('recordVoice');if(audioRecorder?.state==='recording'){audioRecorder.stop();return}try{const stream=await navigator.mediaDevices.getUserMedia({audio:true});const type=['audio/webm;codecs=opus','audio/webm','audio/mp4'].find(t=>MediaRecorder.isTypeSupported(t));audioChunks=[];audioRecorder=new MediaRecorder(stream,type?{mimeType:type}:undefined);recordStart=engine.time;audioRecorder.ondataavailable=e=>{if(e.data.size)audioChunks.push(e.data)};audioRecorder.onstop=async()=>{stream.getTracks().forEach(t=>t.stop());const blob=new Blob(audioChunks,{type:audioRecorder.mimeType||'audio/webm'}),file=new File([blob],`Voiceover-${Date.now()}.${blob.type.includes('mp4')?'m4a':'webm'}`,{type:blob.type});const a=await addFile(file);const measured=Math.max(.2,(Date.now()-recordStartedAt)/1000);if(a.duration<=0)a.duration=measured;commit();p.audio.push({id:uid(),assetId:a.id,start:recordStart,sourceStart:0,duration:a.duration,volume:1,role:'voice'});update();toast('Recorded narration added to the audio track');audioRecorder=null};recordStartedAt=Date.now();audioRecorder.start(250);b.textContent='■ Stop recording';b.classList.add('recording');toast('Microphone recording started') }catch(e){toast(`Microphone: ${e.message}`,true)}}
async function doExport(){if(renderBusy)return;renderBusy=true;renderInspector();try{await engine.record({onProgress:r=>{if($('renderProgress'))$('renderProgress').style.width=`${Math.round(r*100)}%`},onStatus:s=>{if($('renderStatus'))$('renderStatus').textContent=s}});toast('Video exported successfully')}catch(e){toast(`Export failed: ${e.message}`,true)}finally{renderBusy=false;renderInspector()}}
async function probe(file,url,type){if(type==='image'){return new Promise(resolve=>{const img=new Image();img.onload=()=>resolve({duration:15,width:img.naturalWidth,height:img.naturalHeight});img.onerror=()=>resolve({duration:15});img.src=url})}return new Promise(resolve=>{const m=document.createElement(type==='audio'?'audio':'video');m.preload='metadata';let settled=false;const done=()=>{if(settled)return;settled=true;resolve({duration:Number.isFinite(m.duration)?m.duration:0,width:m.videoWidth||0,height:m.videoHeight||0});m.removeAttribute('src');m.load()};m.onloadedmetadata=done;m.onerror=done;setTimeout(done,9000);m.src=url})}
/** Replace an original source in place, preserving stable asset IDs and all edits/transcripts.
 * Converted/renamed files are allowed but timestamp alignment must be checked. */
async function relinkSourceFile(assetId,file,handle=null){
 const original=p.assets.find(x=>x.id===assetId);
 if(!original)throw Error('The selected video is missing from this project');
 if(original.type!=='video')throw Error('Choose a video source to relink');
 if(!file||!(file.type.startsWith('video/')||/\.(mkv|mov|mp4|m4v|avi|webm)$/i.test(file.name)))
  throw Error('Select the original video or a compatible replacement file');
 const url=URL.createObjectURL(file);
 let info;
 try{info=await probe(file,url,'video')}
 catch(e){URL.revokeObjectURL(url);throw e}
 if(!(Number.isFinite(info.duration)&&info.duration>0&&info.width>0&&info.height>0)){
  URL.revokeObjectURL(url);
  throw Error('Chrome could not read a playable video track in '+file.name+'. Convert to H.264/AAC MP4 or VP8/Opus WebM and try again.');
 }
 const warning=relinkSynchronizationWarning(original,{name:file.name,size:file.size,duration:info.duration});
 if(warning&&!confirm(
  warning+'\n\nThe app will preserve all original transcript times and clip boundaries. After relinking, check captions near the beginning and end. Continue?'
 )){URL.revokeObjectURL(url);return false}
 const prev=assets.get(original.id);
 commit('Relinked source video');
 if(p.gameplayTracks)delete p.gameplayTracks[original.id];Object.assign(original,{name:file.name,size:file.size,lastModified:file.lastModified,mime:file.type||'',duration:info.duration,width:info.width,height:info.height,url});
 assets.set(original.id,{...original,file,url});
 p.selectedAsset=original.id;
 update();
 if(prev?.url&&prev.url!==url)URL.revokeObjectURL(prev.url);
 if(handle)saveMediaHandle(original.id,handle).then(()=>savedHandles.set(original.id,handle)).catch(e=>toast('Could not remember source permission: '+e.message,true));
  if(p.settings.rememberMedia&&file.size<=256*1024*1024)saveMedia(original.id,file).catch(e=>toast('Could not cache relinked source: '+e.message,true));
 else deleteMedia(original.id).catch(()=>{});
 toast('Video linked to the original source. Subtitle timestamps have NOT been changed. Verify caption alignment in Transcript → Subtitle synchronization.');
 return true;
}

async function addFile(file,handle=null){const existing=p.assets.find(a=>a.name===file.name&&a.size===file.size);if(existing){const prev=assets.get(existing.id);if(prev?.url)URL.revokeObjectURL(prev.url);const url=URL.createObjectURL(file);Object.assign(existing,{url});assets.set(existing.id,{...existing,file,url});p.selectedAsset=existing.id;if(handle)saveMediaHandle(existing.id,handle).then(()=>savedHandles.set(existing.id,handle)).catch(e=>toast('Could not remember file access: '+e.message,true));if(p.settings.rememberMedia&&file.size<=256*1024*1024)saveMedia(existing.id,file).catch(()=>{});return existing}
const type=file.type.startsWith('video')||/\.(mkv|mp4|mov|avi|webm)$/i.test(file.name)?'video':file.type.startsWith('image')?'image':'audio',id=uid(),url=URL.createObjectURL(file),info=await probe(file,url,type),data={id,name:file.name,type,mime:file.type||'',size:file.size,lastModified:file.lastModified,duration:info.duration|| (type==='image'?15:0),width:info.width||0,height:info.height||0,url};p.assets.push(data);assets.set(id,{...data,file});p.selectedAsset=id;if(handle)saveMediaHandle(id,handle).then(()=>savedHandles.set(id,handle)).catch(e=>toast('Could not remember source permission: '+e.message,true));if(p.settings.rememberMedia&&file.size<=256*1024*1024)saveMedia(id,file).catch(e=>toast(`Media cache not saved: ${e.message}`,true));else if(p.settings.rememberMedia&&file.size>256*1024*1024&&!handle)toast('Large file is linked for now. For auto-reconnection next time, use Import & Remember or choose the file again.');return data}
async function importRememberedFiles(){
 if(typeof window.showOpenFilePicker!=='function')return toast('Chrome file handles are unavailable. Use Import; files under 256 MB can be cached. Large files must be relinked manually.',true);
 try{
  // Called directly from a user click so Chrome can grant persistent read access.
  const handles=await window.showOpenFilePicker({multiple:true});
  const files=[],fileHandles=new Map();
  for(const handle of handles){
   if(handle.kind!=='file')continue;
   const file=await handle.getFile();
   files.push(file);fileHandles.set(file,handle);
  }
  if(files.length)await importFiles(files,fileHandles);
 }catch(e){if(e.name!=='AbortError')toast('Import & Remember: '+e.message,true)}
}
function syncSourceRange(){const a=asset(p.selectedAsset);$('sourceIn').value='0';$('sourceOut').value=sourceSecondsValue(a);}
async function importFiles(files,handles=new Map()){
 const array=[...files].filter(x=>x.type.startsWith('video/')||x.type.startsWith('audio/')||x.type.startsWith('image/')||/\.(mkv|mov|mp4|webm|wav|mp3|m4a)$/i.test(x.name));
 if(!array.length)return toast('No supported media files selected',true);
 commit();let imported=0,inserted=0,relinked=0;
 for(const file of array){try{
  const missing=possibleMissingSourceRelink(p.assets,file,p.segments,p.words);
  if(missing&&confirm('A saved project has an unlinked original recording: '+missing.name+'.\n\nWould you like to RELINK that original with '+file.name+' instead of adding a new video? Relinking keeps your existing SRT subtitles, cuts, and AI Director clips.\n\nChoose Cancel if this is a separate new recording.')){
   const success=await relinkSourceFile(missing.id,file,handles.get(file)||null);
   if(success){imported++;relinked++;continue}
   continue;
  }
  const previous=p.assets.some(x=>x.name===file.name&&x.size===file.size);
  const a=await addFile(file,handles.get(file)||null);imported++;if(previous)relinked++;
  if(shouldAutoInsertMedia(a,p.segments.some(s=>s.assetId===a.id),p.settings)){
   const cut=entireSourceCut(a);p.segments.push(cut);p.selectedSegment=cut.id;inserted++;
  }else if(a.type==='video'&&!a.duration)toast('Could not determine '+a.name+' duration. Try converting to MP4/H.264.',true);
 }catch(e){toast('Import '+file.name+': '+e.message,true)}
 }
 syncSourceRange();update();
 toast('Imported '+imported+' source(s); relinked '+relinked+' existing recordings; added '+inserted+' new full-source cuts ('+fmt(duration(p))+').');
}
function refreshLastProjectButton(){
 const button=$('loadLastProject'),hint=$('lastProjectHint');
 if(button){button.disabled=!lastSavedInfo||restoreBusy;button.title=lastSavedInfo?'Load '+lastSavedInfo.name+' · '+(lastSavedInfo.assets||0)+' sources':'No previously saved project found';}
 if(hint)hint.textContent=lastSavedInfo?'Saved: '+lastSavedInfo.name:'New project · nothing saved';
}
function showMissingMedia(){
 const missing=p.assets.filter(a=>!a.url),button=$('reconnectSavedMedia');
 if(button){button.hidden=!missing.length;button.textContent='Reconnect '+missing.length+' file'+(missing.length===1?'':'s');}
 return missing;
}
function attachStoredFile(a,file){
 if(!file||file.name!==a.name||file.size!==a.size) return false;
 if(Number.isFinite(a.lastModified)&&a.lastModified&&file.lastModified&&a.lastModified!==file.lastModified)return false;
 const url=URL.createObjectURL(file);
 a.url=url;assets.set(a.id,{...a,file,url});
 return true;
}
async function linkSavedAssets(){
 let reconnected=0; savedHandles.clear();
 for(const a of p.assets){
  try{
   const cached=await loadMedia(a.id);
   if(cached&&attachStoredFile(a,cached)){reconnected++;continue}
  }catch(e){console.warn('Media cache unavailable',a.name,e)}
  try{
   const handle=await loadMediaHandle(a.id);
   if(!handle||handle.kind!=='file')continue;
   savedHandles.set(a.id,handle);
   if((await handle.queryPermission({mode:'read'}))!=='granted')continue;
   if(attachStoredFile(a,await handle.getFile()))reconnected++;
  }catch(e){console.warn('Saved file permission unavailable',a.name,e)}
 }
 return reconnected;
}
async function loadLastProject(){
 if(restoreBusy)return;
 if(sessionActive&&(p.assets.length||p.segments.length||p.words.length)&&!confirm('Load your last saved project? Current unsaved work will be replaced. Save it first if needed.'))return;
 restoreBusy=true;refreshLastProjectButton();clearTimeout(saving);
 try{
  const saved=await loadProject();if(!saved){lastSavedInfo=null;return toast('No previously saved project available.',true)}
  const next=validateProject(saved);engine.pause();
  for(const x of assets.values())if(x.url)URL.revokeObjectURL(x.url);
  assets.clear();history=[];future=[];p=next;
  // A user-selected project must not overwrite the stored copy until it is fully loaded.
  sessionActive=false;engine.time=0;
  const connected=await linkSavedAssets();
  sessionActive=true;draw();
  const missing=showMissingMedia();
  if(missing.length)toast('Loaded '+p.name+': '+connected+' source(s) reconnected automatically. '+missing.length+' need file permission or relinking.',true);
  else toast('Loaded '+p.name+' with all '+connected+' source file(s) reconnected.');
 }catch(e){toast('Load last project failed: '+e.message,true)}
 finally{restoreBusy=false;refreshLastProjectButton()}
}
async function restore(){
 // Always open a fresh, unsaved project. Never overwrite the last saved project on startup.
 sessionActive=false;draw();
 try{
  const saved=await loadProject();
  lastSavedInfo=saved?{id:saved.id,name:saved.name,modifiedAt:saved.modifiedAt,assets:saved.assets?.length||0}:null;
 }catch(e){console.warn('Last project metadata unavailable',e)}
 refreshLastProjectButton();showMissingMedia();
}
async function reconnectMissingFiles(){
 const missing=showMissingMedia();
 if(!missing.length)return toast('All project media is connected.');
 const prompts=[];
 for(const a of missing){const handle=savedHandles.get(a.id);if(handle)prompts.push({a,handle})}
 if(!prompts.length)return $('fileUpload').click();
 try{
  // Permissions must be requested only from an explicit user click.
  const permissions=prompts.map(x=>x.handle.requestPermission({mode:'read'}).then(value=>({...x,allowed:value==='granted'})).catch(()=>({...x,allowed:false})));
  const granted=await Promise.all(permissions);
  let connected=0;
  for(const {a,handle,allowed} of granted){
   if(!allowed)continue;
   try{if(attachStoredFile(a,await handle.getFile()))connected++}
   catch(e){toast('Could not reconnect '+a.name+': '+e.message,true)}
  }
  update();const left=showMissingMedia();
  if(left.length)toast('Reconnected '+connected+' source(s). '+left.length+' still missing; use Import/Relink to select their original files.',true);
  else toast('All project files reconnected.');
 }catch(e){toast('Reconnection failed: '+e.message,true)}
}

function openJSON(file){file.text().then(text=>{try{const newp=validateProject(JSON.parse(text));engine.pause();history=[];future=[];assets.forEach(a=>a.url&&URL.revokeObjectURL(a.url));assets.clear();p=newp;draw();toast('Project loaded. Import original media to relink by filename and file size.')}catch(e){toast(`Could not open project: ${e.message}`,true)}})}
function bind(){all('.tab').forEach(b=>b.onclick=()=>chooseTab(b.dataset.tab));$('projectName').onchange=e=>{commit();p.name=e.target.value||'Untitled Project';setStatus('Renamed')};$('newProject').onclick=()=>{if(!confirm('Create a new project? Save/export your current project first.'))return;engine.pause();history=[];future=[];p=newProject();assets.forEach(a=>a.url&&URL.revokeObjectURL(a.url));assets.clear();draw()};$('saveProject').onclick=()=>save();$('exportProject').onclick=()=>download(JSON.stringify({...p,assets:p.assets.map(({file,url,...rest})=>rest)},null,2),`${p.name}-project.json`,'application/json');$('loadProject').onchange=e=>e.target.files[0]&&openJSON(e.target.files[0]);$('goExport').onclick=()=>chooseTab('export');$('fileUpload').onchange=e=>{importFiles(e.target.files);e.target.value=''};$('relinkFromPreview').onclick=()=>{$('relinkSourceUpload').value='';$('relinkSourceUpload').click()};$('relinkSourceUpload').onchange=async e=>{const file=e.target.files?.[0];e.target.value='';if(!file)return;const sourceId=segmentAt(p,engine.time)?.seg?.assetId||p.selectedAsset;try{await relinkSourceFile(sourceId,file)}catch(error){toast('Relink failed: '+error.message,true)}};$('dropzone').onclick=()=>$('fileUpload').click();$('dropzone').onkeydown=e=>{if(e.key==='Enter')$('fileUpload').click()};for(const e of ['dragover','dragenter'])$('dropzone').addEventListener(e,x=>{x.preventDefault();$('dropzone').classList.add('dragover')});$('dropzone').ondragleave=()=>$('dropzone').classList.remove('dragover');$('dropzone').ondrop=e=>{e.preventDefault();$('dropzone').classList.remove('dragover');importFiles(e.dataTransfer.files)};$('addSelection').onclick=()=>{try{const a=asset(p.selectedAsset);if(!a)throw Error('Choose a source first');const seg=selectedSourceCut(a,$('sourceIn').value,$('sourceOut').value);commit();seg.transition=p.settings.transition;p.segments.push(seg);p.selectedSegment=seg.id;update();toast(`Added ${fmt(seg.end-seg.start)} from ${a.name}`)}catch(e){toast(e.message,true)}};$('addEntireSource').onclick=()=>{try{const a=asset(p.selectedAsset);const seg=entireSourceCut(a);commit();p.segments.push(seg);p.selectedSegment=seg.id;update();toast(`Added the complete ${fmt(seg.end)} source to the timeline`)}catch(e){toast(e.message,true)}};$('aspectSelect').onchange=e=>{commit();p.settings.aspect=e.target.value;engine.setSize();update()};$('toggleCaptions').onclick=()=>{commit();p.settings.captionOn=!p.settings.captionOn;update()};$('playButton').onclick=async()=>{await engine.play();engine.onTick(engine.time)};$('skipBack').onclick=()=>engine.seek(engine.time-5);$('skipForward').onclick=()=>engine.seek(engine.time+5);$('stepBackFrame').onclick=()=>engine.seek(engine.time-1/Math.max(1,Number(p.settings.fps)||30));$('stepForwardFrame').onclick=()=>engine.seek(engine.time+1/Math.max(1,Number(p.settings.fps)||30));$('playhead').oninput=e=>engine.seek(Number(e.target.value));$('mutePreview').onclick=()=>{engine.previewMuted=!engine.previewMuted;engine.syncAudio();engine.updateAudioUi(true)};
 $('previewVolume').oninput=e=>{engine.previewMuted=false;p.settings.videoVolume=Number(e.target.value)/100;engine.syncAudio();engine.updateAudioUi(true);setStatus('Preview volume updated')};
 $('restoreAudio').onclick=async()=>{
   try{
     engine.restoreSound();
     if(engine.audioCtx?.state==='suspended')await engine.audioCtx.resume();
     engine.updateAudioUi(true);
     setStatus('Sound restored');
     toast('Unmuted the preview and restored the current clip/game audio to 100%. Try Play.');
   }catch(e){toast('Restore sound: '+e.message,true)}
 };$('undoBtn').onclick=undo;$('redoBtn').onclick=redo;$('splitBtn').onclick=splitSelected;$('deleteBtn').onclick=removeSelected;$('fitBtn').onclick=()=>{timelinePixelsPerSecond=null;renderTimeline();toast('Fit full edit to timeline')};$('zoomInBtn').onclick=()=>{timelinePixelsPerSecond=Math.min(40,(timelinePixelsPerSecond||($('timelineScroller').clientWidth/Math.max(1,duration(p))))*2);renderTimeline()};$('zoomOutBtn').onclick=()=>{timelinePixelsPerSecond=Math.max(.05,(timelinePixelsPerSecond||($('timelineScroller').clientWidth/Math.max(1,duration(p))))/2);renderTimeline()};window.addEventListener('keydown',e=>{const focus=/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName||'');if(e.ctrlKey&&e.key.toLowerCase()==='s'){e.preventDefault();save();return}if(focus)return;if(e.key===' '){e.preventDefault();engine.play()}else if(e.key==='ArrowLeft'){e.preventDefault();engine.seek(engine.time-5)}else if(e.key==='ArrowRight'){e.preventDefault();engine.seek(engine.time+5)}else if(e.key==='Delete'||e.key==='Backspace')removeSelected();else if(e.ctrlKey&&e.key==='z'){e.preventDefault();e.shiftKey?redo():undo()}});window.addEventListener('beforeunload',()=>{clearTimeout(saving)})}
bind();restore();if('serviceWorker'in navigator&&location.protocol.startsWith('http'))navigator.serviceWorker.register('./sw.js',{scope:'./'}).catch(()=>{});
