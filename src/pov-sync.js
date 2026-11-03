/** Transcript-only multi-POV timing. All times stay in ORIGINAL source coordinates.
 * targetTime = offset + scale * referenceTime; N-gram anchors are only evidence.
 * Never assert gameplay identities/kills from alignment.
 */
const normalize = s=>String(s||'').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9']/g,'').replace(/^'+|'+$/g,'');
export function transcriptTokens(words,id) {
 return (words||[]).filter(w=>w.assetId===id&&Number.isFinite(w.start)&&Number.isFinite(w.end)&&w.end>w.start)
  .sort((a,b)=>a.start-b.start)
  .flatMap(w=>String(w.text||'').split(/\s+/).map(token=>({token:normalize(token),time:(w.start+w.end)/2})))
  .filter(w=>w.token.length>1);
}
export function transcriptAnchors(words,referenceId,targetId,{gram=5,maxAnchors=1500}={}) {
 const A=transcriptTokens(words,referenceId),B=transcriptTokens(words,targetId);
 const build=tokens=>{
  const result=new Map();
  for(let i=0;i+gram<=tokens.length;i++){
   // Do not join unrelated conversations across long pauses.
   if(tokens[i+gram-1].time-tokens[i].time>15)continue;
   const key=tokens.slice(i,i+gram).map(t=>t.token).join(' ');
   if(key.length<gram*3)continue;
   if(!result.has(key))result.set(key,[]);
   const locations=result.get(key);if(locations.length<5)locations.push(tokens[i].time);
  }
  return result;
 };
 const index=build(B),seen=new Set(),out=[];
 for(let i=0;i+gram<=A.length;i++){
  if(A[i+gram-1].time-A[i].time>15)continue;
  const key=A.slice(i,i+gram).map(w=>w.token).join(' '),matches=index.get(key);
  if(!matches||matches.length>2)continue;
  const id=Math.round(A[i].time*2)+'|'+key;
  if(seen.has(id))continue;seen.add(id);
  for(const targetTime of matches){
   out.push({referenceTime:A[i].time,targetTime,phrase:key,weight:matches.length===1?1:0.5});
   if(out.length>=maxAnchors)return out;
  }
 }
 return out;
}
const median=values=>{
 if(!values.length)return 0;const a=values.slice().sort((x,y)=>x-y);
 return a.length%2?a[(a.length-1)/2]:(a[a.length/2-1]+a[a.length/2])/2;
};
function fitLine(points){
 if(!points.length)return {scale:1,offset:0};
 const xs=points.map(p=>p.referenceTime),ys=points.map(p=>p.targetTime);
 const centerX=median(xs),centerY=median(ys);
 let top=0,bottom=0;
 for(let i=0;i<xs.length;i++){const dx=xs[i]-centerX;top+=dx*(ys[i]-centerY);bottom+=dx*dx}
 const scale=bottom>200?Math.max(.995,Math.min(1.005,top/bottom)):1;
 return {scale,offset:median(points.map(p=>p.targetTime-scale*p.referenceTime))};
}
export function estimateTranscriptSync(anchors,{tolerance=1.25,minInliers=3}={}){
 if((anchors||[]).length<minInliers)return {status:'insufficient',reason:'Not enough matching shared phrases in both VOD transcripts. Use manual offset or transcribe more of both.',matches:anchors?.length||0};
 const unique=[];
 // Ngrams from a single sentence generate many overlapping matches: cap per 8-second region.
 const cells=new Set();
 for(const a of anchors){
  const key=Math.round(a.referenceTime/8)+'|'+Math.round(a.targetTime/8);
  if(cells.has(key))continue;cells.add(key);unique.push(a);
 }
 if(unique.length<minInliers)return {status:'insufficient',reason:'Too few independent shared conversations',matches:unique.length};
 // Vote offset at near scale=1; robust to repeated speech and unrelated VODs.
 const bins=new Map();
 for(const a of unique){
  const delta=a.targetTime-a.referenceTime,bin=Math.round(delta/2);
  bins.set(bin,(bins.get(bin)||0)+a.weight);
 }
 const peaks=[...bins].sort((a,b)=>b[1]-a[1]).slice(0,10);
 let best=null;
 for(const [bin] of peaks){
  const near=unique.filter(a=>Math.abs((a.targetTime-a.referenceTime)-bin*2)<=Math.max(2.5,tolerance*2));
  if(near.length<minInliers)continue;
  let model=fitLine(near),inliers=near;
  for(let repeat=0;repeat<3;repeat++){
   inliers=unique.filter(a=>Math.abs(a.targetTime-(model.offset+model.scale*a.referenceTime))<=tolerance);
   if(inliers.length<minInliers)break;
   model=fitLine(inliers);
  }
  if(inliers.length<minInliers)continue;
  const errors=inliers.map(a=>Math.abs(a.targetTime-(model.offset+model.scale*a.referenceTime)));
  const spread=Math.max(...inliers.map(a=>a.referenceTime))-Math.min(...inliers.map(a=>a.referenceTime));
  const score=inliers.length*2+Math.min(12,spread/300)-median(errors)*4;
  if(!best||score>best.score)best={...model,inliers,errors,spread,score};
 }
 if(!best)return {status:'insufficient',reason:'Matching phrases did not agree on a common timestamp offset. The VODs may not share the same voice chat.',matches:unique.length};
 const residual=median(best.errors);
 const confidence=best.inliers.length>=6&&best.spread>=600&&residual<.5?'high':
  best.inliers.length>=3&&residual<=1?'medium':'low';
 return {status:'matched',method:'transcript',offset:+best.offset.toFixed(3),scale:+best.scale.toFixed(8),
  inliers:best.inliers.length,matches:unique.length,confidence,residual:+residual.toFixed(3),
  coveredSeconds:+best.spread.toFixed(1),anchors:best.inliers.slice(0,80).map(({referenceTime,targetTime,phrase})=>({referenceTime,targetTime,phrase})),
  warning:confidence==='low'?'Only a few reliable phrase matches. Verify both ends manually before making a multi-POV edit.':
   best.spread<240?'Transcript matches cover a short section. Later gameplay may drift; verify near the end.':''};
}
export function syncFromTranscripts(words,a,b,opts={}){
 return estimateTranscriptSync(transcriptAnchors(words,a,b,opts),opts);
}
export function referenceToTarget(time,sync){return sync.offset+time*(sync.scale||1)}
export function targetToReference(time,sync){return (time-sync.offset)/(sync.scale||1)}
export function alignmentAt(sync,sourceId,time){
 if(sourceId===sync.referenceId)return time;
 if(sourceId===sync.targetId)return targetToReference(time,sync);
 return null;
}
export function sourceAtAlignment(sync,sourceId,time){
 if(sourceId===sync.referenceId)return time;
 if(sourceId===sync.targetId)return referenceToTarget(time,sync);
 return null;
}
export function checkSynchronization(sync,referenceDuration,targetDuration){
 if(!sync)return {valid:false,reason:'No alignment saved'};
 if(!Number.isFinite(sync.offset)||!(sync.scale>.98&&sync.scale<1.02))return {valid:false,reason:'Invalid or implausible clock mapping'};
 const start=Math.max(0,targetToReference(0,sync)),end=Math.min(referenceDuration,targetToReference(targetDuration,sync));
 if(end-start<8)return {valid:false,reason:'The synchronized recordings overlap for fewer than eight seconds'};
 return {valid:true,commonStart:+start.toFixed(3),commonEnd:+end.toFixed(3),overlap:end-start};
}
