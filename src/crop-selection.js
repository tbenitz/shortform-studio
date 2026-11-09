/** Turn a user's drag rectangle on the ACTUAL preview frame into per-clip crop.
 * Coordinates are canvas pixels, never made-up source coordinates.
 * The same focus/zoom is used by Program preview and final MP4 renderer.
 */
export function cropBoxToFraming(box,projection,{projectZoom=1,maxZoom=5}={}){
 const p=projection;
 if(!p||!Number.isFinite(p.dw)||!Number.isFinite(p.dh)||p.dw<=0||p.dh<=0||
    !Number.isFinite(p.dx)||!Number.isFinite(p.dy)||p.outputWidth<=0||p.outputHeight<=0)
  throw Error('A decoded original video frame must be visible before you can draw a crop.');
 const {x1,y1,x2,y2}=box||{};
 if(![x1,y1,x2,y2].every(Number.isFinite))throw Error('Crop box has invalid coordinates.');
 const left=Math.max(0,Math.min(p.outputWidth,Math.min(x1,x2)));
 const top=Math.max(0,Math.min(p.outputHeight,Math.min(y1,y2)));
 const right=Math.max(0,Math.min(p.outputWidth,Math.max(x1,x2)));
 const bottom=Math.max(0,Math.min(p.outputHeight,Math.max(y1,y2)));
 const bw=right-left,bh=bottom-top;
 if(bw<12||bh<12)throw Error('Drag a larger rectangle around the person you want to show.');
 const cx=left+bw/2,cy=top+bh/2;
 const focusX=Math.max(0,Math.min(1,(cx-p.dx)/p.dw));
 const focusY=Math.max(0,Math.min(1,(cy-p.dy)/p.dh));
 // Fit the entire selected box in the output canvas, preserving its aspect ratio.
 // A drag box is an editable camera crop, not a permanent media mask.
 const zoomFactor=Math.min(p.outputWidth/bw,p.outputHeight/bh);
 const zoom=Math.max(.5,Math.min(maxZoom,(p.zoom/(Number(projectZoom)||1))*zoomFactor));
 return {focusX,focusY,zoom,sourceBounds:{
  left:Math.max(0,Math.min(1,(left-p.dx)/p.dw)),
  top:Math.max(0,Math.min(1,(top-p.dy)/p.dh)),
  right:Math.max(0,Math.min(1,(right-p.dx)/p.dw)),
  bottom:Math.max(0,Math.min(1,(bottom-p.dy)/p.dh))
 }};
}
