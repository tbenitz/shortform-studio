/** Source and decode checks for long-video canvas preview. */
export function sourcePlaybackIssue(asset, segment) {
 if (!segment) return null;
 if (!asset) return {code:'missing-source',message:'The source for this clip is not in the project. Import the original recording to restore video playback.',relink:true};
 if (!asset.url) return {code:'unlinked',message:'Original video not linked: '+(asset.name||'recording')+'. Subtitles are saved separately. Click Relink original video and choose the SAME file to restore footage.',relink:true};
 if (asset.type==='video' && Number.isFinite(asset.duration)&&asset.duration>0 && Number(segment.start)>=asset.duration-.03)
  return {code:'outside-source',message:'This clip starts at '+Number(segment.start).toFixed(1)+'s, beyond the linked video duration of '+Number(asset.duration).toFixed(1)+'s. Verify the correct original recording is linked.',relink:true};
 return null;
}
export function decodedVideoReady(video){
 return Boolean(video && !video.error && !video.seeking && video.readyState>=2 &&
  Number.isFinite(video.videoWidth)&&video.videoWidth>0 &&
  Number.isFinite(video.videoHeight)&&video.videoHeight>0);
}
export function sourceTimeToProjectTime(segment,offset,sourceSeconds){
 const speed=Number(segment?.speed)>0?Number(segment.speed):1;
 return offset+Math.max(0,(Number(sourceSeconds)-Number(segment.start))/speed);
}
export function segmentTimeLength(segment){
 return Math.max(0,(segment.end-segment.start)/Math.max(.25,Number(segment.speed)||1));
}
