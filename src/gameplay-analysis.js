/** Browser-only gameplay activity scan. Signals are evidence, not verified game events. */
import {openAudioReader,loadStreamingMedia} from './audio-reader.js';
import {clamp} from './model.js';
const TWO_PI=Math.PI*2;
export const GAMEPLAY_SCAN_VERSION=1;
export function audioBuckets(pcm,start=0,{sampleRate=16000,seconds=1}={}){
 const samplesPer=Math.max(1,Math.floor(sampleRate*seconds)),out=[];
 for(let base=0;base<pcm.length;base+=samplesPer){
  const end=Math.min(pcm.length,base+samplesPer),n=end-base;
  if(n<sampleRate*.18)continue;
  let sum=0,peak=0,slope=0,prev=0;
  const block=Math.max(1,Math.floor(sampleRate*.0125));let transients=0,prevBlock=.0001;
  for(let j=base;j<end;j++){
   const v=Number.isFinite(pcm[j])?Math.max(-1,Math.min(1,pcm[j])):0;
   sum+=v*v;peak=Math.max(peak,Math.abs(v));slope+=Math.abs(v-prev);prev=v;
   if((j-base+1)%block===0){
    const level=Math.abs(v);
    if(level>prevBlock*2.7&&level>.085)transients++;
    prevBlock=prevBlock*.92+level*.08;
   }
  }
  out.push({time:+(start+base/sampleRate).toFixed(2),rms:+Math.sqrt(sum/n).toFixed(5),peak:+peak.toFixed(4),texture:+(slope/n).toFixed(5),transients:Math.min(120,transients)});
 }
 return out;
}
const median=items=>{if(!items.length)return 0;const sorted=[...items].sort((a,b)=>a-b);return sorted[Math.floor(sorted.length/2)]};
export function findAudioCombatBursts(buckets,{minimum=0.25}={}){
 if(!buckets.length)return [];
 const baseline=Math.max(.003,median(buckets.map(x=>x.rms))||.003);
 const textureBaseline=Math.max(.0003,median(buckets.map(x=>x.texture))||.0003);
 const scores=buckets.map(b=>{
  const energy=clamp((b.rms/baseline-1.12)/2.8,0,1);
  const texture=clamp((b.texture/textureBaseline-1.25)/3,0,1);
  const impulses=clamp((b.transients-2)/12,0,1);
  return {...b,action:Math.max(0,Math.min(1,.52*energy+.33*texture+.15*impulses))};
 });
 const active=scores.filter(b=>b.action>=minimum&&b.rms>.015);
 const events=[];let group=null;
 for(const b of active){
  if(!group||b.time-group.end>5){
   if(group)events.push(group);
   group={start:b.time,end:b.time+1,peakTime:b.time,score:b.action,kind:'possible-combat-audio',evidence:'Elevated audio intensity and transient/impact-like sounds; not verified gunfire',count:1};
  }else{
   group.end=b.time+1;group.count++;
   if(b.action>group.score){group.score=b.action;group.peakTime=b.time}
  }
 }
 if(group)events.push(group);
 return events.filter(x=>x.count>=2||x.score>=.6).map(x=>({...x,start:Math.max(0,x.start-1),end:x.end+1,score:+x.score.toFixed(3)}));
}
export function frameDifference(prev,next){
 if(!prev||!next||prev.length!==next.length)return 0;
 let change=0,n=0;
 // Discard edges and overlays; compare coarse luminance of the central area.
 const width=160,height=Math.max(1,Math.floor(next.length/(160*4)));
 for(let y=Math.floor(height*.12);y<Math.floor(height*.88);y+=2){
  for(let x=16;x<144;x+=2){
   const i=(y*width+x)*4;
   const a=.21*prev[i]+.72*prev[i+1]+.07*prev[i+2];
   const b=.21*next[i]+.72*next[i+1]+.07*next[i+2];
   change+=Math.abs(a-b);n++;
  }
 }
 return n?Math.min(1,change/n/78):0;
}
export function chooseVisualTimestamps(events,duration,{limit=840}={}){
 const keys=new Set(),result=[],push=t=>{
  if(t<0||t>=duration)return;
  const key=Math.round(t*2)/2;
  if(!keys.has(key)){keys.add(key);result.push(key)}
 };
 // Minimum coverage across source timeline, plus short paired samples near audio activity.
 for(let t=2;t<duration;t+=90)push(t);
 const byBucket=new Map();
 for(const e of events){
  const bucket=Math.floor(e.peakTime/300);
  if(!byBucket.has(bucket))byBucket.set(bucket,[]);
  byBucket.get(bucket).push(e);
 }
 for(const events of byBucket.values()){
  events.sort((a,b)=>b.score-a.score);
  for(const e of events.slice(0,6)){push(e.peakTime-1);push(e.peakTime);push(e.peakTime+1)}
 }
 const ordered=result.sort((a,b)=>a-b);
 if(ordered.length<=limit)return ordered;
 const chosen=[];for(let i=0;i<limit;i++)chosen.push(ordered[Math.round(i*(ordered.length-1)/(limit-1))]);
 return [...new Set(chosen)];
}
export async function scanMotion(file,times,{signal,onProgress=()=>{},moduleLoader=loadStreamingMedia}={}){
 if(!times?.length)return [];
 const mod=await moduleLoader(),input=new mod.Input({formats:mod.ALL_FORMATS,source:new mod.BlobSource(file)});
 try{
  const track=await input.getPrimaryVideoTrack();
  if(!track||!(await track.canDecode()))throw Error('This recording video codec cannot be decoded by Chrome WebCodecs; audio+dialogue analysis can still be used.');
  const sink=new mod.CanvasSink(track,{width:160});
  const canvas=typeof OffscreenCanvas==='function'?new OffscreenCanvas(160,90):document.createElement('canvas');
  canvas.width=160;canvas.height=90;
  const ctx=canvas.getContext('2d',{willReadFrequently:true});
  if(!ctx)throw Error('Video motion canvas unavailable');
  const output=[];let previous=null,previousTime=-20,i=0;
  for await(const item of sink.canvasesAtTimestamps(times)){
   if(signal?.aborted)throw Error('Gameplay scan paused');
   const time=times[i++];if(!item?.canvas)continue;
   ctx.clearRect(0,0,160,90);
   ctx.drawImage(item.canvas,0,0,160,90);
   const image=ctx.getImageData(0,0,160,90).data;
   const value=time-previousTime<=3.5?frameDifference(previous,image):0;
   output.push({time,motion:+value.toFixed(3),kind:'visual-motion',evidence:'Frame changes in source video; does not identify individual players'});
   previous=new Uint8ClampedArray(image);previousTime=time;
   if(i%12===0){onProgress(i/times.length,'Compared '+i+'/'+times.length+' sampled gameplay frames');await new Promise(r=>setTimeout(r,0))}
  }
  onProgress(1,'Compared '+output.length+' real decoded video frames');
  return output;
 }finally{input.dispose()}
}
export async function scanGameplay(file,{durationHint=0,signal,onProgress=()=>{},onCheckpoint=async()=>{},readerFactory=openAudioReader,videoScanner=scanMotion,analysisVersion=GAMEPLAY_SCAN_VERSION,resume=null}={}){
 let reader;
 let sound=[];const warnings=[];
 try{
  onProgress(0,'Opening bounded audio reader; no full video download');
  reader=await readerFactory(file,{durationHint});
  const duration=reader.duration;
  const checkpointOk=resume?.version===analysisVersion&&Math.abs((resume.duration||0)-duration)<.5&&resume.status==='scanning'&&Array.isArray(resume.audio);
  const resumeAt=checkpointOk?Math.max(0,Math.min(duration,Math.floor((resume.processed||0)/24)*24)):0;
  if(resumeAt>0) {
   sound=resume.audio.filter(b=>b.time<resumeAt);
   onProgress(.78*resumeAt/duration,'Resuming gameplay audio analysis at '+Math.floor(resumeAt/60)+' minutes ('+sound.length+' evidence buckets saved)');
  }
  // 24s windows hold <1.6 MB of uncompressed PCM, even on three-hour sources.
  for(let t=resumeAt;t<duration;t+=24){
   if(signal?.aborted)throw Error('Gameplay scan paused');
   const end=Math.min(duration,t+24),pcm=await reader.readRange(t,end,{signal});
   sound.push(...audioBuckets(pcm,t));
   if(Math.floor(t/24)%10===0){
    onProgress(.78*end/duration,'Scanning gameplay audio '+Math.floor(end/60)+' / '+Math.ceil(duration/60)+' minutes');
    await onCheckpoint({version:analysisVersion,duration,audio:sound.slice(),motion:[],events:[],status:'scanning',processed:end,warnings:[]});
    await new Promise(r=>setTimeout(r,0));
   }
  }
  const events=findAudioCombatBursts(sound);
  reader.close();reader=null;
  onProgress(.79,'Audio scan complete: '+events.length+' possible action bursts. Sampling video motion…');
  let motion=[];
  try{
   const times=chooseVisualTimestamps(events,duration);
   motion=await videoScanner(file,times,{signal,onProgress:(fraction,message)=>onProgress(.79+.21*fraction,message)});
  }catch(e){if(signal?.aborted)throw e;warnings.push('Video motion scan unavailable: '+e.message)}
  const track={version:analysisVersion,duration,audio:sound,motion,events,status:'complete',processed:duration,warnings,createdAt:Date.now()};
  await onCheckpoint(track);
  onProgress(1,'Game scan finished: '+events.length+' possible combat audio bursts and '+motion.length+' sampled frames');
  return track;
 }finally{reader?.close()}
}
