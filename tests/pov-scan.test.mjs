import test from 'node:test';
import assert from 'node:assert/strict';
import {overlappingPovWindows,scopedScanFingerprint,validScopedScan} from '../src/pov-scan.js';

const sync={referenceId:'a',targetId:'b',offset:19066.825,scale:.99975115};
const a={id:'a',duration:12310},b={id:'b',duration:42898};
test('only the same match clock is scheduled, never unrelated hours of POV B',()=>{
  const w=overlappingPovWindows(sync,a,b);
  assert.equal(w.a.start,0);
  assert.equal(w.a.end,12310);
  assert.ok(w.b.start>19000);
  assert.ok(w.b.end<32000);
  assert.ok(w.b.end-w.b.start<12311);
});
test('when camera B starts much later, both windows omit earlier non-overlapping footage',()=>{
  const s={referenceId:'a',targetId:'b',offset:-180,scale:1};
  const w=overlappingPovWindows(s,{id:'a',duration:10800},{id:'b',duration:10800});
  assert.equal(w.a.start,180);
  assert.equal(w.a.end,10800);
  assert.equal(w.b.start,0);
  assert.equal(w.b.end,10620);
});
test('scanned data cannot be reused after changing overlap, video or scan version',()=>{
  const file={size:10240,lastModified:111};
  const w={start:200,end:700};
  const key=scopedScanFingerprint(file,2,w);
  const track={status:'complete',fingerprint:key,window:{...w}};
  assert.ok(validScopedScan(track,key,w));
  assert.ok(!validScopedScan(track,key,{start:300,end:700}));
  assert.ok(!validScopedScan(track,scopedScanFingerprint(file,3,w),w));
  assert.notEqual(key,scopedScanFingerprint(file,2,{start:201,end:700}));
  assert.ok(!validScopedScan(track,key,null));
});
