/** Optional text-only LLM critique for locally detected PvP encounters.
 * No screenshot input: do not assert visually unverified kills or revives. */
import {fetchAIWithRetry} from './director.js';
import {clamp} from './model.js';
export function gameplayReviewInput(candidate,words,maxWords=100){
 const segments=candidate.segments||[],contexts=[];
 for(const seg of segments){
  const matches=words.filter(w=>w.assetId===seg.assetId&&w.end>=seg.start-3&&w.start<=seg.end+3);
  contexts.push({source:seg.assetId,start:seg.start,end:seg.end,transcript:matches.slice(0,maxWords).map(w=>w.text).join(' ')});
 }
 return {id:candidate.id,score:candidate.score,title:candidate.title,duration:candidate.duration,evidence:candidate.gameplay?.explanation||[],contexts};
}
export async function reviewPvPWithAI(candidates,words,settings,key,onProgress=()=>{},{fetcher=globalThis.fetch,wait}={}){
 if(!candidates.length)return [];
 const limit=Math.min(Math.max(1,settings.maxAICalls||8),24),perBatch=14;
 // Stratified sampling includes later hours rather than always reviewing the opening.
 const count=Math.min(candidates.length,limit*perBatch),sampled=[];
 for(let i=0;i<count;i++)sampled.push(candidates[Math.floor((i+.5)*candidates.length/count)]);
 const reviewed=new Map(),endpoint=settings.providerUrl;
 if(!/^https:\/\//.test(endpoint||''))throw Error('An HTTPS AI Director endpoint is required for narrative review');
 const system='You are a professional Call of Duty PvP short-form editor. ONLY rate the supplied timestamp-accurate video edits. You receive speech transcript and approximate audio/motion features, NOT video frames. Never claim a kill, revive, player sighting or explosion was visually confirmed unless speech explicitly says it. Evaluate full-fight setup, turning point, funny reaction, trash talk, coherence, novelty, and payoff. Do not select isolated talking; never cut a fight midway. Preserve all supplied timestamps: you may NOT change clip segments. Follow user editorial directions. Return JSON {"reviews":[{"id":"candidate-id","quality":0,"keep":true,"title":"grounded title","reason":"specific evidence-based editorial review"}]}. Include each candidate exactly once. No markdown.';
 for(let offset=0;offset<sampled.length;offset+=perBatch){
  const batch=sampled.slice(offset,offset+perBatch).map(c=>gameplayReviewInput(c,words));
  onProgress(offset/sampled.length,'AI reviewing PvP story/payoff '+Math.min(sampled.length,offset+perBatch)+'/'+sampled.length);
  let response;
  try{
   response=await fetchAIWithRetry(endpoint,{method:'POST',headers:{'content-type':'application/json',...(key?{authorization:'Bearer '+key}:{})},body:JSON.stringify({
    model:settings.providerModel,temperature:.2,response_format:{type:'json_object'},
    messages:[{role:'system',content:system},{role:'user',content:JSON.stringify({editorDirections:settings.directorInstructions||'Prioritize action with funny or dramatic reaction; no dialogue-only moments.',candidates:batch})}]
   })},{fetcher,wait,maxAttempts:3,onRetry:({attempt,status})=>onProgress(offset/sampled.length,'Provider '+status+' overloaded; retry '+(attempt+1))});
  }catch(e){
   if(!e.retryable)throw e;
   onProgress(1,'AI provider still unavailable: retaining locally ranked gameplay clips');
   break;
  }
  const body=await response.json(),raw=body.choices?.[0]?.message?.content||'';
  let parsed;
  try{parsed=JSON.parse(String(raw).replace(/^\x60{3}(?:json)?\s*/,'').replace(/\x60{3}$/,''))}
  catch{onProgress(offset/sampled.length,'AI response malformed; preserving local clips');continue}
  const known=new Set(batch.map(x=>x.id));
  for(const r of Array.isArray(parsed?.reviews)?parsed.reviews:[]){
   if(!known.has(r.id)||!Number.isFinite(Number(r.quality)))continue;
   reviewed.set(r.id,{quality:clamp(Number(r.quality),0,100),keep:r.keep!==false,title:String(r.title||'').slice(0,100),reason:String(r.reason||'').slice(0,260)});
  }
 }
 onProgress(1,'Narrative review complete: '+reviewed.size+' of '+candidates.length+' PvP proposals evaluated by text AI; original fight footage preserved');
 return candidates.map(c=>{
  const r=reviewed.get(c.id);
  if(!r)return {...c,aiReview:'not-reviewed',reason:c.reason+' Narrative AI did not review this clip; gameplay signals were locally evaluated.'};
  const quality=Math.round(.4*c.score+.6*r.quality);
  return {...c,title:r.title||c.title,score:quality,aiReview:r.keep?'approved':'review-needed',aiScore:r.quality,
   reason:c.reason+' AI text-based critique: '+(r.reason||'No specific notes')+(r.keep?'':' · AI recommends reviewing or rejecting this candidate.')};
 }).sort((a,b)=>Number(b.aiReview==='approved')-Number(a.aiReview==='approved')||b.score-a.score);
}
