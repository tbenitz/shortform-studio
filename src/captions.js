import {clamp} from './model.js';
/** Binary search, avoiding a full transcript scan on every preview frame. */
export function activeWordIndex(words,time){
 let lo=0,hi=words.length;
 while(lo<hi){const mid=(lo+hi)>>1;if(words[mid].projectStart<=time)lo=mid+1;else hi=mid}
 const index=lo-1;
 return index>=0&&time<words[index].projectEnd?index:-1;
}
const allowedFonts=new Set(['system-ui','Arial','Georgia','Impact','Verdana']);
/** Canvas subtitle renderer, shared by the live preview and export capture. */
export function drawCaptions(ctx,width,height,settings,words,index){
 if(index<0||!words.length)return;
 const count=clamp(settings.captionWords||5,1,12);
 const start=Math.floor(index/count)*count;
 const tokens=words.slice(start,start+count).map((w,i)=>({value:settings.captionUppercase?String(w.text||'').toUpperCase():String(w.text||''),index:start+i}));
 const fontSize=clamp(settings.captionSize||42,12,120)*width/540;
 const font=allowedFonts.has(settings.captionFont)?settings.captionFont:'system-ui';
 const lineLimit=clamp(settings.captionMaxLines||2,1,3);
 ctx.save();
 ctx.font='800 '+fontSize+'px '+(font==='system-ui'?'system-ui, sans-serif':JSON.stringify(font)+', sans-serif');
 ctx.textBaseline='middle';ctx.textAlign='center';
 const safe=clamp(settings.captionSafeArea??10,2,22)/100;
 const maxWidth=width*(1-safe*2);
 const lines=[[]];
 for(const token of tokens){
  const line=lines.at(-1),text=[...line.map(t=>t.value),token.value].join(' ');
  if(line.length&&ctx.measureText(text).width>maxWidth&&lines.length<lineLimit)lines.push([token]);
  else line.push(token);
 }
 const gap=fontSize*1.22;
 const blockHeight=(lines.length-1)*gap+fontSize*1.3;
 const requestedY=height*clamp(settings.captionPosition??80,5,95)/100;
 const centerY=clamp(requestedY,blockHeight/2+height*safe,height-blockHeight/2-height*safe);
 const desiredX=width*clamp(settings.captionX??50,5,95)/100;
 const outlineWidth=clamp(settings.captionOutlineWidth??5,0,12)*width/540;
 ctx.lineWidth=outlineWidth;
 ctx.lineJoin='round';
 ctx.strokeStyle=settings.captionOutlineColor||'#10151d';
 for(let li=0;li<lines.length;li++){
  const parts=lines[li],line=parts.map(t=>t.value).join(' ');
  const measured=ctx.measureText(line).width;
  const x=clamp(desiredX,measured/2+width*safe,width-measured/2-width*safe);
  const y=centerY+(li-(lines.length-1)/2)*gap;
  if(settings.captionStyle==='boxed'){
   ctx.fillStyle=settings.captionBackground||'#141821';
   ctx.fillRect(x-measured/2-fontSize*.25,y-fontSize*.67,measured+fontSize*.5,fontSize*1.34);
  }
  if(outlineWidth)ctx.strokeText(line,x,y,maxWidth);
  ctx.fillStyle=settings.captionColor||'#ffffff';
  ctx.fillText(line,x,y,maxWidth);
  if(settings.captionStyle==='dynamic'){
   const pos=parts.findIndex(t=>t.index===index);
   if(pos>=0){
    const prefix=parts.slice(0,pos).map(t=>t.value).join(' ');
    const pad=prefix?ctx.measureText(prefix+' ').width:0;
    const item=parts[pos].value,activeX=x-measured/2+pad;
    ctx.textAlign='left';if(outlineWidth)ctx.strokeText(item,activeX,y);
    ctx.fillStyle=settings.captionAccent||'#ffe176';ctx.fillText(item,activeX,y);
    ctx.textAlign='center';
   }
  }
 }
 ctx.restore();
}
