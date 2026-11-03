/** Gameplay-evidence-based Call of Duty PvP clips. No fabricated kill detection. */
import {makeSegment,clamp,fmt} from './model.js';
import {selectDiverseCandidates} from './director-coverage.js';
export const GAMEPLAY_LABELS={spotted:'Enemy location callout',combat:'Combat callout',down:'Down/elimination callout',revive:'Revive callout',trash:'Trash talk',laugh:'Funny reaction',clutch:'Clutch/endgame callout'};
const PATTERNS={
 spotted:/\b(enemy|enemies|hostile|player(?:s)?|guys?|team|squad|on me|on you|behind (?:me|us|you)|over here|right (?:there|here)|left (?:side|building)|there(?:'?s| is) (?:one|two|three)|contact|push (?:me|them|him)|coming at us|they(?:'?re| are) pushing|i see (?:him|them)|i found (?:him|them))\b/i,
 combat:/\b(shoot(?:ing)?|shots?|firing|spray(?:ing)?|crack(?:ed)?|hit marker|armor break|broke (?:his|her|their) plates?|pushing|fight(?:ing)?|beaming|snip(?:e|ed|ing)|flank|nade|grenade|rocket|flash|stun(?:ned)?)\b/i,
 down:/\b(i(?:'?m| am) down|i (?:died|got killed)|you(?:'?re| are) dead|he(?:'?s| is) down|downed|knock(?:ed)?|eliminat(?:ed|ion)|finished him|got (?:him|her|them)|killed (?:him|her|them)|he (?:killed|got) me|wiped|team wipe|squad wipe|we(?:'?re| are) dead|respawn)/i,
 revive:/\b(reviv(?:e|ing|ed)|rez(?:zing|zed)?|resuscitat|pick (?:me|him|her|them) up|buy (?:me|him|her|them) back|bring (?:me|him|them) back|self[- ]reviv|need (?:a )?rez|save me|help me up)/i,
 trash:/\b(trash|you(?:'?re| are) (?:bad|awful|garbage)|get (?:wrecked|destroyed|owned)|sit down|skill issue|bot(?:s)?|clown|dog ?water|rage|you suck|so bad|noob|uninstall|cook(?:ed)? (?:you|them)|that(?:'?s| is) embarrassing|bro you|what are you doing|what was that)/i,
 laugh:/\b(ha(?:ha)+|laugh(?:ed|ing)?|lol|lmao|rofl|that(?:'?s| is) (?:hilarious|funny)|oh my god|no way|are you kidding|i can'?t believe|what the heck|what the hell|bro what|i'm crying)/i,
 clutch:/\b(clutch|last (?:guy|one|player|team)|one[- ]v[- ]?(?:two|three|four|[234])|1v[234]|1 versus|final circle|win(?:ning)? this|won the game|victory|dub|squad wipe|team wipe|wipe(?:d)? (?:them|the squad)|final kill)/i
};
export function labelGameplayDialogue(text){
 const out=[],clean=String(text||'').toLowerCase();
 for(const [tag,regex] of Object.entries(PATTERNS))if(regex.test(clean))out.push(tag);
 return out;
}
export function gameplayPreferences(value=''){
 const text=String(value).toLowerCase();
 return {
  trash:/trash|banter|roast|talk.+smack|talk.+shit/i.test(text),
  funny:/funny|humou?r|hilarious|laugh|comedy|jokes|rage/i.test(text),
  revive:/reviv|rezz|rescue|save|downed/i.test(text),
  clutch:/clutch|comeback|multi.?kill|team wipe|win|final circle/i.test(text),
  fights:/fight|gun|combat|shoot|action|enemy|player|pvp|kill/i.test(text),
  noDialogueOnly:/no (?:dialogue|talking|conversation|commentary) only|never.*dialogue|must.*gameplay|include.*gunfight|don'?t cut.*fight/i.test(text)
 };
}
export function extractGameplaySignals(words=[],tracks={}){
 const sorted=[...words].filter(w=>w?.assetId&&Number.isFinite(w.start)&&Number.isFinite(w.end)).sort((a,b)=>a.assetId.localeCompare(b.assetId)||a.start-b.start);
 const signals=[];let batch=[];
 const emit=()=>{
  if(!batch.length)return;
  const text=batch.map(w=>w.text).join(' '),tags=labelGameplayDialogue(text);
  if(tags.length)signals.push({assetId:batch[0].assetId,start:batch[0].start,end:batch.at(-1).end,time:(batch[0].start+batch.at(-1).end)/2,text:text.slice(0,220),tags,kind:'dialogue'});
  batch=[];
 };
 for(const w of sorted){
  if(batch.length&&(w.assetId!==batch[0].assetId||w.start-batch.at(-1).end>1.5||batch.length>=35||w.speaker!==batch[0].speaker))emit();
  batch.push(w);if(/[.!?]$/.test(w.text)&&batch.length>3)emit();
 }
 emit();
 for(const [assetId,track] of Object.entries(tracks||{})){
  if(!track?.audio)continue;
  for(const a of track.events||[])signals.push({assetId,start:a.start,end:a.end,time:a.peakTime,kind:'audio',tags:['possible-action'],score:a.score});
  for(const a of track.motion||[])if(a.motion>=.22)signals.push({assetId,start:a.time-1,end:a.time+1,time:a.time,kind:'motion',tags:['screen-motion'],score:a.motion});
 }
 return signals.sort((a,b)=>a.assetId.localeCompare(b.assetId)||a.start-b.start);
}
function groupEvents(events,{maxGap=11,maxSpan=88}={}){
 const out=[];let curr;
 for(const e of events){
  if(!curr||e.assetId!==curr.assetId||e.start-curr.end>maxGap||Math.max(curr.end,e.end)-curr.start>maxSpan){
   if(curr)out.push(curr);curr={assetId:e.assetId,start:e.start,end:e.end,events:[e]};
  }else{curr.start=Math.min(curr.start,e.start);curr.end=Math.max(curr.end,e.end);curr.events.push(e)}
 }
 if(curr)out.push(curr);
 return out;
}
export function scoreGameplayEncounter(group,settings={},track={}){
 const tags=new Set(group.events.flatMap(e=>e.tags||[])),audible=group.events.filter(e=>e.kind==='audio'),motion=group.events.filter(e=>e.kind==='motion');
 const prefs=gameplayPreferences(settings.directorInstructions||'');
 const sound=Math.max(0,...audible.map(e=>e.score||0)),movement=Math.max(0,...motion.map(e=>e.score||0));
 const hasFight=audible.length>0||tags.has('combat')||tags.has('spotted')||tags.has('down')||tags.has('clutch');
 const diversity=tags.has('spotted')&&tags.has('down')?13:tags.has('combat')&&tags.has('down')?12:0;
 const payoff=(tags.has('trash')||tags.has('laugh'))&&(tags.has('combat')||tags.has('down')||audible.length)?12:0;
 const rescue=tags.has('revive')&&(tags.has('down')||audible.length)?12:0;
 let value=18+sound*21+movement*13+diversity+payoff+rescue;
 if(tags.has('down'))value+=10;if(tags.has('spotted'))value+=6;if(tags.has('trash'))value+=7;
 if(tags.has('laugh'))value+=7;if(tags.has('clutch'))value+=12;if(tags.has('revive'))value+=9;if(tags.has('combat'))value+=9;
 if(prefs.trash&&tags.has('trash'))value+=13;if(prefs.funny&&(tags.has('trash')||tags.has('laugh')))value+=12;
 if(prefs.revive&&tags.has('revive'))value+=14;if(prefs.clutch&&tags.has('clutch'))value+=15;
 if(prefs.fights&&hasFight)value+=8;
 if(!hasFight)value-=32;
 if(!audible.length&&track?.status==='complete'&&prefs.noDialogueOnly)value-=15;
 if(!audible.length&&track?.status==='complete'&&tags.size===1&&tags.has('trash'))value-=20;
 if(!group.events.some(e=>e.kind==='dialogue')&&!audible.length)value-=20;
 return {score:clamp(Math.round(value),0,98),tags:[...tags],audioConfidence:+sound.toFixed(2),motionConfidence:+movement.toFixed(2),hasAction:hasFight};
}
function clipTimes(group,duration,min,max){
 const action=group.events.filter(e=>e.kind==='audio'||e.kind==='motion'||(e.tags||[]).some(t=>['spotted','combat','down','revive','clutch'].includes(t)));
 const peak=action.sort((a,b)=>(b.score||0)-(a.score||0))[0]||group.events[Math.floor(group.events.length/2)];
 let start=Math.max(0,group.start-7),end=Math.min(duration,group.end+9);
 if(end-start>max){
  const lead=Math.min(11,max*.22);
  start=Math.max(0,Math.min(peak.time-lead,duration-max));
  end=Math.min(duration,start+max);
 }
 if(end-start<min){
  const extra=(min-(end-start))/2;
  start=Math.max(0,start-extra);end=Math.min(duration,Math.max(end+extra,start+min));
  if(end-start<min)start=Math.max(0,end-min);
 }
 return {start:+start.toFixed(3),end:+end.toFixed(3)};
}
export function generatePvPHighlights(words,assets,tracks={},settings={},onProgress=()=>{}){
 const signals=extractGameplaySignals(words,tracks),byId=new Map();
 for(const e of signals){if(!byId.has(e.assetId))byId.set(e.assetId,[]);byId.get(e.assetId).push(e)}
 const min=Math.max(8,Number(settings.clipMin)||15),max=Math.max(min+2,Number(settings.clipMax)||75),candidates=[];
 for(const asset of assets||[]){
  if(asset.type!=='video')continue;
  const groups=groupEvents(byId.get(asset.id)||[],{maxGap:11,maxSpan:Math.min(110,max*1.5)});
  const length=Math.max(asset.duration||0,...groups.map(g=>g.end));
  for(const g of groups){
   const analysis=scoreGameplayEncounter(g,settings,tracks[asset.id]);
   if(!analysis.hasAction||analysis.score<(settings.gameplayMinScore??42))continue;
   const window=clipTimes(g,length,min,max);
   if(window.end-window.start<Math.min(min,8))continue;
   const unique=[...new Set(g.events.filter(e=>e.kind==='dialogue').flatMap(e=>e.tags))];
   const type=unique.includes('trash')&&unique.includes('down')?'Trash talk + elimination callout':
    unique.includes('revive')?'Revive / rescue moment':unique.includes('clutch')?'Clutch / possible win':
    unique.includes('down')?'Down / elimination reaction':unique.includes('trash')?'Trash talk during encounter':
    unique.includes('spotted')?'Enemy spotted + engagement':'Possible gunfight / action';
   const evidence=[];
   if(unique.length)evidence.push('Spoken evidence: '+unique.map(t=>GAMEPLAY_LABELS[t]||t).join(', '));
   if(analysis.audioConfidence>0)evidence.push('Combat-like audio activity '+Math.round(analysis.audioConfidence*100)+'% (unverified)');
   if(analysis.motionConfidence>0)evidence.push('Sampled video motion '+Math.round(analysis.motionConfidence*100)+'% (not enemy detection)');
   if(!tracks[asset.id]?.status)evidence.push('Action scan incomplete: tags depend on transcript. Scan video and audio for stronger results');
   const segment=makeSegment(asset.id,window.start,window.end);
   candidates.push({
    id:'pvp-'+asset.id+'-'+window.start.toFixed(2)+'-'+window.end.toFixed(2),
    title:type+' · '+fmt(g.start),duration:window.end-window.start,
    anchorAssetId:asset.id,anchorTime:g.start,
    segments:[segment],score:analysis.score,mode:'cod-pvp',source:'pvp-evidence',
    gameplay:{...analysis,events:g.events.length,explanation:evidence},
    reason:'Uninterrupted source footage '+fmt(window.start)+'–'+fmt(window.end)+': '+evidence.join('; ')+'. Includes pre-fight setup and reaction tail. Review source video: audio and motion signals cannot confirm kills, enemies, or revives.',
    createdAt:Date.now()
   });
  }
  onProgress(1,'Scored '+candidates.length+' PvP gameplay encounters throughout the recording');
 }
 return selectDiverseCandidates(candidates,settings);
}
