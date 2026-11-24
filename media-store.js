/* Special Appearance V11: binary media separated from slide JSON.
   This module is loaded in the authoring app, never in a published reader. */
(function(){'use strict';
const DB='special-appearance-v9-private', VERSION=2, STORE='media';
function open(){return new Promise((resolve,reject)=>{const req=indexedDB.open(DB,VERSION);req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains('values'))db.createObjectStore('values');if(!db.objectStoreNames.contains(STORE))db.createObjectStore(STORE,{keyPath:'id'});};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});}
function op(db,mode,action){return new Promise((resolve,reject)=>{const tx=db.transaction(STORE,mode),req=action(tx.objectStore(STORE));req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);tx.onabort=()=>reject(tx.error||new Error('媒体存储事务已中断'));});}
async function put(db,file,id){if(!(file instanceof Blob))throw Error('媒体文件无效');const value={id:id||('m-'+(typeof crypto.randomUUID==='function'?crypto.randomUUID():Date.now().toString(36)+'-'+Math.random().toString(36).slice(2))),blob:file,name:file.name||'media',type:file.type||'application/octet-stream',size:file.size,created:Date.now()};await op(db,'readwrite',s=>s.put(value));return value;}
const get=(db,id)=>op(db,'readonly',s=>s.get(id));
const all=db=>op(db,'readonly',s=>s.getAll());
const remove=(db,id)=>op(db,'readwrite',s=>s.delete(id));
const URLS=new Map();
async function url(db,id){if(URLS.has(id))return URLS.get(id);const item=await get(db,id);if(!item)return null;const objectURL=URL.createObjectURL(item.blob);URLS.set(id,objectURL);return objectURL;}
function forgetURL(id){const u=URLS.get(id);if(u){URL.revokeObjectURL(u);URLS.delete(id);}}
window.SpecialMediaStore={open,put,get,all,remove,url,forgetURL};
})();
