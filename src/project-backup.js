/** Verified, portable metadata backup. Original media bytes and API keys are excluded.
 * New format is integrity checked; plain old project JSON remains accepted as legacy.
 */
import {validateProject} from './model.js';
export const PROJECT_BACKUP_FORMAT='shortform-studio-verified-backup';
export const PROJECT_BACKUP_VERSION=1;
export function cleanProjectForBackup(project){
 if(!project||!Array.isArray(project.assets)||!Array.isArray(project.segments))throw Error('Project metadata is incomplete.');
 const cloned=structuredClone(project);
 cloned.assets=(cloned.assets||[]).map(a=>{
  const {file,url,handle,apiKey,token,...safe}=a;return safe;
 });
 // These properties are never required in backups and may contain credentials.
 for(const k of ['providerKey','voiceKey','diarizationKey','apiKey','authorization','secretKey'])delete cloned[k];
 return cloned;
}
export async function sha256Text(text){
 if(!globalThis.crypto?.subtle)throw Error('Web Crypto SHA-256 is unavailable. Cannot guarantee backup integrity.');
 const bytes=new TextEncoder().encode(String(text));
 const digest=new Uint8Array(await crypto.subtle.digest('SHA-256',bytes));
 return [...digest].map(x=>x.toString(16).padStart(2,'0')).join('');
}
export async function makeVerifiedBackup(project,{when=Date.now()}={}){
 const metadata=cleanProjectForBackup(project);
 const content=JSON.stringify(metadata);
 const value=await sha256Text(content);
 return {
  format:PROJECT_BACKUP_FORMAT,version:PROJECT_BACKUP_VERSION,createdAt:new Date(when).toISOString(),
  integrity:{algorithm:'SHA-256',value,coveredBytes:new TextEncoder().encode(content).length},
  project:metadata,
  mediaIncluded:false,
  note:'Original video/audio files are never embedded in this metadata backup. Relink originals if needed. A SHA-256 digest protects project metadata from accidental modification, not from malicious tampering.'
 };
}
export async function readProjectBackup(value,{acceptLegacy=false}={}){
 const input=typeof value==='string'?JSON.parse(value):value;
 if(!input||typeof input!=='object')throw Error('Project backup is not valid JSON.');
 if(input.format!==PROJECT_BACKUP_FORMAT){
  if(!acceptLegacy)throw Error('This is an unverified older project JSON. Enable legacy import to continue without an integrity guarantee.');
  return {project:validateProject(input),verified:false,legacy:true,note:'Older unverified JSON format. Inspect source references before editing.'};
 }
 if(input.version!==PROJECT_BACKUP_VERSION)throw Error('Unsupported project backup version '+String(input.version)+'.');
 if(input.integrity?.algorithm!=='SHA-256'||!/^[0-9a-f]{64}$/.test(input.integrity?.value||''))
  throw Error('Project backup is missing a valid SHA-256 integrity record.');
 const actual=await sha256Text(JSON.stringify(input.project));
 if(actual!==input.integrity.value)throw Error('Project backup integrity check FAILED: project metadata differs from the saved SHA-256 digest. Import was blocked.');
 const project=validateProject(input.project);
 return {project,verified:true,legacy:false,note:'Project metadata integrity verified. Original media files are not embedded.'};
}
