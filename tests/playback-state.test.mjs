import test from 'node:test';
import assert from 'node:assert/strict';
import {sourcePlaybackIssue,decodedVideoReady,sourceTimeToProjectTime,segmentTimeLength} from '../src/playback-state.js';
test('shows actionable relink message when transcript exists without the original video',()=>{
 const seg={assetId:'movie',start:7200,end:7230,speed:1};
 const asset={id:'movie',name:'three-hour.mp4',type:'video',duration:10800};
 assert.equal(sourcePlaybackIssue(asset,seg).code,'unlinked');
 assert.match(sourcePlaybackIssue(asset,seg).message,/Subtitles are saved separately/);
 assert.equal(sourcePlaybackIssue({...asset,url:'blob:https://example.test/abc'},seg),null);
});
test('rejects wrong short video linked to long transcript timestamp',()=>{
 const error=sourcePlaybackIssue({name:'short.mp4',type:'video',duration:60,url:'blob:other'}, {start:7200,end:7225});
 assert.equal(error.code,'outside-source');
});
test('a seeking or metadata-only video cannot be presented as decoded footage',()=>{
 const mock={readyState:1,seeking:false,videoWidth:640,videoHeight:360,error:null};
 assert.equal(decodedVideoReady(mock),false);
 assert.equal(decodedVideoReady({...mock,readyState:3,seeking:true}),false);
 assert.equal(decodedVideoReady({...mock,readyState:3,videoWidth:0}),false);
 assert.equal(decodedVideoReady({...mock,readyState:3}),true);
});
test('video playback clock remains tied to decoded source timestamp after distant seek',()=>{
 const seg={start:7200,end:7230,speed:2};
 assert.equal(sourceTimeToProjectTime(seg,10,7204),12);
 assert.equal(sourceTimeToProjectTime(seg,10,7220),20);
 assert.equal(segmentTimeLength(seg),15);
});
