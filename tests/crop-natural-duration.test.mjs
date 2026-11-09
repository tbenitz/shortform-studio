import test from 'node:test';
import assert from 'node:assert/strict';
import {cropBoxToFraming} from '../src/crop-selection.js';
import {newProject,validateProject} from '../src/model.js';
import {discoverFullRecording} from '../src/director-coverage.js';

const projection={segmentId:'clip1',assetId:'video',dx:-600,dy:0,dw:1800,dh:960,zoom:1,outputWidth:600,outputHeight:960,sourceWidth:1920,sourceHeight:1080};
test('Drawn preview rectangle maps to the real source person and zooms that one clip',()=>{
 const result=cropBoxToFraming({x1:160,y1:150,x2:390,y2:630},projection,{projectZoom:1});
 assert(result.focusX>0&&result.focusX<1);
 assert(result.focusY>0&&result.focusY<1);
 assert(result.zoom>1);
 assert.equal(result.zoom,2);
 assert(result.sourceBounds.left<result.sourceBounds.right);
 assert(result.sourceBounds.top<result.sourceBounds.bottom);
});
test('crop handles any drag direction, zoom cap and rejects empty or undecoded footage',()=>{
 const a=cropBoxToFraming({x1:350,y1:700,x2:150,y2:200},projection);
 const b=cropBoxToFraming({x1:150,y1:200,x2:350,y2:700},projection);
 assert.deepEqual(a,b);
 assert.equal(cropBoxToFraming({x1:20,y1:20,x2:40,y2:40},projection).zoom,5);
 assert.throws(()=>cropBoxToFraming({x1:100,y1:100,x2:102,y2:102},projection),/larger rectangle/);
 assert.throws(()=>cropBoxToFraming({x1:100,y1:100,x2:200,y2:200},null),/decoded original/);
});
test('automatic source clip durations have no legacy 75-second ceiling',()=>{
 const settings=newProject().settings;
 assert.equal(settings.clipMax,0);
 assert.equal(settings.clipMin,0);
 const asset={id:'long',name:'Long funny conversation',type:'video',duration:260};
 const utterances=Array.from({length:61},(_,i)=>({id:'u'+i,assetId:'long',start:i*2.4,end:i*2.4+2.1,
   duration:2.1,text:'The helicopter prank was hilarious and everyone laughed again',speaker:'Speaker 1',keywords:['helicopter','prank','laugh']}));
 const clips=discoverFullRecording(utterances,[asset],{clipMin:0,clipMax:0,clipCount:0,minScore:0,mode:'all',allowNonlinear:false});
 assert(clips.some(c=>c.duration>75),'Natural conversation should allow >75s when real source dialogue continues');
});
test('older saved 20–75 defaults migrate to unlimited without losing source or edit',()=>{
 const project=newProject();project.settings.clipMin=20;project.settings.clipMax=75;
 const migrated=validateProject(project);
 assert.equal(migrated.settings.clipMin,0);
 assert.equal(migrated.settings.clipMax,0);
});
