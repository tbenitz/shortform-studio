import {duration,segmentAt,mapWords,clamp,fmt,download} from './model.js';
import {focusAt} from './faces.js';
import {activeWordIndex,drawCaptions} from './captions.js';
import {sourcePlaybackIssue,decodedVideoReady,sourceTimeToProjectTime,segmentTimeLength} from './playback-state.js';
const el=id=>document.getElementById(id);
export class Renderer{
 constructor(project,getAsset,notify){this.project=project;this.asset=getAsset;this.notify=notify;this.video=el('engineVideo');this.canvas=el('previewCanvas');this.ctx=this.canvas.getContext('2d',{alpha:false});this.time=0;this.playing=false;this.lastFrame=0;this.rendering=false;this.cancelRequested=false;this.loadedAsset=null;this.loadedUrl=null;this.lastMediaWarning='';this.mediaPendingSince=0;this.loadedImage=null;this.image=null;this.raf=null;this.audioCtx=null;this.mediaDestination=null;this.videoGain=null;this.audioPlayers=new Map();this.previewMuted=false;this.onTick=()=>{};this.lastWordIndex=-1;this.captionCache={words:null,segments:null,list:[]};this.previousFrame=null;this.lastSegmentId=null;this.frameCache=null;this.video.addEventListener('loadedmetadata',()=>{this.syncVideo();this.draw()});
  for(const event of ['loadeddata','canplay','seeked','playing'])this.video.addEventListener(event,()=>{
   if(this.loadedUrl){this.syncVideo();this.draw()}
  });
  for(const event of ['waiting','stalled'])this.video.addEventListener(event,()=>{
   if(this.loadedUrl&&this.playing)this.setMediaStatus('loading','Waiting for video frames to decode…',false)
  });
  this.video.addEventListener('error',()=>{
   if(!this.loadedUrl)return;
   this.setMediaStatus('error','The browser cannot decode this video source. Try MP4 with H.264 video and AAC audio, then relink the converted recording.',true);
   if(this.playing)this.pause()
  });
  this.setSize();this.draw();}
 setProject(p){this.project=p;this.time=clamp(this.time,0,duration(p));this.setSize();this.syncVideo();this.draw()}
 get settings(){return this.project.settings}
 setSize(height){const ar=this.settings.aspect.split(':').map(Number);const h=height||720;this.canvas.height=h;this.canvas.width=Math.round(h*ar[0]/ar[1]);this.canvas.style.aspectRatio=`${ar[0]}/${ar[1]}`;this.draw()}
 async initAudio(){if(this.audioCtx)return;this.audioCtx=new(window.AudioContext||window.webkitAudioContext)();this.mediaDestination=this.audioCtx.createMediaStreamDestination();const source=this.audioCtx.createMediaElementSource(this.video);this.videoGain=this.audioCtx.createGain();this.compressor=this.audioCtx.createDynamicsCompressor();source.connect(this.videoGain);this.videoGain.connect(this.compressor);this.compressor.connect(this.audioCtx.destination);this.compressor.connect(this.mediaDestination);await this.audioCtx.resume()}
 async createAudioPlayers(){await this.initAudio();const ids=new Set(this.project.audio.map(a=>a.id));for(const [id,entry] of this.audioPlayers){if(!ids.has(id)){entry.el.pause();entry.el.remove();entry.node.disconnect();this.audioPlayers.delete(id)}}for(const a of this.project.audio){if(this.audioPlayers.has(a.id))continue;const asset=this.asset(a.assetId);if(!asset?.url)continue;const player=document.createElement('audio');player.preload='auto';player.src=asset.url;player.crossOrigin='anonymous';player.loop=false;const source=this.audioCtx.createMediaElementSource(player);const node=this.audioCtx.createGain();source.connect(node);node.connect(this.audioCtx.destination);node.connect(this.mediaDestination);el('audioElements').append(player);this.audioPlayers.set(a.id,{el:player,node})}}
 syncAudio(){this.videoGain&&(this.videoGain.gain.value=this.previewMuted?0:clamp(this.settings.videoVolume,0,2)*(segmentAt(this.project,this.time)?.seg.volume??1));for(const a of this.project.audio){const entry=this.audioPlayers.get(a.id);if(!entry)continue;const target=this.time-a.start+a.sourceStart,enabled=this.time>=a.start&&this.time<a.start+a.duration;entry.node.gain.value=this.previewMuted?0:enabled*clamp(a.volume??this.settings.audioVolume,0,2)*(this.settings.duckMusic&&a.role==='music'?.30:1);if(enabled){if(Math.abs(entry.el.currentTime-target)>.3&&Number.isFinite(target))try{entry.el.currentTime=Math.max(0,target)}catch{}if(this.playing&&entry.el.paused)entry.el.play().catch(()=>{});else if(!this.playing&&!entry.el.paused)entry.el.pause()}else if(!entry.el.paused)entry.el.pause()}}
 setMediaStatus(kind,message='',relink=false){
  const panel=el('previewMediaStatus'),label=el('previewMediaMessage'),button=el('relinkFromPreview');
  if(!panel)return;
  if(!kind||kind==='ready'){if(!panel.hidden)panel.hidden=true;this.lastMediaWarning='';return}
  const state=kind+'|'+message+'|'+String(relink);
  if(this.lastMediaWarning===state&&!panel.hidden)return;
  this.lastMediaWarning=state;panel.hidden=false;panel.dataset.state=kind;
  if(label)label.textContent=message;
  if(button)button.hidden=!relink;
 }
 resetLoadedVideo(){
  this.video.pause();
  if(this.loadedUrl||this.video.getAttribute('src')){this.video.removeAttribute('src');this.video.load()}
  this.loadedAsset=null;this.loadedUrl=null;this.mediaPendingSince=0;
 }
 syncVideo(){
  const curr=segmentAt(this.project,this.time);
  if(!curr){this.video.pause();this.setMediaStatus('ready');return}
  const seg=curr.seg,asset=this.asset(seg.assetId);
  const issue=sourcePlaybackIssue(asset,seg);
  if(issue){
   if(this.loadedUrl)this.resetLoadedVideo();
   this.setMediaStatus('error',issue.message,issue.relink);return;
  }
  if(asset.type==='image'){
   if(this.loadedAsset!==asset.id||this.loadedUrl!==asset.url){
    this.resetLoadedVideo();this.loadedAsset=asset.id;this.loadedUrl=asset.url;
    this.image=new Image();this.image.onload=()=>{this.setMediaStatus('ready');this.draw()};
    this.image.onerror=()=>this.setMediaStatus('error','This image could not be decoded. Relink the original image.',true);
    this.image.src=asset.url;
   }
   return;
  }
  if(asset.type==='audio'){
   this.video.pause();
   this.setMediaStatus('loading','This is an audio-only source; there is no video picture.',false);
   return;
  }
  // Asset IDs remain stable across project reloads and file relinks, but blob URLs do not.
  // The previous implementation checked only asset.id and kept using a revoked old URL.
  if(this.loadedAsset!==asset.id||this.loadedUrl!==asset.url||this.video.src!==asset.url){
   this.video.pause();this.loadedAsset=asset.id;this.loadedUrl=asset.url;
   this.video.preload='auto';this.video.src=asset.url;this.video.playbackRate=clamp(seg.speed||1,.25,3);this.video.load();
   this.mediaPendingSince=performance.now();
   this.setMediaStatus('loading','Opening '+asset.name+' · seeking to '+fmt(seg.start)+'…',false);
   return;
  }
  if(this.video.error){
   this.setMediaStatus('error','Video decode failed. Try converting the recording to H.264 MP4 and relink it.',true);return;
  }
  if(this.video.readyState<1){
   this.setMediaStatus('loading','Reading video metadata…',false);return;
  }
  const sourceDuration=Number.isFinite(this.video.duration)&&this.video.duration>0?this.video.duration:asset.duration;
  if(!(sourceDuration>seg.start+.01)){
   this.setMediaStatus('error','Selected segment starts after the end of the linked video. Please relink the correct source file.',true);
   if(this.playing)this.pause();
   return;
  }
  const target=Math.max(0,Math.min(seg.start+curr.local,sourceDuration-.025));
  this.video.playbackRate=clamp(seg.speed||1,.25,3);
  if(Math.abs(this.video.currentTime-target)>(this.playing&&decodedVideoReady(this.video)?1.2:.20)){
   if(!this.video.seeking||Math.abs(this.video.currentTime-target)>1.5){
    try{this.video.currentTime=target;this.mediaPendingSince=performance.now()}
    catch(e){this.setMediaStatus('error','Could not seek to '+fmt(target)+': '+e.message,true);return}
   }
  }
  if(!decodedVideoReady(this.video)){
   const waited=this.mediaPendingSince?(performance.now()-this.mediaPendingSince)/1000:0;
   if(waited>16)this.setMediaStatus('error','The browser has not decoded a video frame at '+fmt(target)+' after 16 seconds. Check the original video in the Media preview, or convert/relink as H.264 MP4.',true);
   else this.setMediaStatus('loading','Decoding source frame at '+fmt(target)+'…',false);
   return;
  }
  this.setMediaStatus('ready');
  if(this.playing&&this.video.paused)this.video.play().catch(e=>{
   if(this.loadedUrl===asset.url)this.setMediaStatus('error','Unable to play video: '+e.message,true);
  });
  else if(!this.playing&&!this.video.paused)this.video.pause();
 }
 draw(){
  const p=this.project,{ctx,canvas}=this,w=canvas.width,h=canvas.height;
  const curr=segmentAt(p,this.time),seg=curr?.seg,source=seg&&this.asset(seg.assetId);
  if(seg?.id!==this.lastSegmentId){
    if(this.lastSegmentId&&canvas.width&&canvas.height){const previous=document.createElement('canvas');previous.width=w;previous.height=h;previous.getContext('2d').drawImage(canvas,0,0);this.previousFrame=previous}
    this.lastSegmentId=seg?.id||null;
  }
  ctx.save();ctx.fillStyle='#090d13';ctx.fillRect(0,0,w,h);
  let media=null;
  if(source?.type==='video'&&decodedVideoReady(this.video)&&this.loadedAsset===source.id&&this.loadedUrl===source.url)media=this.video;
  if(source?.type==='image'&&this.image?.complete&&this.loadedAsset===source.id)media=this.image;
  if(media){
    const mw=media.videoWidth||media.naturalWidth,mh=media.videoHeight||media.naturalHeight;
    if(mw&&mh){
      const progress=clamp(curr.local/Math.max(.05,seg.end-seg.start),0,1),keyedZoom=(seg.zoom||1)*(1-progress)+(seg.zoomEnd??seg.zoom??1)*progress;
      const zoom=clamp(keyedZoom*this.settings.zoom,.5,5),scale=Math.max(w/mw,h/mh)*zoom,dw=mw*scale,dh=mh*scale;
      const sourceTime=seg.start+curr.local, detected=this.settings.autoFaceFraming?focusAt(p.faceTracks?.[seg.assetId]||[],sourceTime,seg.focusX??.5):null;
      const f=clamp((this.settings.faceTrackingStrength||80)/100,0,1);
      const baseX=(seg.focusX??.5)*(1-progress)+(seg.focusEndX??seg.focusX??.5)*progress,baseY=(seg.focusY??.5)*(1-progress)+(seg.focusEndY??seg.focusY??.5)*progress;
      const x=clamp(baseX*(1-f)+(detected?.x??baseX)*f,0,1),y=clamp(baseY*(1-f)+(detected?.y??baseY)*f,0,1);
      const dx=clamp(w/2-x*dw,w-dw,0),dy=clamp(h/2-y*dh,h-dh,0);
      const look={grayscale:'grayscale(100%)',sepia:'sepia(80%)',vintage:'sepia(50%) contrast(115%)',soft:'blur(1.4px)'}[this.settings.videoFilter]||'';ctx.filter=`brightness(${this.settings.brightness}%) contrast(${this.settings.contrast}%) saturate(${this.settings.saturation}%) ${look}`;
      ctx.drawImage(media,dx,dy,dw,dh);ctx.filter='none';
    }
  }
  const elapsed=(this.time-(curr?.offset||0)),seconds=clamp(seg?.transitionSeconds||.25,.05,3),a=clamp(elapsed/seconds,0,1),transition=seg?.transition||'cut';
  if(seg&&a<1){
    if(transition==='fade'){ctx.fillStyle=`rgba(9,13,19,${1-a})`;ctx.fillRect(0,0,w,h)}
    else if(this.previousFrame){
      if(transition==='dissolve'){ctx.globalAlpha=1-a;ctx.drawImage(this.previousFrame,0,0,w,h);ctx.globalAlpha=1}
      else if(transition==='wipe'){ctx.save();ctx.beginPath();ctx.rect(a*w,0,(1-a)*w,h);ctx.clip();ctx.drawImage(this.previousFrame,0,0,w,h);ctx.restore()}
      else if(transition==='slide'){ctx.drawImage(this.previousFrame,-a*w,0,w,h)}
      else if(transition==='zoom'){ctx.globalAlpha=1-a;const z=1+a*.22;ctx.drawImage(this.previousFrame,(w-w*z)/2,(h-h*z)/2,w*z,h*z);ctx.globalAlpha=1}
    }
  }
  if(this.settings.captionOn&&curr){if(this.captionCache.words!==p.words||this.captionCache.segments!==p.segments){this.captionCache={words:p.words,segments:p.segments,list:mapWords(p)}}const words=this.captionCache.list,idx=activeWordIndex(words,this.time);if(idx>=0)drawCaptions(ctx,w,h,this.settings,words,idx)}
  if(seg?.title){ctx.font=`700 ${Math.max(15,w*.038)}px system-ui`;ctx.fillStyle='#ffffff';ctx.textAlign='center';ctx.fillText(seg.title.slice(0,80),w/2,h*.12,w*.9)}ctx.restore();
 }
 async seek(t){
  this.time=clamp(t,0,duration(this.project));
  this.syncVideo();
  if(this.audioCtx)this.syncAudio();
  this.draw();this.onTick(this.time);
 }
 async play(){
  if(this.playing){this.pause();return}
  if(!duration(this.project)){this.notify('Add clips to the timeline first',true);return}
  if(this.time>=duration(this.project)-.02)this.time=0;
  const current=segmentAt(this.project,this.time);
  const issue=current?sourcePlaybackIssue(this.asset(current.seg.assetId),current.seg):null;
  if(issue){this.syncVideo();this.notify(issue.message,true);return}
  try{await this.initAudio();await this.createAudioPlayers();await this.audioCtx.resume()}
  catch(e){this.notify('Unable to initialize audio: '+e.message,true);return}
  this.playing=true;this.lastFrame=performance.now();
  this.syncVideo();this.syncAudio();this.loop();
 }
 pause(){
  this.playing=false;this.video.pause();
  for(const x of this.audioPlayers.values())x.el.pause();
  if(this.raf)cancelAnimationFrame(this.raf);
  this.raf=null;this.draw();this.onTick(this.time)
 }
 loop=()=>{
  if(!this.playing)return;
  const now=performance.now(),dt=Math.min((now-this.lastFrame)/1000,.12);
  this.lastFrame=now;
  const curr=segmentAt(this.project,this.time);
  if(!curr){
   this.time=duration(this.project);this.pause();
   if(this.rendering)this.finishedRender?.();return;
  }
  const seg=curr.seg,source=this.asset(seg.assetId),issue=sourcePlaybackIssue(source,seg);
  if(issue){this.syncVideo();this.pause();this.notify(issue.message,true);return}
  if(source?.type==='video'){
   // The previous implementation advanced wall-clock time even while Chrome was
   // still seeking distant frames. Keep the edit clock on the actual decoded video.
   this.syncVideo();
   if(this.loadedAsset===source.id&&this.loadedUrl===source.url&&decodedVideoReady(this.video)&&!this.video.paused){
    const end=curr.offset+segmentTimeLength(seg);
    if(this.video.ended||this.video.currentTime>=seg.end-.02){
     this.time=Math.min(duration(this.project),end+.005);
    }else{
     this.time=clamp(sourceTimeToProjectTime(seg,curr.offset,this.video.currentTime),curr.offset,end);
    }
   }else{
    this.draw();this.onTick(this.time);
    this.raf=requestAnimationFrame(this.loop);
    return;
   }
  }else this.time+=dt;
  if(this.time>=duration(this.project)-.002){
   this.time=duration(this.project);this.syncVideo();this.syncAudio();this.draw();
   this.pause();if(this.rendering)this.finishedRender?.();return;
  }
  this.syncVideo();this.syncAudio();this.draw();this.onTick(this.time);
  this.raf=requestAnimationFrame(this.loop);
 };
 cancelRender(){if(this.rendering){this.cancelRequested=true;this.finishedRender?.()}}
 async record({onProgress=()=>{},onStatus=()=>{}}={}){if(this.rendering)throw Error('Render already in progress');if(!duration(this.project))throw Error('Timeline is empty');if(this.project.segments.some(s=>!this.asset(s.assetId)?.url))throw Error('At least one source is unavailable. Relink missing files before rendering.');if(!window.MediaRecorder||!this.canvas.captureStream)throw Error('This browser does not support Canvas MediaRecorder export');this.pause();this.rendering=true;this.cancelRequested=false;const initialOnTick=this.onTick;const previousTime=this.time,oldWidth=this.canvas.width,oldHeight=this.canvas.height,oldMuted=this.previewMuted;let recorder,stream;try{await this.initAudio();await this.createAudioPlayers();this.previewMuted=false;this.setSize(this.settings.outputHeight);await this.seek(0);await new Promise(r=>setTimeout(r,300));onStatus('Preparing real-time local render');const opts=[`video/mp4;codecs=avc1.42E01E,mp4a.40.2`,`video/webm;codecs=vp9,opus`,`video/webm;codecs=vp8,opus`,`video/webm`];const type=opts.find(t=>MediaRecorder.isTypeSupported(t));if(!type)throw Error('No supported video recording format');const picture=this.canvas.captureStream(clamp(this.settings.fps,15,60)),tracks=[...picture.getVideoTracks(),...this.mediaDestination.stream.getAudioTracks()];stream=new MediaStream(tracks);recorder=new MediaRecorder(stream,{mimeType:type,videoBitsPerSecond:clamp(this.settings.quality,1000000,25000000),audioBitsPerSecond:160000});const blobs=[];const done=new Promise((resolve,reject)=>{recorder.ondataavailable=e=>{if(e.data.size)blobs.push(e.data)};recorder.onerror=e=>reject(e.error||Error('Recording failed'));recorder.onstop=()=>resolve(new Blob(blobs,{type:recorder.mimeType}))});const originalTick=this.onTick;this.onTick=(t)=>{originalTick(t);onProgress(t/Math.max(.1,duration(this.project)))};let complete;const completed=new Promise(r=>{complete=r});this.finishedRender=complete;recorder.start(1000);await this.play();await completed;this.onTick=originalTick;if(this.cancelRequested)throw Error('Render canceled by user');if(recorder.state!=='inactive')recorder.stop();const blob=await done;const extension=type.includes('mp4')?'mp4':'webm';download(blob,`${safeName(this.project.name)}-${this.settings.aspect.replace(':','x')}.${extension}`,blob.type);onProgress(1);onStatus(`Exported ${extension.toUpperCase()} (${(blob.size/1048576).toFixed(1)} MB)`);return blob}finally{this.onTick=initialOnTick;this.rendering=false;this.finishedRender=null;this.pause();if(recorder?.state==='recording')recorder.stop();stream?.getTracks().filter(t=>t.kind==='video').forEach(t=>t.stop());this.previewMuted=oldMuted;this.canvas.width=oldWidth;this.canvas.height=oldHeight;await this.seek(previousTime)}}
}
function safeName(s){return String(s).trim().replace(/[^\w\-.]+/g,'-').slice(0,72)||'shortform'}
function wrapCaption(text,width,maxLines=2){const toks=text.split(/\s+/),lines=[''];for(const tok of toks){if((lines.at(-1)+' '+tok).trim().length>width&&lines.length<maxLines)lines.push(tok);else lines[lines.length-1]+=(lines.at(-1)?' ':'')+tok}return lines}
