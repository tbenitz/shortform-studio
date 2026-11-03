/** Convert a recognized source timestamp to project timeline time without moving cuts. */
export function sourceToTimelineTime(segments,assetId,sourceTime){
 let offset=0;
 for(const segment of segments||[]){
  const speed=Math.max(.25,Number(segment.speed)||1);
  const length=(segment.end-segment.start)/speed;
  if(segment.assetId===assetId&&sourceTime>=segment.start&&sourceTime<segment.end)
   return offset+(sourceTime-segment.start)/speed;
  offset+=length;
 }
 return null;
}
/** Return a fresh word list so subtitle preview cache notices incoming recognition. */
export function appendLiveWords(current,newWords){
 if(!Array.isArray(newWords)||!newWords.length)return current;
 return current.concat(newWords);
}
