import {frameTimecode,clipStartTime} from './timeline-workbench.js';
import {duration,fmt,escapeHTML as esc} from './model.js';
/** Professional but optional precision editing operations; all controls operate
 * on actual source ranges and current editor timeline. No inert affordances. */
export function timelineWorkbenchHTML(project,playhead,{open=false}={}){
 const selected=(project.segments||[]).find(s=>s.id===project.selectedSegment),hasSource=(project.assets||[]).some(a=>a.type==='video');
 const fps=Number(project.settings?.fps)||30;
 const from=selected?clipStartTime(project.segments,selected.id):null;
 const t=frameTimecode(playhead,fps);
 return '<div class="separator"></div><details id="precisionEditor" class="humor-advanced" '+(open?'open':'')+'>'+
 '<summary>Precision editing · timecodes, insert, overwrite, slip and roll</summary>'+
 '<p class="tiny muted">Every operation edits original source references without transcoding or fabricating footage. Undo is available after each edit. Import a video first.</p>'+
 '<div class="metric"><span>Program playhead</span><b>'+esc(t)+' @ '+fps+' fps</b></div>'+
 (selected?'<div class="metric"><span>Selected cut start</span><b>'+frameTimecode(from,fps)+'</b></div>'+
  '<div class="metric"><span>Source in / out</span><b>'+frameTimecode(selected.start,fps)+' / '+frameTimecode(selected.end,fps)+'</b></div>':'')+
 '<div class="row wrap"><label class="field" style="flex:1">Jump to HH:MM:SS:FF<input id="precisionTimecode" placeholder="00:00:00:00" value="'+esc(t)+'"></label><button id="precisionGo" class="small">Go</button></div>'+
 '<div class="row wrap"><button id="precisionPrev" class="small" '+(project.segments.length?'':'disabled')+'>Previous cut</button>'+
 '<button id="precisionNext" class="small" '+(project.segments.length?'':'disabled')+'>Next cut</button>'+
 '<button id="precisionSnapFrame" class="small">Snap to nearest frame</button>'+
 '<button id="precisionSnapMarker" class="small" '+(project.markers?.length?'':'disabled')+'>Nearest marker</button>'+
 '<button id="precisionSnapWord" class="small" '+(project.words?.length?'':'disabled')+'>Nearest word</button></div>'+
 '<p class="tiny muted">Insert or overwrite the source In–Out range from the Media library at the current program playhead.</p>'+
 '<div class="row wrap"><button id="precisionInsert" class="small" '+(hasSource?'':'disabled')+'>Insert source at playhead</button>'+
 '<button id="precisionOverwrite" class="small" '+(hasSource?'':'disabled')+'>Overwrite from playhead</button></div>'+
 (selected?'<p class="tiny muted">Slip shifts the clip’s source window but keeps its timeline length. Roll adjusts the selected cut’s end and the next cut’s start. Both work at one project frame per click.</p>'+
 '<div class="row wrap"><button id="precisionSlipBack" class="small">Slip −1 frame</button><button id="precisionSlipForward" class="small">Slip +1 frame</button>'+
 '<button id="precisionRollBack" class="small">Roll cut −1 frame</button><button id="precisionRollForward" class="small">Roll cut +1 frame</button>'+
 '<button id="precisionRippleDelete" class="small danger">Ripple delete</button></div>'+
 '<label class="field">Role of this actual source cut<select id="precisionStoryRole">'+
 [['other','Not specified'],['setup','Setup'],['action','Action'],['joke','Joke / banter'],['reaction','Reaction'],['payoff','Payoff'],['bridge','Transition / bridge']].map(([k,v])=>'<option value="'+k+'" '+((selected.storyRole||'other')===k?'selected':'')+'>'+v+'</option>').join('')+
 '</select></label>':'')+
 '<button id="precisionExportCutList" class="small full" '+(project.segments.length?'':'disabled')+'>Download source-referenced timecode cut list</button>'+
 '<p class="tiny muted">This cut list is a readable text report, not a standard CMX3600 interchange EDL. Video export still uses the project renderer.</p>'+
 '</details>';
}
