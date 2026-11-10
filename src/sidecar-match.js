/** Associate original SRT/VTT sidecars by filename; never guess among ambiguous sources. */
const bare=s=>String(s||'').normalize('NFKC').trim().toLowerCase().replace(/\.[^.]+$/,'');
export function subtitleStem(fileName){
 return bare(fileName).replace(/[._ -](?:en|en-us|english|captions|subtitle|subtitles|cc|sdh)$/i,'')
  .replace(/\s+/g,' ').trim();
}
/** Exact or common language suffix match; a sole video may be used safely.
 * If multiple video filenames are ambiguous, return null.
 */
export function matchingCaptionSource(filename,assets,{selectedId=null}={}){
 const videos=(assets||[]).filter(a=>a?.type==='video'||a?.type==='audio');
 const stem=subtitleStem(filename);
 const matches=videos.filter(a=>subtitleStem(a.name)===stem);
 if(matches.length===1)return matches[0];
 if(matches.length>1)return null;
 if(videos.length===1)return videos[0];
 return null;
}
export function isCaptionSidecar(file){return /\.(srt|vtt)$/i.test(String(file?.name||''))}
