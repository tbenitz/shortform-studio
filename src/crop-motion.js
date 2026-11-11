/** Deterministic easing for the existing real-source focus and zoom keyframes.
 * Same interpolation is used by Program preview and exported MP4 frames.
 * No change in focus/zoom boundaries or footage identity.
 */
export function cropMotionProgress(progress,mode='smooth'){
 const x=Math.min(1,Math.max(0,Number.isFinite(progress)?progress:0));
 if(mode==='linear')return x;
 if(mode==='ease-in')return x*x;
 if(mode==='ease-out')return 1-(1-x)*(1-x);
 // Smoothstep: zero initial/final velocity, monotonic and no overshoot.
 return x*x*(3-2*x);
}
export function cropKeyframes(clip,progress){
 const t=cropMotionProgress(progress,clip?.cropEasing||'linear');
 const lerp=(a,b)=>a+(b-a)*t;
 const zoom=lerp(Number(clip?.zoom)||1,Number(clip?.zoomEnd??clip?.zoom??1));
 const x=lerp(Number(clip?.focusX??.5),Number(clip?.focusEndX??clip?.focusX??.5));
 const y=lerp(Number(clip?.focusY??.5),Number(clip?.focusEndY??clip?.focusY??.5));
 return {progress:t,zoom,x,y};
}
