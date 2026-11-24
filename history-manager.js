/* 《特别出演》V12.11 · 无服务器的本机历史快照
   历史与原工程使用不同 IndexedDB，绝不升级/清空原来的数据库。
   内容寻址的图片只保存一份；历史只恢复排版和图层，不是完整工程 ZIP。 */
(function(){'use strict';
const DB='special-appearance-history-v1211', VERSION=1, KEEP=8;
const STORE_V='versions',STORE_A='assets',MARK='__SA_V1211_ASSET__:';
let conn=null, busy=false, dirty=false, timer=null, getProject=null, onState=()=>{};
const wait=req=>new Promise((resolve,reject)=>{req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)});
const transaction=(db,stores,mode,body)=>new Promise((resolve,reject)=>{
 const tx=db.transaction(stores,mode);let result;try{result=body(tx)}catch(e){tx.abort();reject(e);return}
 tx.oncomplete=()=>resolve(result);tx.onerror=()=>reject(tx.error||Error('本机历史数据库操作失败'));
 tx.onabort=()=>reject(tx.error||Error('本机历史数据库操作被中断'));
});
function open(){if(conn)return Promise.resolve(conn);return new Promise((resolve,reject)=>{
 const req=indexedDB.open(DB,VERSION);
 req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains(STORE_V))db.createObjectStore(STORE_V,{keyPath:'id'});if(!db.objectStoreNames.contains(STORE_A))db.createObjectStore(STORE_A,{keyPath:'id'})};
 req.onsuccess=()=>{conn=req.result;conn.onversionchange=()=>{conn.close();conn=null};resolve(conn)};req.onerror=()=>reject(req.error);
 req.onblocked=()=>reject(Error('另一个标签页正在更新历史数据库，请关闭后重试'));
})}
function hex(data){return [...new Uint8Array(data)].map(b=>b.toString(16).padStart(2,'0')).join('')}
async function sha(bytes){if(!crypto?.subtle)throw Error('浏览器需要安全环境（HTTPS 或 localhost）才能创建去重历史');return hex(await crypto.subtle.digest('SHA-256',bytes))}
function dataUrlBlob(src){const pos=src.indexOf(',');if(pos<5)throw Error('图片数据格式损坏');const header=src.slice(0,pos),part=src.slice(pos+1),mime=/^data:([^;,]+)/i.exec(header)?.[1]||'application/octet-stream';
 if(/;base64/i.test(header)){
   const raw=atob(part),bytes=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);
   return {header,blob:new Blob([bytes],{type:mime}),bytes};
 }
 const plain=decodeURIComponent(part),bytes=new TextEncoder().encode(plain);return {header,blob:new Blob([bytes],{type:mime}),bytes};
}
function blobDataUrl(blob,header){return new Promise((resolve,reject)=>{const r=new FileReader();r.onerror=()=>reject(r.error);r.onload=()=>{const actual=r.result;if(header.includes(';base64'))resolve(header+actual.slice(actual.indexOf(',')));else resolve(header+','+encodeURIComponent(atob(actual.split(',')[1])))};r.readAsDataURL(blob)})}
const allVersions=async()=>{const db=await open();const rows=await wait(db.transaction(STORE_V).objectStore(STORE_V).getAll());return rows.sort((a,b)=>b.created-a.created)};
async function checkQuota(){const p=await navigator.storage?.estimate?.().catch(()=>null);if(p?.quota&&p.usage/p.quota>.88)throw Error('浏览器空间接近上限（超过 88%），已停止创建历史。请先导出完整工程 ZIP，再清理旧历史。');return p}
// First serialize the project with asset tokens. Real image bytes are stored in a single reusable asset store.
async function compact(project){const value=structuredClone(project),refs=new Set(),newAssets=new Map(),known=new Set();const db=await open();
 async function walk(node){if(!node||typeof node!=='object')return;
  for(const k of Object.keys(node)){
   const v=node[k];
   if(typeof v==='string'&&/^data:[^,]*;base64,/i.test(v)&&v.length>4096){
    const {header,blob,bytes}=dataUrlBlob(v);const id=await sha(bytes);refs.add(id);
    if(!known.has(id)){
     known.add(id);const existing=await wait(db.transaction(STORE_A).objectStore(STORE_A).getKey(id));
     if(!existing)newAssets.set(id,{id,header,blob,size:blob.size});
    }
    node[k]=MARK+id;
   }else if(v&&typeof v==='object')await walk(v)
  }
 }
 await walk(value);return {payload:JSON.stringify(value),refs:[...refs],newAssets};
}
async function vacuum(){const db=await open(),rows=await allVersions();const active=new Set(rows.flatMap(row=>row.refs||[]));const all=await wait(db.transaction(STORE_A).objectStore(STORE_A).getAllKeys());const stale=all.filter(id=>!active.has(id));if(!stale.length)return;
 await transaction(db,[STORE_A],'readwrite',tx=>{for(const id of stale)tx.objectStore(STORE_A).delete(id)})
}
async function create(project,reason='手动快照',opts={}){if(busy)throw Error('已有历史备份任务正在运行');busy=true;try{
 if(!project?.slides?.length)throw Error('当前没有可保存的书页工程');
 await checkQuota();onState('正在生成去重历史快照…');const db=await open();
 const {payload,refs,newAssets}=await compact(project),digest=await sha(new TextEncoder().encode(payload));const prev=(await allVersions())[0];
 if(prev?.digest===digest&&!opts.force){dirty=false;onState('当前排版与最近历史版本相同，无需重复保存');return {...prev,skipped:true}}
 if(newAssets.size)await transaction(db,[STORE_A],'readwrite',tx=>{for(const record of newAssets.values())tx.objectStore(STORE_A).put(record)});
 const row={id:(crypto.randomUUID?.()||Date.now()+'-'+Math.random()),created:Date.now(),reason,digest,payload,refs,slideCount:project.slides.length,filled:project.slides.filter(s=>(s?.elements||[]).some(e=>!e.hidden&&e.type!=='placeholder')).length,bytes:payload.length};
 await transaction(db,[STORE_V],'readwrite',tx=>tx.objectStore(STORE_V).put(row));
 const versions=await allVersions();if(versions.length>KEEP){await transaction(db,[STORE_V],'readwrite',tx=>{for(const old of versions.slice(KEEP))tx.objectStore(STORE_V).delete(old.id)});await vacuum()}
 dirty=false;onState(`历史快照已保存（保留最近 ${Math.min(versions.length,KEEP)} 个）`);return row;
 }catch(e){onState('历史备份失败：'+e.message);throw e}finally{busy=false}}
async function restore(id){const db=await open(),row=await wait(db.transaction(STORE_V).objectStore(STORE_V).get(id));if(!row)throw Error('历史版本已不存在');
 const data=JSON.parse(row.payload),memo=new Map();async function walk(node){if(!node||typeof node!=='object')return;
 for(const k of Object.keys(node)){const v=node[k];if(typeof v==='string'&&v.startsWith(MARK)){
  const id=v.slice(MARK.length);if(!memo.has(id)){
   const record=await wait(db.transaction(STORE_A).objectStore(STORE_A).get(id));if(!record?.blob)throw Error('历史照片资源缺失：'+id);
   memo.set(id,await blobDataUrl(record.blob,record.header))
  }node[k]=memo.get(id);
 }else if(v&&typeof v==='object')await walk(v)}
 }
 await walk(data);if(!Array.isArray(data.slides)||!data.slides.length||data.slides.length>80||data.slides.length%2)throw Error('历史排版页数不符合当前编辑器要求');return {project:data,meta:row}
}
async function remove(id){const db=await open();await transaction(db,[STORE_V],'readwrite',tx=>tx.objectStore(STORE_V).delete(id));await vacuum()}
async function estimate(){const p=await navigator.storage?.estimate?.().catch(()=>null);return p&&p.quota?{usage:p.usage,quota:p.quota,ratio:p.usage/p.quota}:null}
function markDirty(){dirty=true;autoSchedule()}
function autoSchedule(){if(timer||!dirty||!getProject||busy)return;
 timer=setTimeout(async()=>{timer=null;if(!dirty)return;try{const latest=(await allVersions())[0];const waitMs=latest?20*60*1000-(Date.now()-latest.created):0;
  if(waitMs>0){timer=setTimeout(()=>{timer=null;autoSchedule()},Math.max(waitMs,20000));return}
  await create(getProject(),'自动历史快照')
 }catch(e){onState('自动历史快照失败：'+e.message)}finally{if(dirty&&!timer){timer=setTimeout(()=>{timer=null;autoSchedule()},5*60*1000)}}},90*1000);
}
async function start(projectGetter,handler){getProject=projectGetter;onState=handler||(()=>{});await open()}
window.SpecialHistory={start,create,restore,list:allVersions,remove,estimate,markDirty,KEEP};
})();
