/** Source-bound editorial review: every finding is derived from actual original
 * asset intervals and timed transcript words. No scene, reaction, or joke is
 * claimed to have been visually/semantically confirmed by this module. */
import {storyTopicWords} from './humor-stories.js';

const ACTION_WORDS=/\b(shoot|shot|hit|kill|killed|downed|fight|fighting|crash|crashed|ran|jumped|helicopter|exploded|grenade|caught|saved|escaped|died|won|lost)\b/i;
const REACTION_WORDS=/\b(laugh|hahaha|lol|lmao|oh|wow|what|no way|are you serious|you got me|wtf|holy|kidding|ridiculous|amazing)\b/i;
const DRY=/\b(configuration|documentation|parameters|installation|requirements|endpoint|architecture|algorithm)\b/i;
const sourceWords=(words,assetId,start=-Infinity,end=Infinity)=>(words||[]).filter(w=>w.assetId===assetId&&Number.isFinite(w.start)&&Number.isFinite(w.end)&&w.end>start&&w.start<end&&String(w.text||'').trim()).sort((a,b)=>a.start-b.start||a.end-b.end);
const formatWordSpan=arr=>arr.map(w=>String(w.text)).join(' ').replace(/\s+([,.!?;:])/g,'$1').trim();
const round=x=>Number(x.toFixed(3));
export function verifySourceCut(cut,assets=[]){
 const a=(assets||[]).find(a=>a.id===cut?.assetId);
 if(!a)return {ok:false,status:'missing',problem:'No original asset with this source ID exists in the project.'};
 if(!Number.isFinite(cut.start)||!Number.isFinite(cut.end)||cut.start<0||cut.end<=cut.start)
  return {ok:false,status:'invalid',problem:'Source in/out times are invalid.'};
 if(Number.isFinite(a.duration)&&a.duration>0&&cut.end>a.duration+.1)
  return {ok:false,status:'out-of-range',problem:'Cut exceeds the original recording duration.'};
 return {ok:true,status:a.url?'ready':'relink',problem:a.url?'':'The original file needs re-linking before footage can be verified or exported.',sourceName:a.name||a.id,duration:cut.end-cut.start};
}
export function sourceTranscriptContext(cut,words,{seconds=8}={}){
 const inRange=sourceWords(words,cut.assetId,cut.start,cut.end),
  before=sourceWords(words,cut.assetId,Math.max(0,cut.start-seconds),cut.start),
  after=sourceWords(words,cut.assetId,cut.end,cut.end+seconds);
 const selectedText=formatWordSpan(inRange),prior=formatWordSpan(before),next=formatWordSpan(after);
 return {selectedText,prior,next,
  selectedWordCount:inRange.length,preWordCount:before.length,postWordCount:after.length,
  firstWord:inRange[0]||null,lastWord:inRange.at(-1)||null,
  speakers:[...new Set(inRange.map(w=>w.speaker||'Speaker 1'))],
  selectedSourceTime:{start:cut.start,end:cut.end},
  originalWords:inRange};
}
export function analyzeStoryCut(cut,words,assets,previous=null){
 const validity=verifySourceCut(cut,assets),context=sourceTranscriptContext(cut,words);
 const issues=[],evidence=[];
 const add=(kind,code,why)=>issues.push({kind,code,why});
 if(!validity.ok)add('error','SOURCE_INVALID',validity.problem);
 else if(validity.status==='relink')add('warning','RELINK_ORIGINAL',validity.problem);
 if(!context.originalWords.length)add('warning','NO_TIMED_DIALOGUE','No timed transcript words overlap this source interval; silence, game audio or an SRT gap are possible.');
 else{
  evidence.push('Actual source transcript: '+context.selectedWordCount+' timed words, '+context.speakers.length+' speaker label(s)');
  if(context.preWordCount&&context.firstWord.start-cut.start<.7)
   add('review','POSSIBLE_SETUP_CUT','There is real dialogue just before the cut; check whether it establishes the joke or action.');
  if(context.postWordCount&&cut.end-context.lastWord.end<.7)
   add('review','POSSIBLE_PAYOFF_CUT','There is real dialogue after the cut; review for the reaction or punchline.');
  if(DRY.test(context.selectedText))
   add('review','DRY_WORDING','Contains technical/informational wording. Review whether this is actually funny or story-relevant.');
  if(context.speakers.length>=2)evidence.push('At least two distinct transcript speaker labels appear; this does not prove correct diarization.');
  if(REACTION_WORDS.test(context.selectedText))evidence.push('Possible reaction wording occurs in original transcript; humor is not proven.');
  if(ACTION_WORDS.test(context.selectedText))evidence.push('Action-related language occurs in original transcript; no visual action has been verified.');
 }
 if(previous){
  if(previous.assetId===cut.assetId&&cut.start<previous.start)
   add('review','REVERSED_CHRONOLOGY','Source order goes backwards; this could change the meaning of the conversation.');
  if(previous.assetId===cut.assetId&&cut.start<previous.end){
   const overlap=Math.min(cut.end,previous.end)-cut.start;
   if(overlap>.2)add('review','REPEATED_FOOTAGE','Adjacent cuts repeat '+round(overlap)+'s of original video.');
  }
  if(previous.assetId!==cut.assetId)add('review','CROSS_SOURCE_SYNC','Cuts use different recordings; synchronization has not been verified from these intervals.');
  if(previous.assetId===cut.assetId&&cut.start-previous.end>25){
   const prevWords=sourceWords(words,previous.assetId,previous.start,previous.end),
    shared=storyTopicWords(formatWordSpan(prevWords)).filter(w=>new Set(storyTopicWords(context.selectedText)).has(w));
   if(shared.length<2)add('review','DISTANT_TOPIC_CHANGE','Large source-time jump has fewer than two repeated dialogue terms. Confirm it is the same event.');
   else evidence.push('Distant source cuts share original dialogue terms: '+shared.slice(0,4).join(', '));
  }
 }
 return {cutId:cut.id||null,assetId:cut.assetId,start:cut.start,end:cut.end,duration:round(cut.end-cut.start),
  sourceName:validity.sourceName||null,ready:validity.status==='ready',issues,evidence,
  transcript:{selected:context.selectedText,before:context.prior,after:context.next,speakers:context.speakers},
  sourceStatus:validity.status,scoreKind:'technical and transcript evidence only; not a predicted engagement score'};
}
export function inspectConnectedStory(cuts,words=[],assets=[]){
 const review=(cuts||[]).map((c,i)=>analyzeStoryCut(c,words,assets,cuts[i-1]||null));
 const issueCounts={error:0,warning:0,review:0};
 for(const cut of review)for(const issue of cut.issues)issueCounts[issue.kind]=(issueCounts[issue.kind]||0)+1;
 const total=(cuts||[]).reduce((n,c)=>n+Math.max(0,(c.end-c.start)/Math.max(.25,c.speed||1)),0);
 const sourceCount=new Set((cuts||[]).map(c=>c.assetId)).size;
 const overlapPairs=[];
 for(let i=0;i<(cuts||[]).length;i++)for(let j=i+1;j<cuts.length;j++){
  const a=cuts[i],b=cuts[j];
  if(a.assetId!==b.assetId)continue;
  const shared=Math.max(0,Math.min(a.end,b.end)-Math.max(a.start,b.start)),shorter=Math.min(a.end-a.start,b.end-b.start);
  if(shorter>.05&&shared/shorter>=.65)overlapPairs.push([i,j,round(shared/shorter)]);
 }
 if(overlapPairs.length)issueCounts.review+=overlapPairs.length;
 return {version:1,sourceOfTruth:'original-source IDs, source seconds and timed transcript ONLY',
  visualVerification:false,meaningVerified:false,readyForExport:issueCounts.error===0&&review.every(x=>x.ready),
  totalSeconds:round(total),cutCount:review.length,originalSourceCount:sourceCount,
  issueCounts,duplicatePairs:overlapPairs,cuts:review,
  disclaimer:'This is a deterministic source/transcript review. It cannot verify jokes, gunfights, visual outcomes, audio tone or real synchronization without inspecting the actual footage.'};
}
export function deduplicateSourceCuts(cuts,{threshold=.65}={}){
 const kept=[],removed=[];
 for(const cut of cuts||[]){
  const duplicate=kept.find(x=>{
   if(x.assetId!==cut.assetId)return false;
   const shorter=Math.min(x.end-x.start,cut.end-cut.start);
   return shorter>.05&&Math.max(0,Math.min(x.end,cut.end)-Math.max(x.start,cut.start))/shorter>=threshold;
  });
  if(duplicate)removed.push({cut,duplicateOf:duplicate.id||null});else kept.push(cut);
 }
 return {kept,removed};
}
export function chronologicalCuts(cuts){
 // Cross-source reordering is unsafe without verified synchronization.
 const sources=new Set((cuts||[]).map(c=>c.assetId));
 if(sources.size>1)throw Error('Cannot put different recordings in event order without a verified synchronization.');
 return (cuts||[]).slice().sort((a,b)=>a.start-b.start||a.end-b.end);
}
export function contextualCut(cut,words,assets,{before=0,after=0}={}){
 const source=(assets||[]).find(a=>a.id===cut.assetId);
 if(!source)throw Error('Original recording is missing.');
 const prior=sourceWords(words,cut.assetId,Math.max(0,cut.start-Math.max(0,before)),cut.start);
 const next=sourceWords(words,cut.assetId,cut.end,cut.end+Math.max(0,after));
 const start=prior.length?Math.max(0,Math.min(cut.start,prior[0].start-.15)):cut.start;
 const end=next.length?Math.min(Number(source.duration)||Infinity,Math.max(cut.end,next.at(-1).end+.2)):cut.end;
 return {...cut,start:round(start),end:round(end)};
}
export function trimToSpokenDialogue(cut,words,assets,{padding=.25}={}){
 const valid=verifySourceCut(cut,assets);if(!valid.ok)throw Error(valid.problem);
 const content=sourceWords(words,cut.assetId,cut.start,cut.end);
 if(!content.length)throw Error('No timed original-source dialogue in selected segment; no trim applied.');
 const start=Math.max(cut.start,content[0].start-padding),end=Math.min(cut.end,content.at(-1).end+padding);
 if(end-start<.3)throw Error('Aligned dialogue is too short for a safe cut.');
 return {...cut,start:round(start),end:round(end)};
}
export function storyEditPlan(project,cuts,mode='append'){
 const review=inspectConnectedStory(cuts,project.words,project.assets);
 return {format:'shortform-source-story-plan',version:1,createdAt:new Date().toISOString(),
  projectName:project.name,mode,review,
  selections:(cuts||[]).map((c,i)=>({sequence:i+1,assetId:c.assetId,sourceName:project.assets.find(a=>a.id===c.assetId)?.name||null,
   sourceIn:c.start,sourceOut:c.end,seconds:c.end-c.start,storyRole:c.storyRole||'unassigned',
   dialogue:review.cuts[i].transcript.selected,sourceEvidence:review.cuts[i].evidence,
   warnings:review.cuts[i].issues.map(x=>x.code)}))};
}
