/** Explicit opt-in browser-local API key persistence. No project JSON or source control secrets. */
export const DIRECTOR_API_KEY_STORAGE='shortform-studio:director-api-key:v1';
export const DIRECTOR_REMEMBER_STORAGE='shortform-studio:director-remember:v1';
export function directorKeyRemembered(store=globalThis.localStorage){
 try{return store?.getItem(DIRECTOR_REMEMBER_STORAGE)!=='false'}catch{return false}
}
export function loadDirectorKey(store=globalThis.localStorage){
 try{return directorKeyRemembered(store)?store?.getItem(DIRECTOR_API_KEY_STORAGE)||'':''}catch{return ''}
}
export function saveDirectorKey(key,{remember=true,store=globalThis.localStorage}={}){
 try{
  store?.setItem(DIRECTOR_REMEMBER_STORAGE,String(Boolean(remember)));
  if(remember&&String(key).trim())store?.setItem(DIRECTOR_API_KEY_STORAGE,String(key).trim());
  else store?.removeItem(DIRECTOR_API_KEY_STORAGE);
  return true;
 }catch{return false}
}
export function clearDirectorKey(store=globalThis.localStorage){
 try{store?.removeItem(DIRECTOR_API_KEY_STORAGE);return true}catch{return false}
}
