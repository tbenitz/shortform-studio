/**
 * Human-verified synchronization points for actual original-source recordings.
 * POV B time = offset + scale * POV A time.
 */
import {checkSynchronization,referenceToTarget,targetToReference} from './pov-sync.js';
const html=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const r=n=>Math.round(Number(n)*1000)/1000;
export function fitManualPovAnchors(points,referenceDuration,targetDuration,{maxDrift=.005}={}){
 const ordered=(points||[]).map(x=>({referenceTime:Number(x.referenceTime),targetTime:Number(x.targetTime)}))
  .filter(x=>Number.isFinite(x.referenceTime)&&Number.isFinite(x.targetTime));
 if(ordered.length<2)throw Error('Mark the same event at two separate times in both original recordings.');
 for(const p of ordered)if(p.referenceTime<0||p.targetTime<0||p.referenceTime>referenceDuration||p.targetTime>targetDuration)
  throw Error('Sync marks must be within the original recording durations.');
 ordered.sort((a,b)=>a.referenceTime-b.referenceTime);
 const first=ordered[0],last=ordered.at(-1),span=last.referenceTime-first.referenceTime;
 if(span<10)throw Error('Use two real events at least 10 seconds apart to estimate clock drift.');
 const scale=(last.targetTime-first.targetTime)/span;
 if(!Number.isFinite(scale)||Math.abs(scale-1)>maxDrift)
  throw Error('The two original recordings disagree by over '+(maxDrift*100).toFixed(1)+'% clock drift. Verify both marks; no correction was applied.');
 const offset=ordered.reduce((n,x)=>n+x.targetTime-scale*x.referenceTime,0)/ordered.length;
 const residuals=ordered.map(x=>r(x.targetTime-(offset+scale*x.referenceTime)));
 if(Math.max(...residuals.map(Math.abs))>2)throw Error('Manual event marks disagree by over 2 seconds; remove inaccurate marks first.');
 const value={offset:r(offset),scale:Number(scale.toFixed(8)),manualAnchors:ordered.map(x=>({referenceTime:r(x.referenceTime),targetTime:r(x.targetTime)})),
  residuals,method:'manual-event-pairs',confidence:'human-marked',inliers:ordered.length};
 const check=checkSynchronization(value,referenceDuration,targetDuration);
 if(!check.valid)throw Error(check.reason||'Original recordings do not overlap.');
 return {...value,overlap:{start:check.commonStart,end:check.commonEnd,seconds:r(check.overlap)}};
}
export function manualPovOverlap(sync,referenceDuration,targetDuration){
 if(!sync)return null;
 const check=checkSynchronization(sync,referenceDuration,targetDuration);
 if(!check.valid)return null;
 const low=Math.max(0,check.commonStart),high=Math.min(referenceDuration,check.commonEnd);
 const points=[],chunk=Math.max(2,(high-low)/8);
 for(let t=low;t<=high+.01;t+=chunk){
  const b=referenceToTarget(Math.min(high,t),sync);
  points.push({referenceTime:r(Math.min(high,t)),targetTime:r(b)});
 }
 return {commonStart:r(low),commonEnd:r(high),seconds:r(check.overlap),samples:points,
  note:'Overlap computed from two saved clocks; actual synchronized events must be visually or aurally verified.'};
}
export function povManualSyncHTML(project,referenceId,targetId){
 const a=(project.assets||[]).find(x=>x.id===referenceId),b=(project.assets||[]).find(x=>x.id===targetId);
 if(!a||!b||a.id===b.id)return '';
 const sync=project.povSync?.referenceId===a.id&&project.povSync?.targetId===b.id?project.povSync:null;
 const overlap=manualPovOverlap(sync,a.duration,b.duration),marks=sync?.manualAnchors||[];
 const rows=marks.map((m,i)=>'<tr><td>'+r(m.referenceTime)+'s</td><td>'+r(m.targetTime)+'s</td><td>'+r(sync.residuals?.[i]??0)+'s</td></tr>').join('');
 return '<details class="story-workbench"><summary>Manual event-pair alignment & overlap inspector</summary>'+
  '<p class="tiny muted">Find the same gunshot, spoken phrase or real event in both ORIGINAL sources. Enter the timestamps twice (preferably near start and end). A fitted drift is accepted only within 0.5%; an inconsistent pair is refused. This does not identify people or events automatically.</p>'+
  '<div class="row wrap"><label class="field">POV A event (seconds)<input id="povMarkA" type="number" min="0" max="'+r(a.duration)+'" step="0.001" value="0"></label>'+
  '<label class="field">POV B SAME event (seconds)<input id="povMarkB" type="number" min="0" max="'+r(b.duration)+'" step="0.001" value="0"></label></div>'+
  '<button id="povAddEventMark" class="full">Add synchronized event mark</button>'+
  '<p class="tiny muted">'+marks.length+' saved human-marked pairs. Current fitting uses the earliest and latest marks with residual verification for middle marks.</p>'+
  (rows?'<table><thead><tr><th>POV A</th><th>POV B</th><th>Residual</th></tr></thead><tbody>'+rows+'</tbody></table>':'<p class="tiny muted">No paired event marks recorded for this source pair.</p>')+
  (overlap?'<p class="tiny muted">Common original event time: '+r(overlap.commonStart)+'s–'+r(overlap.commonEnd)+'s ('+r(overlap.seconds)+'s). Drift scale '+r(sync.scale)+', offset '+r(sync.offset)+'s. Verify both sources while previewing.</p>':'<p class="tiny muted">No valid saved overlap for this pair.</p>')+
  '<button id="povClearEventMarks" class="small" '+(marks.length?'':'disabled')+'>Clear human event marks (keep transcript sync)</button></details>';
}
