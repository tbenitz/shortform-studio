/** Evidence-only review of proposed original-source clips.
 * This is ranking of complete dialogue structure, NOT a humor/virality prediction.
 * No invented event, unrelated source, or cut is ever introduced.
 */
import {storyTopicWords} from './humor-stories.js';
const reaction=/\b(?:(?:ha){2,}|(?:he){2,}|laugh(?:ing|ed|s)?|lol|lmao|wow|no way|are you serious|you kidding|that's crazy|that is crazy|oh my god|wtf|what the hell|gotcha|unbelievable)\b/i;
const max=(x,a,b)=>Math.max(a,Math.min(b,x));
const match=(m,w)=>w.assetId===m.assetId&&Number.isFinite(w.start)&&Number.isFinite(w.end)&&w.end>m.start&&w.start<m.end;
export function reviewClipStructure(moment,words=[]){
 const raw=(words||[]).filter(w=>match(moment,w)).sort((a,b)=>a.start-b.start);
 const dialogue=raw.length?raw.map(w=>w.text).join(' '):String(moment.dialogue||'');
 const speakers=[...new Set(raw.map(w=>w.speaker||'Speaker 1'))],topics=storyTopicWords(dialogue);
 const wordsCount=raw.length||dialogue.split(/\s+/).filter(Boolean).length;
 const question=/[?]/.test(dialogue),response=reaction.test(dialogue),multiSpeaker=speakers.length>=2;
 const boundaries=raw.length&&raw[0].start>=moment.start-.4&&raw.at(-1).end<=moment.end+.4;
 const startsAtWord=raw.length?moment.start<=raw[0].start+.3:false;
 const endsAtWord=raw.length?moment.end>=raw.at(-1).end-.3:false;
 const length=Number(moment.end)-Number(moment.start);
 // Wider excerpts get credit for context only up to a point; one-word clips never score high.
 let score=20+Math.min(22,Math.floor(wordsCount/4))+Math.min(12,topics.length*3);
 if(multiSpeaker)score+=18;
 if(question)score+=10;
 if(response)score+=12;
 if(raw.length&&boundaries&&startsAtWord&&endsAtWord)score+=6;
 if(wordsCount<7)score-=18;
 if(length<2)score-=15;
 const signals=[multiSpeaker?'multiple speakers':null,question?'question or setup cue':null,
  response?'written reaction cue':null,wordsCount>=12?'conversation context':null,
  topics.length>=2?'specific subject words':null].filter(Boolean);
 return {score:max(Math.round(score),0,100),signals,wordCount:wordsCount,
  topicWords:topics,hasReaction:response,hasQuestion:question,hasMultipleSpeakers:multiSpeaker,
  sourceWords:raw.length,reason:signals.length?signals.join(' · '):'Few recognizable dialogue signals; listen before choosing'};
}
export function orderClipSuggestions(moments,words,{sort='source',reactionOnly=false,multiSpeakerOnly=false}={}){
 const ranked=(moments||[]).map(moment=>({moment,review:reviewClipStructure(moment,words)}))
  .filter(({review})=>(!reactionOnly||review.hasReaction)&&(!multiSpeakerOnly||review.hasMultipleSpeakers));
 ranked.sort((a,b)=>{
  if(sort==='structure')return b.review.score-a.review.score||a.moment.start-b.moment.start;
  if(sort==='longest')return (b.moment.end-b.moment.start)-(a.moment.end-a.moment.start)||a.moment.start-b.moment.start;
  if(sort==='reaction')return Number(b.review.hasReaction)-Number(a.review.hasReaction)||b.review.score-a.review.score||a.moment.start-b.moment.start;
  return a.moment.assetId.localeCompare(b.moment.assetId)||a.moment.start-b.moment.start;
 });
 return ranked;
}
/** Curate diverse real moments, never auto-paste them into a final story. */
export function suggestDiverseSelection(moments,words,{count=5,minSpacing=10}={}){
 const ranked=orderClipSuggestions(moments,words,{sort:'structure'}),out=[];
 const limit=max(Number(count)||5,1,15);
 for(const item of ranked){
  if(out.length>=limit)break;
  const c=item.moment,duration=c.end-c.start;
  if(duration<=0)continue;
  if(out.some(p=>p.assetId===c.assetId&&(
    Math.min(p.end,c.end)-Math.max(p.start,c.start)>0||
    Math.abs(p.start-c.start)<minSpacing)))continue;
  out.push(c);
 }
 return out;
}
