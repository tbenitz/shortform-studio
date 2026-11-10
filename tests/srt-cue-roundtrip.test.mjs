import test from 'node:test';
import assert from 'node:assert/strict';
import {newProject,makeSegment,parseSRT,toSRT,mapWords} from '../src/model.js';
test('imported original-timestamp SRT keeps its genuine cue grouping when exported',()=>{
 const original='1\n00:00:01,000 --> 00:00:03,000\nA long real sentence with seven words here\n\n2\n00:00:04,500 --> 00:00:07,000\nFunny comeback and actual reaction\n';
 const p=newProject();p.words=parseSRT(original,'v');p.segments=[makeSegment('v',0,20)];
 const rendered=toSRT(mapWords(p));
 const cues=rendered.trim().split(/\n\n/);
 assert.equal(cues.length,2,'Do not split the original first caption into arbitrary six-word chunks');
 assert.match(cues[0],/00:00:01,000 --> 00:00:03,000/);
 assert.match(cues[0],/A long real sentence with seven words here/);
 assert.match(cues[1],/00:00:04,500 --> 00:00:07,000/);
});
test('trimmed and reordered real-video cuts keep source subtitles mapped to edited timeline and do not invent words',()=>{
 const p=newProject();p.words=parseSRT('1\n00:00:10,000 --> 00:00:12,000\nFirst actual reaction\n\n2\n00:00:25,000 --> 00:00:27,000\nSecond actual joke\n','v');
 p.segments=[makeSegment('v',24,30),makeSegment('v',9,15)];
 const srt=toSRT(mapWords(p));
 assert.equal(srt.trim().split(/\n\n/).length,2);
 assert(srt.indexOf('Second actual joke')<srt.indexOf('First actual reaction'));
 assert.match(srt,/00:00:01,000 --> 00:00:03,000/);
 assert.match(srt,/00:00:07,000 --> 00:00:09,000/);
});
