import test from 'node:test';
import assert from 'node:assert/strict';
import {activeWordIndex,drawCaptions} from '../src/captions.js';
test('binary subtitle search works with 60,000-word three-hour source',()=>{
 const words=Array.from({length:60000},(_,i)=>({projectStart:i*.18,projectEnd:i*.18+.15,text:'hello'}));
 assert.equal(activeWordIndex(words,10799.99),-1);
 assert.equal(activeWordIndex(words,10799.82),59999);
 assert.equal(activeWordIndex(words,30.01),Math.floor(30.01/.18));
});
test('caption colors, horizontal placement, font, and highlighted word are applied',()=>{
 const ops=[];
 const ctx={font:'',textAlign:'',textBaseline:'',fillStyle:'',strokeStyle:'',lineWidth:0,lineJoin:'',save(){},restore(){},measureText(t){return {width:t.length*10}},strokeText(t,x,y){ops.push(['stroke',t,x,y,this.strokeStyle])},fillText(t,x,y){ops.push(['fill',t,x,y,this.fillStyle])},fillRect(x,y,w,h){ops.push(['box',x,y,w,h,this.fillStyle])}};
 const words=[{text:'This'},{text:'works'},{text:'great'}];
 drawCaptions(ctx,540,960,{captionStyle:'dynamic',captionWords:3,captionSize:40,captionPosition:75,captionX:70,captionColor:'#ffffff',captionAccent:'#ff8800',captionOutlineColor:'#222222',captionOutlineWidth:6},words,1);
 assert.ok(ops.some(x=>x[0]==='fill'&&x[1]==='works'&&x[4]==='#ff8800'));
 assert.ok(ops.some(x=>x[0]==='stroke'&&x[4]==='#222222'));
 assert.ok(ops.some(x=>x[0]==='fill'&&x[2]>270&&x[3]>600));
});
test('no subtitle shown without active word',()=>{
 const ctx={save(){throw Error('must not draw')}};drawCaptions(ctx,360,640,{},[], -1);
});
