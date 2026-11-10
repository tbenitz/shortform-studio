/**
 * Ctrl/Cmd+K navigator. Searches actual saved project evidence, never invented
 * results, never triggers an action on mere search, and never calls an AI API.
 */
import {searchProjectEvidence} from './source-health.js';
export const PALETTE_DESTINATIONS=[
 {id:'media',title:'Media library',hint:'Import, relink and inspect original files'},
 {id:'transcript',title:'Transcript',hint:'Whisper, subtitles and speaker labels'},
 {id:'director',title:'AI Director',hint:'Source-grounded creative story proposals'},
 {id:'humor',title:'Funny Clips & Compilations',hint:'Find jokes and build connected stories'},
 {id:'editor',title:'Editor',hint:'Precise cuts, zoom, crop and audio overlays'},
 {id:'export',title:'Export video',hint:'Produce and verify rendered output'},
 {id:'tools',title:'Production Tools',hint:'Source health, search, recovery and project audits'},
 {id:'settings',title:'Settings',hint:'Caption, audio and model preferences'}
];
export function searchPaletteItems(project,query,{maxResults=35}={}){
 const needle=String(query||'').trim().toLocaleLowerCase();
 const nav=PALETTE_DESTINATIONS.filter(x=>!needle||[x.title,x.hint,x.id].some(s=>s.toLocaleLowerCase().includes(needle)))
  .map(x=>({kind:'navigate',id:x.id,title:x.title,subtitle:x.hint}));
 const evidence=needle.length>=2?searchProjectEvidence(project,needle,{limit:Math.min(200,maxResults)}).map(x=>({
  kind:'evidence',id:x.id,title:x.title||'Original evidence',subtitle:x.kind+' · '+String(x.text||'').slice(0,150),
  evidence:x
 })):[];
 return [...nav,...evidence].slice(0,Math.max(1,Math.min(100,maxResults)));
}
export function installCommandPalette({getProject,onNavigate,onEvidence}){
 if(!globalThis.document||typeof getProject!=='function'||typeof onNavigate!=='function'||typeof onEvidence!=='function')
  throw Error('Command palette requires a browser and real navigation callbacks.');
 const nav=document.querySelector('.tabs'),spacer=nav?.querySelector('.spacer');
 if(!nav)return ()=>{};
 const launcher=document.createElement('button');launcher.type='button';launcher.id='openCommandPalette';
 launcher.className='small quiet';launcher.textContent='⌕ Search  Ctrl+K';
 launcher.title='Search actions, source evidence and saved dialogue';
 nav.insertBefore(launcher,spacer||null);
 const dialog=document.createElement('dialog');dialog.className='command-palette-dialog';dialog.setAttribute('aria-label','Search editor and original project evidence');
 const style=document.createElement('style');style.textContent=
  '.command-palette-dialog{width:min(95vw,680px);max-height:min(80vh,750px);overflow:auto;padding:20px;border:1px solid #455779;border-radius:14px;background:#121a28;color:#f1f5fc;box-shadow:0 20px 80px #000a}'+
  '.command-palette-dialog::backdrop{background:rgba(0,0,0,.7)}'+
  '.command-palette-dialog input{width:100%;padding:12px;box-sizing:border-box;border-radius:8px;border:1px solid #51627a;background:#1c2738;color:white;font-size:16px}'+
  '.command-palette-result{display:block;box-sizing:border-box;width:100%;margin:5px 0;padding:10px 12px;cursor:pointer;text-align:left;border:1px solid transparent;border-radius:9px;background:#202b3d;color:#f1f5fc;white-space:normal}'+
  '.command-palette-result small{display:block;color:#afbed0;margin-top:4px}'+
  '.command-palette-result[aria-selected="true"],.command-palette-result:hover{border-color:#86b5ef;background:#2b415d}'+
  '.command-palette-header{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:12px}'+
  '.command-palette-results{max-height:52vh;overflow-y:auto;margin-top:12px}';
 document.head.append(style);
 const header=document.createElement('div');header.className='command-palette-header';
 const title=document.createElement('strong');title.textContent='Go to tools or source evidence';
 const close=document.createElement('button');close.type='button';close.textContent='Close ×';close.className='small';
 header.append(title,close);
 const input=document.createElement('input');input.type='search';input.placeholder='Search dialogue, clips, assets, tools…';input.setAttribute('aria-label','Search project evidence and actions');
 const help=document.createElement('p');help.className='tiny muted';help.textContent='Literal saved evidence only · arrows to choose, Enter to open · no cloud requests';
 const container=document.createElement('div');container.className='command-palette-results';container.setAttribute('role','listbox');
 dialog.append(header,input,help,container);document.body.append(dialog);
 let items=[],selected=0,timer=null;
 const perform=()=>{
  clearTimeout(timer);timer=null;
  items=searchPaletteItems(getProject(),input.value);
  selected=0;render();
 };
 const render=()=>{
  container.replaceChildren();
  if(!items.length){const p=document.createElement('p');p.className='tiny muted';p.textContent='No literal matches; missing transcripts and visual frames have not been searched.';container.append(p);return}
  for(let i=0;i<items.length;i++){
   const result=items[i],button=document.createElement('button');button.type='button';
   button.className='command-palette-result';button.setAttribute('role','option');
   button.setAttribute('aria-selected',String(selected===i));
   const name=document.createElement('strong');name.textContent=result.title;
   const sub=document.createElement('small');sub.textContent=result.subtitle;
   button.append(name,sub);
   button.onclick=()=>activate(i);container.append(button);
  }
 };
 const highlight=()=>{
  const buttons=[...container.querySelectorAll('[role="option"]')];
  buttons.forEach((b,i)=>b.setAttribute('aria-selected',String(i===selected)));
  buttons[selected]?.scrollIntoView({block:'nearest'});
 };
 const activate=i=>{
  const item=items[i];if(!item)return;
  dialog.close();
  if(item.kind==='navigate')onNavigate(item.id);
  else onEvidence(item.evidence);
 };
 const open=()=>{
  if(dialog.open)return;
  input.value='';dialog.showModal();perform();input.focus();
 };
 launcher.onclick=open;
 close.onclick=()=>dialog.close();
 input.oninput=()=>{clearTimeout(timer);timer=setTimeout(perform,100)};
 input.onkeydown=e=>{
  if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();if(!items.length)return;selected=(selected+(e.key==='ArrowDown'?1:-1)+items.length)%items.length;highlight()}
  if(e.key==='Enter'){e.preventDefault();if(timer){perform()}activate(selected)}
 };
 const shortcut=e=>{
  if((e.ctrlKey||e.metaKey)&&e.key.toLocaleLowerCase()==='k'){e.preventDefault();if(dialog.open)dialog.close();else open()}
 };
 window.addEventListener('keydown',shortcut);
 return ()=>{clearTimeout(timer);window.removeEventListener('keydown',shortcut);dialog.remove();launcher.remove();style.remove()};
}
