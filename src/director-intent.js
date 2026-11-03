/** Creative-direction contracts for source-grounded CoD PvP editing.
 * The detector never identifies an opponent from a mixed microphone recording.
 */
export const EDITORIAL_TOPICS={
 trolling:{instruction:/\b(troll(?:ing|ed)?|bait(?:ing|ed)?|prank(?:ing|ed)?|trick(?:ed|ing)?|mock(?:ing)?|teabag(?:ging)?|tea.?bag|mess(?:ing)? with|fool(?:ing|ed)?|taunt(?:ing)?|humiliat|lure(?:d|ing)?)\b/i,tags:['troll']},
 enemychat:{instruction:/\b(prox(?:imity)?(?: voice)? chat|enemy (?:chat|comms?|mic|voice|talk|speak|reply|troll)|opponent (?:chat|voice|comms?|troll|talk)|talk(?:ing)? to (?:the )?(?:enemies|enemy|opponents))\b/i,tags:['enemychat']},
 squadbanter:{instruction:/\b(squad(?:mate)? (?:banter|chat|troll|talk)|teammate (?:banter|chat|troll|talk)|(?:troll|roast|prank) (?:my |our )?(?:teammates|team|friends|squad)|between (?:teammates|friends)|friendly banter)\b/i,tags:['squadbanter']},
 trashtalk:{instruction:/\b(trash[\s-]?talk(?:ing)?|roast(?:ing)?|insult(?:ing)?|talk(?:ing)? (?:smack|shit)|banter|toxic|flam(?:e|ing))\b/i,tags:['trash']},
 funny:{instruction:/\b(funn(?:y|iest)|hilarious|laugh(?:ter|ing|s)?|comedy|jokes?|ridiculous|rage|reaction(?:s)?|humou?r)\b/i,tags:['laugh','trash','troll']},
 revive:{instruction:/\b(reviv(?:e|ing|es|al)|rezz?(?:ing)?|rescu(?:e|ing)|save (?:a )?teammate|pick (?:me|him|her|them) up|buy (?:me|them|him|her) back|save me)\b/i,tags:['revive']},
 clutch:{instruction:/\b(clutch|comeback|1v[234]|one[- ]v[- ]?(?:two|three|four)|multi.?kill|team wipe|squad wipe|victory|winning|win the (?:match|game))\b/i,tags:['clutch']},
 combat:{instruction:/\b(gunfights?|shootouts?|shooting|combat|action|kill(?:s|ing)?|fight(?:ing|s)?|engage(?:ment)?|firefight|battle)\b/i,tags:['combat','down','possible-action']},
 down:{instruction:/\b(deaths?|died|dying|downed|eliminat(?:ion|ed)|knock(?:ed)?|lost the fight|wipe(?:d)?)\b/i,tags:['down']},
 spotted:{instruction:/\b(spott?(?:ed|ing)? enemies|enemy sightings?|find (?:the )?players?|enemy callouts?|locat(?:e|ing) enemies|push(?:ing)? players?)\b/i,tags:['spotted']},
 stealth:{instruction:/\b(stealth|sneak(?:ing|y)?|quiet approach|flank(?:ing)?|ambush|hide(?:ing)?|camp(?:ing|ers?)?)\b/i,tags:['spotted','combat']},
};
const hostile=/\b(?:without|exclude|avoid|skip|no|not|never|don't|do not|not interested in|cut out)\b/i;
const grouping=/\b(?:and|or|with|plus|featuring)\b/i;
const norm=s=>String(s||'').toLowerCase().replace(/\s+/g,' ').trim();
export function editorialDirectionKey({mode='cod-pvp',directorInstructions='',provider='',clipMin=20,clipMax=75}={}){
 return [mode,provider,Math.round(clipMin),Math.round(clipMax),norm(directorInstructions)].join('|');
}
export function parseEditorialDirection(text=''){
 const raw=norm(text);
 const positive=[],excluded=[];
 const clauses=raw.split(/[,;.\n]+|\bbut\b/).filter(Boolean);
 for(const clause of clauses){
  for(const [topic,def] of Object.entries(EDITORIAL_TOPICS)){
   const match=def.instruction.exec(clause);
   if(!match)continue;
   // Check the nearest negation, not an unrelated 'no dialogue-only' phrase elsewhere.
   const prefix=clause.slice(Math.max(0,match.index-34),match.index);
   if(hostile.test(prefix))excluded.push(topic);
   else positive.push(topic);
  }
 }
 // "Troll the enemies" and "trolling enemies" require an explicit conversational clue,
 // not merely an arbitrary loud gunfight near an enemy callout.
 if(/\b(?:troll|prank|taunt|mock)\w*\s+(?:the\s+)?(?:enemies|enemy|opponents)\b/i.test(raw)){
  positive.push('trolling','enemychat');
 }
 if(/\b(?:troll|prank|roast)\w*\s+(?:my |our )?(?:team|teammates|squad|friends)\b/i.test(raw)){
  positive.push('trolling','squadbanter');
 }
 const focus=[...new Set(positive)].filter(t=>!excluded.includes(t));
 return {raw,focus,exclude:[...new Set(excluded)],strict:/\b(?:only|exclusively|specifically|nothing but)\b/i.test(raw),
  requiresCombat:/\b(?:no dialogue.only|no just talking|keep the gunfight|don't cut the fight|include (?:the )?fight)\b/i.test(raw)};
}
export function matchEditorialDirection(profile,tags,events=[]){
 const have=new Set(tags||[]);
 const matches=[];
 const satisfied=topic=>{
  if(topic==='trolling')return have.has('troll')||(have.has('trash')&&have.has('laugh'));
  if(topic==='enemychat')return have.has('enemychat');
  if(topic==='squadbanter')return have.has('squadbanter');
  if(topic==='funny')return have.has('laugh')||have.has('troll')||(have.has('trash')&&have.has('down'));
  if(topic==='combat')return ['combat','down','possible-action'].some(t=>have.has(t));
  if(topic==='stealth')return have.has('spotted')&&(have.has('combat')||have.has('possible-action'));
  return (EDITORIAL_TOPICS[topic]?.tags||[]).some(t=>have.has(t));
 };
 for(const focus of profile.focus||[])if(satisfied(focus))matches.push(focus);
 const excluded=(profile.exclude||[]).filter(satisfied);
 const noRequiredEvidence=!(profile.focus||[]).length;
 // An enemy proximity-chat request has to show an explicit transcript marker.
 // A gunfight alone is not enemy chat. Never manufacture a speaker identity.
 let eligible=!excluded.length&&(noRequiredEvidence||matches.length>0);
 const requestedBoth=profile.focus?.includes('enemychat')&&profile.focus?.includes('squadbanter');
 if(profile.focus?.includes('enemychat')&&!matches.includes('enemychat')&&!(requestedBoth&&!profile.strict&&matches.includes('squadbanter')))eligible=false;
 if(profile.focus?.includes('squadbanter')&&!matches.includes('squadbanter')&&!(requestedBoth&&!profile.strict&&matches.includes('enemychat')))eligible=false;
 if(profile.strict&&profile.focus?.length&&matches.length<profile.focus.length)eligible=false;
 if(profile.requiresCombat&&!['combat','down','possible-action'].some(t=>have.has(t)))eligible=false;
 const alignment=profile.focus?.length?matches.length/profile.focus.length:0;
 return {eligible,matches,excluded,alignment,scoreDelta:matches.length*24-(profile.focus?.length-matches.length)*8-excluded.length*90,
   reason:matches.length?'Matches creative direction: '+matches.join(', '):profile.focus?.length?'No explicit evidence for requested topics':'Broad gameplay discovery'};
}
export function summarizeEditorialCoverage(profile,candidates){
 const topics=profile.focus||[],count=Object.fromEntries(topics.map(t=>[t,0]));
 for(const c of candidates||[]){
  const have=new Set(c.gameplay?.tags||[]);
  const match=matchEditorialDirection(profile,have);
  for(const tag of match.matches)count[tag]++;
 }
 return count;
}
