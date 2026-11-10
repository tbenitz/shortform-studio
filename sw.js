const CACHE='shortform-studio-shell-v36';
const SHELL=['./','./index.html','./src/main.js','./src/main.js?v=1.8.0','./src/production-tools.js','./src/humor-studio.js','./src/humor-ui.js','./src/humor-stories.js','./src/story-proof.js','./src/story-workbench-ui.js','./src/timeline-workbench.js','./src/timeline-workbench-ui.js','./src/humor-review.js','./src/recovery.js','./src/source-integrity.js','./src/transcript-review.js','./src/pov-manual-review.js','./src/production-review.js','./src/source-health.js','./src/source-visual-qa.js','./src/command-palette.js','./src/project-backup.js','./src/project-library.js','./src/reliability-ui.js','./src/crop-selection.js','./src/mp4-export.js','./vendor/mediabunny/mediabunny.mjs','./src/faces.js','./src/media-workflow.js','./src/model.js','./src/storage.js','./src/director.js','./src/director-coverage.js','./src/gameplay-analysis.js','./src/director-intent.js','./src/director-batches.js','./src/director-mode.js','./src/pov-sync.js','./src/pov-director.js','./src/pov-story.js','./src/pov-vision.js','./src/pov-scout.js','./src/pov-scan.js','./src/story-brief.js','./src/gameplay-director.js','./src/gameplay-review.js','./src/playback-state.js','./src/renderer.js','./src/asr.js','./src/audio-reader.js','./src/live-captions.js','./src/subtitle-sync.js','./src/credentials.js','./src/captions.js','./src/speakers.js','./src/scenes.js','./src/review.js','./src/voice.js','./src/quality.js','./src/styles.css','./icon.svg','./manifest.webmanifest'];
// The old all-or-nothing install failed whenever optional vendor files were
// omitted by a GitHub Pages branch deployment. Keep the core site installable,
// fetch optional modules independently, and refresh cached modules as available.
self.addEventListener('install',event=>{
 event.waitUntil((async()=>{
  const cache=await caches.open(CACHE);
  await cache.addAll(['./','./index.html','./src/main.js?v=1.8.0','./src/styles.css']);
  await Promise.allSettled(SHELL.map(async path=>{
   try{
    const request=new Request(path,{cache:'reload'});
    const response=await fetch(request);
    if(response.ok)await cache.put(request,response);
   }catch{/* Other source modules and the MP4 backup can be loaded online later. */}
  }));
  await self.skipWaiting();
 })());
});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
 if(e.request.method!=='GET'||new URL(e.request.url).origin!==self.location.origin)return;
 e.respondWith(fetch(e.request).then(r=>{if(r.ok){const copy=r.clone();caches.open(CACHE).then(cache=>cache.put(e.request,copy)).catch(()=>{})}return r}).catch(async()=>{const cached=await caches.match(e.request);if(cached)return cached;throw Error('Offline and resource not cached')}));
});