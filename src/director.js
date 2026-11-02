import {uid,clamp,makeSegment} from './model.js';
const STOP=new Set('i me my we our you your he she they their this that the a an and or but to in on at for of is are was were be been with it its as from then about do did does not so if would could should have has had just really very more than what when where how why who yes no yeah okay ok um uh like well'.split(' '));
const STEM=w=>w.toLowerCase().replace(/[^a-z0-9]/g,'').replace(/(ing|edly|ation|ments|ment|ed|es|s)$/,'');
export function utterances(words){const sorted=[...words].sort((a,b)=>a.assetId.localeCompare(b.assetId)||a.start-b.start);const out=[];let c=[];const emit=()=>{if(!c.length)return;const text=c.map(w=>w.text).join(' ');out.push({id:uid(),assetId:c[0].assetId,start:c[0].start,end:c.at(-1).end,text,speaker:c[0].speaker||'Speaker 1',keywords:[...new Set(c.map(w=>STEM(w.text)).filter(w=>w.length>3&&!STOP.has(w)))],duration:c.at(-1).end-c[0].start});c=[]};for(const w of sorted){if(c.length&&(w.assetId!==c[0].assetId||w.start-c.at(-1).end>1.6||w.speaker!==c[0].speaker||c.length>55))emit();c.push(w);if(/[.!?]$/.test(w.text)&&c.length>5)emit()}emit();return out.filter(x=>x.duration>=1.2)}
const comedy=/(laugh|funny|joke|ridiculous|wrong|never|oops|what\??|seriously|no way|crazy|hilarious|roast|fail|believe|impossible|actually|wait|haha|lol)/i;
const insight=/(because|reason|learn|explain|how to|why|tip|secret|mistake|result|important|first|second|finally|example)/i;
const drama=/(suddenly|shock|problem|disaster|never|terrible|surpris|angry|scared|challenge|truth|can't believe)/i;
const modes={comedy:comedy,educational:insight,story:/(first|then|next|after|finally|end|happened|story)/i,debate:/(but|disagree|actually|wrong|instead|however|because|think)/i,dramatic:drama,inspiration:/(learn|hope|dream|believe|change|improve|achieve|finally|better)/i,gaming:/(game|win|lose|kill|level|boss|round|score|play)/i};
function similarity(a,b){const s=new Set(a.keywords),t=new Set(b.keywords);if(!s.size||!t.size)return 0;let intersection=0;for(const k of s)if(t.has(k))intersection++;return intersection/Math.sqrt(s.size*t.size)}
function dedup(candidates){let seen=new Set();return candidates.filter(c=>{const key=c.utteranceIds.slice().sort().join(',');if(seen.has(key))return false;seen.add(key);return true})}
export function generateCandidates(words,assets,options={}){const {clipMin=15,clipMax=60,clipCount=8,mode='comedy',creativity=50,allowNonlinear=true,minScore=0}=options;let utt=utterances(words);if(!utt.length)return [];const regex=modes[mode]||comedy;let candidates=[];const lengthTarget=Math.min(clipMax,Math.max(clipMin,(clipMax+clipMin)/2));for(let i=0;i<utt.length;i++){
const seed=utt[i];let related=utt.map((u,j)=>({u,j,similarity:similarity(seed,u),bonus:regex.test(u.text)?0.22:0,distance:u.assetId===seed.assetId?Math.abs(u.start-seed.start):1e5})).filter(x=>x.j!==i&&x.u.duration>1.2).sort((a,b)=>(b.similarity+b.bonus)-(a.similarity+a.bonus));
let chosen=[seed],total=seed.duration;
if(allowNonlinear){for(const r of related){if(total>=lengthTarget||chosen.length>=7)break;if(r.similarity<.12&&r.bonus===0)continue;if(chosen.some(c=>c.assetId===r.u.assetId&&Math.abs(c.start-r.u.start)<2))continue;if(total+r.u.duration>clipMax*1.23)continue;chosen.push(r.u);total+=r.u.duration}}
let n=i+1;while(total<clipMin&&n<utt.length&&chosen.length<9){const u=utt[n++];if(chosen.includes(u))continue;if(total+u.duration>clipMax*1.18)break;chosen.push(u);total+=u.duration}
if(total<Math.min(clipMin,8)||total>clipMax*1.35)continue;
const chronological=mode==='story'||mode==='debate'||mode==='educational'||creativity<30;
if(chronological)chosen.sort((a,b)=>a.assetId.localeCompare(b.assetId)||a.start-b.start);
const segments=chosen.map(u=>makeSegment(u.assetId,u.start,Math.min(u.end,u.start+Math.max(3,clipMax/chosen.length))));let actual=segments.reduce((s,x)=>s+x.end-x.start,0);if(actual>clipMax){let excess=actual-clipMax;for(let j=segments.length-1;j>=0&&excess>0;j--){let cut=Math.min(excess,Math.max(0,segments[j].end-segments[j].start-2));segments[j].end-=cut;excess-=cut}actual=segments.reduce((s,x)=>s+x.end-x.start,0)}
const relatedness=chosen.slice(1).reduce((s,u)=>s+similarity(seed,u),0)/Math.max(1,chosen.length-1);const hook=regex.test(seed.text)?16:0;const score=clamp(Math.round(32+hook+relatedness*32+Math.min(14,chosen.length*2)+Math.min(10,actual/5)+Math.min(6,seed.text.split(/\s+/).length/3)),0,95);
const name=`${mode==='comedy'?'Funny moment':mode==='educational'?'Key insight':mode==='story'?'Story':mode==='debate'?'Debate':'Highlight'}: ${seed.text.replace(/[^\w\s'-]/g,'').split(/\s+/).slice(0,7).join(' ')}`.slice(0,90);
const scattered=chosen.some((u,k)=>k&&u.assetId===chosen[k-1].assetId&&Math.abs(u.start-chosen[k-1].end)>30);
candidates.push({id:uid(),title:name,score,mode,segments,duration:actual,utteranceIds:chosen.map(u=>u.id),reason:`${chosen.length} transcript moments${scattered?' from different timestamps':''}. Shared topics: ${seed.keywords.slice(0,4).join(', ')||'general conversation'}. Review chronology and context before publishing.`,createdAt:Date.now(),source:'heuristic'});
}
return dedup(candidates.sort((a,b)=>b.score-a.score)).filter(c=>c.score>=minScore).slice(0,clipCount)}

let semanticModel=null;
export function sampleAcrossTimeline(utteranceList,limit=450){if(utteranceList.length<=limit)return utteranceList;const chosen=[];for(let i=0;i<limit;i++)chosen.push(utteranceList[Math.round(i*(utteranceList.length-1)/(limit-1))]);return chosen}
/** Optional local sentence embeddings: searches across all recording times, not only the first N minutes. */
export async function semanticCandidates(words,assets,settings={},progress=()=>{}){
 const entries=sampleAcrossTimeline(utterances(words),Math.max(40,Math.min(450,settings.semanticSamples||250)));if(entries.length<2)return generateCandidates(words,assets,settings);
 progress(0,'Loading on-device sentence embeddings');
 if(!semanticModel){const mod=await import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1');semanticModel=await mod.pipeline('feature-extraction','Xenova/all-MiniLM-L6-v2',{device:'wasm',dtype:'q8'})}
 const vectors=[];for(let i=0;i<entries.length;i++){
  const embedding=await semanticModel(entries[i].text,{pooling:'mean',normalize:true});vectors.push(Float32Array.from(embedding.data));
  if(i%3===0)progress((i+1)/entries.length,`Indexing meaning across recording ${i+1}/${entries.length}`)
 }
 const mode=settings.mode||'comedy',recognizer=modes[mode]||comedy,min=settings.clipMin||15,max=settings.clipMax||60,used=new Set(),candidates=[];
 for(let i=0;i<entries.length;i++){
  const seed=entries[i],top=entries.map((u,j)=>({u,j,match:j===i?-1:vectors[i].reduce((n,v,k)=>n+v*vectors[j][k],0)+(recognizer.test(u.text)?.09:0)})).filter(x=>x.j!==i&&x.match>.28).sort((a,b)=>b.match-a.match);
  const picked=[{u:seed,j:i,match:1}];let seconds=seed.duration;
  for(const item of top){if(picked.length>=7||seconds>=max*.83)break;if(picked.some(x=>x.u.assetId===item.u.assetId&&Math.abs(x.u.start-item.u.start)<5))continue;if(seconds+item.u.duration>max*1.12)continue;picked.push(item);seconds+=item.u.duration}
  if(seconds<min||seconds>max*1.2||picked.length<2)continue;
  if(mode==='story'||mode==='educational'||settings.creativity<35)picked.sort((a,b)=>a.u.assetId.localeCompare(b.u.assetId)||a.u.start-b.u.start);
  const id=picked.map(x=>x.u.id).sort().join('|');if(used.has(id))continue;used.add(id);
  const segs=picked.map(x=>makeSegment(x.u.assetId,x.u.start,x.u.end));const quality=picked.slice(1).reduce((a,b)=>a+b.match,0)/(picked.length-1);
  candidates.push({id:uid(),title:`${mode==='comedy'?'Comedy':'Story'}: ${seed.text.replace(/[^\w\s'-]/g,'').split(/\s+/).slice(0,8).join(' ')}`.slice(0,110),reason:`${picked.length} moments with related meaning (embedding similarity ${(quality*100).toFixed(0)}%). Verify sources and chronology before publishing.`,score:clamp(Math.round(35+quality*55+Math.min(10,picked.length*2)),0,95),mode,segments:segs,duration:seconds,utteranceIds:picked.map(x=>x.u.id),source:'local-embeddings',createdAt:Date.now()});
 }
 progress(1,`Compared ${entries.length} moments across the full source timeline`);
 return candidates.sort((a,b)=>b.score-a.score).filter(c=>c.score>=(settings.minScore??0)).slice(0,settings.clipCount||8);
}
/** Windowed remote AI analysis. A bounded set of windows spans the whole recording. */
export async function remoteCandidates(words,assets,settings,key,onProgress=()=>{}){
 const all=utterances(words);if(!all.length)throw Error('No transcript to analyze');
 const endpoint=settings.providerUrl;if(!/^https:\/\//.test(endpoint))throw Error('An HTTPS endpoint is required');
 const maxCalls=clamp(settings.maxAICalls||8,1,24),windowSize=clamp(settings.remoteWindowSize||160,40,300);
 const windowCount=Math.min(maxCalls,Math.ceil(all.length/windowSize));const windows=[];
 for(let n=0;n<windowCount;n++){
  const start=Math.floor(n*all.length/windowCount),end=Math.floor((n+1)*all.length/windowCount);
  windows.push(sampleAcrossTimeline(all.slice(start,end),windowSize).map(u=>({id:u.id,assetId:u.assetId,start:u.start,end:u.end,text:u.text.slice(0,500)})));
 }
 const instructions=`You edit faithful short-form videos. Return JSON object {"clips":[{"title":"...","reason":"...","indices":[0,1,2]}]}. Indices reference ONLY the supplied utterances. Combine non-adjacent timestamps only when their meanings genuinely connect; include setup, payoff, context. Never fabricate dialogue, misrepresent chronological events or create fake reactions. Aim ${settings.clipMin}-${settings.clipMax}s with 2-8 utterances per short. Mode: ${settings.mode}. Editor instructions: ${settings.directorInstructions||'None'}. Return ONLY JSON.`;
 const proposals=[];for(let n=0;n<windows.length;n++){
  onProgress(n/windows.length,`Analyzing transcript window ${n+1}/${windows.length}`);
  const utt=windows[n];const response=await fetch(endpoint,{method:'POST',headers:{'content-type':'application/json',...(key?{'authorization':`Bearer ${key}`}:{})},body:JSON.stringify({model:settings.providerModel,temperature:.5,response_format:{type:'json_object'},messages:[{role:'system',content:instructions},{role:'user',content:JSON.stringify(utt)}]})});
  if(!response.ok)throw Error(`AI provider HTTP ${response.status}: ${(await response.text()).slice(0,240)}`);
  const payload=await response.json(),out=payload.choices?.[0]?.message?.content||'';let parsed;try{parsed=JSON.parse(out.replace(/^```(?:json)?\s*/,'').replace(/```$/,''))}catch{throw Error('AI response was not valid JSON')}
  if(!Array.isArray(parsed.clips))throw Error('AI did not return a clips array');
  for(const x of parsed.clips){const indices=[...new Set((x.indices||[]).filter(i=>Number.isInteger(i)&&i>=0&&i<utt.length))].slice(0,9);const segs=indices.map(i=>makeSegment(utt[i].assetId,utt[i].start,utt[i].end)),dur=segs.reduce((t,s)=>t+s.end-s.start,0);
   if(!segs.length||dur<1)continue;proposals.push({id:uid(),title:String(x.title||'AI clip').slice(0,120),reason:String(x.reason||'AI proposed sequence').slice(0,600),score:0,mode:settings.mode,segments:segs,duration:dur,createdAt:Date.now(),source:'remote-ai',utteranceIds:indices.map(i=>utt[i].id)})
  }
 }
 onProgress(1,`Reviewed ${windows.length} windows across ${all.length} transcript moments`);
 return dedup(proposals).slice(0,settings.clipCount||8)
}
