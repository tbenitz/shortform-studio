import test from 'node:test';import assert from 'node:assert/strict';
import {mapSubtitleWords,projectSubtitleWordsToSource,subtitleOffset,relinkSynchronizationWarning,alignedVideoProjectTime,sourceTimestampAtProjectTime} from '../src/subtitle-sync.js';
const p={subtitleOffsets:{recording:2},words:[{id:'one',assetId:'recording',text:'down',start:3601,end:3602},{id:'two',assetId:'recording',text:'revive',start:7201,end:7202}],segments:[{assetId:'recording',start:3600,end:3610,speed:1},{assetId:'recording',start:7200,end:7210,speed:2}]};
test('original subtitle words map to EDITED project time with saved positive offset',()=>{
 const x=mapSubtitleWords(p);
 assert.deepEqual(x.map(w=>[w.text,w.projectStart,w.projectEnd]),[['down',3,4],['revive',11.5,12]]);
});
test('relink never changes word source timestamps and offset stays saved',()=>{
 const before=structuredClone(p),result=mapSubtitleWords(before);
 const relinked={...before,assets:[{id:'recording',url:'blob:other',duration:10800}]};
 assert.equal(subtitleOffset(relinked,'recording'),2);
 assert.deepEqual(mapSubtitleWords(relinked),result);
 assert.deepEqual(relinked.words,p.words);
});
test('reimporting an EDITED timeline SRT restores original-source word times',()=>{
 const exported=mapSubtitleWords(p).map(w=>({id:w.id,start:w.projectStart,end:w.projectEnd,text:w.text,assetId:'recording'}));
 const restored=projectSubtitleWordsToSource(exported,p);
 assert.deepEqual(restored.map(w=>[w.text,w.start,w.end]),[['down',3601,3602],['revive',7201,7202]]);
});
test('timeline SRT imported for several recording sources maps to correct IDs',()=>{
 const project={segments:[{assetId:'a',start:200,end:210,speed:1},{assetId:'b',start:2000,end:2005,speed:1}],words:[]};
 const words=[{text:'first',start:1,end:2},{text:'second',start:12,end:13}];
 assert.deepEqual(projectSubtitleWordsToSource(words,project).map(w=>[w.assetId,w.start,w.end]),[['a',201,202],['b',2002,2003]]);
});
test('seeking to different original source hour suppresses stale captions until decoded frame matches',()=>{
 const seg={start:7200,end:7230,speed:1};
 assert.equal(alignedVideoProjectTime(seg,0,3600,0),null);
 assert.equal(alignedVideoProjectTime(seg,0,7200.2,0),.1999999999998181);
 assert.equal(alignedVideoProjectTime(seg,0,7204,0),null);
});
test('a replacement with altered duration or filename warns, never automatically shifts subtitles',()=>{
 const previous={name:'three-hour.mp4',duration:10800,size:4e9};
 assert.match(relinkSynchronizationWarning(previous,{name:previous.name,duration:10804,size:previous.size}),/changed/);
 assert.match(relinkSynchronizationWarning(previous,{name:'other.mp4',duration:10800,size:1e9}),/different/);
 assert.equal(relinkSynchronizationWarning(previous,{...previous}),null);
});
test('mapping a video playhead to source time honors nonlinear edits',()=>{
 const x=sourceTimestampAtProjectTime(p.segments,12,'recording');
 assert.deepEqual(x,{assetId:'recording',sourceTime:7204});
});
