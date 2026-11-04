/** Exact source-time windows for two VODs that share a synchronized match clock. */
import {checkSynchronization,sourceAtAlignment} from './pov-sync.js';

export function overlappingPovWindows(sync,reference,target){
  if(!sync||reference?.id!==sync.referenceId||target?.id!==sync.targetId)
    throw Error('Select and align the correct two original POV recordings.');
  const overlap=checkSynchronization(sync,reference.duration,target.duration);
  if(!overlap.valid)throw Error(overlap.reason);
  const start=overlap.commonStart,end=overlap.commonEnd;
  const targetStart=sourceAtAlignment(sync,target.id,start);
  const targetEnd=sourceAtAlignment(sync,target.id,end);
  if(!(targetEnd>targetStart))throw Error('Invalid second POV time mapping');
  return {
    [reference.id]:{start,end},
    [target.id]:{start:+Math.max(0,targetStart).toFixed(3),
      end:+Math.min(target.duration,targetEnd).toFixed(3)}
  };
}

export function scopedScanFingerprint(file,version,window=null){
  if(!file)return '';
  const range=window?Math.round(window.start*1000)+'-'+Math.round(window.end*1000):'full';
  return [file.size,file.lastModified,version,range].join(':');
}
export function validScopedScan(track,fingerprint,window=null){
  if(track?.status!=='complete'||track.fingerprint!==fingerprint)return false;
  if(!window)return !track.window||Math.abs(track.window.start)<.01&&Math.abs(track.window.end-track.duration)<.01;
  return !!track.window&&Math.abs(track.window.start-window.start)<.01&&
    Math.abs(track.window.end-window.end)<.01;
}
