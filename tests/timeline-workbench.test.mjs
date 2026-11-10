import test from 'node:test';
import assert from 'node:assert/strict';
import {frameTimecode,parseFrameTimecode,clipStartTime,nearestEditPoint,nextBoundary,insertAtPlayhead,overwriteAtPlayhead,rippleDelete,slipSelected,rollBoundary,setStoryRole,sourceToTimeline,timecodeCutList} from '../src/timeline-workbench.js';
const clip=(id,start,end,assetId='a',speed=1)=>({id,assetId,start,end,speed});
const project=()=>({name:'Real edit',settings:{fps:30},segments:[clip('base',0,12)],audio:[{id:'music',start:8,duration:4}],markers:[{id:'mark',time:7,label:'action'}],assets:[{id:'a',name:'source.mp4',duration:120},{id:'b',name:'camera2.mp4',duration:60}],words:[],selectedSegment:'base'});
test('frame-aware timecodes are reversible, with invalid frame values blocked',()=>{
 assert.equal(frameTimecode(61.5,30),'00:01:01:15');
 assert.equal(parseFrameTimecode('00:01:01:15',30),61.5);
 assert.throws(()=>parseFrameTimecode('00:00:01:35',30),/frame value/);
});
test('insert splits original source precisely and ripples downstream music and chapter marker',()=>{
 const p=project(),added=insertAtPlayhead(p,clip('new',30,34),5);
 assert.equal(p.segments.length,3);assert.equal(p.segments[0].end,5);
 assert.equal(p.segments[1].assetId,'a');assert.equal(p.segments[1].start,30);
 assert.equal(p.segments[2].start,5);assert.equal(clipStartTime(p.segments,added.id),5);
 assert.equal(p.audio[0].start,12);assert.equal(p.markers[0].time,11);
});
test('overwrite replaces only the occupied source window, keeps content outside it',()=>{
 const p=project();overwriteAtPlayhead(p,clip('new',50,55),3);
 assert.equal(p.segments.length,3);assert.equal(p.segments[0].end,3);
 assert.equal(p.segments[1].start,50);assert.equal(p.segments[2].start,8);
 const total=p.segments.reduce((n,s)=>n+(s.end-s.start),0);assert.equal(total,12);
});
test('ripple delete closes a cut and shifts later overlay and markers',()=>{
 const p=project();insertAtPlayhead(p,clip('new',30,34),5);
 const added=p.segments[1];const deleted=rippleDelete(p,added.id);
 assert.equal(deleted.seconds,4);assert.equal(p.audio[0].start,8);assert.equal(p.markers[0].time,7);
 assert.equal(p.segments.length,2);
});
test('slip shifts real source in/out while timeline length stays constant and boundaries clamp',()=>{
 const p=project(),oldDuration=p.segments[0].end-p.segments[0].start;
 slipSelected(p,'base',2,p.assets);assert.equal(p.segments[0].start,2);assert.equal(p.segments[0].end,14);
 assert.equal(p.segments[0].end-p.segments[0].start,oldDuration);
 slipSelected(p,'base',-100,p.assets);assert.equal(p.segments[0].start,0);
});
test('roll edits shared source cut boundary at one frame and preserves runtime',()=>{
 const p=project();p.segments=[clip('left',0,5),clip('right',5,10)];
 const result=rollBoundary(p,'left',1/30,p.assets);
 assert(result.left.end>5);assert(result.right.start>5);
 assert(Math.abs((result.left.end-result.left.start)+(result.right.end-result.right.start)-10)<.002);
 assert.throws(()=>rollBoundary(p,'right',1/30,p.assets),/before a cut/);
});
test('snapping is source-aware and can be limited to original word or marker anchors',()=>{
 const p=project();p.words=[{assetId:'a',start:3.4,end:3.7,text:'joke'}];
 assert.equal(nextBoundary(p.segments,0,1),12);assert.equal(nextBoundary(p.segments,12,-1),0);
 assert.equal(nearestEditPoint(p,7.1,{threshold:12,includeMarkers:true,includeClipEdges:false}).kind,'marker');
 assert.equal(nearestEditPoint(p,3.3,{threshold:12,includeClipEdges:false,includeMarkers:false,includeWords:true}).kind,'word start');
 assert.equal(sourceToTimeline(p,'a',4),4);
});
test('valid story-role edits and true source-referenced timecode cut sheet',()=>{
 const p=project();setStoryRole(p.segments[0],'reaction');
 assert.equal(p.segments[0].storyRole,'reaction');
 assert.throws(()=>setStoryRole(p.segments[0],'verified funny'),/Unsupported/);
 const txt=timecodeCutList(p);assert.match(txt,/source.mp4/);assert.match(txt,/reaction/);
 assert.match(txt,/NONSTANDARD EDL/);
});
