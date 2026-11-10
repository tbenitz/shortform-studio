/** Source-media identity probe. Reads at most 1 MiB from each file, not whole video.
 * It is a fast, deterministic sampled fingerprint, NOT a full-file integrity hash.
 * SHA-256 is applied to sample bytes plus their offsets and the exact file size.
 */
const CHUNK=256*1024;
export const MEDIA_IDENTITY_KIND='sha256-sampled-v1';
function bytesFromString(value){return new TextEncoder().encode(value)}
export async function sampledMediaFingerprint(file,{chunkBytes=CHUNK,signal=null}={}){
 if(!file||typeof file.slice!=='function'||!Number.isSafeInteger(file.size)||file.size<0)
  throw Error('A valid original File or Blob is required for a source identity check.');
 if(!globalThis.crypto?.subtle)throw Error('Secure browser hashing (Web Crypto) is not available.');
 if(signal?.aborted)throw Error('Source identity check canceled.');
 const size=file.size,block=Math.max(1024,Math.min(1024*1024,Number(chunkBytes)||CHUNK));
 const positions=[0,Math.max(0,Math.floor(size/3-block/2)),Math.max(0,Math.floor(size*2/3-block/2)),Math.max(0,size-block)];
 const offsets=[...new Set(positions.map(n=>Math.max(0,Math.min(n,size))))];
 const chunks=[bytesFromString('ShortFormStudio.sampled-v1:'+size+'\n')];
 for(const offset of offsets){
  if(signal?.aborted)throw Error('Source identity check canceled.');
  const bytes=new Uint8Array(await file.slice(offset,Math.min(size,offset+block)).arrayBuffer());
  chunks.push(bytesFromString(offset+':'+bytes.length+':'),bytes);
 }
 const total=chunks.reduce((n,b)=>n+b.byteLength,0);
 const data=new Uint8Array(total);let position=0;
 for(const part of chunks){data.set(part,position);position+=part.byteLength}
 const hash=new Uint8Array(await crypto.subtle.digest('SHA-256',data));
 return {kind:MEDIA_IDENTITY_KIND,size,digest:[...hash].map(x=>x.toString(16).padStart(2,'0')).join(''),sampledBytes:chunks.filter((_,i)=>i>0&&i%2===0).reduce((n,b)=>n+b.length,0)};
}
export function compareMediaIdentity(saved,actual){
 if(!saved||!actual)return {status:'unverified',reason:'No original or current sampled fingerprint is available.'};
 if(saved.kind!==MEDIA_IDENTITY_KIND||actual.kind!==MEDIA_IDENTITY_KIND)
  return {status:'unverified',reason:'The two fingerprint algorithms are not comparable.'};
 if(saved.size!==actual.size||saved.digest!==actual.digest)
  return {status:'mismatch',reason:'Source samples or exact file size have changed. This may be the wrong original recording.'};
 return {status:'match',reason:'Sampled file regions and size match the previously recorded original. The complete file has not been hashed.'};
}
export async function inspectProjectSources(project,getFile,{onProgress=()=>{},signal=null}={}){
 const sources=Array.isArray(project?.assets)?project.assets:[],results=[];
 for(let i=0;i<sources.length;i++){
  if(signal?.aborted)throw Error('Media verification canceled.');
  const a=sources[i],file=await getFile(a.id);
  if(!file){results.push({id:a.id,name:a.name,status:'missing',reason:'Original file must be relinked.'})}
  else{
   try{
    const actual=await sampledMediaFingerprint(file,{signal});
    const check=compareMediaIdentity(a.sourceFingerprint,actual);
    results.push({id:a.id,name:a.name,status:check.status,reason:check.reason,actual});
   }catch(e){results.push({id:a.id,name:a.name,status:'error',reason:e.message})}
  }
  onProgress((i+1)/Math.max(1,sources.length),results.at(-1));
 }
 return {checkedAt:Date.now(),sources:results,total:sources.length,
  matched:results.filter(x=>x.status==='match').length,missing:results.filter(x=>x.status==='missing').length,
  mismatched:results.filter(x=>x.status==='mismatch').length,unverified:results.filter(x=>x.status==='unverified').length};
}
