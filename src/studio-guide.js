/** One visible beginner-friendly workflow shared by ALL inspector tabs.
 * Navigation changes tabs only; never deletes, merges, or creates clips.
 */
const steps=[
 ['media','1. Add video'],
 ['transcript','2. Subtitles'],
 ['humor','3. Find clips'],
 ['editor','4. Edit'],
 ['export','5. Export']
];
const notes={
 media:['Add your original videos','Import a recording on the left. Inspect its source frame here, then bring in its SRT subtitles.','transcript','Next: import SRT'],
 transcript:['Use SRT subtitles first','Import the video’s original-timestamp .srt file. Whisper is optional and never overwrites your SRT automatically.','humor','Next: find clips'],
 humor:['Choose moments worth keeping','Pick funny clips, a connected story, or a themed compilation. Use dialogue evidence and preview real video before building.','editor','Next: edit selected clips'],
 director:['Find specific source moments','Describe the exact type of clip, then review original footage, context, and timestamps. Multi-POV work is under its separate controls.','editor','Next: open Editor'],
 editor:['Make the cut feel natural','Select a timeline cut. Add source footage before/after, preview the full conversation, crop if needed, then check Export.','export','Next: export video'],
 export:['Check the finished edit','Preview the full edit, check captions and sound, then download an actual video. Use SRT export for separate captions.','transcript','Edit subtitles'],
 tools:['Recover and inspect your project','Project backups, source checks and audit tools are optional. Your current edit is not modified until you explicitly select an action.','editor','Back to Editor'],
 settings:['Change only what you need','The defaults are designed for ordinary video editing. Subtitle import, clip discovery and export live in their own workspaces.','media','Back to Media']
};
export function nextStep(project,tab){
 const a=notes[tab]||notes.media;
 const sources=project?.assets?.length||0,words=project?.words?.length||0,cuts=project?.segments?.length||0;
 let headline=a[0],detail=a[1],destination=a[2],action=a[3];
 if(!sources){headline='Start by importing a video';detail='Choose Import or drag your original recording into Media. All tabs keep your existing settings.';destination='media';action='Go to Media';}
 else if(!words&&['humor','director','transcript'].includes(tab)){headline='Add subtitles to find dialogue';detail='Import an SRT first. If you do not have one, choose Run local Whisper in Transcript.';destination='transcript';action='Import SRT';}
 else if(!cuts&&tab==='export'){headline='Build a clip before exporting';detail='Choose a suggested source moment or add a video selection to the timeline. Only actual source footage is exported.';destination='humor';action='Find clips';}
 return {headline,detail,destination,action};
}
export function studioGuideHTML(project,tab,{simple=true}={}){
 const info=nextStep(project,tab);
 const stages=steps.map(([id,name])=>'<button type="button" class="guide-stage '+(tab===id?'current':'')+'" data-guide-tab="'+id+'" aria-current="'+(tab===id?'step':'false')+'">'+name+'</button>').join('');
 return '<section class="studio-guide" aria-label="Video creation workflow">'+
  '<div class="guide-stages">'+stages+'</div>'+
  '<div class="guide-message"><div><b>'+info.headline+'</b><p>'+info.detail+'</p></div>'+
  '<button type="button" class="small primary" data-guide-tab="'+info.destination+'">'+info.action+'</button></div>'+
  '<div class="guide-bottom"><span>Other workspaces: '+(tab==='director'?'AI Director, Production Tools':'AI Director for advanced multi-camera stories · Production Tools for backups')+'</span>'+
  '<button type="button" id="toggleEasyUI" class="small quiet" aria-pressed="'+simple+'">'+(simple?'Show spacious layout':'Use compact layout')+'</button></div>'+
  '</section>';
}
