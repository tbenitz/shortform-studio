import test from 'node:test';
import assert from 'node:assert/strict';
import {transcriptionSourceSignature,checkTranscriptionResume,nextTranscriptionCheckpoint,gapRetryPlan,gapReviewKey} from '../src/transcript-checkpoint.js';
import {transcribeWithReader,reconcileWords,retryGaps,gapRetryTargets} from '../src/asr.js';
import {newProject,parseSRT,validateProject} from '../src/model.js';
import {importSrtAsDefault,beginWhisperCaptionRun,appendWhisperCaptionWords} from '../src/subtitle-preference.js';
const asset={id:'v1',name:'actual-long-source.webm',type:'video',duration:100};
const file={name:'actual-long-source.webm',size:89871,lastModified:1731301100000};
const settings={whisperModel:'whisper-tiny',transcriptionTiming:'plain',transcriptionChunk:20};
const signature=transcriptionSourceSignature(asset,file);
const cp=(before,from,to,words=[])=>nextTranscriptionCheckpoint(before,{from,to,nextAt:to,total:asset.duration,words,gaps:[]},{signature,model:settings.whisperModel,now:100});

test('PLAN-006: verified contiguous audio windows resume safely after a browser reload',()=>{
 const first=cp({windows:[]},0,20,[{text:'hello'}]);
 const second=cp(first,20,40,[]);
 const persisted=JSON.parse(JSON.stringify(second));
 assert.deepEqual(persisted.windows.map(x=>[x.from,x.to]),[[0,20],[20,40]]);
 const resume=checkTranscriptionResume(persisted,asset,file,{model:settings.whisperModel});
 assert.equal(resume.allowed,true);
 assert.equal(resume.startAt,40);
 assert.equal(resume.completedWindows,2);
 assert.equal(second.windows[1].words,0,'Silence is still an explicitly processed original audio window.');
});
test('PLAN-009/QA-020: never resume mismatched, legacy, missing-ledger or changed-source checkpoints',()=>{
 const saved=cp({windows:[]},0,20);
 assert.equal(checkTranscriptionResume(saved,asset,{...file,size:file.size+1},{model:settings.whisperModel}).allowed,false);
 assert.equal(checkTranscriptionResume(saved,asset,{...file,name:'other-recording.webm'},{model:settings.whisperModel}).allowed,false);
 assert.equal(checkTranscriptionResume(saved,asset,file,{model:'some-other-whisper'}).allowed,false);
 assert.equal(checkTranscriptionResume({...saved,sourceSignature:null},asset,file,{model:settings.whisperModel}).allowed,false);
 assert.equal(checkTranscriptionResume({...saved,nextAt:40},asset,file,{model:settings.whisperModel}).allowed,false);
 assert.equal(checkTranscriptionResume({...saved,windows:[{from:0,to:19},{from:21,to:40}],nextAt:40},asset,file,{model:settings.whisperModel}).allowed,false);
 assert.throws(()=>cp(saved,25,40),/non-contiguous/);
 assert.throws(()=>cp(saved,20,120),/bounds/);
});
test('PLAN-014/019: a decoder error leaves previously committed source windows to resume without reading the first hour again',async()=>{
 const reads=[],saved=[];let n=0;
 const reader={duration:100,async readRange(a,b){reads.push([a,b]);if(n>=3)throw Error('Decoder failed');return new Float32Array(16)}};
 const whisper=async()=>{n++;return {text:'word '+n}};
 await assert.rejects(transcribeWithReader(reader,'v1',settings,whisper,()=>{},()=>false,{
  onCheckpoint:async chunk=>saved.push(chunk)
 }),/Decoder failed/);
 assert.equal(saved.length,3,'Every completed audio window is separately committed, not batched in groups of three.');
 assert.deepEqual(saved.map(x=>x.nextAt),[20,40,60]);
 const last=saved.at(-1);assert.deepEqual([last.from,last.to],[40,60]);
 const resumedReads=[];
 const resumed={duration:100,async readRange(a,b){resumedReads.push([a,b]);return new Float32Array(16)}};
 await transcribeWithReader(resumed,'v1',settings,async()=>({text:'resumed'}),()=>{},()=>false,{
  startAt:last.nextAt,onCheckpoint:async chunk=>saved.push(chunk)
 });
 assert.equal(resumedReads.length,2);
 assert.ok(resumedReads[0][0]>=58.4,'Read only the first saved-window overlap after restart, not from time zero.');
 assert.equal(saved.at(-1).nextAt,100);
});
test('PLAN-015: overlap reconciliation works per source, but never deletes authentic repeat speech',()=>{
 const w=(assetId,start,end,text)=>({assetId,start,end,text});
 const unique=reconcileWords([
  w('a',10,10.3,'Hello'),w('a',10.06,10.36,'hello!'),w('a',10.6,10.95,'Hello'),
  w('b',10.04,10.34,'hello'),
  w('a',12,12.5,'no'),w('a',12.51,13,'no')
 ]);
 assert.equal(unique.length,5);
 assert.equal(unique.filter(x=>x.assetId==='a'&&x.text.toLowerCase().startsWith('hello')).length,2);
 assert.equal(unique.filter(x=>x.assetId==='b').length,1);
});
test('PLAN-018: retry indices are stable, independently persisted and resume without replaying completed windows',async()=>{
 const gaps=[{start:2,end:34},{start:60,end:66}],targets=gapRetryTargets(gaps);
 assert.deepEqual(targets.map(x=>[x.index,x.start,x.end]),[[0,2,22],[0,22,34],[1,60,66]]);
 const completed=[],read=[];
 const readerFactory=async()=>({duration:100,async readRange(a,b){read.push([a,b]);return new Float32Array(16)},close(){}});
 const whisper=async()=>({text:'real audio'});
 await assert.rejects(retryGaps(file,'v1',settings,gaps,()=>{},()=>false,{
  readerFactory,whisper,onCheckpoint:async info=>{if(info.targetIndex===1)throw Error('Interrupted before commit');completed.push(info.targetIndex)}
 }),/Interrupted before commit/);
 assert.deepEqual(completed,[0]);
 read.length=0;
 const after=await retryGaps(file,'v1',settings,gaps,()=>{},()=>false,{
  readerFactory,whisper,completedIndexes:completed,
  onCheckpoint:async info=>completed.push(info.targetIndex)
 });
 assert.deepEqual(completed,[0,1,2]);
 assert.equal(read.length,2,'Committed first window must not be reprocessed');
 assert.ok(after.every(w=>w.assetId==='v1'));
});
test('SRT-first caption and per-source retry metadata survive project validation after checkpoint',()=>{
 const project=newProject();project.assets=[asset];
 const srt=parseSRT('1\n00:00:01,000 --> 00:00:02,000\nSource subtitle is primary\n','v1');
 importSrtAsDefault(project,'v1',srt);
 beginWhisperCaptionRun(project,'v1',{resume:true});
 appendWhisperCaptionWords(project,'v1',[{assetId:'v1',start:1,end:2,text:'Unconfirmed Whisper'}]);
 project.transcriptGapRetries.v1={...gapRetryPlan([{start:3,end:4}],asset,file,settings.whisperModel),completedIndexes:[0],status:'paused'};
 project.transcriptGapReviewed.v1=[{start:7,end:8,reviewedAt:100,confirmation:'owner-audio-review'}];
 const hydrate=validateProject(JSON.parse(JSON.stringify(project)));
 assert.deepEqual(hydrate.words,srt);
 assert.equal(hydrate.subtitleTracks.v1.active,'srt');
 assert.equal(hydrate.subtitleTracks.v1.whisper.length,1);
 assert.deepEqual(hydrate.transcriptGapRetries.v1.completedIndexes,[0]);
 assert.equal(hydrate.transcriptGapReviewed.v1[0].confirmation,'owner-audio-review');
 assert.equal(gapReviewKey({start:3.001,end:4.005}),'3001-4005');
});
