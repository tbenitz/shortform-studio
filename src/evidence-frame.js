/** Source-file only frame receipts for proposed cuts.
 * PLAN-055: display actual decoded frames at original clip timestamps.
 * A frame is evidence of what was visible at that instant, not proof of action.
 */
export function frameReceipt(candidate,assets,index=0,{fraction=.5}={}){
 const segment=candidate?.segments?.[index];
 if(!segment||typeof segment.assetId!=='string'||!Number.isFinite(segment.start)||!Number.isFinite(segment.end)||segment.end<=segment.start)
  throw Error('Choose a valid actual source clip, not an inferred video scene.');
 const original=(assets||[]).find(a=>a.id===segment.assetId);
 if(!original||original.type!=='video')throw Error('This candidate has no original video source available for a frame receipt.');
 if(!Number.isFinite(original.duration)||original.duration<=0||segment.start<0||segment.end>original.duration+.2)
  throw Error('The original source duration does not match this candidate. Relink the correct video before reviewing frames.');
 const ratio=Math.max(0,Math.min(1,Number.isFinite(fraction)?fraction:.5));
 const time=Math.max(0,Math.min(original.duration,segment.start+ratio*(segment.end-segment.start)));
 return {assetId:original.id,name:original.name,start:segment.start,end:segment.end,
  time:Math.round(time*1000)/1000,segmentIndex:index,requiresDecodedFrame:true};
}
