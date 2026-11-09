/** Full-recording short-form discovery. CPU-bounded and deterministic across runs. */
import {clamp,makeSegment,fmt} from './model.js';
export const MAX_DISCOVERY_CLIPS=500;
const BUCKET_SECONDS=300;
const rounded=t=>Math.round((Number(t)||0)*2)/2;
export const clipSignature=clip=>(clip.segments||[]).map(s=>String(s.assetId)+':'+rounded(s.start)+'-'+rounded(s.end)).join('|');
export function clipAnchor(clip){
 const first=clip.segments?.[0];
 return {assetId:clip.anchorAssetId||first?.assetId||'',time:Number.isFinite(clip.anchorTime)?clip.anchorTime:first?.start||0};
}
export function sourceCoverage(assets=[],words=[],progress={},candidates=[]){
 const recordable=assets.filter(a=>['video','audio'].includes(a.type));
 const byId=new Map(recordable.map(a=>[a.id,{id:a.id,name:a.name,duration:Math.max(0,Number(a.duration)||0),bins:[],transcribed:0,latestWord:0,progress:0,clips:0}]));
 for(const w of words){if(!byId.has(w.assetId))byId.set(w.assetId,{id:w.assetId,name:'Unlinked source',duration:0,bins:[],transcribed:0,latestWord:0,progress:0,clips:0});const data=byId.get(w.assetId);data.latestWord=Math.max(data.latestWord,Number(w.end)||0);data.transcribed++;}
 for(const item of byId.values()){
  const info=progress?.[item.id]||{};
  item.duration=Math.max(item.duration,item.latestWord);
  const bins=Math.max(1,Math.ceil(item.duration/BUCKET_SECONDS));
  item.bins=Array.from({length:bins},()=>0);
  item.progress=Math.min(item.duration,Math.max(0,Number(info.nextAt)||0));
 }
 for(const w of words){const item=byId.get(w.assetId);if(item?.bins?.length){const idx=Math.min(item.bins.length-1,Math.max(0,Math.floor((Number(w.start)||0)/BUCKET_SECONDS)));item.bins[idx]++}}
 for(const c of candidates){const a=clipAnchor(c),item=byId.get(a.assetId);if(item)item.clips++}
 const sources=[...byId.values()].map(item=>({...item,coveredBins:item.bins.filter(n=>n>0).length,totalBins:item.bins.length,processed:progress?.[item.id]?.status==='complete'?item.duration:item.progress}));
 const totalSeconds=sources.reduce((sum,s)=>sum+s.duration,0);
 const transcriptSeconds=sources.reduce((sum,s)=>sum+s.processed,0);
 const populatedBins=sources.reduce((sum,s)=>sum+s.coveredBins,0),allBins=sources.reduce((sum,s)=>sum+s.totalBins,0);
 return {sources,totalSeconds,transcriptSeconds,wordCount:words.length,percent:totalSeconds?Math.round(1000*transcriptSeconds/totalSeconds)/10:0,coveredBins:populatedBins,totalBins:allBins};
}
const getAncestors=utterance=>[...new Set((utterance.keywords||[]).filter(k=>k.length>4))];
function scoreMoment(seed,mode,pattern,length,nonlinear=false){
 const recognized=mode==='all'||pattern.test(seed.text);
 const clue=/\?|!|because|however|but|why|result|finally|mistake|wait|happened|learn/i.test(seed.text);
 const substantial=(seed.text||'').split(/\s+/).length>=8;
 return clamp(Math.round(35+(recognized?15:0)+(clue?8:0)+(substantial?6:0)+Math.min(13,length/4)+(nonlinear?6:0)),0,96);
}
const patterns={
 comedy:/(laugh|funny|joke|ridiculous|wrong|oops|seriously|crazy|roast|fail|impossible|haha|lol|wait)/i,
 educational:/(because|reason|learn|explain|how to|why|tip|secret|mistake|important|example)/i,
 story:/(first|then|next|after|finally|end|happened|story)/i,
 debate:/(but|disagree|actually|wrong|instead|however|because|think)/i,
 dramatic:/(suddenly|shock|problem|disaster|never|surpris|challenge|truth)/i,
 inspiration:/(hope|dream|believe|change|improve|achieve|better)/i,
 gaming:/(game|win|lose|level|boss|round|score|play)/i,
 all:/.+/
};
function meaningfulMatch(seed,other){
 if(seed.assetId===other.assetId&&Math.abs(seed.start-other.start)<35)return -1;
 let same=0,shared=[];
 const theirs=new Set(other.keywords||[]);
 for(const word of getAncestors(seed))if(theirs.has(word)){same++;shared.push(word)}
 return same>=2?{same,shared}:null;
}
const durationOf=c=>(c.segments||[]).reduce((total,s)=>total+Math.max(0,s.end-s.start)/Math.max(.25,s.speed||1),0);
const groupIntervals=clips=>{
 const map=new Map();
 for(const c of clips||[])for(const s of c.segments||[]){
  if(!Number.isFinite(s.start)||!Number.isFinite(s.end)||s.end<=s.start)continue;
  if(!map.has(s.assetId))map.set(s.assetId,[]);
  map.get(s.assetId).push([s.start,s.end]);
 }
 for(const [id,list] of map){list.sort((a,b)=>a[0]-b[0]);const merged=[];for(const [s,e] of list){const prev=merged.at(-1);if(prev&&s<=prev[1])prev[1]=Math.max(prev[1],e);else merged.push([s,e])}map.set(id,merged)}
 return map;
};
function overlapAgainst(candidate,intervals){
 let covered=0,total=0;
 for(const s of candidate.segments||[]){
  const length=Math.max(0,s.end-s.start);total+=length;
  const arr=intervals.get(s.assetId)||[];
  for(const [a,b] of arr){if(a>=s.end)break;if(b<=s.start)continue;covered+=Math.max(0,Math.min(s.end,b)-Math.max(s.start,a))}
 }
 return total?covered/total:1;
}
const asHistoryClips=history=>(history||[]).filter(h=>h&&h.assetId&&Number.isFinite(h.start)&&Number.isFinite(h.end)&&h.end>h.start).map(h=>({segments:[{assetId:h.assetId,start:h.start,end:h.end}],anchorAssetId:h.assetId,anchorTime:h.start}));
/** Fair, source-time-bucket round-robin. No over-represented 'best few' sections. */
export function selectDiverseCandidates(raw,options={}){
 const existing=[...(options.existingCandidates||[]),...asHistoryClips(options.history||[])];
 const seen=new Set([...existing.map(clipSignature),...(options.history||[]).map(h=>h.signature).filter(Boolean)]);
 const occupiedAnchors=new Map(),cover=groupIntervals(existing);
 const limit=Math.min(MAX_DISCOVERY_CLIPS,Math.max(1,Number(options.clipCount)||MAX_DISCOVERY_CLIPS));
 const maxOverlap=clamp(Number(options.maxReuseRatio??.48),0,.95);
 const spacing=Math.max(4,Math.min(15,(Number(options.clipMin)||15)*.45));
 for(const prev of existing){const a=clipAnchor(prev);if(!occupiedAnchors.has(a.assetId))occupiedAnchors.set(a.assetId,[]);occupiedAnchors.get(a.assetId).push(a.time)}
 const bins=new Map(),hasBucket=new Set();
 for(const item of raw||[]){
  if(!item?.segments?.length||!Number.isFinite(item.duration)||item.duration<=0)continue;
  const sig=clipSignature(item);if(!sig||seen.has(sig))continue;
  const a=clipAnchor(item),key=a.assetId+'|'+Math.floor(a.time/BUCKET_SECONDS);
  if(!bins.has(key))bins.set(key,[]);
  bins.get(key).push({...item,anchorAssetId:a.assetId,anchorTime:a.time,signature:sig});
  hasBucket.add(key);
 }
 const keys=[...bins.keys()].sort((a,b)=>a.localeCompare(b,undefined,{numeric:true}));
 for(const queue of bins.values())queue.sort((a,b)=>(b.score+(b.source==='remote-ai'?14:0))-(a.score+(a.source==='remote-ai'?14:0))||a.anchorTime-b.anchorTime);
 const found=[];
 let progress=true;
 while(found.length<limit&&progress){
  progress=false;
  for(const key of keys){
   const queue=bins.get(key);
   while(queue.length){
    const candidate=queue.shift(),a=clipAnchor(candidate);
    if(seen.has(candidate.signature))continue;
    if((occupiedAnchors.get(a.assetId)||[]).some(x=>Math.abs(x-a.time)<spacing))continue;
    if(overlapAgainst(candidate,cover)>maxOverlap)continue;
    found.push(candidate);progress=true;
    seen.add(candidate.signature);
    if(!occupiedAnchors.has(a.assetId))occupiedAnchors.set(a.assetId,[]);
    occupiedAnchors.get(a.assetId).push(a.time);
    // update coverage as a union, not repeated sums
    for(const s of candidate.segments){if(!cover.has(s.assetId))cover.set(s.assetId,[]);cover.get(s.assetId).push([s.start,s.end]);}
    for(const [assetId,list] of cover){list.sort((a,b)=>a[0]-b[0]);const merged=[];for(const [start,end] of list){const prev=merged.at(-1);if(prev&&start<=prev[1])prev[1]=Math.max(prev[1],end);else merged.push([start,end])}cover.set(assetId,merged)}
    break;
   }
   if(found.length>=limit)break;
  }
 }
 return found;
}
export function historyEntries(candidates=[]){
 return candidates.map(c=>{
  const a=clipAnchor(c);
  const segments=c.segments||[];
  // Store PRIMARY anchor span only. Cross-timestamp callbacks don't permanently reserve other stories.
  const primary=segments.find(s=>s.assetId===a.assetId&&a.time>=s.start&&a.time<s.end)||segments[0];
  return {assetId:a.assetId,start:primary?.start??a.time,end:primary?.end??a.time+.2,mode:c.mode||'all',signature:clipSignature(c)};
 });
}
/** Generates a full-length pool in linear-ish time; no per-seed scan of all utterances. */
export function discoverFullRecording(utterances,assets=[],settings={},onProgress=()=>{}){
 const min=Number(settings.clipMin)>0?clamp(settings.clipMin,1,21600):0;
  const max=Number(settings.clipMax)>0?Math.max(min+1,clamp(settings.clipMax,min+1,21600)):Infinity;
  const autoDuration=!Number.isFinite(max);
 const mode=settings.mode||'all',regex=patterns[mode]||patterns.all;
 const grouped=new Map();for(const u of utterances||[]){if(!u.assetId||!(u.end>u.start))continue;if(!grouped.has(u.assetId))grouped.set(u.assetId,[]);grouped.get(u.assetId).push(u)}
 const raw=[];
 const assetNames=new Map(assets.map(a=>[a.id,a.name]));
 const groups=[...grouped.entries()];
 for(let gi=0;gi<groups.length;gi++){
  const [assetId,list]=groups[gi];list.sort((a,b)=>a.start-b.start);
  // Sparse inverted index enables callback search without O(n^2) full transcript comparisons.
  const index=new Map();
  for(let i=0;i<list.length;i++)for(const kw of getAncestors(list[i])){
   if(!index.has(kw))index.set(kw,[]);
   index.get(kw).push(i);
  }
  for(let i=0;i<list.length;i++){
   const seed=list[i];if(seed.end-seed.start<.6)continue;
   let j=i,end=seed.start,words=0,length=0;
   const sequential=[];
   while(j<list.length&&j<i+(autoDuration?800:24)){
    const u=list[j],gap=j>i?u.start-end:0;
    if(gap>(autoDuration?5.5:32))break;
    const uLength=Math.max(.01,u.end-u.start);
    if(length+uLength>max+.2)break;
    const previous=sequential.at(-1);
    if(previous&&gap<1.8){
     const increment=u.end-previous.end;
     if(length+increment>max+.2)break;
     previous.end=u.end;length+=increment;
    }else{sequential.push(makeSegment(assetId,u.start,u.end));length+=uLength}
    end=u.end;words+=(u.text||'').split(/\s+/).length;j++;
    if(!autoDuration&&length>=Math.max(min,Math.min(max,min+10)))break;
   }
   if(length<min*.83||length>max+.2||words<4)continue;
   const clip=sequential;
   const isRelevant=mode==='all'||regex.test(seed.text)||regex.test(list[Math.max(i,j-1)]?.text||'');
   const score=scoreMoment(seed,mode,regex,length);
   if(mode==='all'||isRelevant||settings.discoveryAll||score>=(settings.minScore??0)){
    raw.push({id:'clip-'+assetId+'-'+seed.start.toFixed(3),title:(mode==='all'?'Highlight':mode==='comedy'?'Comedy':mode==='educational'?'Insight':mode==='story'?'Story':'Moment')+': '+(seed.text||'').replace(/[^\w\s'-]/g,'').split(/\s+/).slice(0,9).join(' ').slice(0,80),mode,score,source:'full-source',anchorAssetId:assetId,anchorTime:seed.start,segments:clip,duration:length,reason:'Continuous original dialogue from '+(assetNames.get(assetId)||'source')+' at '+fmt(seed.start)+'. Review meaning and pacing before export.'});
   }
   if(settings.allowNonlinear===false||!(seed.keywords||[]).length)continue;
   const candidatePositions=new Map();
   const keys=getAncestors(seed).filter(w=>index.get(w)?.length>1).sort((a,b)=>(index.get(a)?.length||Infinity)-(index.get(b)?.length||Infinity)).slice(0,4);
   for(const key of keys){
    const matches=index.get(key)||[];
    const stride=Math.max(1,Math.floor(matches.length/50));
    for(let z=(i%stride);z<matches.length;z+=stride){const idx=matches[z];if(idx===i)continue;candidatePositions.set(idx,(candidatePositions.get(idx)||0)+1)}
   }
   const matches=[...candidatePositions].filter(([idx,count])=>count>=2&&idx!==i&&Math.abs(list[idx].start-seed.start)>=35)
    .map(([idx,count])=>({idx,count,dist:Math.abs(list[idx].start-seed.start)}))
    .sort((a,b)=>b.count-a.count||Math.abs(a.dist-(40+(i%17)*80))-Math.abs(b.dist-(40+(i%17)*80)));
   if(!matches.length)continue;
   const callback=list[matches[0].idx];
   const hookEnd=Math.min(end,seed.start+Math.max(6,max*.55));
   const available=max-(hookEnd-seed.start);
   if(available<4)continue;
   const callbackEnd=Math.min(callback.end,callback.start+available);
   const total=(hookEnd-seed.start)+(callbackEnd-callback.start);
   if(total<min*.8)continue;
   const segments=[makeSegment(assetId,seed.start,hookEnd),makeSegment(assetId,callback.start,callbackEnd)];
   if(mode==='story'||mode==='educational'||mode==='debate'||(settings.creativity??50)<30)segments.sort((a,b)=>a.start-b.start);
   raw.push({id:'callback-'+assetId+'-'+seed.start.toFixed(3)+'-'+callback.start.toFixed(3),title:'Callback: '+(seed.text||'').split(/\s+/).slice(0,8).join(' ').slice(0,80),mode,score:scoreMoment(seed,mode,regex,total,true),source:'full-source-callback',anchorAssetId:assetId,anchorTime:seed.start,segments,duration:total,reason:'Two non-adjacent original moments share at least two topical keywords; '+fmt(seed.start)+' ↔ '+fmt(callback.start)+'. Verify continuity before posting.'});
  }
  onProgress((gi+1)/Math.max(1,groups.length),'Indexed '+(gi+1)+'/'+groups.length+' source transcripts, '+raw.length+' potential clips');
 }
 // Treat a score minimum as a ranking preference in exhaustive mode, never silently discard hours.
 const minimum=settings.clipCount===0||settings.discoveryAll?0:clamp(settings.minScore??0,0,100);
 return selectDiverseCandidates(raw.filter(c=>c.score>=minimum),settings);
}
