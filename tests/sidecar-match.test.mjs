import test from 'node:test';
import assert from 'node:assert/strict';
import {subtitleStem,matchingCaptionSource,isCaptionSidecar} from '../src/sidecar-match.js';
const assets=[
 {id:'1',name:'Clutch Gameplay.mp4',type:'video'},
 {id:'2',name:'Teammate Webcam.webm',type:'video'},
 {id:'music',name:'b-roll.wav',type:'audio'}
];
test('match SRT/English/SDH sidecars to the correct original video, never a nearby camera',()=>{
 assert.equal(matchingCaptionSource('Clutch Gameplay.srt',assets).id,'1');
 assert.equal(matchingCaptionSource('Clutch Gameplay.en.srt',assets).id,'1');
 assert.equal(matchingCaptionSource('Clutch Gameplay.sdh.vtt',assets).id,'1');
 assert.equal(matchingCaptionSource('Teammate Webcam.srt',assets).id,'2');
 assert.equal(subtitleStem('CLUTCH GAMEPLAY.english.srt'),subtitleStem('clutch gameplay.mp4'));
});
test('do not invent matches when multiple originals are plausible or none share a basename',()=>{
 assert.equal(matchingCaptionSource('someone-else.srt',assets),null);
 assert.equal(matchingCaptionSource('Clutch Gameplay.srt',[...assets,{id:'3',name:'Clutch Gameplay.webm',type:'video'}]),null);
 assert.equal(matchingCaptionSource('anything.srt',[assets[0]]).id,'1','one original can accept its user-selected captions');
});
test('only literal subtitle extensions are accepted as sidecar files',()=>{
 assert.equal(isCaptionSidecar({name:'captions.srt'}),true);
 assert.equal(isCaptionSidecar({name:'captions.VTT'}),true);
 assert.equal(isCaptionSidecar({name:'movie.mp4'}),false);
 assert.equal(isCaptionSidecar({name:'captions.srt.exe'}),false);
});
