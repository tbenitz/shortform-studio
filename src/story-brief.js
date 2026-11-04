/** Interpret long-form editing directions as an editorial BRIEF, not as a
 * conjunctive Boolean keyword query. This is not an LLM and must not claim to
 * interpret every nuance; it extracts explicit source-time scouting windows
 * and leaves all story categories available for factual verification.
 */
const duration=s=>{
 const p=String(s).split(':').map(Number);
 if(p.some(n=>!Number.isFinite(n))||p.length<2||p.length>3)return NaN;
 return p.reduce((t,n)=>t*60+n,0);
};
export function parseScoutingWindows(text=''){
 const list=[],dedupe=new Set();
 for(const line of String(text).split(/\n/)){
  const a=/\bPOV\s*A\b\s*(?:[:—–-]\s*)?(\d{1,2}:\d{2}(?::\d{2})?)\s*[–—-]\s*(\d{1,2}:\d{2}(?::\d{2})?)/i.exec(line);
  if(!a)continue;
  const b=/\bPOV\s*B\b\s*(?:[:—–-]\s*)?(\d{1,2}:\d{2}(?::\d{2})?)\s*[–—-]\s*(\d{1,2}:\d{2}(?::\d{2})?)/i.exec(line);
  const start=duration(a[1]),end=duration(a[2]);
  if(!(start>=0&&end>start&&end-start<=3600))continue;
  const key=Math.round(start)+'-'+Math.round(end);
  if(dedupe.has(key))continue;dedupe.add(key);
  const label=line.replace(/[#*]/g,'').replace(/^\s*\d+[.)]\s*/,'').split(/POV\s*A\b/i)[0].trim().slice(0,110)||'User scouting window';
  const item={start,end,label,priority:list.length};
  if(b){const bs=duration(b[1]),be=duration(b[2]);if(be>bs){item.targetStart=bs;item.targetEnd=be}}
  list.push(item);
 }
 return list;
}
export function interpretStoryBrief(input='',{defaultTarget=5}={}){
 const text=String(input||'').trim(),words=text.split(/\s+/).filter(Boolean);
 const longForm=text.length>=950||words.length>=175||/\b(?:STORY FIRST|PRIMARY OBJECTIVE|STRICT QUALITY CONTROL|REQUIRED OUTPUT FOR EACH SHORT)\b/i.test(text);
 const windows=parseScoutingWindows(text);
 const requested=/\b(?:at least|minimum|generate|create|produce|find|want)\s+(?:the\s+)?(?:top\s+)?(?:five|5|six|6|three|3|four|4|[1-9]\d?)\b/i.exec(text);
 const token=requested?.[1]?.toLowerCase();
 const count=token?({'three':3,'four':4,'five':5,'six':6}[token]||Number(token)):defaultTarget;
 const targetCount=Math.max(1,Math.min(20,Number.isFinite(count)?count:defaultTarget));
 return {longForm,targetCount,windows,
  requireStory:true,
  // Long instructions are a goal/quality specification. Their negative
  // examples and "never" language MUST NOT be interpreted as scene exclusions.
  narrativeDirections:longForm?text:'',
  focusHint:longForm?'Evaluate complete encounters for coherent setup, sustained action, meaningful POV differences and actual payoff; these are quality goals, not hard transcript keyword requirements.':text,
  containsSpecificWindows:windows.length>0};
}
export function storyWindowMatch(candidate,windows=[]){
 const start=candidate?.pov?.globalStart??candidate?.anchorTime;
 const end=candidate?.pov?.globalEnd??start;
 if(!Number.isFinite(start))return null;
 for(const w of windows)if(end>=w.start-20&&start<=w.end+20)return w;
 return null;
}
/** Rank only genuinely built story candidates, not one-cut or single-source
 * media. Prioritize user-provided encounter windows, narrative evidence and
 * diversity; if fewer qualify return fewer. Never fabricate a quota.
 */
export function selectEditorialStories(candidates,brief,{count=brief?.targetCount||5}={}){
 const scored=[];
 for(const c of candidates||[]){
  if(!c?.segments||c.segments.length<3||new Set(c.segments.map(s=>s.assetId)).size!==2||
      (c.pov?.jumpCuts||0)<1)continue;
  const w=storyWindowMatch(c,brief?.windows||[]);
  const roles=c.pov?.storyBeats||[];
  const haveHook=roles.some(r=>/hook|setup/i.test(r.role||''));
  const havePayoff=roles.some(r=>/payoff|reaction|aftermath/i.test(r.role||''));
  const interesting=roles.filter(r=>/engagement|rescue|combat|down|elimination|clutch|reaction|trash/i.test(r.role||'')).length;
  const variety=new Set(roles.map(r=>(r.role||'').replace(/\s*·.*/,''))).size;
  const activityFromBoth=roles.filter(r=>!String(r.role||'').includes('context only')).length;
  let quality=20+Math.min(18,interesting*3)+Math.min(12,variety*3)+
   (haveHook?8:0)+(havePayoff?8:0)+Math.min(12,activityFromBoth*2)+
   Math.min(8,c.pov.jumpCuts*1.5);
  // Scouting windows are explicit evidence supplied by the user and should
  // guide selection, not stand in for proof the footage is interesting.
  quality=Math.min(93,Math.round(quality));
  scored.push({candidate:c,window:w,quality,priority:quality+(w?16:0)});
 }
 scored.sort((a,b)=>b.priority-a.priority||a.candidate.anchorTime-b.candidate.anchorTime);
 const selected=[],seenWindows=new Set();
 const choose=item=>{
  if(selected.length>=count)return;
  const c=item.candidate,anchor=c.anchorTime;
  if(selected.some(s=>Math.abs(s.anchorTime-anchor)<110))return;
  selected.push({...c,score:item.quality,
   pov:{...c.pov,scoutingWindow:item.window||undefined},
   reason:c.reason+(item.window?' User-supplied scouting window: '+item.window.label+' ('+Math.round(item.window.start)+'–'+Math.round(item.window.end)+'s on POV A).':'')});
  if(item.window)seenWindows.add(item.window.priority);
 };
 // First take one from each requested distinct incident.
 for(const item of scored)if(item.window&&!seenWindows.has(item.window.priority))choose(item);
 for(const item of scored)choose(item);
 return selected;
}
