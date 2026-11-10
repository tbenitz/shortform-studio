const DB='shortform-studio-v1',VERSION=1;let openPromise;
function openDB(){if(!('indexedDB'in window))return Promise.reject(Error('IndexedDB unavailable'));if(!openPromise)openPromise=new Promise((resolve,reject)=>{const req=indexedDB.open(DB,VERSION);req.onupgradeneeded=()=>{const db=req.result;for(const n of ['projects','media'])if(!db.objectStoreNames.contains(n))db.createObjectStore(n)};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)});return openPromise}
async function trans(store,mode,cb){const db=await openDB();return new Promise((resolve,reject)=>{const tx=db.transaction(store,mode),s=tx.objectStore(store),req=cb(s);req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);tx.onerror=()=>reject(tx.error)})}
export const saveProject=p=>trans('projects','readwrite',s=>s.put(p,'current'));
export const loadProject=()=>trans('projects','readonly',s=>s.get('current'));
export const saveMedia=(id,file)=>trans('media','readwrite',s=>s.put(file,id));
export const loadMedia=id=>trans('media','readonly',s=>s.get(id));
export const deleteMedia=id=>trans('media','readwrite',s=>s.delete(id));
/** FileSystemFileHandle is structured-cloneable in Chromium IndexedDB.
 * This stores permission-linked references, not bytes or fake paths.
 * File access can still require a fresh user permission after reopening.
 */
export const saveMediaHandle=(id,handle)=>trans('media','readwrite',s=>s.put(handle,'handle:'+id));
export const loadMediaHandle=id=>trans('media','readonly',s=>s.get('handle:'+id));
export const deleteMediaHandle=id=>trans('media','readwrite',s=>s.delete('handle:'+id));

export async function clearMedia(){const db=await openDB();return new Promise((resolve,reject)=>{const tx=db.transaction('media','readwrite');tx.objectStore('media').clear();tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)})}
export async function quota(){if(!navigator.storage?.estimate)return null;return navigator.storage.estimate()}

/** Named project metadata snapshots; original media stays in the existing media store. */
export const saveSnapshot=snapshot=>trans('projects','readwrite',store=>store.put(snapshot,'snapshot:'+snapshot.id));
export const loadSnapshot=id=>trans('projects','readonly',store=>store.get('snapshot:'+id));
export const deleteSnapshot=id=>trans('projects','readwrite',store=>store.delete('snapshot:'+id));
export async function listSnapshots(projectId){
 const rows=await trans('projects','readonly',store=>store.getAll());
 return rows.filter(s=>s&&s.project&&s.projectId===projectId&&s.id).sort((a,b)=>b.createdAt-a.createdAt);
}

/** Multiple locally named project versions, independent of projects.current.
 * All source bytes remain in the shared media store. Deleting one metadata copy
 * must not silently delete files still referenced by another project.
 */
export const saveLibraryProject=entry=>{
 if(entry?.kind!=='library-project'||!entry?.id||!entry?.project)throw Error('A named project entry needs valid metadata.');
 return trans('projects','readwrite',store=>store.put(entry,'library:'+entry.id));
};
export const loadLibraryProject=id=>trans('projects','readonly',store=>store.get('library:'+id));
export const deleteLibraryProject=id=>trans('projects','readwrite',store=>store.delete('library:'+id));
export async function listLibraryProjects(){
 const rows=await trans('projects','readonly',store=>store.getAll());
 return rows.filter(x=>x?.kind==='library-project'&&x.id&&x.project)
   .sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0));
}
export async function sharedMediaReferenced(assetId){
 const rows=await trans('projects','readonly',store=>store.getAll());
 return rows.some(x=>Array.isArray(x?.project?.assets)&&x.project.assets.some(a=>a.id===assetId));
}
