import {makeSegment} from './model.js';
/** Never use the short-form default to guess source durations. */
export function usableDuration(asset){const seconds=Number(asset?.duration);return Number.isFinite(seconds)&&seconds>0?seconds:0}
export function entireSourceCut(asset){const d=usableDuration(asset);if(!asset?.id||!d)throw Error('Source duration unavailable. Convert to browser-compatible MP4 (H.264/AAC) and retry.');return makeSegment(asset.id,0,d)}
export function selectedSourceCut(asset,inValue,outValue){const d=usableDuration(asset);if(!d)throw Error('Source duration unavailable');const from=Number(inValue),to=Number(outValue);if(!Number.isFinite(from)||!Number.isFinite(to)||from<0||to>d+.01||to-from<=.02)throw Error('Choose a valid source time range, with Out after In.');return makeSegment(asset.id,from,Math.min(d,to))}
export function shouldAutoInsertMedia(asset,alreadyInTimeline,{autoInsertMedia=true}={}){return Boolean(autoInsertMedia&&!alreadyInTimeline&&asset?.type==='video'&&usableDuration(asset)>0)}
export const sourceSecondsValue=asset=>usableDuration(asset).toFixed(2).replace(/\.00$/,'');
