import {uid,clamp,makeSegment} from './model.js';
import {discoverFullRecording,selectDiverseCandidates,clipSignature} from './director-coverage.js';
const STOP=new Set('i me my we our you your he she they their this that the a an and or but to in on at for of is are was were be been with it its as from then about do did does not so if would could should have has had just really very more than what when where how why who yes no yeah okay ok um uh like well'.split(' '));
const STEM=w=>w.toLowerCase().replace(/[^a-z0-9]/g,'').replace(/(ing|edly|ation|ments|ment|ed|es|s)$/,'');
export function utterances(words){const sorted=[...words].sort((a,b)=>a.assetId.localeCompare(b.assetId)||a.start-b.start);const out=[];let c=[];const emit=()=>{if(!c.length)return;const text=c.map(w=>w.text).join(' ');out.push({id:c[0].assetId+'@'+c[0].start.toFixed(3)+'-'+c.at(-1).end.toFixed(3),assetId:c[0].assetId,start:c[0].start,end:c.at(-1).end,text,speaker:c[0].speaker||'Speaker 1',keywords:[...new Set(c.map(w=>STEM(w.text)).filter(w=>w.length>3&&!STOP.has(w)))],duration:c.at(-1).end-c[0].start});c=[]};for(const w of sorted){if(c.length&&(w.assetId!==c[0].assetId||w.start-c.at(-1).end>1.6||w.speaker!==c[0].speaker||c.length>55))emit();c.push(w);if(/[.!?]$/.test(w.text)&&c.length>5)emit()}emit();return out.filter(x=>x.duration>=1.2)}
const comedy=/(laugh|funny|joke|ridiculous|wrong|never|oops|what\??|seriously|no way|crazy|hilarious|roast|fail|believe|impossible|actually|wait|haha|lol)/i;
const insight=/(because|reason|learn|explain|how to|why|tip|secret|mistake|result|important|first|second|finally|example)/i;
const drama=/(suddenly|shock|problem|disaster|never|terrible|surpris|angry|scared|challenge|truth|can't believe)/i;
const modes={comedy:comedy,educational:insight,story:/(first|then|next|after|finally|end|happened|story)/i,debate:/(but|disagree|actually|wrong|instead|however|because|think)/i,dramatic:drama,inspiration:/(learn|hope|dream|believe|change|improve|achieve|finally|better)/i,gaming:/(game|win|lose|kill|level|boss|round|score|play)/i};
function similarity(a,b){const s=new Set(a.keywords),t=new Set(b.keywords);if(!s.size||!t.size)return 0;let intersection=0;for(const k of s)if(t.has(k))intersection++;return intersection/Math.sqrt(s.size*t.size)}
function dedup(candidates){let seen=new Set();return candidates.filter(c=>{const key=c.utteranceIds.slice().sort().join(',');if(seen.has(key))return false;seen.add(key);return true})}
/** Exhaustive recording-wide discovery: time-balanced, source-faithful and novel on reruns. */
export function generateCandidates(words,assets,options={}){
 return discoverFullRecording(utterances(words),assets,options);
}
export async function generateCandidatesBatched(words,assets,options={},onProgress=()=>{}){
 onProgress(0,'Reading all available transcript moments…');
 // Yield before the synchronous index pass so the browser can paint the progress UI.
 await new Promise(resolve=>setTimeout(resolve,0));
 const candidates=discoverFullRecording(utterances(words),assets,options,onProgress);
 onProgress(1,'Searched every transcript moment · '+candidates.length+' distinct proposals selected');
 return candidates;
}

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
 const mode=settings.mode||'comedy',recognizer=modes[mode]||comedy,min=Number(settings.clipMin)>0?Number(settings.clipMin):0,max=Number(settings.clipMax)>0?Number(settings.clipMax):Infinity,used=new Set(),candidates=[];
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
 const local=generateCandidates(words,assets,{...settings,mode:'all',clipCount:0,discoveryAll:true,history:[],existingCandidates:[]});
 return selectDiverseCandidates([...candidates,...local],settings);
}

/** Retry temporary provider overloads; never retry bad credentials or malformed requests. */
export const retryableAIStatus=status=>[408,425,429,500,502,503,504].includes(Number(status));
export function aiRetryDelay(attempt,retryAfter=null){
 let delay=Math.min(8000,700*2**Math.max(0,attempt-1));
 if(retryAfter){
  const sec=Number(retryAfter);
  if(Number.isFinite(sec)&&sec>=0)delay=Math.min(10000,Math.max(delay,Math.round(sec*1000)));
  else {
   const when=Date.parse(retryAfter);
   if(Number.isFinite(when))delay=Math.min(10000,Math.max(delay,when-Date.now()));
  }
 }
 return delay;
}
export async function fetchAIWithRetry(endpoint,options,{fetcher=globalThis.fetch,wait=ms=>new Promise(resolve=>setTimeout(resolve,ms)),maxAttempts=4,onRetry=()=>{}}={}){
 let lastError;
 for(let attempt=1;attempt<=Math.max(1,maxAttempts);attempt++){
  let response;
  try{response=await fetcher(endpoint,options)}
  catch(e){
   if(e?.name==='AbortError')throw e;
   lastError=Error('AI provider connection failed: '+String(e?.message||e));
   lastError.retryable=true;lastError.status=null;
   if(attempt>=maxAttempts)throw lastError;
   const delay=aiRetryDelay(attempt);onRetry({attempt,maxAttempts,delay,status:'network'});
   await wait(delay);continue;
  }
  if(response.ok)return response;
  // Avoid dumping provider request identifiers or large bodies into UI.
  let body='';try{body=(await response.text()).slice(0,300)}catch{}
  const retryable=retryableAIStatus(response.status);
  const error=Error('AI provider HTTP '+response.status+(retryable?' (temporarily unavailable)':'')+': '+body.slice(0,150));
  error.retryable=retryable;error.status=response.status;
  if(!retryable||attempt>=maxAttempts)throw error;
  const delay=aiRetryDelay(attempt,response.headers?.get?.('retry-after'));
  onRetry({attempt,maxAttempts,delay,status:response.status});
  await wait(delay);
 }
 throw lastError||Error('AI provider did not respond');
}

/** Windowed remote AI analysis. A bounded set of windows spans the whole recording. */
export async function remoteCandidates(words,assets,settings,key,onProgress=()=>{},{fetcher=globalThis.fetch,wait}={}){
 const all=utterances(words);if(!all.length)throw Error('No transcript to analyze');
 const endpoint=settings.providerUrl;if(!/^https:\/\//.test(endpoint))throw Error('An HTTPS endpoint is required');
 const maxCalls=clamp(settings.maxAICalls||8,1,96),windowSize=clamp(settings.remoteWindowSize||160,40,300);
 const windowCount=Math.min(maxCalls,Math.ceil(all.length/windowSize));const windows=[];
 for(let n=0;n<windowCount;n++){
  const start=Math.floor(n*all.length/windowCount),end=Math.floor((n+1)*all.length/windowCount);
  windows.push(sampleAcrossTimeline(all.slice(start,end),windowSize).map(u=>({id:u.id,assetId:u.assetId,start:u.start,end:u.end,text:u.text.slice(0,500)})));
 }
 const instructions=`You are a story editor choosing from an ACTUAL ORIGINAL-SOURCE transcript, not a generic viral-clip keyword scorer.
GOAL: Find complete, engaging moments with authentic funny conversations, jokes, reactions, clever exchanges, insights, or a coherent mini-story depending on the user's direction. Never claim real-world action that is not in the supplied dialogue.
READ THE CONTEXT before each highlight: identify (1) setup / who or what is being discussed, (2) the surprising turn or joke, (3) the answer, laugh, comeback, consequence or meaningful conclusion. Include the WHOLE exchange, not only its funniest isolated sentence. If the transcript lacks context, mark it in reason or return no clip. Do not make abrupt beginning/end cuts mid-sentence. There is no automatic 30/60/75 second limit. Let the complete exchange determine duration.
For COMPILATIONS: choose distinct moments about a specific recurring subject, running joke or genuine sequence. Preserve original chronological order for the same event. Do not stitch unrelated banter simply because both excerpts mention 'funny', 'bro', 'game', or 'laugh'. For a story, the viewer should understand the topic at the beginning and see a real payoff at the end.
Return ONLY JSON: {"clips":[{"title":"specific, descriptive actual subject","reason":"cite literal setup, joke/payoff and why they belong together; disclose if reaction not present","indices":[0,1,2]}]}. Indices refer to exact zero-based indices supplied. Prefer consecutive utterance indices for a single conversation; nonadjacent sequences must demonstrably share a unique topic and cannot imply a false event. Do not mix different unsynchronized media files. Never invent words, laughs, faces, kills, reactions, outcomes, timestamps, or speakers. Skip dry filler, repetitive weak proposals and incomplete exchanges. Return multiple DISTINCT worthwhile clips only if they really exist. If none qualify, return an empty clips list.
Mode: ${settings.mode}. User's creative goal: ${settings.directorInstructions||'Find full funny moments and coherent stories with real setup and payoff.'}`;
 const proposals=[];for(let n=0;n<windows.length;n++){
  onProgress(n/windows.length,`Analyzing transcript window ${n+1}/${windows.length}`);
  const utt=windows[n];let response;
  try{
   response=await fetchAIWithRetry(endpoint,{method:'POST',headers:{'content-type':'application/json',...(key?{'authorization':`Bearer ${key}`}:{})},body:JSON.stringify({model:settings.providerModel,temperature:.5,response_format:{type:'json_object'},messages:[{role:'system',content:instructions},{role:'user',content:JSON.stringify(utt)}]})},{
    fetcher,wait,maxAttempts:4,onRetry:({attempt,maxAttempts,delay,status})=>onProgress(n/windows.length,`Provider ${status} — retry ${attempt+1}/${maxAttempts} in ${(delay/1000).toFixed(1)}s`)
   });
  }catch(e){
   if(!e.retryable)throw e;
   const local=generateCandidates(words,assets,{...settings,mode:'all',clipCount:0,discoveryAll:true,history:[],existingCandidates:[]}).map(candidate=>({...candidate,source:'local-fallback',reason:'Remote AI temporarily unavailable ('+(e.status||'network')+'). Locally assembled from original transcript; verify context. '+candidate.reason}));
   const combined=selectDiverseCandidates([...proposals,...local],settings);
   onProgress(1,'Provider '+(e.status||'network')+' remained unavailable. Kept '+proposals.length+' remote clips and offered '+local.length+' local fallback clips.');
   return combined;
  }
  const payload=await response.json(),out=payload.choices?.[0]?.message?.content||'';let parsed;try{parsed=JSON.parse(out.replace(/^```(?:json)?\s*/,'').replace(/```$/,''))}catch{throw Error('AI response was not valid JSON')}
  if(!Array.isArray(parsed.clips))throw Error('AI did not return a clips array');
  for(const x of parsed.clips){
   const indices=[...new Set((x.indices||[]).filter(i=>Number.isInteger(i)&&i>=0&&i<utt.length))].sort((a,b)=>a-b).slice(0,40);
   if(!indices.length)continue;
   const chosen=indices.map(i=>utt[i]),sourceId=chosen[0].assetId;
   // An unaligned cross-camera collage is NOT a single authentic conversation.
   if(chosen.some(u=>u.assetId!==sourceId))continue;
   const segs=[];
   for(const u of chosen){
    const prev=segs.at(-1),gap=prev?u.start-prev.end:Infinity;
    if(prev&&gap>=-.1&&gap<=4.5)prev.end=Math.max(prev.end,u.end);
    else segs.push(makeSegment(u.assetId,u.start,u.end));
   }
   // Do not silently add a chapter of unrelated original footage between remote excerpts.
   if(segs.length>1&&segs.some((q,i)=>i>0&&q.start-segs[i-1].end>180))continue;
   for(const seg of segs){const asset=assets.find(a=>a.id===seg.assetId);if(asset?.duration>0){seg.start=Math.max(0,Math.round(Math.max(0,seg.start-1.1)*1000)/1000);seg.end=Math.min(asset.duration,Math.round((seg.end+1.75)*1000)/1000)}}
   const dur=segs.reduce((t,s)=>t+(s.end-s.start),0);
   if(!segs.length||dur<1)continue;proposals.push({id:uid(),title:String(x.title||'AI clip').slice(0,120),reason:String(x.reason||'AI proposed sequence').slice(0,600),score:74,mode:settings.mode,segments:segs,duration:dur,anchorAssetId:segs[0].assetId,anchorTime:segs[0].start,createdAt:Date.now(),source:'remote-ai',utteranceIds:indices.map(i=>utt[i].id)})
  }
 }
 onProgress(1,`Reviewed ${windows.length} windows across ${all.length} transcript moments`);
 if(!proposals.length){onProgress(1,'No complete, grounded AI edits found in the sampled dialogue. No keyword fallback clips disguised as AI stories.');return [];}
 return selectDiverseCandidates(proposals,settings)
}
