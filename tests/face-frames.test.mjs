import test from 'node:test';
import assert from 'node:assert/strict';
import {faceFrameSize,isInvalidFaceROIError,waitForFaceFrame} from '../src/faces.js';

test('metadata without decoded image dimensions never produces zero-sized canvas',()=>{
 for(const [videoWidth,videoHeight] of [[0,0],[0,360],[640,0],[NaN,360],[640,NaN]]){
  assert.throws(()=>faceFrameSize({videoWidth,videoHeight}),/No decoded video frame size/);
 }
});
test('scan uses bounded nonzero frame sizes for portrait and landscape media',()=>{
 assert.deepEqual(faceFrameSize({videoWidth:1920,videoHeight:1080}),{width:480,height:270});
 assert.deepEqual(faceFrameSize({videoWidth:1080,videoHeight:1920}),{width:270,height:480});
 assert.deepEqual(faceFrameSize({videoWidth:1080,videoHeight:1080}),{width:480,height:480});
});
test('MediaPipe ROI failure is identifiable without masking unrelated failures',()=>{
 assert.equal(isInvalidFaceROIError(new Error('INTERNAL: CalculatorGraph::Run() failed: ROI width and height must be > 0.')),true);
 assert.equal(isInvalidFaceROIError(new Error('image_to_tensor_utils.cc:67 roi->width > 0')),true);
 assert.equal(isInvalidFaceROIError(new Error('GPU device lost')),false);
});
test('a frame with readyState 2 and dimensions is accepted',async()=>{
 const v={readyState:2,seeking:false,videoWidth:640,videoHeight:360,currentTime:1,error:null,addEventListener(){},removeEventListener(){}};
 await waitForFaceFrame(v,{targetTime:1,timeoutMs:250});
});
test('ready metadata without valid dimensions times out instead of reaching detector',async()=>{
 const v={readyState:1,seeking:false,videoWidth:0,videoHeight:0,currentTime:0,error:null,addEventListener(){},removeEventListener(){}};
 await assert.rejects(()=>waitForFaceFrame(v,{timeoutMs:15}),/Timed out decoding a usable video frame/);
});
