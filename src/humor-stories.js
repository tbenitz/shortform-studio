/** Real-source humor stories: join only actual moments with verifiable shared subject.
 * No random montage, invented clips or unsupported multi-source synchronization.
 */
const STOP=new Set('a an and are as at be been being but by can cannot cant could did do does doing for from had has have having he her hers him his how i if im in into is it its just like me mine my no not of on one or our ours out over really say saying she so some that thats the their them then there these they this those to too us was we were what when where who why will with would yeah yes you your yours laugh laughter laughing laughed hilarious haha hahaha lol lmao joke jokes joking funny prank troll trolling comedy crazy dude bro buddy seriously wait oh wow omg wtf okay ok right man guy guys someone something thing things actually literally very first next still only now again ever never react reaction said says got get getting all gonna going go come coming around about same story scene footage video clip clips fuck fucking shit nope sure yep well fine good bad'.split(/\s+/));
export function storyTopicWords(dialogue){
 const tokens=String(dialogue||'').toLowerCase().match(/[a-z][a-z'-]{2,}/g)||[];
 const unique=new Set();
 for(let w of tokens){
  w=w.replace(/'(s|re|ve|ll|d|t)$/,'');
  if(w.endsWith('ies')&&w.length>5)w=w.slice(0,-3)+'y';
  else if(/(ing|ed|es|s)$/.test(w)&&w.length>6)w=w.replace(/(ing|ed|es|s)$/,'');
  if(w.length>=4&&!STOP.has(w))unique.add(w);
 }
 return [...unique];
}
function topicalMatch(a,b){const left=new Set(storyTopicWords(a.dialogue));return storyTopicWords(b.dialogue).filter(w=>left.has(w))}
/** AI topics may link paraphrased jokes but must be present in both
 * source excerpts, never merely repeated invented labels from a model. */
function groundedSharedAiTopic(a,b){
 const topicA=storyTopicWords(a.topic),topicB=new Set(storyTopicWords(b.topic));
 const common=topicA.filter(w=>topicB.has(w));
 if(common.length<2)return null;
 const aWords=new Set(storyTopicWords(a.dialogue)),bWords=new Set(storyTopicWords(b.dialogue));
 const groundedA=common.filter(w=>aWords.has(w)),groundedB=common.filter(w=>bWords.has(w));
 if(!groundedA.length||!groundedB.length)return null;
 return common;
}
function validSourceMoment(m){return m&&typeof m.id==='string'&&typeof m.assetId==='string'&&Number.isFinite(m.start)&&Number.isFinite(m.end)&&m.end>m.start&&typeof m.dialogue==='string'}
/** At least two distinct cuts, shared topical evidence, chronology, same original source. */
export function findConnectedFunnyStories(moments,{maxSourceGap=240,maxStorySpan=540,maxClips=6,minTopicWords=2}={}){
 const candidates=(moments||[]).filter(validSourceMoment).slice().sort((a,b)=>a.assetId.localeCompare(b.assetId)||a.start-b.start),stories=[],seen=new Set();
 for(let i=0;i<candidates.length;i++){
  const seed=candidates[i],group=[seed],common=new Set(storyTopicWords(seed.dialogue));let groundedAiTopic=null;
  if(!common.size)continue;
  for(let j=i+1;j<candidates.length&&group.length<maxClips;j++){
   const next=candidates[j],prior=group.at(-1);
   if(next.assetId!==seed.assetId)break;
   if(next.start-seed.start>maxStorySpan)break;
   if(next.start-prior.end>maxSourceGap)break;
   if(next.start<prior.end-.25)continue;
   const overlap=topicalMatch(seed,next);
   const evolving=storyTopicWords(next.dialogue).filter(w=>common.has(w));
   const topicEvidence=groundedSharedAiTopic(seed,next);
   if((evolving.length<minTopicWords||overlap.length<minTopicWords)&&!topicEvidence)continue;
   if(topicEvidence)groundedAiTopic=topicEvidence;
   group.push(next);
   for(const word of [...common])if(!evolving.includes(word))common.delete(word);
  }
  if(group.length<2||(common.size<minTopicWords&&!groundedAiTopic))continue;
  const ids=group.map(m=>m.id),key=ids.join('|');
  if(seen.has(key))continue;seen.add(key);
  const topic=(common.size>=minTopicWords?[...common]:groundedAiTopic||[]).sort((a,b)=>b.length-a.length).slice(0,3);
  const t0=group[0],last=group.at(-1);
  stories.push({id:'connected:'+ids[0]+':'+ids.length,assetId:seed.assetId,title:'Funny conversation about '+topic.join(' / '),
   topic:topic.join(' · '),momentIds:ids,start:t0.start,end:last.end,cutCount:group.length,
   duration:group.reduce((n,m)=>n+m.end-m.start,0),
   reason:'These '+group.length+' separate original-source moments have evidence of a recurring subject: '+topic.join(', ')+(groundedAiTopic?' (AI proposed this connection; review the footage).':' (shared transcript wording).')+' Review setup, order and punchline before publishing.',
   score:group.length*10+topic.length*7+group.reduce((n,m)=>n+Number(m.score||0),0)/group.length});
 }
 stories.sort((a,b)=>b.cutCount-a.cutCount||b.score-a.score||a.start-b.start);
 const result=[],covered=[];
 for(const story of stories){if(covered.some(ids=>story.momentIds.every(id=>ids.has(id))))continue;result.push(story);covered.push(new Set(story.momentIds))}
 return result.slice(0,48);
}
export function storyMoments(story,moments){
 const byId=new Map((moments||[]).map(m=>[m.id,m])),selected=(story?.momentIds||[]).map(id=>byId.get(id)).filter(Boolean);
 if(selected.length<2||new Set(selected.map(m=>m.id)).size<2)throw Error('A connected story needs at least two separate source clips.');
 if(selected.some((m,i)=>i>0&&(m.assetId!==selected[i-1].assetId||m.start<selected[i-1].end-.25)))throw Error('Story clips overlap or come from different unsynchronized sources.');
 return selected;
}
