import {cleanProjectForBackup} from './project-backup.js';
import {uid} from './model.js';
export const PROJECT_LIBRARY_KIND='library-project';
/** Name + stable project ID are the library key. Saved source files are shared
 * via their original source IDs, never cloned or silently downloaded. */
export function makeLibraryProject(project,{now=Date.now(),archived=false}={}){
 if(!project?.id)throw Error('Give the project a valid ID before saving to the library.');
 const clean=cleanProjectForBackup(project);
 return {
  kind:PROJECT_LIBRARY_KIND,id:clean.id,name:String(clean.name||'Untitled Project').slice(0,120),
  archived:Boolean(archived),updatedAt:now,createdAt:clean.createdAt||now,
  sourceCount:clean.assets.length,cutCount:clean.segments.length,project:clean
 };
}
export function cloneLibraryProject(entry,{now=Date.now(),id=uid()}={}){
 if(entry?.kind!==PROJECT_LIBRARY_KIND||!entry.project||!id)throw Error('Cannot duplicate an invalid saved project.');
 const project=structuredClone(entry.project);
 project.id=id;project.createdAt=now;project.modifiedAt=now;
 project.name=String((entry.name||project.name||'Untitled')+' (copy)').slice(0,120);
 return makeLibraryProject(project,{now,archived:false});
}
export function filterLibraryProjects(entries,query='',includeArchived=false){
 const q=String(query||'').trim().toLocaleLowerCase();
 return (entries||[]).filter(e=>e?.kind===PROJECT_LIBRARY_KIND&&(includeArchived||!e.archived)&&
  (!q||[e.name,e.project?.name,...(e.project?.assets||[]).map(a=>a.name)].some(value=>String(value||'').toLocaleLowerCase().includes(q))))
  .slice().sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0));
}
