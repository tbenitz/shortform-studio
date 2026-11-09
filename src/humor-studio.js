import {makeSegment} from './model.js';
import {fetchAIWithRetry} from './director.js';
const FUNNY=/\b(laugh(?:ing|ed|s)?|hahaha?|hehe|lol|lmao|rofl|jok(?:e|es|ing)|funny|hilarious|ridiculous|roast|prank|troll|sarcasm|clown|bro what|no way|are you serious|you'?re kidding|you got me|oh my god|wtf|what the hell|imagine that|ain'?t no way|i can'?t believe|that'?s crazy|gotcha|shut up)\b/gi;
const BANTER=/\b(bro|dude|buddy|mate|guys|you|your|we|us|everyone|who|why|what|really|seriously|no|yes|wait|how)\b/gi;
const DRY=/\b(megabyte|gigabyte|installation|documentation|configuration|debugging|technical|tutorial|instructions|requirement|version|step one|typically|algorithm|parameter|procedure|settings|api key|server endpoint)\b/gi;
export const DEFAULT_HUMOR_INSTRUCTIONS="Read through this transcript and extract every section featuring humorous banter, clever jokes, or funny group dynamics. Skip dry informational talk, technical explanations, or filler. Use only dialogue actually present in the source.";
function validWords(words,assetId){return (words||[]).filter(w=>w&&w.assetId===assetId&&Number.isFinite(w.start)&&Number.isFinite(w.end)&&w.end>=w.start&&String(w.text||'').trim()).sort((a,b)=>a.start-b.start)}
export function transcriptTurns(words,assetId){
 const sorted=validWords(words,assetId),out=[];let group=[];
 const flush=()=>{if(!group.length)return;const t={id:assetId+':'+group[0].start.toFixed(3),assetId,start:group[0].start,end:group.at(-1).end,speaker:String(group[0].speaker||'Speaker 1'),text:group.map(w=>w.text).join(' ').replace(/\s+([!?,.;:])/g,'$1')};out.push(t);group=[]};
 for(const w of sorted){const last=group.at(-1);if(last&&(w.start-last.end>1.8||w.speaker!==group[0].speaker||group.length>=42||w.end-group[0].start>15||(/[.!?]$/.test(last.text)&&group.length>=7)))flush();group.push(w)}flush();
 return out;
}
function score(turns){
 const text=turns.map(t=>t.text).join(' '),hits=(text.match(FUNNY)||[]).length,banter=(text.match(BANTER)||[]).length,dry=(text.match(DRY)||[]).length;
 const speakers=new Set(turns.map(t=>t.speaker));
 const points=Math.max(0,Math.min(100,24+Math.min(45,hits*17)+Math.min(12,banter*2)+Math.min(10,(text.match(/[!?]/g)||[]).length*3)+(speakers.size>1?12:0)-Math.min(40,dry*16)));
 return {points,hits,dry};
}
function asMoment(asset,turns,why,points){
 const start=Math.max(0,turns[0].start-.5),end=Math.min(Number(asset.duration)||Number.MAX_SAFE_INTEGER,turns.at(-1).end+.6);
 if(end-start<1)return null;
 return {id:'humor:'+asset.id+':'+Math.round(turns[0].start*10)+'-'+Math.round(turns.at(-1).end*10),assetId:asset.id,start:Number(start.toFixed(3)),end:Number(end.toFixed(3)),dialogue:turns.map(t=>(t.speaker&&t.speaker!=='Speaker 1'?t.speaker+': ':'')+t.text).join('\n'),score:points,reason:why,selected:false,source:'transcript'};
}
/** Local heuristic discovery is a candidate finder, NOT proof of humor. */
export function findLocalHumor(words,assets,{minScore=50,maxResults=200}={}){
 const found=[];
 for(const asset of assets||[]){
  const turns=transcriptTurns(words,asset.id);
  for(let i=0;i<turns.length;i++){
   const anchor=score([turns[i]]);
   if(!anchor.hits&&!(anchor.points>=55&&/[!?]/.test(turns[i].text)))continue;
   let l=i,r=i;
   while(l>0&&i-l<3&&turns[l].start-turns[l-1].end<=4&&turns[i].end-turns[l-1].start<40&&(score([turns[l-1]]).dry===0||score([turns[l-1]]).hits>0))l--;
   while(r+1<turns.length&&r-i<3&&turns[r+1].start-turns[r].end<=4&&turns[r+1].end-turns[l].start<50&&(score([turns[r+1]]).dry===0||score([turns[r+1]]).hits>0))r++;
   const section=turns.slice(l,r+1),rating=score(section);
   if(rating.points<minScore||rating.dry>rating.hits+1)continue;
   const item=asMoment(asset,section,'Local wording/banter match; verify actual joke in source footage',rating.points);
   if(item)found.push(item);
  }
 }
 found.sort((a,b)=>a.assetId.localeCompare(b.assetId)||a.start-b.start);
 const unique=[];
 for(const m of found){
  const prev=unique.at(-1);
  if(prev&&prev.assetId===m.assetId&&m.start<=prev.end&&Math.min(m.end,prev.end)-Math.max(m.start,prev.start)>.35*Math.min(m.end-m.start,prev.end-prev.start)){
   if(m.score>prev.score)unique[unique.length-1]=m;continue;
  }
  unique.push(m);
 }
 return unique.slice(0,maxResults);
}
export function rawDialogueOnly(moments){return (moments||[]).slice().sort((a,b)=>a.assetId.localeCompare(b.assetId)||a.start-b.start).map(m=>String(m.dialogue||'').trim()).filter(Boolean).join('\n\n')}
export function makeCompilationSegments(moments,assets,{cropMode='manual',zoom=1}={}){
 const lookup=new Map((assets||[]).map(a=>[a.id,a]));const output=[];
 for(const m of moments||[]){
  const a=lookup.get(m.assetId);
  if(!a||a.type!=='video'||!Number.isFinite(m.start)||!Number.isFinite(m.end)||m.start<0||m.end<=m.start||m.end>(Number(a.duration)||Infinity)+.1)throw Error('Missing or invalid original recording: '+(a?.name||m.assetId));
  const clip=makeSegment(m.assetId,m.start,m.end);
  clip.notes='Compilation · '+String(m.dialogue||'').slice(0,180);clip.compilationMomentId=m.id;
  clip.cropMode=['auto','off','manual'].includes(cropMode)?cropMode:'manual';
  clip.zoom=clip.zoomEnd=Math.max(1,Math.min(4,Number(zoom)||1));
  output.push(clip);
 }
 return output;
}
function decodeSelections(content){
 const text=String(content||'').trim();
 const l=text.indexOf('{'),r=text.lastIndexOf('}');
 if(l<0||r<l)throw Error('AI response was not valid JSON selections');
 const obj=JSON.parse(text.slice(l,r+1));
 return Array.isArray(obj.selections)?obj.selections:[];
}
/** Optional real AI transcript classification, constrained to real source turn indices. */
export async function classifyHumorWithAI(words,assets,{endpoint,model,key,instructions=DEFAULT_HUMOR_INSTRUCTIONS,maxCalls=16,chunkSize=70,onProgress=()=>{},signal}={}){
 if(!key?.trim())throw Error('Enter the AI Director key first.');
 if(!/^https:\/\//i.test(endpoint||''))throw Error('AI endpoint must use HTTPS.');
 const batches=[];
 for(const a of assets||[]){const ts=transcriptTurns(words,a.id);for(let i=0;i<ts.length;i+=chunkSize){const part=ts.slice(i,i+chunkSize);if(part.length)batches.push({asset:a,turns:part})}}
 const total=batches.length,limit=Math.min(total,Math.max(1,Math.min(150,Number(maxCalls)||16))),out=[];
 for(let n=0;n<limit;n++){
  if(signal?.aborted)throw Error('Humor scan canceled');
  const {asset,turns}=batches[n];
  const dialogue=turns.map((t,i)=>({i,start:t.start,end:t.end,speaker:t.speaker,text:t.text}));
  const system='Identify genuinely humorous banter, clever jokes, teasing and funny group dynamics from transcript ONLY. Return only JSON {"selections":[{"first":0,"last":1,"why":"brief reason"}]}. first and last are indices of the supplied transcript array. Include setup and payoff. Exclude dry technical/informational sections. No imaginary footage or dialogue. If no good humor {"selections":[]}.';
  const user='User selection instructions: '+String(instructions).slice(0,1500)+'\nSource: '+asset.name+'\nTranscript:\n'+JSON.stringify(dialogue);
  const response=await fetchAIWithRetry(endpoint,{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+key},body:JSON.stringify({model,messages:[{role:'system',content:system},{role:'user',content:user}],temperature:.1,max_tokens:2000})},{maxAttempts:3,onRetry:i=>onProgress(n/Math.max(1,total),'Retrying batch '+(n+1)+' request '+i)});
  if(!response.ok)throw Error('Humor AI HTTP '+response.status);
  const reply=await response.json(),items=decodeSelections(reply?.choices?.[0]?.message?.content);
  for(const item of items){
   const l=Number(item.first),r=Number(item.last);
   if(!Number.isInteger(l)||!Number.isInteger(r)||l<0||r<l||r>=turns.length||r-l>15)continue;
   const found=asMoment(asset,turns.slice(l,r+1),String(item.why||'AI suggested — verify in original footage').slice(0,120),75);
   if(found)out.push({...found,source:'AI transcript selection (not visually verified)'});
  }
  onProgress((n+1)/Math.max(1,total),'Scanned '+(n+1)+' of '+total+' transcript windows · '+out.length+' candidates');
 }
 const seen=new Set(),moments=out.filter(m=>{const key=m.assetId+':'+Math.round(m.start)+'-'+Math.round(m.end);if(seen.has(key))return false;seen.add(key);return true});
 return {moments,totalBatches:total,processedBatches:limit,complete:limit===total};
}
