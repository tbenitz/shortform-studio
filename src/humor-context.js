/** Source-only humor context reviews: never claim actual laughter or joke quality.
 * IDEA-001: possible callback, IDEA-002: source-timed opening/ending receipts,
 * IDEA-010: cue-level cutoff detection from the ORIGINAL subtitle track.
 */
import {storyTopicWords} from './humor-stories.js';
const fmt=(time)=>{const m=Math.floor(Math.max(0,time)/60),s=(Math.max(0,time)%60).toFixed(1).padStart(4,'0');return m+':'+s};
const valid=m=>m&&typeof m.id==='string'&&m.assetId&&Number.isFinite(m.start)&&Number.isFinite(m.end)&&m.end>m.start;
const timed=(words,id)=>(words||[]).filter(w=>w.assetId===id&&Number.isFinite(w.start)&&Number.isFinite(w.end)&&w.end>w.start).sort((a,b)=>a.start-b.start);
function excerpt(words){return words.map(w=>String(w.text||'')).join(' ').replace(/\s+/g,' ').trim().slice(0,240)}
export function sourceDialogueBeats(moment,words){
 if(!valid(moment))return {opening:null,ending:null,count:0};
 const inside=timed(words,moment.assetId).filter(w=>w.start<moment.end&&w.end>moment.start);
 if(!inside.length)return {opening:null,ending:null,count:0};
 const size=Math.max(1,Math.min(12,Math.round(inside.length*.25)));
 const first=inside.slice(0,size),last=inside.slice(-size);
 return {opening:{time:first[0].start,text:excerpt(first)},ending:{time:last[0].start,text:excerpt(last)},count:inside.length,
  evidence:'Original timed transcript words; opening and ending are NOT automatically verified joke setup/punchline'};
}
export function inspectMomentCutoff(moment,words){
 if(!valid(moment))return {before:false,after:false,reasons:[]};
 const list=timed(words,moment.assetId),within=list.filter(w=>w.end>moment.start&&w.start<moment.end);
 if(!within.length)return {before:false,after:false,reasons:[]};
 const first=within[0],last=within.at(-1),previous=list.findLast(w=>w.end<=moment.start),next=list.find(w=>w.start>=moment.end);
 // Only flag a strong source fact: a timed subtitle cue continuing outside the cut.
 // This avoids calling pauses or two unrelated transcript sentences a punchline.
 const before=!!previous?.subtitleCueId&&previous.subtitleCueId===first.subtitleCueId&&
   first.start-previous.end<=2.5&&first.start-moment.start<2.5;
 const after=!!next?.subtitleCueId&&next.subtitleCueId===last.subtitleCueId&&
   next.start-last.end<=2.5&&moment.end-last.end<2.5;
 const reasons=[];
 if(before)reasons.push('Source SRT cue begins before this clip; earlier spoken words were cut');
 if(after)reasons.push('Source SRT cue continues after this clip; later spoken words were cut');
 return {before,after,reasons,firstWord:first.text,lastWord:last.text,source:moment.assetId};
}
/** Possible *lexical* callback, not a semantic claim: two separate nonoverlapping
 * source intervals share >=2 uncommon subject words after a substantial gap.
 * For deliberate review we return the original timestamps and quoted evidence. */
export function findCallbackThreads(moments,{minGap=25,minTopics=2,maxResults=30,maxSpan=7200}={}){
 const list=(moments||[]).filter(valid).slice().sort((a,b)=>a.assetId.localeCompare(b.assetId)||a.start-b.start),threads=[],seen=new Set();
 for(let i=0;i<list.length;i++){
  const first=list[i],a=new Set(storyTopicWords(first.dialogue||''));
  if(a.size<minTopics)continue;
  for(let j=i+1;j<list.length;j++){
   const later=list[j];if(later.assetId!==first.assetId)break;
   if(later.start-first.end>maxSpan)break;
   if(later.start-first.end<minGap)continue;
   const common=[...new Set(storyTopicWords(later.dialogue||'').filter(w=>a.has(w)))].sort((x,y)=>y.length-x.length);
   if(common.length<minTopics)continue;
   const key=first.id+'|'+later.id;if(seen.has(key))continue;seen.add(key);
   threads.push({id:'callback:'+key,assetId:first.assetId,momentIds:[first.id,later.id],start:first.start,end:later.end,
    gap:Math.round((later.start-first.end)*10)/10,terms:common.slice(0,4),score:common.length*12+Math.min(30,Math.round((later.start-first.end)/40)),
    earlier:{id:first.id,start:first.start,end:first.end,text:String(first.dialogue||'').slice(0,240)},
    later:{id:later.id,start:later.start,end:later.end,text:String(later.dialogue||'').slice(0,240)},
    reason:'Possible spoken callback: these separate, actual source conversations repeat '+common.slice(0,4).join(', ')+'. Review both clips to determine whether this really is a recurring joke.'});
  }
 }
 return threads.sort((a,b)=>b.score-a.score||a.start-b.start).slice(0,Math.max(1,maxResults));
}
