import test from 'node:test';import assert from 'node:assert/strict';
import {entireSourceCut,selectedSourceCut,shouldAutoInsertMedia} from '../src/media-workflow.js';import {newProject,duration} from '../src/model.js';
test('full two-hour source, not 15-second excerpt',()=>{const p=newProject();p.segments=[entireSourceCut({id:'video',type:'video',duration:7200})];assert.equal(duration(p),7200);assert.equal(p.segments[0].end,7200)});
test('can select late moment in long video',()=>{const cut=selectedSourceCut({id:'v',type:'video',duration:4000},3980,4000);assert.equal(cut.start,3980);assert.equal(cut.end,4000)});
test('auto insert only newly imported video',()=>{const a={id:'v',type:'video',duration:120};assert.equal(shouldAutoInsertMedia(a,false),true);assert.equal(shouldAutoInsertMedia(a,true),false);assert.equal(shouldAutoInsertMedia(a,false,{autoInsertMedia:false}),false);assert.equal(shouldAutoInsertMedia({id:'a',type:'audio',duration:120},false),false)});
test('unrecognized duration is not replaced with 15 seconds',()=>{assert.throws(()=>entireSourceCut({id:'bad',type:'video',duration:0}),/duration/)});
