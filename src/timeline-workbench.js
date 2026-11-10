/** Non-destructive timeline operations on real source seconds. */
import {uid,duration} from './model.js';
const length=s=>(s.end-s.start)/Math.max(.25,s.speed||1);
const round=x=>Number(Number(x).toFixed(3));
export function frameTimecode(seconds,fps=30){
 const f=Math.max(1,Math.min(120,Math.round(Number(fps)||30)));
 const total=Math.max(0,Math.round((Number(seconds)||0)*f)),frames=total%f,whole=Math.floor(total/f);
 return [Math.floor(whole/3600),Math.floor(whole/60)%60,whole%60,frames].map(n=>String(n).padStart(2,'0')).join(':');
}
export function parseFrameTimecode(value,fps=30){
 const v=String(value||'').trim(),f=Math.max(1,Math.min(120,Math.round(Number(fps)||30)));
 if(/^\d+(\.\d+)?$/.test(v))return Number(v);
 const m=v.match(/^(\d{1,3}):([0-5]\d):([0-5]\d):(\d{2,3})$/);
 if(!m||Number(m[4])>=f)throw Error('Use HH:MM:SS:FF with frame value smaller than '+f+'.');
 return Number(m[1])*3600+Number(m[2])*60+Number(m[3])+Number(m[4])/f;
}
export function clipStartTime(segments,id){let time=0;for(const s of segments||[]){if(s.id===id)return time;time+=length(s)}return null}
export function nearestEditPoint(project,time,{threshold=.25,includeWords=false,includeMarkers=true}={}){
 const candidates=[{time:0,kind:'project start'}];let at=0;
 for(const s of project.segments||[]){candidates.push({time:at,kind:'cut start',clipId:s.id});at+=length(s);candidates.push({time:at,kind:'cut end',clipId:s.id})}
 if(includeMarkers)for(const m of project.markers||[])if(Number.isFinite(m.time))candidates.push({time:m.time,kind:'marker',id:m.id});
 if(includeWords){let t=0;for(const seg of project.segments||[]){for(const w of project.words||[]){
  if(w.assetId!==seg.assetId||w.start<seg.start||w.end>seg.end)continue;
  candidates.push({time:t+(w.start-seg.start)/Math.max(.25,seg.speed||1),kind:'word start'});
  candidates.push({time:t+(w.end-seg.start)/Math.max(.25,seg.speed||1),kind:'word end'});
 }t+=length(seg)}}
 return candidates.filter(c=>Math.abs(c.time-time)<=threshold).sort((a,b)=>Math.abs(a.time-time)-Math.abs(b.time-time))[0]||{time,kind:'unsnapped'};
}
export function nextBoundary(segments,time,direction=1){
 const boundaries=[0];let t=0;for(const s of segments||[]){t+=length(s);boundaries.push(t)}
 return direction>=0?(boundaries.find(t=>t>time+.001)??t):(boundaries.slice().reverse().find(t=>t<time-.001)??0);
}
function splitAt(segments,time){
 const t=Math.max(0,Number(time)||0),total=segments.reduce((n,s)=>n+length(s),0);
 if(t>=total-.00001)return segments.length;
 let at=0;
 for(let i=0;i<segments.length;i++){
  const s=segments[i],d=length(s),local=t-at;
  if(local<=.00001)return i;
  if(local>=d-.00001){at+=d;continue}
  const sourceSplit=s.start+local*Math.max(.25,s.speed||1);
  const before={...s,end:sourceSplit},after={...s,id:uid(),start:sourceSplit};
  segments.splice(i,1,before,after);return i+1;
 }
 return segments.length;
}
function shiftTimelineAnchors(project,at,delta){
 if(!Number.isFinite(delta)||!delta)return;
 for(const overlay of project.audio||[])if(Number(overlay.start)>=at-.0001)overlay.start=Math.max(0,round(overlay.start+delta));
 for(const marker of project.markers||[])if(Number(marker.time)>=at-.0001)marker.time=Math.max(0,round(marker.time+delta));
}
export function insertAtPlayhead(project,clip,at){
 if(!clip||!Number.isFinite(clip.start)||!Number.isFinite(clip.end)||clip.end<=clip.start)throw Error('Insert a real source clip with valid in/out points.');
 const idx=splitAt(project.segments,at),incoming={...clip,id:uid()};
 project.segments.splice(idx,0,incoming);project.selectedSegment=incoming.id;
 shiftTimelineAnchors(project,Math.max(0,Number(at)||0),length(incoming));return incoming;
}
export function overwriteAtPlayhead(project,clip,at){
 if(!clip||!Number.isFinite(clip.start)||!Number.isFinite(clip.end)||clip.end<=clip.start)throw Error('Overwrite requires a real source clip.');
 const atTime=Math.max(0,Math.min(duration(project),Number(at)||0)),clipLen=length(clip),endTime=Math.min(duration(project),atTime+clipLen);
 splitAt(project.segments,endTime);const beforeIndex=splitAt(project.segments,atTime);
 const newEndIndex=splitAt(project.segments,endTime),n=Math.max(0,newEndIndex-beforeIndex);
 const incoming={...clip,id:uid()};project.segments.splice(beforeIndex,n,incoming);project.selectedSegment=incoming.id;return incoming;
}
export function rippleDelete(project,id){
 const idx=project.segments.findIndex(s=>s.id===id);if(idx<0)throw Error('Selected timeline clip was not found.');
 const oldStart=clipStartTime(project.segments,id);
 const [old]=project.segments.splice(idx,1);
 project.selectedSegment=project.segments[Math.min(idx,project.segments.length-1)]?.id||null;
 shiftTimelineAnchors(project,oldStart+length(old),-length(old));
 return {deleted:old,seconds:round(length(old))};
}
export function slipSelected(project,id,seconds,assets=[]){
 const c=project.segments.find(s=>s.id===id);if(!c)throw Error('Select a clip to slip.');
 const source=assets.find(a=>a.id===c.assetId),limit=Number(source?.duration)||Infinity;
 const shift=Math.max(-c.start,Math.min(Number(seconds)||0,limit-c.end));
 if(Math.abs(shift)<.0001)throw Error('The original media boundary prevents further slipping.');
 c.start=round(c.start+shift);c.end=round(c.end+shift);return {shift:round(shift),clip:c};
}
export function rollBoundary(project,leftId,delta,assets=[]){
 const i=project.segments.findIndex(s=>s.id===leftId),left=project.segments[i],right=project.segments[i+1];
 if(!left||!right)throw Error('Select the clip immediately before a cut to roll its boundary.');
 const leftSource=assets.find(a=>a.id===left.assetId),move=Number(delta)||0;
 const leftNew=left.end+move*Math.max(.25,left.speed||1),rightNew=right.start+move*Math.max(.25,right.speed||1);
 if(leftNew<=left.start+.1||rightNew>=right.end-.1||rightNew<0||leftNew>(Number(leftSource?.duration)||Infinity))
  throw Error('The requested roll would create an invalid source range.');
 left.end=round(leftNew);right.start=round(rightNew);return {left,right,delta:round(move)};
}
export function setStoryRole(clip,role){
 if(!['setup','action','joke','reaction','payoff','bridge','other'].includes(role))throw Error('Unsupported story role');
 clip.storyRole=role;return clip;
}
export function sourceToTimeline(project,assetId,sourceTime){
 let offset=0;for(const s of project.segments||[]){if(s.assetId===assetId&&sourceTime>=s.start&&sourceTime<=s.end)return offset+(sourceTime-s.start)/Math.max(.25,s.speed||1);offset+=length(s)}
 return null;
}
export function timecodeCutList(project){
 const fps=Number(project.settings?.fps)||30;let offset=0;
 const lines=['# ShortForm Studio source-referenced cut list (NONSTANDARD EDL)','# Project: '+String(project.name||'Untitled').replace(/[\r\n]/g,' '),'# Record TC | Original filename | Original in TC | Original out TC | Story role'];
 for(let i=0;i<(project.segments||[]).length;i++){
  const s=project.segments[i],a=project.assets.find(a=>a.id===s.assetId);
  lines.push(String(i+1).padStart(3,'0')+' '+frameTimecode(offset,fps)+' | '+(a?.name||'MISSING SOURCE').replace(/[|\r\n]/g,' ')+' | '+frameTimecode(s.start,fps)+' | '+frameTimecode(s.end,fps)+' | '+(s.storyRole||'unassigned'));
  offset+=length(s);
 }return lines.join('\n')+'\n';
}
