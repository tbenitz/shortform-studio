/** Browser voice preview and optional compatible external speech synthesis. */
export function previewSpeech(text,voiceName='',rate=1){if(!('speechSynthesis'in window))throw Error('Speech synthesis not available in this browser');speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.rate=Math.max(.5,Math.min(2,Number(rate)||1));const voice=speechSynthesis.getVoices().find(v=>v.name===voiceName);if(voice)u.voice=voice;speechSynthesis.speak(u);return u}
export function stopSpeech(){if('speechSynthesis'in window)speechSynthesis.cancel()}
export function availableVoices(){return 'speechSynthesis'in window?speechSynthesis.getVoices().map(v=>({name:v.name,lang:v.lang,local:v.localService})):[]}
/** Compatible POST /audio/speech contract. API key lives in RAM and the text is sent to chosen provider. */
export async function synthesizeSpeech(text,{endpoint,model='tts-1',voice='alloy',speed=1,apiKey}={}){
  if(!/^https:\/\//i.test(endpoint||''))throw Error('Specify a trusted HTTPS speech endpoint');if(!text?.trim())throw Error('Type narration first');
  const response=await fetch(endpoint,{method:'POST',headers:{'content-type':'application/json',...(apiKey?{authorization:`Bearer ${apiKey}`}:{})},body:JSON.stringify({model,voice,input:text.trim(),speed:Number(speed)||1,response_format:'mp3'})});
  if(!response.ok){const why=(await response.text()).slice(0,200);throw Error(`Voice generation failed (${response.status}): ${why}`)}
  const blob=await response.blob();if(blob.size<100)throw Error('Voice provider returned empty audio');if((blob.type||'').includes('json'))throw Error('Voice provider did not return audio');return new File([blob],`Narration-${Date.now()}.mp3`,{type:'audio/mpeg'});
}
/** Builds concise bridge narration suggestions from separated source timecodes. */
export function suggestBridges(segments,words){const suggestions=[];for(let i=1;i<segments.length;i++){
  const a=segments[i-1],b=segments[i];if(a.assetId!==b.assetId||Math.abs(b.start-a.end)>30){const preceding=words.filter(w=>w.assetId===a.assetId&&w.end<=a.end&&w.start>=a.end-8).map(w=>w.text).join(' ');suggestions.push({beforeIndex:i,text:'Later, the conversation returned to the same subject.',sourceAfter:b.start,sourceBefore:a.end,context:preceding.slice(0,220),requiresReview:true})}
 }return suggestions}
