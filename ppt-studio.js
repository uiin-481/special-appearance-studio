/* V10.1 增量修复：封面分层、紫金片尾、可编辑文字。保留原有 IndexedDB 草稿。 */
(()=>{'use strict';
const $=id=>document.getElementById(id);
const W=880,H=1180,COUNT_KEY='special-appearance-v9-count',DBNAME='special-appearance-v9-private',DOC_KEY='layout',BOOKS_INDEX_KEY='special-books-index',ACTIVE_BOOK_KEY='special-active-book';
function getBooksIndex(){try{const l=JSON.parse(localStorage.getItem(BOOKS_INDEX_KEY)||'null');if(Array.isArray(l)&&l.length)return l}catch(_){}return [{id:'default',title:'特别出演',subtitle:'纪念摄影书',docKey:DOC_KEY,pages:window.PHOTOBOOK?.spreads?.length*2||40,updatedAt:Date.now()}]}
function saveBooksIndex(l){try{localStorage.setItem(BOOKS_INDEX_KEY,JSON.stringify(l))}catch(_){}}
function getActiveBookId(){try{return localStorage.getItem(ACTIVE_BOOK_KEY)||'default'}catch(_){return 'default'}}
function getActiveBook(){const l=getBooksIndex(),id=getActiveBookId();return l.find(b=>b.id===id)||l[0]}
function activeDocKey(){return getActiveBook()?.docKey||DOC_KEY}
function deleteDbKey(key){return new Promise((res,rej)=>{const tx=db.transaction('values','readwrite');tx.oncomplete=()=>res();tx.onerror=()=>rej(tx.error);tx.objectStore('values').delete(key)})}
const clone=obj=>structuredClone(obj), clamp=(v,min,max)=>Math.min(max,Math.max(min,v)), rand=()=>Math.random().toString(36).slice(2,10);
const musicDefaults={volume:.42,loop:true,fadeMs:650,duckVolume:.16};
const musicSettings=s=>({volume:clamp(Number(s?.volume??.42)||0,0,1),loop:s?.loop!==false,fadeMs:clamp(Number(s?.fadeMs??650)||0,0,4000),duckVolume:clamp(Number(s?.duckVolume??.16)||0,0,1)});
const serif="'Noto Serif CJK SC','Songti SC',serif",sans="'Microsoft YaHei','PingFang SC',sans-serif",hand="'Xiangjiao','香蕉闻雪灵感体',cursive",eng="'Georgia',serif";
const T=(text,x,y,w,h,size=56,color='#42342e',family=serif,extra={})=>({id:rand(),type:'text',text,x,y,w,h,size,color,family,align:'left',weight:'normal',rotation:0,opacity:1,...extra});
const S=(x,y,w,h,fill='#ddd4c5',extra={})=>({id:rand(),type:'shape',x,y,w,h,fill,shape:'rect',radius:0,rotation:0,opacity:1,...extra});
const P=(x,y,w,h,extra={})=>({id:rand(),type:'placeholder',x,y,w,h,rotation:0,opacity:1,...extra});
const templateData=[
 {name:'紫金 · 未完待续',cat:'片尾',desc:'金框、星芒与独立文字',bg:'#322d30',make:()=>unfinishedTemplate().elements},
 {name:'紫金 · 片尾字幕',cat:'片尾',desc:'STARRING / 取景 / 摄影',bg:'#271c31',make:()=>creditsTemplate().elements},
 {name:'紫金 · 可编辑封面',cat:'封面',desc:'照片槽和标题分离',bg:'#231929',make:()=>coverTemplate().elements},
 {name:'空白纸页',cat:'基础',desc:'从零自由创作',bg:'#f7f2e9',make:()=>[]},
 {name:'摄影大留白',cat:'画册',desc:'一张主图与小标题',bg:'#faf8f2',make:()=>[T('OUR MOMENTS',70,60,740,55,25,'#846849',eng),P(94,206,690,745),T('给平凡日子的一次特写',94,990,690,80,44,'#37302b',serif),S(94,1100,130,4,'#ba9466')]},
 {name:'电影单帧',cat:'电影',desc:'紫黑放映海报',bg:'#261d30',make:()=>[S(38,38,804,1104,'#261d30',{stroke:'#c3a069'}),T('SPECIAL APPEARANCE',74,105,720,56,34,'#dec196',eng,{align:'center'}),P(86,244,706,574),T('故事发生的时候',88,879,704,89,56,'#f1e5d4',serif,{align:'center'}),T('SCENE 01   /   2026',110,1021,660,44,22,'#d1b384',eng,{align:'center'})]},
 {name:'拾景 · 撕纸',cat:'Zine',desc:'色块与碎片感留白',bg:'#f4efe4',make:()=>[S(0,0,182,1180,'#d0d7bd'),S(10,120,210,300,'#446253',{rotation:-8}),P(210,172,590,725,{rotation:2}),T('拾起一些\n春天',62,890,750,220,89,'#254c40',serif),S(68,1109,210,14,'#efbf49'),T('A SMALL ZINE',284,80,480,50,22,'#76816b',eng)]},
 {name:'拍立得日记',cat:'手帐',desc:'斜放双张纸片',bg:'#f6efdf',make:()=>[T('今天是值得记住的一天',58,74,770,90,48,'#464235',hand),S(78,212,415,527,'#fffaf0',{rotation:-6}),P(102,239,371,410,{rotation:-6}),S(378,493,409,520,'#fffbf2',{rotation:6}),P(402,516,363,419,{rotation:6}),T('2026 · notes',90,1050,650,60,30,'#826b60',eng)]},
 {name:'胶片四格',cat:'电影',desc:'四帧连续时刻',bg:'#232028',make:()=>[T('FRAME BY FRAME',62,64,770,67,48,'#e2d4b2',eng),...Array.from({length:4},(_,i)=>P(98,198+i*213,685,176)),S(63,180,24,887,'#a8905d'),S(795,180,24,887,'#a8905d'),T('TAKE 01  ·  THE DAYS WE KEEP',110,1092,690,44,23,'#d5b582',eng)]},
 {name:'票根档案',cat:'手帐',desc:'纪念票与旅行碎片',bg:'#e9dfcc',make:()=>[S(65,82,745,170,'#c5c29d',{rotation:-2}),T('MEMORY TICKET',95,107,645,70,53,'#3f423b',eng),T('留下一些小证据',95,186,560,40,28,'#675b45',serif),P(97,336,620,590,{rotation:-3}),S(520,829,270,150,'#aab2a0',{rotation:10}),T('ADMIT ONE',510,863,270,50,26,'#414f47',eng,{rotation:10}),T('NO. 2026—01',110,1028,480,64,39,'#725e4d',hand)]},
 {name:'双栏杂志',cat:'画册',desc:'大图 + 两段说明',bg:'#fffaf4',make:()=>[T('A LITTLE STORY',74,73,690,68,53,'#282c31',eng),S(74,162,705,2,'#a89b8f'),P(74,232,438,816),T('CHAPTER 01',549,240,250,44,24,'#907d69',eng),T('那些\n一起走过的路',549,326,252,240,65,'#292d29',serif),S(549,623,75,6,'#c0906c'),T('在平凡的日子里，\n认真收藏每一次相遇。',549,687,239,174,29,'#696159',serif)]},
 {name:'春日标本',cat:'手帐',desc:'植物色彩与两张图',bg:'#eff1e5',make:()=>[S(0,0,880,70,'#79937f'),T('SPRING / 南京',66,115,740,90,60,'#42634d',serif),P(88,270,505,630),P(618,462,176,270,{rotation:5}),T('✳',607,237,190,180,140,'#9cbb88',serif),T('我们走进春天里',88,970,670,83,49,'#496a55',hand),S(90,1090,200,5,'#c7a668')]},
 {name:'朋友画框',cat:'画册',desc:'合照主画面',bg:'#f8f4ee',make:()=>[S(39,40,804,1100,'#f8f4ee',{stroke:'#b99976'}),T('THE PEOPLE',88,96,704,79,56,'#5a4a46',eng,{align:'center'}),P(98,240,681,665),T('特别出演：我们',98,956,681,96,53,'#443c3d',serif,{align:'center'}),T('THE CAST OF OUR DAYS',98,1078,681,40,23,'#9b867c',eng,{align:'center'})]},
 {name:'极简字幕',cat:'文字',desc:'只给一句话留空间',bg:'#f8f6f0',make:()=>[T('这一页，\n留给一句很想说的话。',100,366,690,270,78,'#39332e',serif),S(108,735,162,5,'#bba17f'),T('2025  —  2026',108,798,640,40,26,'#8a7d70',eng)]},
 {name:'蓝调夜行',cat:'电影',desc:'大幅夜景与电影字幕',bg:'#161e33',make:()=>[T('NIGHTS IN THE CITY',62,77,747,61,45,'#f6e4b9',eng),P(70,215,738,722),S(70,973,738,3,'#a6aabc'),T('THE NIGHT WAS OURS',70,1010,738,67,37,'#ece3dc',eng,{align:'right'})]},
 {name:'两页的信',cat:'文字',desc:'留白书信页面',bg:'#f2e8d8',make:()=>[S(49,47,782,1084,'#f2e8d8',{stroke:'#bba68c'}),T('写给未来的我们',100,150,670,100,66,'#483d34',hand),T('Dear us,',100,328,600,80,45,'#65554a',eng),T('那段日子里，\n我们把平凡的时间过得很好。\n\n留一点空白，\n下次相见再继续写。',104,510,672,470,43,'#5c5045',serif)]}
];
const blank=()=>({bg:'#f7f2e9',elements:[]});
// 背景、金边、标题、照片槽全部是分离的编辑元素；边框锁定鼠标拾取，避免挡住文字。
const gold='#c7ac79', pale='#f1e5ce', dim='#cbbba6';
const border=(x=54,y=58,w=772,h=1068)=>S(x,y,w,h,'transparent',{stroke:gold,locked:true});
const footerLine=()=>S(98,1073,684,2,gold,{locked:true});
const starSVG='data:image/svg+xml;charset=utf-8,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M50 10 C56 40 60 44 90 50 C60 56 56 60 50 90 C44 60 40 56 10 50 C40 44 44 40 50 10Z" fill="none" stroke="#c7ac79" stroke-width="4"/><circle cx="50" cy="50" r="5" fill="#c7ac79"/></svg>');
const star=(x,y,size=86)=>({...P(x,y,size,size),type:'image',src:starSVG,fit:'contain',locked:true});
function coverTemplate(){return {bg:'#231929',v11Cover:true,elements:[
 border(42,40,796,1100),border(57,56,766,1067),
 T('A PERSONAL PHOTOBOOK',130,113,620,48,24,gold,eng,{align:'center'}),
 T('特别出演',112,195,656,115,100,pale,serif,{align:'center'}),
 T('THE CITY WE KEEP',120,310,640,45,31,gold,eng,{align:'center'}),
 {...P(92,402,696,490,{role:'cover-photo'}),fit:'cover'},
 T('我们出现在彼此生活里的日子',102,940,676,72,40,pale,serif,{align:'center'}),
 S(308,1030,264,2,gold,{locked:true}),
 T('2025  —  2026',162,1057,556,46,26,gold,eng,{align:'center'})
 ]};}
function unfinishedTemplate(){return {bg:'#322d30',elements:[
 border(46,44,788,1094),border(63,58,754,1059),
 star(389,210,102),
 T('未完待续',100,380,680,126,87,pale,serif,{align:'center'}),
 T('故事先写到这里。',135,580,610,57,35,dim,serif,{align:'center'}),
 T('下一次见面，',135,655,610,56,35,dim,serif,{align:'center'}),
 T('再继续更新。',135,727,610,56,35,dim,serif,{align:'center'}),
 footerLine(),T('END CREDITS',260,1083,360,40,20,gold,eng,{align:'center'})
 ]};}
function creditsTemplate(){return {bg:'#271c31',elements:[
 border(46,44,788,1094),border(63,58,754,1059),
 T('STARRING',176,153,528,62,34,gold,eng,{align:'center'}),
 T('特别出演',228,292,420,44,30,gold,serif,{align:'center'}),
 T('我们',190,340,500,74,57,pale,serif,{align:'center'}),
 T('取景',228,468,420,46,30,gold,serif,{align:'center'}),
 T('那些一起走过的地方',99,512,682,74,43,pale,serif,{align:'center'}),
 T('摄影',228,648,420,46,30,gold,serif,{align:'center'}),
 T('在场的人',190,690,500,73,51,pale,serif,{align:'center'}),
 T('收藏',228,811,420,46,30,gold,serif,{align:'center'}),
 T('这些日子',190,855,500,73,47,pale,serif,{align:'center'}),
 T('THANK YOU FOR BEING IN FRAME',120,1020,640,40,20,gold,eng,{align:'center'}),
 footerLine(),T('END CREDITS',260,1083,360,40,20,gold,eng,{align:'center'})
 ]};}
const defaultCover=coverTemplate;
const defaultBack=unfinishedTemplate;
// 从 V10 单张烘焙封面迁移为“独立背景＋照片槽＋可编辑文字”，尽量保留用户已换过的照片。
function migrateCover(slide){
 if(slide?.reassignedBookend)return slide;
 if(slide?.flattenedImported)return slide;
 if(!slide?.elements?.length)return defaultCover();
 const all=slide.elements, only=all.length===1?all[0]:null;
 if(only&&only.type==='image'&&only.x===0&&only.y===0){
  const result=coverTemplate(),slot=result.elements.find(e=>e.role==='cover-photo');
  if(only.src&&only.src!=='assets/pages/front-cover.jpg')Object.assign(slot,{type:'image',src:only.src,fit:'cover'});
  return result;
 }
 return slide;
}
function migrateBack(slide){
 if(slide?.reassignedBookend)return slide;
 if(!slide?.elements?.length)return defaultBack();
 const base=slide.elements[0];
 if(base?.type==='image'&&base.src==='assets/pages/back-cover.jpg'&&slide.elements.length===3&&slide.elements[1]?.text==='未完待续'&&slide.elements[2]?.text==='TO BE CONTINUED'){
  // 保留自定义的“未完待续”文案；其余为独立可编辑的装饰元素。
  const result=unfinishedTemplate();
  const oldTitle=slide.elements.find(e=>e.type==='text'&&e.text?.includes('未完待续'));
  if(oldTitle)result.elements.find(e=>e.type==='text'&&e.text==='未完待续').text=oldTitle.text;
  return result;
 }
 return slide;
}
let doc={slides:Array.from({length:window.PHOTOBOOK.spreads.length*2},blank),cover:defaultCover(),back:defaultBack()};
if(doc.slides.length>=2){doc.slides[doc.slides.length-2]=unfinishedTemplate();doc.slides[doc.slides.length-1]=creditsTemplate()}
// V12.3: treat uploaded reader artwork as non-destructive, locked base layers.
// Exported JPG pages have no editable text/photo layer metadata.
function importedReaderDraft(targetCount=doc.slides.length){
  const imported=window.SPECIAL_IMPORTED_READER;
  if(!imported)return null;
  const original=(file)=>({bg:'#f7f2e9',flattenedImported:true,elements:[{
    id:'imported-'+file,type:'image',src:'assets/pages/'+file,
    x:0,y:0,w:W,h:H,fit:'contain',opacity:1,rotation:0,locked:true,
    role:'imported-artwork'
  }]});
  const available=Math.min(targetCount,imported.initialPages||0);
  return {slides:Array.from({length:targetCount},(_,i)=>i<available?original('page-'+String(i+1).padStart(2,'0')+'.jpg'):blank()),
    cover:original('front-cover.jpg'),back:original('back-cover.jpg'),musicId:null,musicSettings:{...musicDefaults}};
}
const activeSlide=()=>current===-1?doc.cover:current===-2?doc.back:doc.slides[current];
const setActiveSlide=v=>{if(current===-1)doc.cover=v;else if(current===-2)doc.back=v;else doc.slides[current]=v};
const MediaStore=window.SpecialMediaStore;
let current=0, selected=-1, selectedIds=new Set(), localClipboard=[], move=null, db=null, dbReady=false, undoStack=[],redoStack=[], pendingSave=null, syncing=false, seq=0, imgCache=new Map(), ready3d=false, fontLoaded=false,coverImg=null;
const canvas=$('editCanvas'),ctx=canvas.getContext('2d');
function status(txt){$('savedStatus').textContent=txt}
function openDb(){return new Promise((resolve,reject)=>{const req=indexedDB.open(DBNAME,2);req.onupgradeneeded=()=>{const d=req.result;if(!d.objectStoreNames.contains('values'))d.createObjectStore('values');if(!d.objectStoreNames.contains('media'))d.createObjectStore('media',{keyPath:'id'})};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)})}
function readDb(key){return new Promise((res,rej)=>{const req=db.transaction('values').objectStore('values').get(key);req.onsuccess=()=>res(req.result);req.onerror=()=>rej(req.error)})}
function writeDb(key,value){return new Promise((res,rej)=>{const tx=db.transaction('values','readwrite');tx.oncomplete=()=>res();tx.onerror=()=>rej(tx.error||new Error('IndexedDB write error'));tx.onabort=()=>rej(tx.error||new Error('IndexedDB write aborted'));const req=tx.objectStore('values').put(value,key);req.onerror=()=>rej(req.error)})}
function persist(){if(!dbReady)return;clearTimeout(pendingSave);pendingSave=setTimeout(async()=>{if(!db){status('此浏览器不支持本地存储，请下载 JSON 备份');return}try{const key=activeDocKey();await writeDb(key,doc);const list=getBooksIndex(),cur=list.find(b=>b.docKey===key);if(cur){cur.pages=doc.slides.length;cur.updatedAt=Date.now();saveBooksIndex(list)}status('✓ 已自动保存在本机');window.SpecialHistory?.markDirty()}catch(e){console.warn(e);status('保存失败，请导出 JSON 备份')}},450)}
function fontReady(){return document.fonts.ready.catch(()=>{})}
// V10.4: 多字体库。每个文件拥有独立 CSS family，而非覆盖固定的 Xiangjiao。
const USER_FONTS_KEY='font-library-v4';
const installedFonts=[];
function fontNameFromBytes(bytes,fallback){
 try{
  const v=new DataView(bytes),len=v.byteLength;
  const four=o=>String.fromCharCode(...new Uint8Array(bytes,o,4));
  if(len<12||four(0)==='wOFF'||four(0)==='wOF2'||four(0)==='ttcf')return fallback;
  const count=v.getUint16(4), tables=Math.min(count,100);
  for(let i=0;i<tables;i++){
   const t=12+i*16;if(t+16>len)break;
   if(four(t)!=='name')continue;
   const offset=v.getUint32(t+8),limit=v.getUint32(t+12);
   if(offset+6>len||limit<6)break;
   const n=Math.min(v.getUint16(offset+2),300),start=offset+v.getUint16(offset+4),candidates=[];
   for(let j=0;j<n;j++){
    const r=offset+6+j*12;if(r+12>len)break;
    const platform=v.getUint16(r),nameId=v.getUint16(r+6),language=v.getUint16(r+4),size=v.getUint16(r+8),pos=start+v.getUint16(r+10);
    if(![1,16].includes(nameId)||pos+size>len||size>1024)continue;
    let name='';
    if(platform===0||platform===3){for(let k=0;k+1<size;k+=2)name+=String.fromCharCode(v.getUint16(pos+k))}
    else if(platform===1){for(let k=0;k<size;k++)name+=String.fromCharCode(v.getUint8(pos+k))}
    name=name.replace(/[\x00-\x1f]/g,'').trim();
    if(name&&name.length<85)candidates.push({name,score:(nameId===16?40:0)+([0x804,0x404,0xC04,0x1404].includes(language)?20:0)+(platform===3?8:0)})
   }
   candidates.sort((a,b)=>b.score-a.score);
   return candidates[0]?.name||fallback;
  }
 }catch(e){console.warn('读取字体名称失败，回退为文件名',e)}
 return fallback;
}
function fontKey(file){const signature=[file.name,file.size,file.lastModified||0].join(':');let n=2166136261;for(let i=0;i<signature.length;i++){n^=signature.charCodeAt(i);n=Math.imul(n,16777619)}return 'UserFont_'+(n>>>0).toString(36)}
function addFontOption(meta){
 const sel=$('fontFamily');if(Array.from(sel.options).some(o=>o.value===meta.family))return;
 let group=sel.querySelector('optgroup[data-imported-fonts]');
 if(!group){group=document.createElement('optgroup');group.label='已导入的字体';group.dataset.importedFonts='1';sel.append(group)}
 const opt=document.createElement('option');opt.value=meta.family;opt.textContent='✦ '+meta.name;group.append(opt);
}
async function loadCustomFont(file,{selectAfter=false,quiet=false}={}){
 if(!file)return false;
 try{
  if(file.size>18*1024*1024)throw Error('单个字体不能超过 18MB');
  const bytes=await file.arrayBuffer();
  const key=fontKey(file),family="'"+key+"', sans-serif";
  const name=fontNameFromBytes(bytes,file.name.replace(/\.[^.]+$/,''));
  if(!installedFonts.some(f=>f.key===key)){
   const face=new FontFace(key,bytes);await face.load();document.fonts.add(face);
   installedFonts.push({key,name,family,file});
  }
  addFontOption({key,name,family});fontLoaded=true;
  if(/香蕉闻雪|香焦闻雪/.test(name)){
   // 模板里早期预设的 'Xiangjiao' 继续使用这款字体，独立新字体仍保留列表条目。
   try{const alias=new FontFace('Xiangjiao',bytes);await alias.load();document.fonts.add(alias)}catch(e){console.warn(e)}
  }
  if(selectAfter){
   const el=activeSlide()?.elements?.[selected];
   if(el?.type==='text')modify(()=>{el.family=family});
   $('fontFamily').value=family;
  }
  if(!quiet)status('✓ 已加入字体库：'+name+'（共 '+installedFonts.length+' 款）');
  schedule();return true;
 }catch(e){console.error(e);if(!quiet)alert('字体导入失败：'+e.message);return false}
}
async function persistFonts(){if(db)await writeDb(USER_FONTS_KEY,installedFonts.map(f=>({file:f.file}))) }
async function loadSavedFonts(){
 if(!db)return;
 const items=await readDb(USER_FONTS_KEY);
 if(Array.isArray(items))for(const item of items){if(item?.file)await loadCustomFont(item.file,{quiet:true})}
 // 兼容旧 V10 只存一款字体的格式，旧文字仍能使用 Xiangjiao。
 const legacy=await readDb('font');
 if(legacy){
  try{const alias=new FontFace('Xiangjiao',await legacy.arrayBuffer());await alias.load();document.fonts.add(alias)}catch(e){console.warn('旧字体别名加载失败',e)}
  if(!Array.isArray(items)||!items.length){await loadCustomFont(legacy,{quiet:true});await persistFonts()}
 }
}

// V12.6: keep decoded images ready for synchronous 60fps canvas previews.
const imgResolved=new Map();
function getImg(src){if(!src)return Promise.resolve(null);if(imgCache.has(src))return imgCache.get(src);const p=new Promise(res=>{const im=new Image();im.onload=()=>{imgResolved.set(src,im);res(im)};im.onerror=()=>res(null);im.src=src});imgCache.set(src,p);return p}

function cropOf(el){
 const r=el.crop||{};
 let x=clamp(Number(r.x)||0,0,.98),y=clamp(Number(r.y)||0,0,.98);
 let w=clamp(Number(r.w)||1,.02,1-x),h=clamp(Number(r.h)||1,.02,1-y);
 return{x,y,w,h};
}
function placement(el,img){
 const r=cropOf(el),sw=img.width*r.w,sh=img.height*r.h;
 const base=(el.fit==='contain'?Math.min:Math.max)(el.w/sw,el.h/sh);
 const zoom=clamp(Number(el.zoom)||1,1,6);
 const dw=sw*base*zoom,dh=sh*base*zoom;
 const maxX=Math.max(0,(dw-el.w)/2),maxY=Math.max(0,(dh-el.h)/2);
 // 图片放大超出画框时允许移动；没有超出时锁定居中，避免空白边缘。
 const ox=clamp(Number(el.offsetX)||0,-maxX,maxX),oy=clamp(Number(el.offsetY)||0,-maxY,maxY);
 return{sx:r.x*img.width,sy:r.y*img.height,sw,sh,dw,dh,ox,oy,maxX,maxY};
}
function imageStroke(el){
 const v=el.stroke||{},num=(n,d,min,max)=>Number.isFinite(Number(n))?clamp(Number(n),min,max):d;
 return {enabled:v.enabled===true,width:num(v.width,14,1,50),color:/^#[0-9a-f]{6}$/i.test(v.color||'')?v.color:'#ffffff'};
}
function imageFrame(el){
 const v=el.frame||{},num=(n,d,min,max)=>Number.isFinite(Number(n))?clamp(Number(n),min,max):d;
 const shape=['none','rounded','circle','torn'].includes(v.shape)?v.shape:'none';
 return {shape,radius:num(v.radius,36,0,200),flipX:v.flipX===true,flipY:v.flipY===true};
}
function tornPaperPath(c,el,x,y){
 const w=el.w,h=el.h,seedStr=String(el.id||'torn')+'_'+Math.round(w)+'x'+Math.round(h);
 let hval=2166136261;
 for(let i=0;i<seedStr.length;i++){hval^=seedStr.charCodeAt(i);hval=Math.imul(hval,16777619)}
 const rnd=()=>{hval^=hval<<13;hval^=hval>>>17;hval^=hval<<5;return (hval>>>0)/4294967295};
 const step=Math.max(8,Math.min(18,Math.min(w,h)/16)),amp=Math.min(10,Math.max(3,Math.min(w,h)*0.025));
 const pts=[];
 for(let px=0;px<w;px+=step)pts.push([x+px,y+amp*(0.25+rnd()*0.75)]);
 for(let py=0;py<h;py+=step)pts.push([x+w-amp*(0.25+rnd()*0.75),y+py]);
 for(let px=w;px>0;px-=step)pts.push([x+px,y+h-amp*(0.25+rnd()*0.75)]);
 for(let py=h;py>0;py-=step)pts.push([x+amp*(0.25+rnd()*0.75),y+py]);
 c.beginPath();
 pts.forEach((pt,idx)=>idx===0?c.moveTo(pt[0],pt[1]):c.lineTo(pt[0],pt[1]));
 c.closePath();
}
function applyImageClip(c,el,x,y){
 const f=imageFrame(el);
 if(f.shape==='none')return false;
 c.beginPath();
 if(f.shape==='circle'){c.ellipse(x+el.w/2,y+el.h/2,el.w/2,el.h/2,0,0,Math.PI*2)}
 else if(f.shape==='rounded'){
  const r=Math.min(f.radius,Math.min(el.w,el.h)/2);
  if(c.roundRect){c.roundRect(x,y,el.w,el.h,r)}
  else{c.moveTo(x+r,y);c.lineTo(x+el.w-r,y);c.quadraticCurveTo(x+el.w,y,x+el.w,y+r);c.lineTo(x+el.w,y+el.h-r);c.quadraticCurveTo(x+el.w,y+el.h,x+el.w-r,y+el.h);c.lineTo(x+r,y+el.h);c.quadraticCurveTo(x,y+el.h,x,y+el.h-r);c.lineTo(x,y+r);c.quadraticCurveTo(x,y,x+r,y);c.closePath()}
 }else if(f.shape==='torn'){tornPaperPath(c,el,x,y)}
 c.clip();return true;
}
function drawPlacedImage(c,el,img,x,y){
 const f=imageFrame(el);
 c.save();
 const clipped=applyImageClip(c,el,x,y);
 if(f.flipX||f.flipY){c.translate(x+el.w/2,y+el.h/2);c.scale(f.flipX?-1:1,f.flipY?-1:1);c.translate(-(x+el.w/2),-(y+el.h/2))}
 if(el.fit==='stretch'){const r=cropOf(el);c.drawImage(img,r.x*img.width,r.y*img.height,img.width*r.w,img.height*r.h,x,y,el.w,el.h);c.restore();return}
 const p=placement(el,img);
 if(!clipped){c.beginPath();c.rect(x,y,el.w,el.h);c.clip();}
 c.drawImage(img,p.sx,p.sy,p.sw,p.sh,x+(el.w-p.dw)/2+p.ox,y+(el.h-p.dh)/2+p.oy,p.dw,p.dh);
 c.restore();
}
const effectCache=new Map();let effectCachePixels=0;
function cachePhotoEffect(el,item){
 const old=effectCache.get(el);if(old)effectCachePixels-=old.buffer.width*old.buffer.height;
 effectCache.delete(el);effectCache.set(el,item);effectCachePixels+=item.buffer.width*item.buffer.height;
 while((effectCachePixels>8000000||effectCache.size>20)&&effectCache.size>1){const first=effectCache.keys().next().value,expired=effectCache.get(first);effectCachePixels-=expired.buffer.width*expired.buffer.height;effectCache.delete(first)}
}
function imageAdjustments(el){
 const a=el.adjustments||{},safe=(value,defaultValue,min,max)=>{const n=Number(value);return Number.isFinite(n)?clamp(n,min,max):defaultValue};
 return {brightness:safe(a.brightness,100,0,200),contrast:safe(a.contrast,100,0,200),saturation:safe(a.saturation,100,0,200),warmth:safe(a.warmth,0,-100,100),sepia:safe(a.sepia,0,0,100),fade:safe(a.fade,0,0,60),grayscale:safe(a.grayscale,0,0,100),vignette:safe(a.vignette,0,0,100),blur:safe(a.blur,0,0,20)};
}
function imageShadow(el){
 const v=el.shadow||{},num=(n,d,min,max)=>Number.isFinite(Number(n))?clamp(Number(n),min,max):d;
 return {enabled:v.enabled===true,blur:num(v.blur,15,0,60),x:num(v.x,5,-50,50),y:num(v.y,9,-50,50),opacity:num(v.opacity,.28,0,1),color:/^#[0-9a-f]{6}$/i.test(v.color||'')?v.color:'#32263c'};
}
function photoFilter(el){
 const a=imageAdjustments(el),parts=[`brightness(${a.brightness}%)`,`contrast(${a.contrast}%)`,`saturate(${a.saturation}%)`];
 if(a.sepia>0)parts.push(`sepia(${a.sepia}%)`);if(a.grayscale>0)parts.push(`grayscale(${a.grayscale}%)`);if(a.blur>0)parts.push(`blur(${a.blur}px)`);
 return parts.join(' ');
}
function shadowColor(sh){const n=parseInt(sh.color.slice(1),16);return `rgba(${(n>>16)&255},${(n>>8)&255},${n&255},${sh.opacity})`}
function paintImageElement(c,el,img,x,y,scale=1){
 const sh=imageShadow(el),st=imageStroke(el),fr=imageFrame(el),adjust=imageAdjustments(el);
 const needsBuffer=(sh.enabled&&sh.opacity>0)||(st.enabled&&st.width>0)||adjust.warmth!==0||adjust.fade>0||adjust.vignette>0;
 if(!needsBuffer){c.save();c.filter=photoFilter(el);drawPlacedImage(c,el,img,x,y);c.restore();return}
 const r=cropOf(el),maxSize=4096,pad=st.enabled&&st.width>0?Math.ceil(st.width):0;
 const ds=Math.min(Math.max(.25,scale),maxSize/Math.max(1,el.w+pad*2),maxSize/Math.max(1,el.h+pad*2));
 const key=[el.w,el.h,el.fit,r.x,r.y,r.w,r.h,el.zoom,el.offsetX,el.offsetY,adjust.brightness,adjust.contrast,adjust.saturation,adjust.warmth,adjust.sepia,adjust.fade,adjust.grayscale,adjust.vignette,adjust.blur,st.enabled?1:0,st.width,st.color,fr.shape,fr.radius,fr.flipX?1:0,fr.flipY?1:0,ds].join('|');
 let item=effectCache.get(el);if(item){effectCache.delete(el);effectCache.set(el,item)}
 if(!item||item.key!==key||item.img!==img){
  const pw=Math.max(1,Math.round(el.w*ds)),ph=Math.max(1,Math.round(el.h*ds));
  const photoCanvas=document.createElement('canvas');photoCanvas.width=pw;photoCanvas.height=ph;
  const pg=photoCanvas.getContext('2d');pg.setTransform(pw/el.w,0,0,ph/el.h,0,0);
  pg.filter=photoFilter(el);drawPlacedImage(pg,el,img,0,0);pg.filter='none';
  if(adjust.warmth!==0){pg.save();pg.globalCompositeOperation='source-atop';pg.fillStyle=adjust.warmth>0?`rgba(255,162,72,${(adjust.warmth/260).toFixed(3)})`:`rgba(88,165,255,${(-adjust.warmth/260).toFixed(3)})`;pg.fillRect(0,0,el.w,el.h);pg.restore()}
  if(adjust.fade>0){pg.save();pg.globalCompositeOperation='source-atop';pg.fillStyle=`rgba(248,240,232,${(adjust.fade/145).toFixed(3)})`;pg.fillRect(0,0,el.w,el.h);pg.restore()}
  if(adjust.vignette>0){pg.save();pg.globalCompositeOperation='source-atop';const cx=el.w/2,cy=el.h/2,rad=Math.hypot(el.w,el.h)*0.54,grad=pg.createRadialGradient(cx,cy,Math.min(el.w,el.h)*0.22,cx,cy,rad);grad.addColorStop(0,'rgba(18,10,22,0)');grad.addColorStop(1,`rgba(18,10,22,${(adjust.vignette/115).toFixed(3)})`);pg.fillStyle=grad;pg.fillRect(0,0,el.w,el.h);pg.restore()}
  const bw=Math.max(1,Math.round((el.w+pad*2)*ds)),bh=Math.max(1,Math.round((el.h+pad*2)*ds));
  const buffer=document.createElement('canvas');buffer.width=bw;buffer.height=bh;
  const g=buffer.getContext('2d'),ox=Math.round(pad*ds),oy=Math.round(pad*ds);
  if(st.enabled&&st.width>0){
   const sil=document.createElement('canvas');sil.width=bw;sil.height=bh;
   const sg=sil.getContext('2d'),sr=st.width*ds,steps=24;
   for(let i=0;i<steps;i++){const a=i/steps*Math.PI*2;sg.drawImage(photoCanvas,ox+Math.cos(a)*sr,oy+Math.sin(a)*sr)}
   if(sr>10){for(let i=0;i<12;i++){const a=i/12*Math.PI*2;sg.drawImage(photoCanvas,ox+Math.cos(a)*sr*0.52,oy+Math.sin(a)*sr*0.52)}}
   sg.globalCompositeOperation='source-in';sg.fillStyle=st.color;sg.fillRect(0,0,bw,bh);g.drawImage(sil,0,0);
  }
  g.drawImage(photoCanvas,ox,oy);
  item={key,img,buffer,pad};cachePhotoEffect(el,item);
 }
 c.save();
 if(sh.enabled&&sh.opacity>0){c.shadowColor=shadowColor(sh);c.shadowBlur=sh.blur*scale;c.shadowOffsetX=sh.x*scale;c.shadowOffsetY=sh.y*scale}
 c.drawImage(item.buffer,x-item.pad,y-item.pad,el.w+item.pad*2,el.h+item.pad*2);
 c.restore();
}
async function trimTransparentImage(){
 const el=activeSlide().elements[selected];if(el?.type!=='image')return;
 const img=await getImg(el.src);if(!img)return;
 const size=700,ratio=Math.min(1,size/Math.max(img.width,img.height));
 const w=Math.max(1,Math.round(img.width*ratio)),h=Math.max(1,Math.round(img.height*ratio));
 const test=document.createElement('canvas');test.width=w;test.height=h;
 const g=test.getContext('2d',{willReadFrequently:true});g.drawImage(img,0,0,w,h);
 const pixels=g.getImageData(0,0,w,h).data;
 let left=w,top=h,right=-1,bottom=-1,hasAlpha=false;
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
   const a=pixels[(y*w+x)*4+3];if(a<253)hasAlpha=true;
   if(a>15){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y)}
 }
 if(!hasAlpha){status('这张图片不含透明留白');return}
 if(right<left){status('图片没有可见内容');return}
 const margin=3;
 const crop={x:Math.max(0,left-margin)/w,y:Math.max(0,top-margin)/h,
   w:(Math.min(w-1,right+margin)-Math.max(0,left-margin)+1)/w,
   h:(Math.min(h-1,bottom+margin)-Math.max(0,top-margin)+1)/h};
 modify(()=>Object.assign(el,{crop,fit:'contain',zoom:1,offsetX:0,offsetY:0}));
 status('✓ 已忽略透明留白；PNG 的透明像素仍然保留');
}
function showPhotoEditor(initialMode='reframe'){
 const original=activeSlide().elements[selected];if(original?.type!=='image')return;
 const targetSlide=activeSlide(),targetId=original.id;
 getImg(original.src).then(img=>{
 if(!img){alert('无法读取这张照片');return}
 const draft=clone(original);let mode='reframe',view={};let interaction=null;
 draft.adjustments={...imageAdjustments(draft)};draft.shadow={...imageShadow(draft)};draft.stroke={...imageStroke(draft)};draft.frame={...imageFrame(draft)};
 let matte=null,matHistory=[],matMode='magic',matBase=null,matWork=null,matCtx=null,matAlpha=null;
 const backdrop=document.createElement('div');backdrop.className='photo-edit-backdrop';
 backdrop.innerHTML=`<section class="photo-edit-dialog" role="dialog" aria-modal="true" aria-label="图片编辑：裁剪、调色与阴影">
 <header class="photo-edit-header"><div><b>图片编辑 · 裁剪与调色</b><small>所有修改仅记录在排版中，不修改原图</small></div><button type="button" data-action="close" title="取消并关闭">✕</button></header>
 <div class="photo-edit-tabs"><button data-tab="reframe" class="active">✋ 移动画面</button><button data-tab="crop">✂ 裁剪区域</button><button data-tab="frame">✎ 描边与形状</button><button data-tab="adjust">☀ 调色与阴影</button><button data-tab="cutout">✦ 抠图 / 去背景</button></div>
 <div class="photo-edit-content"><div class="photo-edit-viewport"><canvas width="640" height="500" title="拖动以调整位置或裁剪框"></canvas></div>
 <aside class="photo-edit-settings">
 <div class="pe-reframe"><label>图片显示方式<select data-field="fit"><option value="cover">填满画框（可裁切）</option><option value="contain">完整显示（不裁切）</option></select></label>
 <label>取景放大 <strong data-zoom-value></strong><input data-field="zoom" type="range" min="1" max="4" step="0.01"></label>
 <div class="photo-edit-buttons"><button data-action="center">重新居中</button><button data-action="fit">完整显示</button></div>
 <p>拖动照片，让希望展示的部分位于画框中间。按住 Alt 在主画布上拖动图片，也能直接移动取景位置。</p></div>
 <div class="pe-crop" hidden><label>裁剪比例<select data-field="ratio"><option value="free">自由</option><option value="frame">按当前画框比例</option><option value="1">1 : 1</option><option value="1.333333">4 : 3</option><option value="0.75">3 : 4</option><option value="1.777778">16 : 9</option></select></label>
 <div class="photo-edit-buttons"><button data-action="reset-crop">恢复全部画面</button></div><p>拖动亮色选框或四角控制点确定裁剪范围。裁剪是非破坏性的，可以随时重新调整。</p></div>
 <div class="pe-frame" hidden>
 <strong class="pe-title">贴纸 / 照片描边（支持透明 PNG 轮廓）</strong>
 <label class="pe-shadow-toggle"><input type="checkbox" data-field="strokeEnabled"> 开启贴纸 / 照片描边</label>
 <div class="pe-stroke-controls">
 <label>描边粗细 <strong data-value="strokeWidth">14px</strong><input data-stroke="width" type="range" min="1" max="50" step="1"></label>
 <label>描边颜色 <input type="color" data-stroke="color"></label>
 <div class="pe-swatches" aria-label="常用描边配色">
  <button type="button" data-swatch="#ffffff" style="background:#ffffff" title="纯白贴纸边"></button>
  <button type="button" data-swatch="#fbf6ea" style="background:#fbf6ea" title="手帐奶白"></button>
  <button type="button" data-swatch="#dfc6a4" style="background:#dfc6a4" title="牛皮卡纸"></button>
  <button type="button" data-swatch="#f4cdd6" style="background:#f4cdd6" title="柔粉花边"></button>
  <button type="button" data-swatch="#2d282c" style="background:#2d282c" title="炭黑胶片"></button>
 </div>
 </div>
 <strong class="pe-title" style="margin-top:6px">画框形状与翻转</strong>
 <label>裁切形状<select data-frame="shape"><option value="none">原图直角（或保留透明轮廓）</option><option value="rounded">圆角卡片</option><option value="circle">圆形 / 椭圆徽章</option><option value="torn">手撕纸边</option></select></label>
 <label class="pe-radius-row">圆角大小 <strong data-value="frameRadius">36px</strong><input data-frame="radius" type="range" min="0" max="200" step="2"></label>
 <div class="photo-edit-buttons"><button type="button" data-action="flip-x">⇄ 水平镜像</button><button type="button" data-action="flip-y">⇅ 垂直翻转</button></div>
 <p>透明抠图贴纸开启描边后，会自动沿着物体轮廓生成剪纸白边；搭配“调色与阴影”里的纸张阴影更有立体剪贴感。</p>
 </div>
 <div class="pe-adjust" hidden>
 <strong class="pe-title">照片色彩与滤镜（实时预览）</strong>
 <div class="photo-edit-buttons">
  <button type="button" data-action="effect-reset">↺ 原图</button>
  <button type="button" data-action="effect-warm">暖调日记</button>
  <button type="button" data-action="effect-soft">柔和复古</button>
  <button type="button" data-action="effect-film">胶片微醺</button>
  <button type="button" data-action="effect-fresh">日系清透</button>
  <button type="button" data-action="effect-bw">黑白叙事</button>
 </div>
 <label>亮度 <strong data-value="brightness">100%</strong><input data-effect="brightness" type="range" min="0" max="200" value="100" step="1"></label>
 <label>对比度 <strong data-value="contrast">100%</strong><input data-effect="contrast" type="range" min="0" max="200" value="100" step="1"></label>
 <label>饱和度 <strong data-value="saturation">100%</strong><input data-effect="saturation" type="range" min="0" max="200" value="100" step="1"></label>
 <label>色温（冷/暖） <strong data-value="warmth">0</strong><input data-effect="warmth" type="range" min="-100" max="100" value="0" step="1"></label>
 <label>胶片褪色 <strong data-value="fade">0%</strong><input data-effect="fade" type="range" min="0" max="60" value="0" step="1"></label>
 <label>复古怀旧 <strong data-value="sepia">0%</strong><input data-effect="sepia" type="range" min="0" max="100" value="0" step="1"></label>
 <label>黑白度 <strong data-value="grayscale">0%</strong><input data-effect="grayscale" type="range" min="0" max="100" value="0" step="1"></label>
 <label>暗角聚焦 <strong data-value="vignette">0%</strong><input data-effect="vignette" type="range" min="0" max="100" value="0" step="1"></label>
 <label>柔焦模糊 <strong data-value="blur">0px</strong><input data-effect="blur" type="range" min="0" max="20" value="0" step="0.5"></label>
 <label class="pe-shadow-toggle"><input type="checkbox" data-field="shadowEnabled"> 给照片 / 贴纸添加纸张阴影</label>
 <div class="pe-shadow-controls">
 <label>模糊范围 <strong data-value="blur">15</strong><input data-shadow="blur" type="range" min="0" max="60" step="1"></label>
 <label>水平位移 <strong data-value="x">5</strong><input data-shadow="x" type="range" min="-50" max="50" step="1"></label>
 <label>垂直位移 <strong data-value="y">9</strong><input data-shadow="y" type="range" min="-50" max="50" step="1"></label>
 <label>阴影浓度 <strong data-value="opacity">28%</strong><input data-shadow="opacity" type="range" min="0" max="100" step="1"></label>
 <label>阴影颜色 <input type="color" data-shadow="color"></label>
 </div>
 <p>只修改当前图片图层，不覆盖原始照片。带透明背景的贴纸，描边与阴影都会跟随非透明部分。</p>
 </div>
 <div class="pe-cutout" hidden>
 <strong class="pe-title">本地背景去除</strong>
 <label>工具<select data-field="matmode"><option value="magic">🪄 点击背景删除（相邻颜色）</option><option value="erase">🖌 橡皮擦</option><option value="restore">↩ 恢复画笔</option></select></label>
 <label>颜色容差 <strong data-mat-tolerance-label>44</strong><input data-field="tolerance" type="range" min="5" max="145" value="44" step="1"></label>
 <label>画笔大小 <strong data-mat-brush-label>28</strong><input data-field="brushsize" type="range" min="5" max="160" value="28" step="1"></label>
 <div class="photo-edit-buttons"><button data-action="four-corners">✨ 尝试清除四角背景</button><button data-action="mat-undo">↶ 撤销抠图</button></div>
 <div class="photo-edit-buttons"><button data-action="mat-reset">还原本次擦除</button><button data-action="mat-original">恢复导入时原图</button></div>
 <p>在图片背景位置点击可去除相连的近似颜色；换成橡皮擦或恢复画笔修整边缘。<b>适合纯色背景、扫描纸片、贴纸</b>；复杂人物发丝或杂乱背景无法像 AI 模型那样一键精确分离。全程在本机浏览器处理。</p>
 </div>
 <div class="photo-edit-buttons"><button data-action="reset-all">恢复图片原始显示</button></div>
 </aside></div>
 <footer class="photo-edit-footer"><span data-note>画框取景预览</span><div><button data-action="cancel">取消</button><button data-action="apply" class="photo-edit-primary">应用修改</button></div></footer>
 </section>`;
 document.body.append(backdrop);const cvs=backdrop.querySelector('canvas'),c=cvs.getContext('2d');
 const qa=q=>backdrop.querySelector(q),byAction=a=>qa(`[data-action="${a}"]`);
 const pick=qa('[data-field="fit"]'),zoomSlider=qa('[data-field="zoom"]'),zoomValue=qa('[data-zoom-value]'),ratio=qa('[data-field="ratio"]');
 const effectInputs=backdrop.querySelectorAll('[data-effect]'),shadowInputs=backdrop.querySelectorAll('[data-shadow]');
 let ratioValue='free';
 // 所有像素计算都在浏览器 Canvas 本地执行；选区遮罩可撤销。
 function setupMatte(){
  if(matte)return;
  const max=1500,scale=Math.min(1,max/Math.max(img.width,img.height));
  const w=Math.max(1,Math.round(img.width*scale)),h=Math.max(1,Math.round(img.height*scale));
  matBase=document.createElement('canvas');matBase.width=w;matBase.height=h;
  matBase.getContext('2d',{willReadFrequently:true}).drawImage(img,0,0,w,h);
  const src=matBase.getContext('2d',{willReadFrequently:true}).getImageData(0,0,w,h);
  matte={w,h,src,removed:new Uint8Array(w*h)};
  matWork=document.createElement('canvas');matWork.width=w;matWork.height=h;
  matCtx=matWork.getContext('2d',{willReadFrequently:true});
  paintMatte();
 }
 function stashMask(){
  if(!matte)return;
  matHistory.push(matte.removed.slice());
  if(matHistory.length>8)matHistory.shift();
 }
 function paintMatte(){
  if(!matte)return;
  const src=matte.src.data,res=new ImageData(new Uint8ClampedArray(src),matte.w,matte.h);
  for(let i=0;i<matte.removed.length;i++)res.data[i*4+3]=Math.round(src[i*4+3]*(255-matte.removed[i])/255);
  matCtx.putImageData(res,0,0);
  img=matWork;
 }
 function colorFlood(ix,iy,tolerance){
  if(!matte)return;
  const {w,h,src,removed}=matte,pixels=src.data;
  ix=clamp(Math.floor(ix),0,w-1);iy=clamp(Math.floor(iy),0,h-1);
  const start=iy*w+ix,seed=start*4,r=pixels[seed],g=pixels[seed+1],b=pixels[seed+2];
  if(pixels[seed+3]<10)return;
  const lim=3*tolerance*tolerance;
  const seen=new Uint8Array(w*h),queue=new Int32Array(w*h);
  let head=0,tail=1;queue[0]=start;seen[start]=1;
  while(head<tail){
   const p=queue[head++],at=p*4;
   if(pixels[at+3]<10||((pixels[at]-r)**2+(pixels[at+1]-g)**2+(pixels[at+2]-b)**2)>lim)continue;
   removed[p]=255;
   const x=p%w,y=(p-x)/w;
   if(x>0&&!seen[p-1]){seen[p-1]=1;queue[tail++]=p-1}
   if(x<w-1&&!seen[p+1]){seen[p+1]=1;queue[tail++]=p+1}
   if(y>0&&!seen[p-w]){seen[p-w]=1;queue[tail++]=p-w}
   if(y<h-1&&!seen[p+w]){seen[p+w]=1;queue[tail++]=p+w}
  }
 }
 function brushMask(ix,iy,restore){
  if(!matte)return;
  const {w,h,removed}=matte,scale=Number(qa('[data-field="brushsize"]').value)||28,rad=Math.max(2,scale*matte.w/640),rad2=rad*rad;
  const x0=clamp(Math.floor(ix-rad),0,w-1),x1=clamp(Math.ceil(ix+rad),0,w-1);
  const y0=clamp(Math.floor(iy-rad),0,h-1),y1=clamp(Math.ceil(iy+rad),0,h-1);
  for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){
   const dd=(x-ix)**2+(y-iy)**2;
   if(dd>rad2)continue;
   const alpha=dd<rad2*.77?1:Math.max(0,(rad2-dd)/(rad2*.23));
   const i=y*w+x;
   removed[i]=restore?Math.round(removed[i]*(1-alpha)):Math.round(255-(255-removed[i])*(1-alpha));
  }
 }
 function mattePosition(e){
  const p=fromEvent(e);
  return{x:(p.x-view.x)*matte.w/view.w,y:(p.y-view.y)*matte.h/view.h};
 }
 function drawChecker(x,y,w,h){c.fillStyle='#fff';c.fillRect(x,y,w,h);c.fillStyle='#ddd6de';const s=14;c.save();c.beginPath();c.rect(x,y,w,h);c.clip();for(let yy=y;yy<y+h;yy+=s)for(let xx=x;xx<x+w;xx+=s)if((Math.floor((xx-x)/s)+Math.floor((yy-y)/s))%2===0)c.fillRect(xx,yy,s,s);c.restore()}
 function draw(){c.clearRect(0,0,640,500);c.fillStyle='#ede9ef';c.fillRect(0,0,640,500);c.save();
 if(mode==='reframe'||mode==='adjust'||mode==='frame'){
   const pad=draft.stroke?.enabled?Math.ceil(draft.stroke.width||0):0;
   const scale=Math.min(545/Math.max(1,draft.w+pad*2),424/Math.max(1,draft.h+pad*2)),w=draft.w*scale,h=draft.h*scale,x=(640-w)/2,y=(500-h)/2;
   view={x,y,w,h,scale};drawChecker(x,y,w,h);
   c.save();c.translate(x,y);c.scale(scale,scale);paintImageElement(c,draft,img,0,0,scale);c.restore();
   c.strokeStyle='#b19357';c.lineWidth=3;c.strokeRect(x+.5,y+.5,w-1,h-1);
   c.fillStyle='#fff9';c.fillRect(x+8,y+8,112,28);c.fillStyle='#534936';c.font='14px sans-serif';c.fillText('拖动调整位置',x+15,y+27);
 }else if(mode==='cutout'){
   setupMatte();
   const scale=Math.min(570/matte.w,442/matte.h),w=matte.w*scale,h=matte.h*scale,x=(640-w)/2,y=(500-h)/2;
   view={x,y,w,h,scale};drawChecker(x,y,w,h);c.drawImage(matWork,x,y,w,h);
   c.strokeStyle='#b19357';c.lineWidth=2;c.strokeRect(x,y,w,h);
 }else{
   const scale=Math.min(570/img.width,440/img.height),w=img.width*scale,h=img.height*scale,x=(640-w)/2,y=(500-h)/2;
   view={x,y,w,h,scale};drawChecker(x,y,w,h);c.drawImage(img,x,y,w,h);
   const r=cropOf(draft),rx=x+r.x*w,ry=y+r.y*h,rw=r.w*w,rh=r.h*h;
   c.fillStyle='rgba(19,16,30,.55)';c.fillRect(x,y,w,r.y*h);c.fillRect(x,y+r.y*h,w,h-(r.y+r.h)*h);
   c.fillRect(x,y+r.y*h,r.x*w,r.h*h);c.fillRect(x+(r.x+r.w)*w,y+r.y*h,w-(r.x+r.w)*w,r.h*h);
   c.strokeStyle='#fff';c.lineWidth=2.5;c.strokeRect(rx,ry,rw,rh);
   c.strokeStyle='#eecb84';c.lineWidth=3;c.strokeRect(rx+2,ry+2,rw-4,rh-4);
   for(const [xx,yy] of [[rx,ry],[rx+rw,ry],[rx,ry+rh],[rx+rw,ry+rh]]){c.fillStyle='#fff';c.fillRect(xx-7,yy-7,14,14);c.strokeStyle='#8d6835';c.lineWidth=2;c.strokeRect(xx-7,yy-7,14,14)}
 }
 c.restore();pick.value=draft.fit==='contain'?'contain':'cover';zoomSlider.value=draft.zoom||1;zoomValue.textContent=(Number(draft.zoom||1)*100).toFixed(0)+'%';
 }
 function close(){backdrop.remove();document.removeEventListener('keydown',escapeListener,true)}
 function escapeListener(e){if(e.key==='Escape'){e.stopImmediatePropagation();close()}}
 document.addEventListener('keydown',escapeListener,true);
 function setTab(tab){mode=tab;backdrop.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));qa('.pe-reframe').hidden=tab!=='reframe';qa('.pe-crop').hidden=tab!=='crop';qa('.pe-frame').hidden=tab!=='frame';qa('.pe-adjust').hidden=tab!=='adjust';qa('.pe-cutout').hidden=tab!=='cutout';qa('[data-note]').textContent=tab==='crop'?'裁剪源图片：拖动白色框及四角':tab==='frame'?'描边、形状与镜像预览 · 点击应用后保存':tab==='adjust'?'实时调色与阴影预览 · 点击应用后保存':tab==='cutout'?'抠图结果是透明 PNG；仅点击「应用修改」后写入当前书页':'取景：拖动照片或调整缩放';draw()}
 backdrop.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>setTab(b.dataset.tab));
 function applyRatio(value){ratioValue=value;if(value==='free')return;
  const desired=value==='frame'?draft.w/draft.h:Number(value);
  let r=cropOf(draft),x=r.x,y=r.y,w=r.w,h=r.h;
  const normalizedAR=desired*img.height/img.width;
  if(w/h>normalizedAR)w=h*normalizedAR;else h=w/normalizedAR;
  const cx=r.x+r.w/2,cy=r.y+r.h/2;
  x=clamp(cx-w/2,0,1-w);y=clamp(cy-h/2,0,1-h);
  draft.crop={x,y,w,h};draft.offsetX=0;draft.offsetY=0;draft.zoom=1;draw();
 }
 function keepRatio(rect,origin='br'){
   if(ratioValue==='free')return rect;
   const ar=(ratioValue==='frame'?draft.w/draft.h:Number(ratioValue))*img.height/img.width;
   const h=rect.w/ar;let w=rect.w,hh=h;
   if(rect.y+h>1) {hh=1-rect.y;w=hh*ar}
   return{x:rect.x,y:rect.y,w,h:hh};
 }
 function fromEvent(e){const r=cvs.getBoundingClientRect();return{x:(e.clientX-r.left)*640/r.width,y:(e.clientY-r.top)*500/r.height}}
 cvs.addEventListener('pointerdown',e=>{const p=fromEvent(e);
 if(mode==='cutout'){
  setupMatte();const m=mattePosition(e);if(m.x<0||m.y<0||m.x>=matte.w||m.y>=matte.h)return;
  draft.restoreOriginal=false;stashMask();const tool=qa('[data-field="matmode"]').value;
  if(tool==='magic')colorFlood(m.x,m.y,+qa('[data-field="tolerance"]').value);
  else brushMask(m.x,m.y,tool==='restore');
  interaction={kind:'matte-brush',tool};paintMatte();draw();cvs.setPointerCapture(e.pointerId);e.preventDefault();return;
 }
 if(mode==='reframe'||mode==='adjust'||mode==='frame'){interaction={kind:'move-photo',start:p,x:draft.offsetX||0,y:draft.offsetY||0};}
 else{
   const r=cropOf(draft),cx=view.x+r.x*view.w,cy=view.y+r.y*view.h,cw=r.w*view.w,ch=r.h*view.h;
   let kind='new';const d=18;
   for(const [name,xx,yy] of [['nw',cx,cy],['ne',cx+cw,cy],['sw',cx,cy+ch],['se',cx+cw,cy+ch]])if(Math.abs(p.x-xx)<d&&Math.abs(p.y-yy)<d){kind=name;break}
   if(kind==='new'&&p.x>=cx&&p.x<=cx+cw&&p.y>=cy&&p.y<=cy+ch)kind='move-crop';
   interaction={kind,start:p,orig:{...r}};
   if(kind==='new'){const x=clamp((p.x-view.x)/view.w,0,.95),y=clamp((p.y-view.y)/view.h,0,.95);draft.crop={x,y,w:.05,h:.05};interaction.kind='se';interaction.orig={...draft.crop}}
 }
 cvs.setPointerCapture(e.pointerId);e.preventDefault()});
 cvs.addEventListener('pointermove',e=>{if(!interaction)return;
 if(interaction.kind==='matte-brush'){
  if(interaction.tool!=='magic'){
   const pos=mattePosition(e);brushMask(pos.x,pos.y,interaction.tool==='restore');paintMatte();draw();
  }
  e.preventDefault();return;
 }
 const p=fromEvent(e),it=interaction,dx=p.x-it.start.x,dy=p.y-it.start.y;
 if(it.kind==='move-photo'){
   draft.offsetX=it.x+dx/view.scale;draft.offsetY=it.y+dy/view.scale;
   const pos=placement(draft,img);draft.offsetX=clamp(draft.offsetX,-pos.maxX,pos.maxX);draft.offsetY=clamp(draft.offsetY,-pos.maxY,pos.maxY);
 }else{
   const r=it.orig,nx=dx/view.w,ny=dy/view.h;
   if(it.kind==='move-crop') draft.crop={...r,x:clamp(r.x+nx,0,1-r.w),y:clamp(r.y+ny,0,1-r.h)};
   else{
     let lx=r.x,ty=r.y,rx=r.x+r.w,by=r.y+r.h;
     if(it.kind.includes('w'))lx=clamp(r.x+nx,0,rx-.025);
     if(it.kind.includes('e'))rx=clamp(r.x+r.w+nx,lx+.025,1);
     if(it.kind.includes('n'))ty=clamp(r.y+ny,0,by-.025);
     if(it.kind.includes('s'))by=clamp(r.y+r.h+ny,ty+.025,1);
     let draftRect={x:lx,y:ty,w:rx-lx,h:by-ty};
     // 固定比例时由拖动的水平边长计算纵向尺寸，并约束在原图内。
     if(ratioValue!=='free'){
       const ar=(ratioValue==='frame'?draft.w/draft.h:Number(ratioValue))*img.height/img.width;
       const hh=draftRect.w/ar;
       if(it.kind.includes('n')){const fixedBottom=by;draftRect.y=clamp(fixedBottom-hh,0,1);draftRect.h=fixedBottom-draftRect.y;draftRect.w=draftRect.h*ar;draftRect.x=it.kind.includes('w')?rx-draftRect.w:lx}
       else {draftRect.h=Math.min(hh,1-draftRect.y);draftRect.w=draftRect.h*ar;draftRect.x=it.kind.includes('w')?rx-draftRect.w:lx}
       draftRect.x=clamp(draftRect.x,0,1-draftRect.w);
     }
     draft.crop=draftRect;
   }
   draft.offsetX=0;draft.offsetY=0;
 }
 draw();e.preventDefault()});
 cvs.addEventListener('pointerup',()=>interaction=null);cvs.addEventListener('pointercancel',()=>interaction=null);
 pick.onchange=()=>{draft.fit=pick.value;draft.offsetX=0;draft.offsetY=0;draw()};
 zoomSlider.oninput=()=>{draft.zoom=Number(zoomSlider.value);draft.offsetX=clamp(draft.offsetX||0,-placement(draft,img).maxX,placement(draft,img).maxX);draft.offsetY=clamp(draft.offsetY||0,-placement(draft,img).maxY,placement(draft,img).maxY);draw()};
 ratio.onchange=()=>applyRatio(ratio.value);
 for(const name of ['close','cancel'])byAction(name).onclick=close;
 byAction('center').onclick=()=>{draft.offsetX=0;draft.offsetY=0;draw()};
 byAction('fit').onclick=()=>{draft.fit='contain';draft.zoom=1;draft.offsetX=0;draft.offsetY=0;draw()};
 byAction('reset-crop').onclick=()=>{draft.crop={x:0,y:0,w:1,h:1};draft.offsetX=0;draft.offsetY=0;ratio.value='free';ratioValue='free';draw()};
 byAction('reset-all').onclick=()=>{draft.crop={x:0,y:0,w:1,h:1};draft.fit='contain';draft.zoom=1;draft.offsetX=0;draft.offsetY=0;ratio.value='free';ratioValue='free';draft.adjustments={brightness:100,contrast:100,saturation:100,warmth:0,sepia:0,fade:0,grayscale:0,vignette:0,blur:0};draft.stroke={enabled:false,width:14,color:'#ffffff'};draft.frame={shape:'none',radius:36,flipX:false,flipY:false};draft.shadow={enabled:false,blur:15,x:5,y:9,opacity:.28,color:'#32263c'};syncEffectInputs();syncFrameInputs();draw()};
 function syncEffectInputs(){
  effectInputs.forEach(input=>{const key=input.dataset.effect,val=draft.adjustments[key];input.value=val;const unit=key==='warmth'?'':key==='blur'?'px':'%';qa('[data-value="'+key+'"]').textContent=val+unit});
  qa('[data-field="shadowEnabled"]').checked=draft.shadow.enabled;
  shadowInputs.forEach(input=>{const key=input.dataset.shadow;const value=key==='opacity'?Math.round(draft.shadow.opacity*100):draft.shadow[key];input.value=value;
   if(key!=='color')qa('[data-value="'+key+'"]').textContent=value+(key==='opacity'?'%':'')});
  qa('.pe-shadow-controls').classList.toggle('is-disabled',!draft.shadow.enabled);
 }
 function syncFrameInputs(){
  qa('[data-field="strokeEnabled"]').checked=draft.stroke.enabled;
  qa('[data-stroke="width"]').value=draft.stroke.width;
  qa('[data-value="strokeWidth"]').textContent=draft.stroke.width+'px';
  qa('[data-stroke="color"]').value=draft.stroke.color;
  qa('.pe-stroke-controls').classList.toggle('is-disabled',!draft.stroke.enabled);
  qa('[data-frame="shape"]').value=draft.frame.shape;
  qa('[data-frame="radius"]').value=draft.frame.radius;
  qa('[data-value="frameRadius"]').textContent=draft.frame.radius+'px';
  qa('.pe-radius-row').hidden=draft.frame.shape!=='rounded';
  byAction('flip-x').classList.toggle('active',draft.frame.flipX);
  byAction('flip-y').classList.toggle('active',draft.frame.flipY);
 }
 effectInputs.forEach(input=>input.addEventListener('input',()=>{draft.adjustments[input.dataset.effect]=Number(input.value);syncEffectInputs();draw()}));
 qa('[data-field="shadowEnabled"]').addEventListener('change',e=>{draft.shadow.enabled=e.target.checked;syncEffectInputs();draw()});
 shadowInputs.forEach(input=>input.addEventListener('input',()=>{const key=input.dataset.shadow;draft.shadow[key]=key==='color'?input.value:key==='opacity'?Number(input.value)/100:Number(input.value);syncEffectInputs();draw()}));
 qa('[data-field="strokeEnabled"]').addEventListener('change',e=>{draft.stroke.enabled=e.target.checked;syncFrameInputs();draw()});
 qa('[data-stroke="width"]').addEventListener('input',e=>{draft.stroke.width=Number(e.target.value);syncFrameInputs();draw()});
 qa('[data-stroke="color"]').addEventListener('input',e=>{draft.stroke.color=e.target.value;syncFrameInputs();draw()});
 backdrop.querySelectorAll('[data-swatch]').forEach(btn=>btn.addEventListener('click',()=>{draft.stroke.enabled=true;draft.stroke.color=btn.dataset.swatch;syncFrameInputs();draw()}));
 qa('[data-frame="shape"]').addEventListener('change',e=>{draft.frame.shape=e.target.value;syncFrameInputs();draw()});
 qa('[data-frame="radius"]').addEventListener('input',e=>{draft.frame.radius=Number(e.target.value);syncFrameInputs();draw()});
 byAction('flip-x').onclick=()=>{draft.frame.flipX=!draft.frame.flipX;syncFrameInputs();draw()};
 byAction('flip-y').onclick=()=>{draft.frame.flipY=!draft.frame.flipY;syncFrameInputs();draw()};
 const applyPreset=p=>{draft.adjustments={brightness:100,contrast:100,saturation:100,warmth:0,sepia:0,fade:0,grayscale:0,vignette:0,blur:0,...p};syncEffectInputs();draw()};
 byAction('effect-reset').onclick=()=>applyPreset({});
 byAction('effect-warm').onclick=()=>applyPreset({brightness:105,contrast:96,saturation:113,warmth:38,vignette:18});
 byAction('effect-soft').onclick=()=>applyPreset({brightness:107,contrast:87,saturation:77,warmth:22,sepia:22,fade:18});
 byAction('effect-film').onclick=()=>applyPreset({brightness:102,contrast:112,saturation:88,warmth:18,fade:24,vignette:36});
 byAction('effect-fresh').onclick=()=>applyPreset({brightness:110,contrast:95,saturation:116,warmth:-20,fade:10});
 byAction('effect-bw').onclick=()=>applyPreset({brightness:104,contrast:118,saturation:0,grayscale:100,vignette:28});
 syncEffectInputs();syncFrameInputs();
 const toolSelect=qa('[data-field="matmode"]');
 for(const name of ['tolerance','brushsize']){
  const field=qa('[data-field="'+name+'"]');
  field.oninput=()=>qa('[data-mat-'+(name==='tolerance'?'tolerance':'brush')+'-label]').textContent=field.value;
 }
 byAction('four-corners').onclick=()=>{
  setupMatte();draft.restoreOriginal=false;stashMask();const {w,h}=matte,t=+qa('[data-field="tolerance"]').value;
  for(const [x,y] of [[1,1],[w-2,1],[1,h-2],[w-2,h-2]])colorFlood(x,y,t);
  paintMatte();draw();status('已尝试清除四角相连的近似颜色背景');
 };
 byAction('mat-undo').onclick=()=>{if(!matte||!matHistory.length)return;matte.removed=matHistory.pop();paintMatte();draw()};
 byAction('mat-reset').onclick=()=>{if(!matte)return;stashMask();matte.removed.fill(0);paintMatte();draw()};
 byAction('mat-original').onclick=()=>{
  if(!original.cutoutOriginalSrc){alert('这张图片还没有抠图前的源图备份');return}
  if(!confirm('恢复到首次抠图前的图像？点击“应用修改”才会真正保存。'))return;
  getImg(original.cutoutOriginalSrc).then(source=>{if(!source)return;img=source;matte=null;matHistory=[];matBase=null;matWork=null;matCtx=null;draft.restoreOriginal=true;draw()});
 };
 byAction('apply').onclick=()=>{
  if(activeSlide()!==targetSlide||!targetSlide.elements.find(e=>e.id===targetId)){status('当前页已经切换，请重新选择图片');close();return}
  const live=targetSlide.elements.find(e=>e.id===targetId);selected=targetSlide.elements.indexOf(live);
  const matSrc=matte&&!draft.restoreOriginal?matWork.toDataURL('image/png'):null;
  modify(()=>{
   Object.assign(live,{crop:cropOf(draft),fit:draft.fit,zoom:draft.zoom||1,offsetX:draft.offsetX||0,offsetY:draft.offsetY||0,adjustments:{...draft.adjustments},shadow:{...draft.shadow},stroke:{...draft.stroke},frame:{...draft.frame}});
   if(draft.restoreOriginal){live.src=original.cutoutOriginalSrc;delete live.cutoutOriginalSrc}
   if(matSrc){
    // 保留首次导入图片的引用，供日后恢复；不覆盖原文件。
    if(!live.cutoutOriginalSrc)live.cutoutOriginalSrc=live.src;
    live.src=matSrc;live.fit='contain';live.zoom=1;live.offsetX=0;live.offsetY=0;
   }
  });
  close();status(matte?'✓ 抠图结果已保存为透明 PNG（原图另行保留）':(mode==='frame'?'✓ 照片描边与形状已保存（原图不变）':mode==='adjust'?'✓ 图片调色与阴影已保存（原图不变）':'✓ 图片裁剪与取景已保存（保留原图）'))
 };
 setTab(['adjust','frame','crop','cutout','reframe'].includes(initialMode)?initialMode:'reframe');
 });
}

function rotatePoint(el,x,y){const rad=(el.rotation||0)*Math.PI/180,cx=el.x+el.w/2,cy=el.y+el.h/2,dx=x-cx,dy=y-cy;return {x:cx+Math.cos(rad)*dx-Math.sin(rad)*dy,y:cy+Math.sin(rad)*dx+Math.cos(rad)*dy}}
function localPoint(el,p){const rad=-(el.rotation||0)*Math.PI/180,cx=el.x+el.w/2,cy=el.y+el.h/2,dx=p.x-cx,dy=p.y-cy;return{x:cx+Math.cos(rad)*dx-Math.sin(rad)*dy,y:cy+Math.sin(rad)*dx+Math.cos(rad)*dy}}
function handles(el){return{
 rot:rotatePoint(el,el.x+el.w/2,el.y-48),
 size:rotatePoint(el,el.x+el.w,el.y+el.h),
 width:rotatePoint(el,el.x+el.w,el.y+el.h/2),
 height:rotatePoint(el,el.x+el.w/2,el.y+el.h)
}}
function linesOf(c,text,maxWidth,fontSize){const result=[];for(const para of String(text||'').split('\n')){if(!para){result.push('');continue}let line='';for(const char of para){const test=line+char;if(c.measureText(test).width>maxWidth&&line){result.push(line);line=char}else line=test}result.push(line)}return result}
function paintSlide(slide,target,hidePlaceholders=false){const c=target.getContext('2d');c.save();c.setTransform(target.width/W,0,0,target.height/H,0,0);c.clearRect(0,0,W,H);c.fillStyle=slide.bg||'#f7f2e9';c.fillRect(0,0,W,H);
 for(const el of slide.elements){if(el.hidden||el.interactiveOnly||(hidePlaceholders&&el.type==='placeholder'))continue;const opacity=el.opacity??1;c.save();c.translate(el.x+el.w/2,el.y+el.h/2);c.rotate((el.rotation||0)*Math.PI/180);c.globalAlpha=opacity;const x=-el.w/2,y=-el.h/2;
 if(el.type==='text') {const size=el.size||48;c.fillStyle=el.color||'#41332c';c.font=`${el.weight||'normal'} ${size}px ${el.family||serif}`;c.textBaseline='top';const m=el.align||'left';c.textAlign=m;const lx=m==='center'?0:m==='right'?el.w/2:-el.w/2;const lines=linesOf(c,el.text,el.w,size);const lh=size*1.33;lines.forEach((line,i)=>{if(i*lh+size>el.h+lh/2)return;c.fillText(line,lx,y+i*lh)});
 }else if(el.type==='shape'){const r=clamp(el.radius||0,0,Math.min(el.w,el.h)/2);c.beginPath();if(el.shape==='circle')c.ellipse(0,0,el.w/2,el.h/2,0,0,Math.PI*2);else c.roundRect(x,y,el.w,el.h,r);if(el.fill&&el.fill!=='transparent'){c.fillStyle=el.fill;c.fill()}if(el.stroke){c.strokeStyle=el.stroke;c.lineWidth=5;c.stroke()}
 }else if(el.type==='placeholder'){c.fillStyle='#e7dfd4';c.fillRect(x,y,el.w,el.h);c.setLineDash([14,11]);c.lineWidth=4;c.strokeStyle='#b9a695';c.strokeRect(x+4,y+4,el.w-8,el.h-8);c.setLineDash([]);c.textAlign='center';c.textBaseline='middle';c.fillStyle='#988877';c.font=`${Math.min(27,el.w/10)}px ${sans}`;c.fillText('＋ 放置照片',0,0);
 }else if(el.type==='image'){const img=imgResolved.get(el.src);if(img)paintImageElement(c,el,img,x,y,target.width/W);else {c.fillStyle='#e3dcd6';c.fillRect(x,y,el.w,el.h)}}
 else if(el.type==='video'||el.type==='audio'){
   c.fillStyle='#f8f0e3';c.fillRect(x,y,el.w,el.h);
   if(el.type==='video'){
     c.fillStyle='#1e1820';c.fillRect(x+10,y+10,el.w-20,Math.max(20,el.h-60));
     const poster=imgResolved.get(el.poster);if(poster){c.save();c.beginPath();c.rect(x+10,y+10,el.w-20,Math.max(20,el.h-60));c.clip();const scale=Math.max((el.w-20)/poster.width,Math.max(20,el.h-60)/poster.height);c.drawImage(poster,x+el.w/2-poster.width*scale/2,y+10+(el.h-60)/2-poster.height*scale/2,poster.width*scale,poster.height*scale);c.restore()}
     c.fillStyle='#ffffffd9';c.beginPath();c.arc(0,-20,Math.min(54,el.w/7),0,Math.PI*2);c.fill();c.fillStyle='#4b3343';c.beginPath();c.moveTo(-13,-43);c.lineTo(27,-20);c.lineTo(-13,3);c.closePath();c.fill();
     c.fillStyle='#59444c';c.font=`${Math.min(27,el.w/14)}px ${serif}`;c.textAlign='center';c.textBaseline='middle';c.fillText(String(el.title||'VIDEO MEMORY').slice(0,24),0,el.h/2-27,el.w-36);
   }else{
     c.fillStyle='#dbcab4';c.fillRect(x+10,y+10,el.w-20,el.h-20);c.textAlign='center';c.textBaseline='middle';
     if(el.style==='vinyl'){c.fillStyle='#2c2631';c.beginPath();c.arc(0,-22,Math.min(el.w,el.h)*.32,0,Math.PI*2);c.fill();c.strokeStyle='#74697b';for(const f of [.25,.29,.32]){c.beginPath();c.arc(0,-22,Math.min(el.w,el.h)*f,0,Math.PI*2);c.stroke()}c.fillStyle='#cead7d';c.beginPath();c.arc(0,-22,24,0,Math.PI*2);c.fill()}
     else if(el.style==='postcard'){c.fillStyle='#faf4e7';c.fillRect(x+32,y+28,el.w-64,el.h-84);c.fillStyle='#957e69';c.font=`${Math.min(55,el.w/8)}px ${serif}`;c.fillText('✉',0,-8)}
     else{c.fillStyle='#504552';c.fillRect(x+32,y+36,el.w-64,el.h-100);c.fillStyle='#efe5ce';c.fillRect(x+65,y+66,el.w-130,Math.max(30,el.h*.25));c.fillStyle='#8e7a5e';for(const sx of [-el.w/5,el.w/5]){c.beginPath();c.arc(sx,16,Math.min(32,el.w/12),0,Math.PI*2);c.fill()}}
     c.fillStyle='#4d3d44';c.font=`${Math.min(28,el.w/13)}px ${serif}`;c.textAlign='center';c.fillText('♫ '+String(el.title||'声音纪念').slice(0,18),0,el.h/2-30,el.w-32);
   }
 } c.restore();
 }
 c.restore();
 return target;
}
async function drawSlide(slide,target,hidePlaceholders=false){
 // Resolve images once before painting; a pointer drag can then repaint entirely synchronously.
 const sources=new Set();
 for(const el of slide.elements){if(el.hidden||el.interactiveOnly)continue;
  if(el.type==='image'&&el.src)sources.add(el.src);
  if(el.type==='video'&&el.poster)sources.add(el.poster);
 }
 await Promise.all([...sources].map(getImg));
 return paintSlide(slide,target,hidePlaceholders);
}
async function render(slide,hidePlaceholders=false,scale=1){const c=document.createElement('canvas');c.width=Math.round(W*scale);c.height=Math.round(H*scale);return drawSlide(slide,c,hidePlaceholders)}
// V12.7 selection is transient. Persisted groupId lives on original elements only,
// so existing JSON, ZIP backups and the 3D exporter remain backwards-compatible.
function selectedEntries(){return activeSlide().elements.map((el,i)=>({el,i})).filter(({el})=>selectedIds.has(el.id))}
function selectedEditable(){return selectedEntries().filter(({el})=>!el.locked)}
function selectElements(indices,{extend=false,expandGroup=true}={}){
 const arr=activeSlide().elements;
 if(!extend)selectedIds.clear();
 for(const idx of indices){const el=arr[idx];if(!el)continue;
  const ids=expandGroup&&el.groupId?arr.filter(e=>e.groupId===el.groupId).map(e=>e.id):[el.id];
  const remove=extend&&ids.every(id=>selectedIds.has(id));
  ids.forEach(id=>remove?selectedIds.delete(id):selectedIds.add(id));
 }
 selected=arr.findIndex(e=>selectedIds.has(e.id));
 if(indices.length&&!extend&&arr[indices.at(-1)]?.id)selected=indices.at(-1);
}
function resetSelection(){selectedIds.clear();selected=-1}
function selectAllEditable(){selectElements(activeSlide().elements.map((e,i)=>e.hidden||e.locked?-1:i).filter(i=>i>=0));properties();schedule()}
function multiBounds(items){
 if(!items.length)return null;
 const rects=items.map(({el})=>{const pts=[[el.x,el.y],[el.x+el.w,el.y],[el.x+el.w,el.y+el.h],[el.x,el.y+el.h]].map(([x,y])=>rotatePoint(el,x,y));return {l:Math.min(...pts.map(p=>p.x)),t:Math.min(...pts.map(p=>p.y)),r:Math.max(...pts.map(p=>p.x)),b:Math.max(...pts.map(p=>p.y))}});
 return {l:Math.min(...rects.map(r=>r.l)),t:Math.min(...rects.map(r=>r.t)),r:Math.max(...rects.map(r=>r.r)),b:Math.max(...rects.map(r=>r.b))};
}
// V12.8: multi-element transforms keep every element editable; no flattening.
function groupTransformOrigins(entries){return entries.map(({el})=>({el,x:el.x,y:el.y,w:el.w,h:el.h,rotation:el.rotation||0,size:el.size,
 centerX:el.x+el.w/2,centerY:el.y+el.h/2}));}
function applyGroupTransform({angle=0,scale=1}={}){
 const entries=selectedEditable();if(entries.length<2){status('至少选择两个未锁定元素才能整体变换');return}
 const bounds=multiBounds(entries),cx=(bounds.l+bounds.r)/2,cy=(bounds.t+bounds.b)/2;
 const rad=angle*Math.PI/180,co=Math.cos(rad),si=Math.sin(rad);
 modify(()=>{for(const o of groupTransformOrigins(entries)){
  const dx=o.centerX-cx,dy=o.centerY-cy;
  const ncx=cx+scale*(dx*co-dy*si),ncy=cy+scale*(dx*si+dy*co);
  o.el.w=Math.max(1,o.w*scale);o.el.h=Math.max(1,o.h*scale);
  o.el.x=ncx-o.el.w/2;o.el.y=ncy-o.el.h/2;
  o.el.rotation=Math.round((o.rotation+angle)*10)/10;
  if(o.el.type==='text'&&Number.isFinite(o.size))o.el.size=Math.max(8,Math.round(o.size*scale*10)/10);
 }});
 status(angle?`✓ 已整体旋转 ${angle}°`:`✓ 已整体缩放 ${Math.round(scale*100)}%`)
}
function groupSelected(){const entries=selectedEditable();if(entries.length<2){status('请用 Shift 或 Ctrl 多选两个以上图层');return}
 modify(()=>{const id='grp-'+rand();entries.forEach(({el})=>el.groupId=id)});status('✓ 已组合，可一起移动、复制、对齐；仍能单独编辑每个元素')}
function ungroupSelected(){const entries=selectedEntries();const ids=new Set(entries.map(({el})=>el.groupId).filter(Boolean));if(!ids.size)return;
 modify(()=>{activeSlide().elements.forEach(e=>{if(ids.has(e.groupId))delete e.groupId})});status('✓ 已取消组合')}
function setSelectedLock(locked){const entries=selectedEntries();if(!entries.length)return;
 if(!locked&&entries.some(({el})=>el.role==='imported-artwork')&&!confirm('解锁整页底图后可误移动或删除它。确定继续吗？'))return;
 modify(()=>entries.forEach(({el})=>el.locked=locked));status(locked?'✓ 已锁定图层':'✓ 已解锁图层')}
function removeSelected(){const entries=selectedEditable();if(!entries.length)return;
 const ids=new Set(entries.map(({el})=>el.id));modify(()=>{activeSlide().elements=activeSlide().elements.filter(e=>!ids.has(e.id));resetSelection()})}
// V12.9: stable stacking operations. Locked artwork is an immovable boundary.
function reorderLayers(kind){
 const arr=activeSlide().elements,ids=new Set(selectedEditable().map(({el})=>el.id));
 if(!ids.size){status('请先选择未锁定的图层');return}
 const before=arr.map(e=>e.id).join('|');
 const movable=el=>!el.locked;
 const result=arr.slice();
 if(kind==='up'){
  for(let i=result.length-2;i>=0;i--)if(ids.has(result[i].id)&&movable(result[i])&&!ids.has(result[i+1].id)&&movable(result[i+1]))[result[i],result[i+1]]=[result[i+1],result[i]];
 }else if(kind==='down'){
  for(let i=1;i<result.length;i++)if(ids.has(result[i].id)&&movable(result[i])&&!ids.has(result[i-1].id)&&movable(result[i-1]))[result[i],result[i-1]]=[result[i-1],result[i]];
 }else{
  // Move only inside unlocked stretches, never across a locked layer.
  for(let start=0;start<result.length;){
   if(!movable(result[start])){start++;continue}
   let end=start;while(end<result.length&&movable(result[end]))end++;
   const segment=result.slice(start,end),picked=segment.filter(e=>ids.has(e.id)),rest=segment.filter(e=>!ids.has(e.id));
   result.splice(start,end-start,...(kind==='front'?[...rest,...picked]:[...picked,...rest]));start=end;
  }
 }
 if(result.map(e=>e.id).join('|')===before){status('图层已经到达可移动的边界');return}
 modify(()=>{activeSlide().elements=result;selected=arr.findIndex(e=>ids.has(e.id));selected=activeSlide().elements.findIndex(e=>ids.has(e.id))});
 status(({up:'✓ 图层已上移一层',down:'✓ 图层已下移一层',front:'✓ 图层已置于最上层',back:'✓ 图层已置于最下层'})[kind]);
}
function layerOrderToolbar(){
 const box=document.createElement('div');box.className='v129-order';
 const title=document.createElement('div');title.className='v129-order-title';title.textContent='图层顺序 · 多选也适用';box.append(title);
 for(const [label,kind] of [['置顶','front'],['上移','up'],['下移','down'],['置底','back']]){
  const b=document.createElement('button');b.type='button';b.textContent=label;b.onclick=()=>reorderLayers(kind);box.append(b);
 }
 const hint=document.createElement('small');hint.textContent='锁定图层不会移动，也不会被其他图层跨越。';box.append(hint);return box;
}
function copySelection(){localClipboard=selectedEditable().map(({el})=>clone(el));if(localClipboard.length)status('✓ 已复制 '+localClipboard.length+' 个元素；Ctrl+V 可粘贴到另一书页')}
let pasteNumber=0;
function pasteSelection(){if(!localClipboard.length)return;pasteNumber=(pasteNumber%8)+1;
 const remap=new Map();const items=localClipboard.map(el=>{const out=clone(el);out.id=rand();out.x+=pasteNumber*18;out.y+=pasteNumber*18;out.locked=false;
  if(out.groupId){if(!remap.has(out.groupId))remap.set(out.groupId,'grp-'+rand());out.groupId=remap.get(out.groupId)}return out});
 modify(()=>{activeSlide().elements.push(...items);selectElements(items.map(e=>activeSlide().elements.indexOf(e)),{expandGroup:false})});changeTab('layers');status('✓ 已粘贴 '+items.length+' 个元素')}
function duplicateEl(){copySelection();pasteSelection()}
function alignSelection(kind){const entries=selectedEditable();if(!entries.length)return;
 const bounds=multiBounds(entries), centerX=(bounds.l+bounds.r)/2,centerY=(bounds.t+bounds.b)/2;
 const ref=entries.length===1?{l:0,r:W,t:0,b:H}:bounds;
 const goalX=kind==='left'?ref.l:kind==='hcenter'?(ref.l+ref.r)/2:ref.r;
 const goalY=kind==='top'?ref.t:kind==='vcenter'?(ref.t+ref.b)/2:ref.b;
 modify(()=>entries.forEach(item=>{const r=multiBounds([item]);if(['left','hcenter','right'].includes(kind))item.el.x+=goalX-(kind==='left'?r.l:kind==='hcenter'?(r.l+r.r)/2:r.r);else item.el.y+=goalY-(kind==='top'?r.t:kind==='vcenter'?(r.t+r.b)/2:r.b)}));status('✓ 已对齐')}
function distributeSelection(axis){const entries=selectedEditable();if(entries.length<3){status('至少选择 3 个元素才能等间距分布');return}
 const ordered=entries.map(item=>({...item,b:multiBounds([item])})).sort((a,b)=>axis==='x'?a.b.l-b.b.l:a.b.t-b.b.t);
 const first=ordered[0].b,last=ordered.at(-1).b;
 const width=axis==='x'?last.r-first.l:last.b-first.t;
 const total=ordered.reduce((sum,x)=>sum+(axis==='x'?x.b.r-x.b.l:x.b.b-x.b.t),0);
 const space=(width-total)/(ordered.length-1);if(space<0){status('元素发生重叠，无法等间距排布');return}
 modify(()=>{let cursor=axis==='x'?first.l:first.t;ordered.forEach(item=>{const pos=axis==='x'?item.b.l:item.b.t;item.el[axis==='x'?'x':'y']+=cursor-pos;cursor+=(axis==='x'?item.b.r-item.b.l:item.b.b-item.b.t)+space})});status('✓ 已等间距分布')}
function selectionToolbar(){const row=document.createElement('div');row.className='v127-actions';
 const toggle=document.createElement('button');toggle.type='button';toggle.textContent=multiLayerMode?'多选模式 ✓':'多选模式';toggle.setAttribute('aria-pressed',String(multiLayerMode));toggle.title='手机可开启多选模式，再逐个轻点下面的图层；电脑也可按住 Shift / Ctrl 多选';toggle.onclick=()=>{multiLayerMode=!multiLayerMode;if(multiLayerMode)resetSelection();properties();status(multiLayerMode?'已开启图层多选，可依次点击图层':'已关闭图层多选')};row.append(toggle);
 const buttons=[['全选',selectAllEditable],['组合',groupSelected],['取消组合',ungroupSelected],['锁定',()=>setSelectedLock(true)],['解锁',()=>setSelectedLock(false)],['复制',copySelection],['粘贴',pasteSelection],['批量换图',startImageReplace]];
 for(const [title,fn] of buttons){const b=document.createElement('button');b.type='button';b.textContent=title;b.onclick=fn;row.append(b)}return row}
function transformToolbar(){
 const box=document.createElement('div');box.className='v128-transform';
 const title=document.createElement('div');title.className='v128-transform-label';title.textContent='多图层整体变换（保持独立图层）';box.append(title);
 for(const [name,fn] of [['↶ 旋转 -15°',()=>applyGroupTransform({angle:-15})],['↷ 旋转 +15°',()=>applyGroupTransform({angle:15})],['缩小 10%',()=>applyGroupTransform({scale:.9})],['放大 10%',()=>applyGroupTransform({scale:1.1})]]){
  const b=document.createElement('button');b.type='button';b.textContent=name;b.onclick=fn;box.append(b)
 }return box
}
function alignmentToolbar(){const box=document.createElement('div');box.className='v127-align';const title=document.createElement('div');title.className='v127-align-label';title.textContent='对齐 / 分布';box.append(title);
 for(const [name,kind] of [['左','left'],['水平中','hcenter'],['右','right'],['上','top'],['垂直中','vcenter'],['下','bottom']]){const b=document.createElement('button');b.textContent=name;b.onclick=()=>alignSelection(kind);box.append(b)}
 for(const [name,axis] of [['横向等距','x'],['纵向等距','y']]){const b=document.createElement('button');b.textContent=name;b.onclick=()=>distributeSelection(axis);box.append(b)}return box}
let snapGuides=[],multiLayerMode=false;
function snapMove(m,dx,dy,bypass){snapGuides=[];if(bypass)return{x:dx,y:dy};const targets=m.targets||[],b=m.bounds;
 const xTargets=[0,W/2,W],yTargets=[0,H/2,H];
 for(const t of targets){xTargets.push(t.l,(t.l+t.r)/2,t.r);yTargets.push(t.t,(t.t+t.b)/2,t.b)}
 let correctionX=0,correctionY=0,bestX=9,bestY=9;const anchorsX=[b.l,(b.l+b.r)/2,b.r],anchorsY=[b.t,(b.t+b.b)/2,b.b];
 for(const a of anchorsX)for(const v of xTargets){const d=v-(a+dx);if(Math.abs(d)<bestX){bestX=Math.abs(d);correctionX=d;snapGuides=snapGuides.filter(g=>g.axis!=='x');snapGuides.push({axis:'x',value:v})}}
 for(const a of anchorsY)for(const v of yTargets){const d=v-(a+dy);if(Math.abs(d)<bestY){bestY=Math.abs(d);correctionY=d;snapGuides=snapGuides.filter(g=>g.axis!=='y');snapGuides.push({axis:'y',value:v})}}
 return{x:dx+correctionX,y:dy+correctionY};
}
function groupHandles(bounds){return {rot:{x:(bounds.l+bounds.r)/2,y:bounds.t-53},size:{x:bounds.r,y:bounds.b}}}
function paintMarquee(){
 if(!move||move.mode!=='marquee')return;
 const x=Math.min(move.start.x,move.end.x),y=Math.min(move.start.y,move.end.y);
 const w=Math.abs(move.end.x-move.start.x),h=Math.abs(move.end.y-move.start.y);
 ctx.save();ctx.fillStyle='rgba(118,73,164,.12)';ctx.strokeStyle='#7649a4';ctx.lineWidth=2;ctx.setLineDash([8,5]);ctx.fillRect(x,y,w,h);ctx.strokeRect(x,y,w,h);ctx.restore();
}
function paintSelection(){
 const entries=selectedEntries();if(!entries.length)return;
 ctx.save();ctx.lineWidth=3;ctx.strokeStyle='#cb4f59';ctx.setLineDash([10,7]);
 for(const {el} of entries){if(el.hidden)continue;ctx.save();ctx.translate(el.x+el.w/2,el.y+el.h/2);ctx.rotate((el.rotation||0)*Math.PI/180);ctx.strokeStyle=el.locked?'#888':'#cb4f59';ctx.strokeRect(-el.w/2,-el.h/2,el.w,el.h);ctx.restore()}
 ctx.restore();
 if(entries.length===1){const el=entries[0].el;if(!el.locked&&!el.hidden){const a=handles(el),p=rotatePoint(el,el.x+el.w/2,el.y);ctx.save();ctx.setLineDash([]);ctx.strokeStyle='#fff';ctx.lineWidth=4;ctx.fillStyle='#df565e';ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(a.rot.x,a.rot.y);ctx.stroke();ctx.beginPath();ctx.arc(a.rot.x,a.rot.y,15,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.fillRect(a.size.x-14,a.size.y-14,28,28);ctx.strokeRect(a.size.x-14,a.size.y-14,28,28);ctx.restore();
  if(el.type==='image'){ctx.save();ctx.setLineDash([]);ctx.lineWidth=3;ctx.strokeStyle='#fff';ctx.fillStyle='#8e54af';for(const pos of [a.width,a.height]){ctx.fillRect(pos.x-12,pos.y-12,24,24);ctx.strokeRect(pos.x-12,pos.y-12,24,24)}ctx.restore()}
 }}else{const b=multiBounds(entries);if(b){ctx.save();ctx.lineWidth=2;ctx.strokeStyle='#7649a4';ctx.setLineDash([7,5]);ctx.strokeRect(b.l-5,b.t-5,b.r-b.l+10,b.b-b.t+10);ctx.restore();
  if(selectedEditable().length===entries.length&&entries.length>=2){const handles=groupHandles(b),mid={x:(b.l+b.r)/2,y:b.t};
   ctx.save();ctx.setLineDash([]);ctx.lineWidth=4;ctx.strokeStyle='#fff';ctx.fillStyle='#7649a4';
   ctx.beginPath();ctx.moveTo(mid.x,mid.y);ctx.lineTo(handles.rot.x,handles.rot.y);ctx.stroke();
   ctx.beginPath();ctx.arc(handles.rot.x,handles.rot.y,16,0,Math.PI*2);ctx.fill();ctx.stroke();
   ctx.fillStyle='#4e9b86';ctx.fillRect(handles.size.x-15,handles.size.y-15,30,30);ctx.strokeRect(handles.size.x-15,handles.size.y-15,30,30);ctx.restore();
  }
 }}
 if(snapGuides.length){ctx.save();ctx.strokeStyle='#d94e9d';ctx.lineWidth=2;ctx.setLineDash([6,4]);for(const guide of snapGuides){ctx.beginPath();if(guide.axis==='x'){ctx.moveTo(guide.value,0);ctx.lineTo(guide.value,H)}else{ctx.moveTo(0,guide.value);ctx.lineTo(W,guide.value)}ctx.stroke()}ctx.restore()}
}
function redrawLive(){
 // Every pointer frame is drawn immediately, without 85ms throttling or async image decoding.
 ++seq;paintSlide(activeSlide(),canvas);paintSelection();paintMarquee();
}
async function redraw(){
 const id=++seq,which=current,slide=activeSlide();
 const tmp=await render(slide);if(id!==seq||which!==current)return;
 ctx.clearRect(0,0,W,H);ctx.drawImage(tmp,0,0);paintSelection();paintMarquee();
}
let drawTimer=null;function schedule(){clearTimeout(drawTimer);drawTimer=setTimeout(()=>{redraw();if(current>=0)drawThumbnail(current);else drawSpecialThumbnail(current)},85)}
function getSlideLabel(i){return i===-1?'封面 · 可编辑':i===-2?'封底 · 可编辑':`第 ${i+1} 页 · ${i%2?'右页':'左页'}`}
/* V12.17.1: render thumbnail at retina resolution instead of upscaling a 100px canvas. */
function prepareThumbnail(c){
 const displayWidth = c.getBoundingClientRect().width || c.parentElement?.clientWidth || 160;
 const dpr=Math.min(2.2,Math.max(1.7,window.devicePixelRatio||1));
 const w=Math.max(256,Math.min(480,Math.round(displayWidth*dpr)));
 const h=Math.round(w*H/W);
 if(c.width!==w||c.height!==h){c.width=w;c.height=h}
 return c;
}
async function drawSpecialThumbnail(key){
 const c=$('slideList').querySelector(`canvas[data-special="${key}"]`);
 if(!c)return;
 const slide=key===-1?doc.cover:doc.back;
 prepareThumbnail(c);
 const painted=await render(slide,false,c.width/W);
 if(!c.isConnected||c.dataset.special!==String(key))return;
 c.getContext('2d').drawImage(painted,0,0,c.width,c.height);
}
async function drawThumbnail(i){
 const c=$('slideList').querySelector(`canvas[data-slide="${i}"]`);
 if(!c||!doc.slides[i])return;
 prepareThumbnail(c);
 const painted=await render(doc.slides[i],false,c.width/W);
 if(!c.isConnected||c.dataset.slide!==String(i))return;
 const ct=c.getContext('2d');ct.clearRect(0,0,c.width,c.height);
 ct.drawImage(painted,0,0,c.width,c.height);
}
async function drawThumbnails(){
 // Serial drawing keeps memory pressure modest in long (80-page) projects.
 for(let i=0;i<doc.slides.length;i++)await drawThumbnail(i);
}
function renderThumbs(){
 const list=$('slideList');list.replaceChildren();
 const addSpecial=(key,title)=>{
  const b=document.createElement('button');b.className='slide-item'+(current===key?' active':'');
  const thumb=document.createElement('canvas');thumb.className='slide-thumb';thumb.dataset.special=key;
  const span=document.createElement('span');span.className='slide-index';span.textContent=key===-1?'封':'底';
  const wrap=document.createElement('div');wrap.className='slide-info';
  const label=document.createElement('span');label.className='slide-name';label.textContent=title;
  wrap.append(thumb,label);b.append(span,wrap);b.onclick=()=>choose(key);list.append(b);
  drawSpecialThumbnail(key);
 };
 addSpecial(-1,'封面 · 可自由更换');
 doc.slides.forEach((sl,i)=>{
  const b=document.createElement('button');b.className='slide-item'+(i===current?' active':'');
  const c=document.createElement('canvas');c.className='slide-thumb';c.dataset.slide=i;
  const n=document.createElement('span');n.className='slide-index';n.textContent=String(i+1).padStart(2,'0');
  const wrap=document.createElement('div');wrap.className='slide-info';
  const lbl=document.createElement('span');lbl.className='slide-name';lbl.textContent=getSlideLabel(i);
  wrap.append(c,lbl);b.append(n,wrap);b.onclick=()=>choose(Number(c.dataset.slide));list.append(b);
 });
 addSpecial(-2,'封底 · 可自由更换');
 $('slideCount').textContent=doc.slides.length+' 张内页 · 封面/封底';
 refreshPageTargets();drawThumbnails();
}
function choose(i){multiLayerMode=false;current= i===-1||i===-2?i:clamp(+i,0,doc.slides.length-1);resetSelection();snapGuides=[];undoStack=[];redoStack=[];$('editingLabel').textContent=getSlideLabel(current);$('slideList').querySelectorAll('.slide-item').forEach(n=>n.classList.toggle('active',current===-1?n.querySelector('canvas')?.dataset.special==='-1':current===-2?n.querySelector('canvas')?.dataset.special==='-2':n.querySelector('canvas')?.dataset.slide===String(current)));$('slideList').querySelector('.active')?.scrollIntoView({block:'nearest'});schedule();properties();if(current>=0)window.goToBookSpread?.(Math.floor(current/2)+1);else if(current===-1)window.goToBookSpread?.(0);else window.goToBookSpread?.(window.PHOTOBOOK.spreads.length+1);refreshPageTargets()}

function snapshot(){lastCrossPage=null;refreshPageTargets();undoStack.push(clone(activeSlide()));if(undoStack.length>35)undoStack.shift();redoStack=[]}
function modify(fn){snapshot();fn();const ids=new Set(activeSlide().elements.map(e=>e.id));for(const id of selectedIds)if(!ids.has(id))selectedIds.delete(id);if(!selectedIds.size)selected=-1;persist();schedule();properties();}
function undo(){if(!undoStack.length)return;redoStack.push(clone(activeSlide()));setActiveSlide(undoStack.pop());resetSelection();persist();schedule();properties()}
function redo(){if(!redoStack.length)return;undoStack.push(clone(activeSlide()));setActiveSlide(redoStack.pop());resetSelection();persist();schedule();properties()}
function changeTab(which){document.querySelectorAll('.right-tab').forEach(b=>b.classList.toggle('selected',b.dataset.tab===which));for(const [tab,id] of [['templates','templatesPanel'],['stickers','stickersPanel'],['layers','layersPanel']])$(id).hidden=which!==tab}
function addElement(el){modify(()=>{activeSlide().elements.push(el);selectElements([activeSlide().elements.length-1],{expandGroup:false})});changeTab('layers')}
function setProp(key,value){const el=activeSlide().elements[selected];if(!el||el.locked||selectedEntries().length!==1)return;modify(()=>{el[key]=value})}
function properties(){const entries=selectedEntries(),el=entries.length===1?entries[0].el:null,panel=$('elementProps'),layers=$('layersList');
 const ppt=$('ppt');if(ppt){ppt.dataset.hybridSelection=el?.type|| (entries.length?'multi':'none');ppt.dataset.hybridPage=current===-1?'cover':current===-2?'back':'page';}
 document.dispatchEvent(new CustomEvent('special:editor-selection',{detail:{type:el?.type||(entries.length?'multi':'none'),page:current,count:entries.length}}));panel.replaceChildren();layers.replaceChildren();panel.append(selectionToolbar());if(entries.length){panel.append(layerOrderToolbar());panel.append(alignmentToolbar());}if(selectedEditable().length>=2)panel.append(transformToolbar());
 const field=(name,key,value,kind='text',onChange=null)=>{const wrap=document.createElement('div');wrap.className='prop-line';const label=document.createElement('label');label.textContent=name;const input=document.createElement(kind==='textarea'?'textarea':'input');if(kind!=='textarea')input.type=kind;input.value=value??'';input.addEventListener(kind==='textarea'?'change':'change',()=>onChange?onChange(input.value):setProp(key,kind==='number'?Number(input.value):input.value));wrap.append(label,input);return wrap};
 if(!el){const p=document.createElement('p');p.className='v127-selection-info';p.textContent=entries.length?`已选择 ${entries.length} 个图层（Shift / Ctrl 点击多选）。组合可共同移动，双击单个图层编辑。`:'选中图层可编辑。Shift / Ctrl 点击多选；拖动会显示对齐辅助线。';panel.append(p)}else{
  panel.append(field('名称',null,el.type==='text'?'文字':el.type==='image'?'照片':el.type==='placeholder'?'图片占位':el.type==='video'?'视频回忆卡':el.type==='audio'?'声音纪念卡':'装饰色块','text',()=>{}));
  if(el.type==='text')panel.append(field('文字内容','text',el.text,'textarea'));
  if(el.type==='video'||el.type==='audio'){
    panel.append(field('媒体标题','title',el.title||'一段回忆'));
    const info=document.createElement('p');info.className='media-prop-hint';info.textContent='媒体文件已独立保存在浏览器。若更换电脑，请使用完整工程 ZIP 备份。';panel.append(info);
    const replace=document.createElement('button');replace.textContent='↻ 替换'+(el.type==='video'?'视频':'音频')+'文件';replace.onclick=()=>{mediaReplaceFor=el.type;document.getElementById(el.type==='video'?'videoInput':'audioInput').click()};panel.append(replace);
    if(el.type==='video'){const poster=document.createElement('button');poster.textContent='▣ 更换视频封面照片';poster.onclick=()=>document.getElementById('mediaPosterInput').click();panel.append(poster);}
    else{const label=document.createElement('label');label.className='prop-line';label.textContent='声音卡片外观';const select=document.createElement('select');for(const [v,name] of [['vinyl','黑胶唱片'],['cassette','复古磁带'],['postcard','声音明信片']]){const o=document.createElement('option');o.value=v;o.textContent=name;select.append(o)}select.value=el.style||'cassette';select.onchange=()=>setProp('style',select.value);label.append(select);panel.append(label);
     const toMusic=document.createElement('button');toMusic.textContent='♫ 设为全书背景音乐（持续循环，不弹窗）';toMusic.title='将当前录音/音乐作为整本书的背景音乐；音频卡片仍保留在本页';
     toMusic.onclick=async()=>{doc.musicIds=[...new Set([...(doc.musicIds||[]),el.mediaId])];doc.musicId=el.mediaId;persist();await syncMedia();syncStudioMusic();status('✓ 已加入曲目并设为当前背景音乐')};panel.append(toMusic);
    }
  }

  if(el.locked){const p=document.createElement('p');p.className='v127-selection-info';p.textContent='此图层已锁定。请先点击上方「解锁」后修改。';panel.append(p);panel.append(document.createElement('hr'));}const grid=document.createElement('div');grid.className='prop-grid';for(const [name,key] of [['位置 X','x'],['位置 Y','y'],['宽度','w'],['高度','h'],['旋转 °','rotation'],['不透明度','opacity']])grid.append(field(name,key,key==='opacity'?Number(el[key]??1):Math.round(el[key]||0),'number',v=>setProp(key,key==='opacity'?clamp(+v,0,1):+v)));panel.append(grid);
  if(el.type==='text'){
    panel.append(field('字号 px','size',el.size,'number'));
    const fs=document.createElement('select');for(const opt of $('fontFamily').options){const o=document.createElement('option');o.value=opt.value;o.textContent=opt.textContent;fs.append(o)}fs.value=el.family||serif;fs.onchange=()=>setProp('family',fs.value);const label=document.createElement('label');label.className='prop-line';label.textContent='字体';label.append(fs);panel.append(label);
    panel.append(field('文字颜色','color',el.color,'color'));const align=document.createElement('div');align.className='prop-buttons';for(const [s,v] of [['左','left'],['中','center'],['右','right']]){const b=document.createElement('button');b.textContent=s;b.onclick=()=>setProp('align',v);align.append(b)}panel.append(align)
  }else if(el.type==='shape')panel.append(field('填充颜色','fill',el.fill,'color'));
  if(el.type==='placeholder'||el.type==='image'){
  const b=document.createElement('button');b.textContent=el.type==='image'?'↻ 替换照片（保留位置/尺寸/旋转）':'＋ 填入照片';b.onclick=()=>el.type==='image'?startImageReplace():$('photoInput').click();panel.append(b);
  if(el.type==='image'){
    const cropBtn=document.createElement('button');cropBtn.className='image-crop-primary';cropBtn.textContent='✂ 裁剪 / 移动 / 抠图';cropBtn.title='裁剪和取景、透明背景抠图（本机处理）';cropBtn.onclick=()=>showPhotoEditor();panel.append(cropBtn);
    const frameBtn=document.createElement('button');frameBtn.className='image-frame-primary';frameBtn.textContent='✎ 描边 / 形状 / 镜像';frameBtn.title='为照片或透明贴纸添加轮廓描边、圆角/圆形/手撕纸边、水平或垂直翻转';frameBtn.onclick=()=>showPhotoEditor('frame');panel.append(frameBtn);
    const effectBtn=document.createElement('button');effectBtn.className='image-effect-primary';effectBtn.textContent='☀ 调色滤镜 / 纸张阴影';effectBtn.title='实时调节亮度、对比度、饱和度、色温、褪色、复古、黑白、暗角、柔焦及透明 PNG 阴影';effectBtn.onclick=()=>showPhotoEditor('adjust');panel.append(effectBtn);
    const mode=document.createElement('select');mode.innerHTML='<option value="cover">填满画框 · 保持图片比例</option><option value="contain">完整显示 · 保持图片比例</option><option value="stretch">自由拉伸 · 横向/纵向变形（边框、胶带）</option>';mode.value=['cover','contain','stretch'].includes(el.fit)?el.fit:'cover';mode.onchange=()=>modify(()=>{el.fit=mode.value;el.offsetX=0;el.offsetY=0});
    const label=document.createElement('label');label.className='prop-line';label.textContent='显示方式';label.append(mode);panel.append(label);
    const tip=document.createElement('div');tip.className='image-photo-hint';tip.textContent='拖动红色角点调整大小；紫色右侧/底部控制点分别调整宽和高。边框、胶带选“自由拉伸”，照片推荐保持比例。双击可裁剪，Alt 拖动调整取景。';panel.append(tip);
    const trim=document.createElement('button');trim.textContent='◌ 去掉 PNG 透明留白';trim.title='不改变 PNG 原始像素，只把裁剪范围贴合非透明部分';trim.onclick=trimTransparentImage;panel.append(trim);
  }
}
  const actions=document.createElement('div');actions.className='prop-buttons';for(const [s,fn] of [['向上一层',()=>reorderLayers('up')],['向下一层',()=>reorderLayers('down')],['删除',removeSelected]]){const b=document.createElement('button');b.textContent=s;b.onclick=fn;actions.append(b)}panel.append(actions)
 }
 if(el?.locked){for(const control of panel.querySelectorAll('input,textarea,select'))control.disabled=true;for(const b of panel.querySelectorAll('button')){if(!b.closest('.v127-actions')&&!b.closest('.v127-align'))b.disabled=true}}
 activeSlide().elements.slice().reverse().forEach((layer,j)=>{const idx=activeSlide().elements.length-1-j,b=document.createElement('button');b.className='layer-row'+(selectedIds.has(layer.id)?' active':'')+(layer.locked?' locked':'');b.textContent=(layer.locked?'🔒 ':'')+(layer.groupId?'⛓ ':'')+(layer.type==='text'?'T ':layer.type==='image'?'▣ ':layer.type==='placeholder'?'□ ':layer.type==='video'?'▶ ':layer.type==='audio'?'♫ ':'◇ ')+(layer.type==='text'?String(layer.text).slice(0,24):layer.type==='image'?(layer.role==='imported-artwork'?'已导入书页底图':'照片'):layer.type==='placeholder'?'照片占位':layer.type==='video'?'视频回忆':layer.type==='audio'?'声音纪念':'装饰色块');b.onclick=e=>{selectElements([idx],{extend:e.shiftKey||e.ctrlKey||e.metaKey||multiLayerMode});properties();schedule()};layers.append(b)});
 if(el?.type==='text'){$('fontFamily').value=el.family||serif;$('fontSize').value=el.size;$('fillColor').value=el.color||'#42342e'}
 if(el?.type==='shape')$('fillColor').value=el.fill||'#ffffff';
}
function locate(e){const b=canvas.getBoundingClientRect();return{x:(e.clientX-b.left)*W/b.width,y:(e.clientY-b.top)*H/b.height}}
function hit(p){const arr=activeSlide().elements;
 const entries=selectedEntries();if(entries.length>=2&&entries.every(({el})=>!el.locked&&!el.hidden)){
  const b=multiBounds(entries),h=groupHandles(b),idx=entries[0].i;
  if(Math.hypot(p.x-h.rot.x,p.y-h.rot.y)<32)return{mode:'group-rotate',idx};
  if(Math.hypot(p.x-h.size.x,p.y-h.size.y)<34)return{mode:'group-size',idx};
 }
 if(selected>=0&&selectedEntries().length===1&&!arr[selected]?.locked){const t=arr[selected],h=handles(t);if(Math.hypot(p.x-h.rot.x,p.y-h.rot.y)<31)return {mode:'rotate',idx:selected};if(Math.hypot(p.x-h.size.x,p.y-h.size.y)<34)return{mode:'size',idx:selected};if(t.type==='image'){if(Math.hypot(p.x-h.width.x,p.y-h.width.y)<30)return{mode:'width',idx:selected};if(Math.hypot(p.x-h.height.x,p.y-h.height.y)<30)return{mode:'height',idx:selected}}}
 for(let i=arr.length-1;i>=0;i--){const t=arr[i];if(t.hidden||t.locked)continue;const q=localPoint(t,p);if(q.x>=t.x-10&&q.x<=t.x+t.w+10&&q.y>=t.y-10&&q.y<=t.y+t.h+10)return{mode:'move',idx:i}}
 return{mode:'none',idx:-1}}
let dragFrame=0;function scheduleLive(){if(dragFrame)return;dragFrame=requestAnimationFrame(()=>{dragFrame=0;if(move)redrawLive()})}
canvas.addEventListener('pointerdown',e=>{
 if(e.button!==0)return;const p=locate(e),found=hit(p);
 if(found.idx<0){
  move={mode:'marquee',start:p,end:p,extend:e.shiftKey||e.ctrlKey||e.metaKey,active:false};
  snapGuides=[];canvas.setPointerCapture(e.pointerId);redrawLive();e.preventDefault();return
 }
 const multikey=e.shiftKey||e.ctrlKey||e.metaKey,handle=found.mode!=='move';
 if(multikey&&!handle){selectElements([found.idx],{extend:true});properties();redrawLive();e.preventDefault();return}
 if(!selectedIds.has(activeSlide().elements[found.idx].id)||selectedEntries().length<2)selectElements([found.idx]);
 const entries=selectedEditable();if(!entries.length){properties();schedule();return}
 snapshot();const el=activeSlide().elements[found.idx],ids=new Set(entries.map(({el})=>el.id));
 const bounds=multiBounds(entries);
 move={mode:(e.altKey&&el.type==='image'&&found.mode==='move'&&entries.length===1)?'photo-pan':found.mode,index:found.idx,start:p,
  origin:{x:el.x,y:el.y,w:el.w,h:el.h,rotation:el.rotation||0,offsetX:el.offsetX||0,offsetY:el.offsetY||0},
  origins:groupTransformOrigins(entries),bounds,
  targets:activeSlide().elements.filter(x=>!ids.has(x.id)&&!x.hidden&&x.role!=='imported-artwork').map(x=>multiBounds([{el:x}])),active:false};
 canvas.setPointerCapture(e.pointerId);properties();redrawLive();e.preventDefault()
});
canvas.addEventListener('pointermove',async e=>{const p=locate(e);if(move){
 if(move.mode==='marquee'){move.end=p;move.active=Math.hypot(p.x-move.start.x,p.y-move.start.y)>5;scheduleLive();e.preventDefault();return}
 const el=activeSlide().elements[move.index];if(!el)return;move.active=true;const dX=p.x-move.start.x,dY=p.y-move.start.y;
 if(move.mode==='move'){const snapped=snapMove(move,dX,dY,e.ctrlKey||e.metaKey);for(const entry of move.origins){entry.el.x=entry.x+snapped.x;entry.el.y=entry.y+snapped.y}}
 else if(move.mode==='group-rotate'){
  const cx=(move.bounds.l+move.bounds.r)/2,cy=(move.bounds.t+move.bounds.b)/2;
  const a0=Math.atan2(move.start.y-cy,move.start.x-cx),a1=Math.atan2(p.y-cy,p.x-cx);
  let angle=(a1-a0)*180/Math.PI;if(angle>180)angle-=360;if(angle<-180)angle+=360;
  if(e.shiftKey)angle=Math.round(angle/15)*15;
  const rad=angle*Math.PI/180,co=Math.cos(rad),si=Math.sin(rad);
  for(const o of move.origins){const dx=o.centerX-cx,dy=o.centerY-cy;
   o.el.x=cx+dx*co-dy*si-o.w/2;o.el.y=cy+dx*si+dy*co-o.h/2;
   o.el.rotation=Math.round((o.rotation+angle)*10)/10;
  }
 }
 else if(move.mode==='group-size'){
  const b=move.bounds,anchor={x:b.l,y:b.t},vx=b.r-b.l,vy=b.b-b.t;
  let factor=((p.x-anchor.x)*vx+(p.y-anchor.y)*vy)/Math.max(1,vx*vx+vy*vy);
  const minScale=Math.max(.1,...move.origins.map(o=>Math.max(1/Math.max(1,o.w),1/Math.max(1,o.h))));
  const maxScale=Math.min(5,...move.origins.map(o=>Math.min(W*3/o.w,H*3/o.h)));
  factor=clamp(factor,minScale,Math.max(minScale,maxScale));
  if(e.shiftKey)factor=clamp(Math.round(factor*10)/10,minScale,Math.max(minScale,maxScale));
  for(const o of move.origins){o.el.w=o.w*factor;o.el.h=o.h*factor;
   o.el.x=anchor.x+(o.centerX-anchor.x)*factor-o.el.w/2;
   o.el.y=anchor.y+(o.centerY-anchor.y)*factor-o.el.h/2;
   if(o.el.type==='text'&&Number.isFinite(o.size))o.el.size=Math.max(8,Math.round(o.size*factor*10)/10);
  }
 }
 else if(move.mode==='photo-pan'){
  const rad=-(el.rotation||0)*Math.PI/180,dx=dX*Math.cos(rad)-dY*Math.sin(rad),dy=dX*Math.sin(rad)+dY*Math.cos(rad);
  const img=imgResolved.get(el.src);if(img){const bounds=placement(el,img);el.offsetX=clamp(move.origin.offsetX+dx,-bounds.maxX,bounds.maxX);el.offsetY=clamp(move.origin.offsetY+dy,-bounds.maxY,bounds.maxY)}else{getImg(el.src).then(scheduleLive)}
 }
 else if(move.mode==='size'||move.mode==='width'||move.mode==='height'){
  const rad=-(el.rotation||0)*Math.PI/180,dx=dX*Math.cos(rad)-dY*Math.sin(rad),dy=dX*Math.sin(rad)+dY*Math.cos(rad);
  if(move.mode!=='height')el.w=clamp(move.origin.w+dx,40,W*3);
  if(move.mode!=='width')el.h=clamp(move.origin.h+dy,40,H*3);
  // Shift locks aspect ratio on corner scaling, while handles on the edges stretch one axis.
  if(move.mode==='size'&&e.shiftKey)el.h=clamp(el.w/(move.origin.w/move.origin.h),40,H*3);
 }
 else if(move.mode==='rotate'){const cx=move.origin.x+move.origin.w/2,cy=move.origin.y+move.origin.h/2;let deg=Math.atan2(p.y-cy,p.x-cx)*180/Math.PI+90;el.rotation=e.shiftKey?Math.round(deg/15)*15:Math.round(deg)}
 scheduleLive();e.preventDefault();return}
 const mode=hit(p).mode;canvas.style.cursor=mode==='group-rotate'?'grab':mode==='group-size'?'nwse-resize':mode==='rotate'?'grab':mode==='size'?'nwse-resize':mode==='width'?'ew-resize':mode==='height'?'ns-resize':mode==='move'?'move':'default';canvas.title=mode==='group-rotate'?'拖动整体旋转；Shift 吸附 15°':mode==='group-size'?'拖动整体等比缩放；Shift 按 10% 吸附':mode==='rotate'?'拖动旋转；按 Shift 吸附 15°':mode==='size'?'拖动缩放；按 Shift 锁定比例':mode==='width'?'拖动横向拉伸':mode==='height'?'拖动纵向拉伸':mode==='move'?'拖动移动元素':''
});
function finishPointer(){if(!move)return;const m=move;move=null;snapGuides=[];
 if(m.mode==='marquee'){
  if(m.active){const l=Math.min(m.start.x,m.end.x),r=Math.max(m.start.x,m.end.x),t=Math.min(m.start.y,m.end.y),b=Math.max(m.start.y,m.end.y);
   const hits=activeSlide().elements.map((el,i)=>({el,i})).filter(({el})=>!el.hidden&&!el.locked&&el.role!=='imported-artwork').filter(({el})=>{
    const box=multiBounds([{el}]);return box.l<r&&box.r>l&&box.t<b&&box.b>t
   });
   if(!m.extend)resetSelection();
   for(const {el,i} of hits){const ids=el.groupId?activeSlide().elements.filter(x=>x.groupId===el.groupId&&!x.locked&&!x.hidden).map(x=>x.id):[el.id];
    ids.forEach(id=>selectedIds.add(id));selected=i;
   }
  }else if(!m.extend)resetSelection();
  if(dragFrame){cancelAnimationFrame(dragFrame);dragFrame=0}redrawLive();properties();schedule();return
 }
 if(dragFrame){cancelAnimationFrame(dragFrame);dragFrame=0}
 redrawLive();
 if(m.active){persist();schedule();properties()}else {undoStack.pop();schedule()}
}
canvas.addEventListener('pointerup',finishPointer);canvas.addEventListener('pointercancel',finishPointer);
canvas.addEventListener('dblclick',e=>{const h=hit(locate(e));const el=activeSlide().elements[h.idx];if(el?.type==='text'){selectElements([h.idx],{expandGroup:false});const v=prompt('编辑文字',el.text);if(v!==null){selected=h.idx;setProp('text',v)}}else if(el?.type==='image'){selectElements([h.idx],{expandGroup:false});properties();showPhotoEditor()}else if(el?.type==='placeholder'){$('photoInput').click()}});
window.addEventListener('keydown',e=>{
 if($('ppt').hidden)return;
 const node=e.target?.tagName||'';if(/INPUT|TEXTAREA|SELECT/.test(node)||e.target?.isContentEditable)return;
 const key=e.key.toLowerCase(),cmd=e.ctrlKey||e.metaKey;
 if(cmd){let used=true;
  if(key==='z')e.shiftKey?redo():undo();else if(key==='y')redo();
  else if(key==='d')duplicateEl();else if(key==='a')selectAllEditable();
  else if(key==='c')copySelection();else if(key==='v')pasteSelection();
  else if(key==='g')e.shiftKey?ungroupSelected():groupSelected();
  else if(key==='l'&&e.shiftKey)setSelectedLock(!selectedEntries().every(({el})=>el.locked));
  else used=false;
  if(used){e.preventDefault();e.stopImmediatePropagation()}return
 }
 if(e.key==='PageDown'||e.key==='PageUp'){e.preventDefault();e.stopImmediatePropagation();stepEditPage(e.key==='PageDown'?1:-1);return}
 if(e.key==='Escape'){resetSelection();properties();schedule();return}
 if(e.key==='Delete'||e.key==='Backspace'){e.preventDefault();e.stopImmediatePropagation();removeSelected()}
 if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)&&selectedEditable().length){
  e.preventDefault();e.stopImmediatePropagation();const entries=selectedEditable(),step=e.shiftKey?10:1;
  snapshot();for(const {el} of entries){if(e.key==='ArrowLeft')el.x-=step;if(e.key==='ArrowRight')el.x+=step;if(e.key==='ArrowUp')el.y-=step;if(e.key==='ArrowDown')el.y+=step}
  persist();redrawLive();schedule()
 }
},true);
// V12.4: 手账素材全部由用户导入，移除内建代码绘制的 SVG 贴纸。
function initStickers(){const host=$('stickers');if(host)host.replaceChildren()}

// V10.3: 可复用本地素材库。素材与书页草稿分别存在同一个 IndexedDB 中。

// V12.14.1: 仅使用用户自己的手账素材库；移除网上精选目录和下载器。
const COLLAGE_TEMPLATE_KEY='personal-collage-templates-v1';
const COLLAGE_TEMPLATE_LIMIT=20, COLLAGE_TEMPLATE_SIZE_LIMIT=8*1024*1024;
let collageTemplates=[];
function selectedForCollage(){return selectedEditable().filter(({el})=>!el.hidden&&['image','shape','text','placeholder'].includes(el.type))}
async function saveCollageTemplate(){
 const entries=selectedForCollage();if(entries.length<2)return alert('请先多选至少两个照片、胶带、纸张或文字图层，再保存组合');
 if(!db)return alert('请使用可保存草稿的浏览器环境');
 if(collageTemplates.length>=COLLAGE_TEMPLATE_LIMIT)return alert('目前最多保存 '+COLLAGE_TEMPLATE_LIMIT+' 个组合，请先删除旧模板');
 const name=prompt('给这个手账组合起名字（例如：复古双人合照）','我的拼贴组合')?.trim();if(!name)return;
 const bounds=multiBounds(entries);const minX=bounds.l,minY=bounds.t;
 // Leave actual photo slots as placeholders: privacy-preserving and reusable.
 const elements=entries.map(({el})=>{
  let copy=clone(el);
  if(copy.type==='image'&&!copy.scrapbookAsset&&!personalStickers.some(s=>s.data===copy.src)&&copy.role!=='scrapbook-decoration'){
   copy={...P(copy.x,copy.y,copy.w,copy.h),rotation:copy.rotation||0,opacity:copy.opacity||1,role:'collage-photo-slot'};
  }
  copy.x-=minX;copy.y-=minY;
  delete copy.groupId;delete copy.locked;return copy;
 });
 const row={id:rand(),name:name.slice(0,44),created:new Date().toISOString(),width:Math.max(1,bounds.r-bounds.l),height:Math.max(1,bounds.b-bounds.t),elements};
 if(JSON.stringify(row).length>COLLAGE_TEMPLATE_SIZE_LIMIT)return alert('组合素材过大；请先缩小图片或减少元素。不会覆盖现有书页。');
 collageTemplates.unshift(row);
 try{await writeDb(COLLAGE_TEMPLATE_KEY,collageTemplates);drawCollageTemplates();status('✓ 已保存可编辑组合模板「'+row.name+'」')}catch(err){collageTemplates.shift();alert('保存组合失败：'+err.message)}
}
function pasteCollageTemplate(row){
 const scale=Math.min(1,760/row.width,960/row.height),offX=(W-row.width*scale)/2,offY=(H-row.height*scale)/2,groupId='collage-'+rand();
 const elements=row.elements.map(el=>{
  const copy=clone(el);copy.id=rand();copy.groupId=groupId;
  copy.x=Math.round(offX+copy.x*scale);copy.y=Math.round(offY+copy.y*scale);
  copy.w=Math.round(copy.w*scale);copy.h=Math.round(copy.h*scale);
  if(copy.type==='text'&&Number.isFinite(copy.size))copy.size=Math.max(10,Math.round(copy.size*scale));return copy;
 });
 modify(()=>{const target=activeSlide().elements;const first=target.length;target.push(...elements);selectElements(Array.from({length:elements.length},(_,i)=>first+i))});
 changeTab('layers');status('✓ 已插入 '+elements.length+' 个独立可编辑图层（可以取消组合、替换照片）');
}
function drawCollageTemplates(){
 const host=$('v1214MyCollage');if(!host)return;host.replaceChildren();
 if(!collageTemplates.length){const msg=document.createElement('small');msg.textContent='多选胶带、照片或纸片后点击「保存当前选区为组合模板」，可以重复使用。';host.append(msg)}
 for(const row of collageTemplates){
  const card=document.createElement('div');card.className='v1214-saved-template';
  const name=document.createElement('strong');name.textContent=row.name;
  const meta=document.createElement('small');meta.textContent=row.elements.length+' 个独立图层 · '+new Date(row.created).toLocaleDateString();
  const insert=document.createElement('button');insert.textContent='＋ 放入当前页';insert.onclick=()=>pasteCollageTemplate(row);
  const del=document.createElement('button');del.textContent='删除模板';del.onclick=async()=>{if(!confirm('删除模板「'+row.name+'」？已经放进书页的组合不受影响。'))return;const old=collageTemplates;collageTemplates=old.filter(x=>x.id!==row.id);try{await writeDb(COLLAGE_TEMPLATE_KEY,collageTemplates);drawCollageTemplates()}catch(e){collageTemplates=old;alert('删除失败：'+e.message)}};
  card.append(name,meta,insert,del);host.append(card)
 }
}
function initCollageToolbox(){
 const tpl=$('templatesPanel');if(tpl&&!$('v1214CollageSection')){
  const group=document.createElement('section');group.id='v1214CollageSection';group.className='v1214-collage-section';
  group.innerHTML='<h3>我的可编辑拼贴组合</h3><p>把真正的照片和纸片分层保存；私人照片会变成可替换的照片槽。</p>';
  const save=document.createElement('button');save.type='button';save.className='v1214-save-group';save.id='v1214SaveCollage';save.textContent='＋ 保存当前选区为组合模板';save.onclick=saveCollageTemplate;
  const list=document.createElement('div');list.id='v1214MyCollage';group.append(save,list);tpl.prepend(group);
 }
 drawCollageTemplates();
}

const STICKER_LIB_KEY='personal-sticker-library-v1';
const STICKER_LIMIT=2000,STICKER_FILE_LIMIT=6*1024*1024;
const STICKER_FOLDERS_KEY='personal-sticker-folders-v1';
// favorite is an optional boolean on each sticker; existing libraries remain valid.
let personalStickers=[],stickerFolders=[],activeStickerFolder='all';
function imageAsDataUrl(file){return new Promise((resolve,reject)=>{
 const reader=new FileReader();reader.onload=()=>resolve(reader.result);
 reader.onerror=()=>reject(new Error('无法读取文件'));reader.readAsDataURL(file);
})}
function stickerMsg(message){status(message)}
function folderName(id){return stickerFolders.find(f=>f.id===id)?.name||'未分类'}
async function storeStickerFolders(){if(db)await writeDb(STICKER_FOLDERS_KEY,stickerFolders)}
async function addStickerFolder(name){name=(name||'').trim().slice(0,50);if(!name)return null;
 const found=stickerFolders.find(f=>f.name===name);if(found)return found.id;
 const id=rand();stickerFolders.push({id,name});await storeStickerFolders();return id}
function stickerNodes(){
 const host=$('stickers');if(!host)return null;
 let section=$('personalStickerLibrary');if(section)return section;
 section=document.createElement('section');section.id='personalStickerLibrary';section.className='personal-sticker-library';
 section.innerHTML=`<div class="personal-sticker-title"><strong>我的手账素材库</strong><span id="personalStickerCount"></span></div><p class="personal-sticker-help">支持 PNG / WebP。可以创建分类、批量导入和直接导入整个文件夹。素材保存在当前浏览器中。</p>`;
 const actions=document.createElement('div');actions.className='personal-sticker-actions';
 const newFolder=document.createElement('button');newFolder.textContent='＋ 新建分类';
 const add=document.createElement('button');add.textContent='＋ 导入图片';add.className='personal-sticker-primary';
 const addFolder=document.createElement('button');addFolder.textContent='导入文件夹';
 const backup=document.createElement('button');backup.textContent='备份库';
 const restore=document.createElement('button');restore.textContent='恢复库';
 actions.append(newFolder,add,addFolder,backup,restore);
 const input=document.createElement('input');input.type='file';input.accept='.png,.webp,image/png,image/webp';input.multiple=true;input.hidden=true;
 const dir=document.createElement('input');dir.type='file';dir.multiple=true;dir.setAttribute('webkitdirectory','');dir.setAttribute('directory','');dir.hidden=true;
 const inputBackup=document.createElement('input');inputBackup.type='file';inputBackup.accept='.json,application/json';inputBackup.hidden=true;
 const folderBar=document.createElement('div');folderBar.id='stickerFolderBar';folderBar.className='sticker-folder-bar';
 const folderOps=document.createElement('div');folderOps.id='stickerFolderOps';folderOps.className='sticker-folder-ops';
 const search=document.createElement('input');search.id='stickerSearch';search.type='search';search.placeholder='搜索素材名称…';search.className='sticker-search';search.oninput=()=>showPersonalStickers();
 const items=document.createElement('div');items.id='personalStickerGrid';items.className='sticker-grid personal-sticker-grid';
 const empty=document.createElement('p');empty.id='personalStickerEmpty';empty.className='personal-sticker-empty';
 section.append(actions,folderBar,folderOps,search,input,dir,inputBackup,items,empty);
 host.parentNode.insertBefore(section,host);
 newFolder.onclick=async()=>{const name=prompt('新分类名称（例如：胶带 / 复古纸张 / 花草）');if(!name)return;const id=await addStickerFolder(name);if(id){activeStickerFolder=id;showPersonalStickers()}};
 add.onclick=()=>input.click();addFolder.onclick=()=>dir.click();backup.onclick=exportPersonalStickerLibrary;restore.onclick=()=>inputBackup.click();
 input.onchange=async e=>{const files=Array.from(e.target.files||[]);input.value='';await importPersonalStickerImages(files,['all','favorites','uncategorized'].includes(activeStickerFolder)?'':activeStickerFolder)};
 dir.onchange=async e=>{const files=Array.from(e.target.files||[]);dir.value='';await importPersonalStickerDirectory(files)};
 inputBackup.onchange=async e=>{const file=e.target.files?.[0];inputBackup.value='';if(file)await restorePersonalStickerLibrary(file)};
 return section;
}
function showPersonalStickers(){
 stickerNodes();const host=$('personalStickerGrid');if(!host)return;
 host.replaceChildren();$('personalStickerCount').textContent=personalStickers.length+' 件 · '+stickerFolders.length+' 类';
 const bar=$('stickerFolderBar');bar.replaceChildren();
 const counts=id=>personalStickers.filter(it=>id==='all'||(id==='favorites'?!!it.favorite:(id==='uncategorized'?!it.folderId:it.folderId===id))).length;
 for(const [id,name] of [['all','全部素材'],['favorites','★ 我的收藏'],['uncategorized','未分类'],...stickerFolders.map(f=>[f.id,f.name])]){
  const btn=document.createElement('button');btn.type='button';btn.className='sticker-folder-btn'+(activeStickerFolder===id?' selected':'');
  btn.textContent=name+' ('+counts(id)+')';btn.onclick=()=>{activeStickerFolder=id;showPersonalStickers()};bar.append(btn)
 }
 const ops=$('stickerFolderOps');ops.replaceChildren();
 if(!['all','uncategorized','favorites'].includes(activeStickerFolder)){
  const rename=document.createElement('button');rename.textContent='重命名当前分类';rename.onclick=async()=>{const f=stickerFolders.find(f=>f.id===activeStickerFolder);if(!f)return;const name=prompt('新分类名称',f.name)?.trim();if(!name)return;f.name=name.slice(0,50);await storeStickerFolders();showPersonalStickers()};
  const remove=document.createElement('button');remove.textContent='删除当前分类';remove.onclick=async()=>{if(!confirm('删除分类？其中素材会转入“未分类”，素材本身不会删除。'))return;personalStickers.forEach(it=>{if(it.folderId===activeStickerFolder)it.folderId=''});stickerFolders=stickerFolders.filter(f=>f.id!==activeStickerFolder);activeStickerFolder='uncategorized';await storeStickerFolders();await storePersonalStickers();showPersonalStickers()};ops.append(rename,remove)
 }
 const term=($('stickerSearch')?.value||'').trim().toLowerCase();
 const shown=personalStickers.filter(it=>(activeStickerFolder==='all'||(activeStickerFolder==='favorites'?!!it.favorite:(activeStickerFolder==='uncategorized'?!it.folderId:it.folderId===activeStickerFolder)))&&(!term||it.name.toLowerCase().includes(term)));
 const shownLimited=shown.slice(0,180);const info=document.createElement('p');info.className='personal-sticker-help';if(shown.length>180){info.textContent='当前匹配 '+shown.length+' 件，仅显示前 180 件；使用搜索或分类缩小范围。';host.append(info)}
 $('personalStickerEmpty').hidden=shown.length>0;
 $('personalStickerEmpty').textContent=activeStickerFolder==='all'?'素材库还没有图片。请先新建分类并导入素材。':activeStickerFolder==='favorites'?'还没有收藏的素材。点任意素材下方的 ☆ 收藏，就能在这里快速找到。':'此分类暂无素材，点击「导入图片」添加。';
 for(const it of shownLimited){
  const wrap=document.createElement('div');wrap.className='personal-sticker-entry';
  const b=document.createElement('button');b.type='button';b.className='sticker-card personal-sticker-image';b.title='点击插入：'+it.name;
  const img=document.createElement('img');img.src=it.data;img.alt=it.name;img.loading='lazy';
  const txt=document.createElement('span');txt.textContent=it.name;b.append(img,txt);
  b.onclick=()=>{const ratio=Math.max(.2,Math.min(5,it.width/it.height));const w=300,h=Math.round(w/ratio);addElement({...P(Math.round((W-w)/2),Math.round((H-Math.min(800,h))/2),w,Math.min(800,h)),type:'image',src:it.data,scrapbookAsset:true,role:'scrapbook-decoration',sourceUrl:it.sourceUrl||null,license:it.license||null,fit:'contain',crop:{x:0,y:0,w:1,h:1},zoom:1,offsetX:0,offsetY:0});stickerMsg('已插入素材「'+it.name+'」')};
  const edit=document.createElement('div');edit.className='personal-sticker-entry-actions';
  const fav=document.createElement('button');fav.type='button';fav.className='v128-favorite'+(it.favorite?' is-favorite':'');
  fav.textContent=it.favorite?'★ 已收藏':'☆ 收藏';fav.title=it.favorite?'取消收藏':'加入快捷收藏';fav.setAttribute('aria-pressed',String(!!it.favorite));
  fav.onclick=async()=>{it.favorite=!it.favorite;await storePersonalStickers();showPersonalStickers()};
  const rename=document.createElement('button');rename.textContent='重命名';rename.onclick=async()=>{const name=prompt('素材名称',it.name)?.trim();if(!name)return;it.name=name.slice(0,60);await storePersonalStickers();showPersonalStickers()};
  const move=document.createElement('button');move.textContent='移动';move.onclick=async()=>{const choices=['0. 未分类',...stickerFolders.map((f,i)=>(i+1)+'. '+f.name)];const result=prompt('输入目标分类的序号：\n'+choices.join('\n'),'0');if(result===null)return;const n=Number(result);if(!Number.isInteger(n)||n<0||n>stickerFolders.length)return alert('序号无效');it.folderId=n?stickerFolders[n-1].id:'';await storePersonalStickers();showPersonalStickers()};
  const del=document.createElement('button');del.textContent='删除';del.onclick=async()=>{if(!confirm('从素材库删除「'+it.name+'」？已经放入书页的图层不会受影响。'))return;personalStickers=personalStickers.filter(x=>x.id!==it.id);await storePersonalStickers();showPersonalStickers()};
  edit.append(fav,rename,move,del);wrap.append(b,edit);host.append(wrap)
 }
}
async function storePersonalStickers(){
 if(!db){stickerMsg('素材库需要浏览器 IndexedDB 存储，请使用 localhost 启动工程');return}
 try{await writeDb(STICKER_LIB_KEY,personalStickers);stickerMsg('✓ 自定义素材库已保存到本机')}catch(e){console.error(e);alert('素材库保存失败：浏览器容量可能不足。请先备份素材库并减少大图片。')}
}
async function importPersonalStickerImages(files,folderId='',silent=false){
 if(!files.length)return 0;let added=0;const errors=[];
 for(const file of files){
  if(!/\.(png|webp)$/i.test(file.name)){if(!silent)errors.push(file.name+'：请使用 PNG 或 WebP');continue}
  if(personalStickers.length>=STICKER_LIMIT){errors.push('素材库已达到 '+STICKER_LIMIT+' 件上限，请分批精简或备份');break}
  if(file.size>STICKER_FILE_LIMIT){errors.push(file.name+'：超过单张 6MB 限制');continue}
  try{const data=await imageAsDataUrl(file);const bitmap=await createImageBitmap(file);const width=bitmap.width,height=bitmap.height;bitmap.close?.();if(!width||!height)throw Error('无法识别图片尺寸');
   personalStickers.push({id:rand(),name:file.name.replace(/\.(png|webp)$/i,'').slice(0,60)||'我的贴纸',data,width,height,folderId});added++;
  }catch(e){errors.push(file.name+'：'+e.message)}
 }
 if(added)await storePersonalStickers();if(!silent)showPersonalStickers();
 if(errors.length)alert(`成功导入 ${added} 件。\n`+errors.slice(0,8).join('\n'));
 else if(added&&!silent)stickerMsg('✓ 已导入 '+added+' 件素材');return added;
}
async function importPersonalStickerDirectory(files){
 if(!files.length)return;const groups=new Map();
 for(const file of files){if(!/\.(png|webp)$/i.test(file.name))continue;
  const path=file.webkitRelativePath||file.name;const segments=path.split('/').filter(Boolean);
  const key=segments.length>2?segments.slice(1,-1).join(' / '):(segments.length>1?segments[0]:'导入文件夹');
  if(!groups.has(key))groups.set(key,[]);groups.get(key).push(file)}
 if(!groups.size)return alert('所选文件夹里没有 PNG 或 WebP 素材');
 let total=0;status('正在批量导入文件夹素材…');
 for(const [name,items] of groups){const id=await addStickerFolder(name);total+=await importPersonalStickerImages(items,id,true)}
 await storeStickerFolders();activeStickerFolder='all';showPersonalStickers();stickerMsg('✓ 从 '+groups.size+' 个分类导入 '+total+' 件素材');
}
function exportPersonalStickerLibrary(){
 const payload={type:'special-appearance-personal-stickers',version:2,folders:stickerFolders,items:personalStickers};
 const blob=new Blob([JSON.stringify(payload)],{type:'application/json'});
 const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='特别出演_我的手账素材库.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);
}
async function restorePersonalStickerLibrary(file){
 try{
  if(file.size>150*1024*1024)throw Error('备份文件太大');
  const json=JSON.parse(await file.text());if(json.type!=='special-appearance-personal-stickers'||!Array.isArray(json.items))throw Error('不是本工作室的素材库备份');
  const valid=json.items.filter(x=>x&&typeof x.id==='string'&&typeof x.name==='string'&&typeof x.data==='string'&&/^data:image\/(png|webp);base64,/i.test(x.data)&&Number.isFinite(x.width)&&Number.isFinite(x.height)&&x.width>0&&x.height>0);
  if(!confirm('恢复 '+valid.length+' 件素材？\n确定：与现有素材合并（同 ID 的素材不会重复）。'))return;
  const idMap=new Map();for(const f of (Array.isArray(json.folders)?json.folders:[])){if(typeof f.name!=='string')continue;const id=await addStickerFolder(f.name);idMap.set(f.id,id)}
  const ids=new Set(personalStickers.map(s=>s.id));let n=0;
  for(const x of valid){if(personalStickers.length>=STICKER_LIMIT)break;if(ids.has(x.id))continue;
   personalStickers.push({id:x.id,name:x.name.slice(0,60),data:x.data,width:x.width,height:x.height,folderId:idMap.get(x.folderId)||'',favorite:x.favorite===true,origin:x.origin||'',sourceUrl:x.sourceUrl||'',sourcePage:x.sourcePage||'',author:x.author||'',license:x.license||''});ids.add(x.id);n++}
  await storePersonalStickers();showPersonalStickers();stickerMsg('✓ 恢复了 '+n+' 件素材');
 }catch(e){alert('恢复素材库失败：'+e.message)}
}

function applyFinalSpread(){
 const n=doc.slides.length;
 const left=n-2,right=n-1;
 const occupied=doc.slides[left].elements.length||doc.slides[right].elements.length;
 if(occupied){
  if(n>=80){alert('最后跨页已有内容，而且已达到 80 页上限。请先整理书页。');return}
  if(!confirm('最后一组跨页已有内容。是否保留原内容，在末尾新增一组紫金片尾双页？'))return;
  doc.slides.push(unfinishedTemplate(),creditsTemplate());
  persist();reloadAt(n);return;
 }
 if(!confirm('将最后两张空白内页填为：左「未完待续」＋右「片尾字幕」？封底不受影响。'))return;
 doc.slides[left]=unfinishedTemplate();doc.slides[right]=creditsTemplate();
 persist();renderThumbs();choose(left);status('✓ 已装订片尾双页，可逐一点击文字编辑');
}
function templatePreview(){const host=$('templates');host.replaceChildren();
 const pair=document.createElement('button');pair.className='ending-apply-all';pair.type='button';pair.textContent='✦ 一键装订最后的紫金片尾双页';pair.title='最后一组左页为「未完待续」，右页为电影片尾字幕；全部文字可编辑';pair.onclick=applyFinalSpread;
 host.before(pair);for(const data of templateData){const button=document.createElement('button');button.className='template-card';button.title=data.desc;const c=document.createElement('canvas');c.width=176;c.height=236;const name=document.createElement('b');name.textContent=data.name;const label=document.createElement('small');label.textContent=data.cat+' · '+data.desc;button.append(c,name,label);button.onclick=()=>{if(activeSlide().elements.length&&!confirm(`替换「${getSlideLabel(current)}」的内容为「${data.name}」？`))return;modify(()=>{setActiveSlide({bg:data.bg,elements:data.make()});selected=-1});status('已应用模板，可继续修改、上传真实照片')};host.append(button);render({bg:data.bg,elements:data.make()}).then(full=>c.getContext('2d').drawImage(full,0,0,c.width,c.height))}}
let mediaReplaceFor=null;
function mediaAllowed(file,type){return file&&((type==='video'?(['video/mp4','video/webm'].includes(file.type)||/\.(mp4|webm)$/i.test(file.name)):(file.type.startsWith('audio/')||/\.(mp3|m4a|wav|ogg|aac)$/i.test(file.name))));}
async function frameFromVideo(file){return new Promise(resolve=>{const video=document.createElement('video'),url=URL.createObjectURL(file);let settled=false;const done=src=>{if(settled)return;settled=true;video.pause();video.removeAttribute('src');video.load();URL.revokeObjectURL(url);resolve(src)};const timeout=setTimeout(()=>done(null),5000);video.preload='auto';video.muted=true;video.playsInline=true;video.onloadedmetadata=()=>{try{video.currentTime=Math.min(.25,Math.max(.01,(video.duration||1)/3))}catch(e){clearTimeout(timeout);done(null)}};video.onseeked=()=>{try{const cv=document.createElement('canvas'),w=640;cv.width=w;cv.height=Math.max(1,Math.round(w*(video.videoHeight||360)/(video.videoWidth||640)));cv.getContext('2d').drawImage(video,0,0,cv.width,cv.height);clearTimeout(timeout);done(cv.toDataURL('image/jpeg',.8))}catch(e){clearTimeout(timeout);done(null)}};video.onerror=()=>{clearTimeout(timeout);done(null)};video.src=url;video.load()})}
async function posterFromImage(file){const bm=await createImageBitmap(file),cv=document.createElement('canvas'),scale=Math.min(1,900/Math.max(bm.width,bm.height));cv.width=Math.max(1,Math.round(bm.width*scale));cv.height=Math.max(1,Math.round(bm.height*scale));cv.getContext('2d').drawImage(bm,0,0,cv.width,cv.height);bm.close?.();return cv.toDataURL('image/jpeg',.84)}
async function addMediaFile(file,type){if(!mediaAllowed(file,type))throw Error('文件格式错误，请选择'+(type==='video'?'MP4 (H.264) / WebM 视频；MOV 请先转换为 MP4':'MP3 / M4A / WAV 音频'));if(file.size>250*1024*1024)throw Error('单个音视频请控制在 250MB 以内');if(!db)throw Error('本地数据库不可用');status('正在保存媒体文件…');const stored=await MediaStore.put(db,file);
 if(mediaReplaceFor===type){const el=activeSlide().elements[selected];mediaReplaceFor=null;if(!el||el.type!==type)throw Error('请重新选择要替换的媒体卡片');const poster=type==='video'?await frameFromVideo(file):null;modify(()=>{el.mediaId=stored.id;if(poster)el.poster=poster;});}
 else{if(current<0)throw Error('请先选择正文书页再添加媒体');const poster=type==='video'?await frameFromVideo(file):null;addElement({id:rand(),type,x:165,y:240,w:type==='video'?550:460,h:type==='video'?420:350,rotation:0,opacity:1,mediaId:stored.id,poster:poster||'',title:file.name.replace(/\.[^.]+$/,''),style:type==='video'?'polaroid':'cassette'});}
 status('✓ '+(type==='video'?'视频':'音频')+'已加入书页；关闭工作室后可在 3D 阅读器中点击播放');
}
function referencedMedia(){
 const ids=new Set(),pages={};
 for(let i=0;i<doc.slides.length;i++){
  const slide=doc.slides[i];const hasMedia=slide.elements.some(el=>(el.type==='video'||el.type==='audio')&&!el.hidden);
  if(!hasMedia)continue;
  pages[`page-${String(i+1).padStart(2,'0')}.jpg`]=slide.elements.filter(el=>!el.hidden&&(el.type==='video'||el.type==='audio'||el.type==='image'||(el.type==='shape'&&el.fill&&el.fill!=='transparent'))).map(el=>({type:el.type,mediaId:el.mediaId,x:el.x,y:el.y,w:el.w,h:el.h,rotation:el.rotation||0,opacity:el.opacity??1,title:el.title||'',style:el.style||'',poster:el.poster||''}));
  slide.elements.filter(el=>(el.type==='video'||el.type==='audio')&&!el.hidden).forEach(el=>ids.add(el.mediaId));
 }
 for(const id of doc.musicIds||[])if(id)ids.add(id);if(doc.musicId)ids.add(doc.musicId);return {ids,pages};
}
function mediaExtension(item){const mime=(item.type||'').toLowerCase(),name=(item.name||'').toLowerCase();if(mime==='video/mp4'||mime==='video/quicktime'||/\.(mp4|mov)$/.test(name))return 'mp4';if(mime==='video/webm'||/\.webm$/.test(name))return 'webm';if(mime==='audio/mpeg'||/\.mp3$/.test(name))return 'mp3';if(mime==='audio/mp4'||mime==='audio/x-m4a'||/\.m4a$/.test(name))return 'm4a';if(mime==='audio/wav'||/\.wav$/.test(name))return 'wav';if(mime==='audio/ogg'||/\.ogg$/.test(name))return 'ogg';return 'bin'}
async function createMediaManifest(live=false,zip=null){const {ids,pages}=referencedMedia(),media={};for(const id of ids){if(!id)continue;const item=await MediaStore.get(db,id);if(!item||!(item.blob instanceof Blob)||item.blob.size===0)throw Error('找不到或无法读取媒体文件 '+id+'。请使用完整工程备份恢复');if(live)media[id]={src:await MediaStore.url(db,id),type:item.type,name:item.name||'',title:(item.name||'').replace(/\.[^.]+$/,'')};else{const path='assets/media/'+String(id).replace(/[^a-zA-Z0-9_-]/g,'_')+'.'+mediaExtension(item);zip.file(path,item.blob);media[id]={src:path,type:item.type,name:item.name||'',title:(item.name||'').replace(/\.[^.]+$/,'')}}}return {version:1,pageWidth:W,pageHeight:H,pages,media,musicId:doc.musicId||null,musicIds:[...new Set([...(doc.musicIds||[]),...(doc.musicId?[doc.musicId]:[])])],musicSettings:musicSettings(doc.musicSettings)}}
async function syncMedia(){if(!db)return;try{window.SpecialMedia?.setManifest(await createMediaManifest(true))}catch(e){console.warn('媒体引用未同步',e);status('有媒体文件缺失：建议恢复完整工程备份')}}
// V12.3 backup reader JPG artwork used as non-destructive imported base layers.
// It must travel with the complete project so another device can restore it.
const importedArtSources = project => {
 const result=new Set();
 for(const slide of [...project.slides,project.cover,project.back])for(const el of (slide?.elements||[])){
   if(el.role==='imported-artwork' && typeof el.src==='string' && el.src.startsWith('assets/pages/'))result.add(el.src);
 }
 return [...result];
};
function blobAsDataURL(blob){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(reader.error);reader.readAsDataURL(blob)})}
// V12.5.1: safeguard full project backup. An online reader snapshot and an
// IndexedDB editor draft are two different sources. Never silently present
// a completely empty editor project as a successful complete backup.
function projectStats(project){
 const pages=[project.cover,...project.slides,project.back];
 return {total:pages.length,filled:pages.filter(p=>(p?.elements||[]).some(e=>!e.hidden&&e.type!=='placeholder')).length,
   content:project.slides.filter(p=>(p?.elements||[]).some(e=>!e.hidden&&e.type!=='placeholder')).length};
}
const pageArtPath=src=>typeof src==='string'&&/^assets\/pages\/[a-zA-Z0-9._-]+\.(jpe?g|png|webp)$/i.test(src);
async function fullBackup(){
 if(typeof JSZip==='undefined')return alert('ZIP 库尚未加载');
 try{
  const stats=projectStats(doc);
  if(!stats.content){
   alert('当前编辑器的正文书页没有可见内容，继续备份只会得到空白工程。\\n\\n请先检查是否在正确的浏览器和 Pages 域名，或者点击「从3D阅读版ZIP找回书页」。本次没有覆盖任何文件。');
   return;
  }
  status('正在检查工程内容与图片文件…');
  const zip=new JSZip(), projectSnapshot=clone(doc), artSet=new Set();
  for(const slide of [...projectSnapshot.slides,projectSnapshot.cover,projectSnapshot.back])for(const el of (slide?.elements||[])){
   for(const field of ['src','poster','cutoutOriginalSrc']){
    const value=el[field];
    if(typeof value!=='string')continue;
    if(value.startsWith('site-data/')||value.startsWith('assets/source-pages/')){
     const response=await fetch(value,{cache:'no-cache'});
     if(!response.ok)throw Error('无法读取图片，完整备份已取消：'+value);
     el[field]=await blobAsDataURL(await response.blob());
    }else if(pageArtPath(value)){
     // Preserve every relative book JPG, not just the special imported-artwork role.
     artSet.add(value);
    }else if(value.startsWith('blob:')){
     throw Error('发现临时图片链接，无法保证换设备恢复：'+field+'。请重新导入这张图片后备份。');
    }
   }
  }
  for(const src of artSet){
   const response=await fetch(src,{cache:'no-cache'});
   if(!response.ok)throw Error('完整备份缺少书页图片：'+src);
   zip.file('imported-pages/'+src.split('/').pop(),await response.blob());
  }
  zip.file('project.json',JSON.stringify({version:12,slides:projectSnapshot.slides,cover:projectSnapshot.cover,back:projectSnapshot.back,musicId:projectSnapshot.musicId||null,musicIds:projectSnapshot.musicIds||[],musicSettings:musicSettings(projectSnapshot.musicSettings),created:new Date().toISOString()}));
  const media=await MediaStore.all(db);
  for(const item of media)zip.file('media/'+item.id+'.blob',item.blob);
  zip.file('media-index.json',JSON.stringify(media.map(({blob,...rest})=>rest)));
  const stickers=await readDb(STICKER_LIB_KEY);
  if(stickers)zip.file('extra/stickers.json',JSON.stringify(stickers));
  const stickerFoldersSaved=await readDb(STICKER_FOLDERS_KEY);
  if(stickerFoldersSaved)zip.file('extra/sticker-folders.json',JSON.stringify(stickerFoldersSaved));
  const collageSaved=await readDb(COLLAGE_TEMPLATE_KEY);if(Array.isArray(collageSaved)){const portable=clone(collageSaved);for(const t of portable)for(const el of (t.elements||[]))if(el.type==='image'&&typeof el.src==='string'&&(el.src.startsWith('site-data/')||el.src.startsWith('assets/pages/'))){const response=await fetch(el.src,{cache:'no-cache'});if(!response.ok)throw Error('组合模板引用的图片已缺失：'+el.src);el.src=await blobAsDataURL(await response.blob())}zip.file('extra/collage-templates.json',JSON.stringify(portable))}
  const fonts=await readDb(USER_FONTS_KEY);
  if(fonts?.length){const meta=[];for(let i=0;i<fonts.length;i++){
   const file=fonts[i]?.file;if(!file)continue;
   const path='extra/fonts/'+i+'.bin';zip.file(path,file);
   meta.push({path,name:file.name||('font-'+i+'.ttf'),type:file.type||'',lastModified:file.lastModified||Date.now()});
  }zip.file('extra/fonts.json',JSON.stringify(meta))}
  zip.file('backup-report.json',JSON.stringify({format:'special-appearance-complete-backup',version:1,
   savedAt:new Date().toISOString(),pageCount:doc.slides.length,nonemptyPages:stats.content,
   importedJpgCount:artSet.size,mediaCount:media.length,stickerCount:stickers?.length||0,fontCount:fonts?.length||0},null,2));
  status('正在压缩并检查完整工程备份…');
  const output=await zip.generateAsync({type:'blob',compression:'DEFLATE',compressionOptions:{level:4}});
  const check=await JSZip.loadAsync(output);
  const valid=JSON.parse(await check.file('project.json').async('string'));
  if(valid.slides.length!==doc.slides.length||!projectStats(valid).content)throw Error('完整备份校验未通过；未生成空白工程 ZIP');
  await writeDb(activeDocKey(),doc);
  downloadBlob(output,'特别出演_V12.5.1_完整工程备份.zip');
  status(`✓ 已验证备份：${doc.slides.length} 页、${stats.content} 页有内容、${media.length} 件媒体`);
 }catch(e){console.error(e);alert('完整备份失败（未替换原草稿）：'+e.message)}
}
async function restoreFull(file){
 if(typeof JSZip==='undefined')return alert('ZIP 库尚未加载');
 try{
  const zip=await JSZip.loadAsync(file),pj=zip.file('project.json');
  if(!pj)throw Error('这不是完整工程 ZIP（缺少 project.json）。如果这是「3D阅读版」，请使用「从3D阅读版ZIP找回书页」。');
  const data=JSON.parse(await pj.async('string'));
  if(!Array.isArray(data.slides)||!data.slides.length||data.slides.length>80||data.slides.length%2)throw Error('工程书页数量不正确');
  const meta=JSON.parse(await zip.file('media-index.json')?.async('string')||'[]');
  for(const item of meta)if(!zip.file('media/'+item.id+'.blob'))throw Error('备份缺少媒体 '+item.id);
  // Validate ALL flattened source images before the user approves overwriting the draft.
  for(const slide of [...data.slides,data.cover,data.back])for(const el of (slide?.elements||[])){
   for(const key of ['src','poster','cutoutOriginalSrc']){
    const value=el[key];
    if(!pageArtPath(value))continue;
    const item=zip.file('imported-pages/'+value.split('/').pop());
    if(!item)throw Error('备份缺少图片 '+value+'；若继续恢复会变成空白。已取消恢复。');
    el[key]=await blobAsDataURL(await item.async('blob'));
   }
  }
  const stats=projectStats(data);
  if(!stats.content)throw Error('这份备份里的所有正文页都是空白。已停止恢复，避免覆盖现有作品。请从已发布的3D阅读版ZIP找回。');
  if(!confirm(`将恢复 ${data.slides.length} 张内页（${stats.content} 张有内容）。此操作将覆盖当前编辑草稿。请先另存一份备份。确定吗？`))return;
  if(window.SpecialHistory){try{await window.SpecialHistory.create(doc,'恢复完整工程 ZIP 前',{force:true})}catch(e){throw Error('为保护当前工程，恢复前的安全快照未成功：'+e.message+'。请先导出完整工程 ZIP，再重试。')}}
  status('正在恢复完整工程…');
  for(const item of meta){const blob=await zip.file('media/'+item.id+'.blob').async('blob');
   await MediaStore.put(db,new File([blob],item.name||'media',{type:item.type||blob.type}),item.id);MediaStore.forgetURL(item.id)}
  const stickers=zip.file('extra/stickers.json');if(stickers)await writeDb(STICKER_LIB_KEY,JSON.parse(await stickers.async('string')));
  const foldersBackup=zip.file('extra/sticker-folders.json');if(foldersBackup)await writeDb(STICKER_FOLDERS_KEY,JSON.parse(await foldersBackup.async('string')));
  const collageSaved=zip.file('extra/collage-templates.json');if(collageSaved)await writeDb(COLLAGE_TEMPLATE_KEY,JSON.parse(await collageSaved.async('string')));
  const fonts=zip.file('extra/fonts.json');if(fonts){const records=JSON.parse(await fonts.async('string')),all=[];for(const f of records){const z=zip.file(f.path);if(z)all.push({file:new File([await z.async('blob')],f.name,{type:f.type,lastModified:f.lastModified})})}await writeDb(USER_FONTS_KEY,all)}
  const restoredDoc={slides:data.slides,cover:migrateCover(data.cover),back:migrateBack(data.back),musicId:data.musicId||null,musicIds:data.musicIds||[...(data.musicId?[data.musicId]:[])],musicSettings:musicSettings(data.musicSettings)};
  await writeDb(activeDocKey(),restoredDoc);doc=restoredDoc;localStorage.setItem(COUNT_KEY,String(doc.slides.length));sessionStorage.setItem('special-v9-focus','0');location.reload();
 }catch(e){console.error(e);alert('恢复完整工程失败：'+e.message)}
}
// Reader ZIP recovery intentionally restores JPG artwork as locked backgrounds.
// It cannot recreate the source text/photo layer structure that was flattened on export.
async function recoverReaderZip(file){
 try{
  const archive=await JSZip.loadAsync(file);
  if(archive.file('project.json'))throw Error('这是完整工程备份，请使用「恢复工程 ZIP」。');
  const names=Object.keys(archive.files).filter(n=>/^assets\/pages\/page-\d+\.jpe?g$/i.test(n));
  const ordered=names.map(name=>({name,index:Number(name.match(/page-(\d+)/i)[1])})).sort((a,b)=>a.index-b.index);
  if(!ordered.length||ordered.length>80||ordered.length%2||ordered.some((v,i)=>v.index!==i+1))throw Error('阅读版书页必须从 page-01.jpg 连续编号，数量为偶数且不超过80。');
  for(const name of ['assets/pages/front-cover.jpg','assets/pages/back-cover.jpg'])if(!archive.file(name))throw Error('阅读版缺少 '+name);
  let manifest={};
  const script=archive.file('book-data.js');
  if(script){
   // Parse the JSON object only; never execute imported JavaScript.
   const source=await script.async('string'),mark='window.SPECIAL_MEDIA_MANIFEST=';
   const pos=source.indexOf(mark);
   if(pos!==-1){
    const start=source.indexOf('{',pos+mark.length);
    let depth=0,quote=false,escaped=false,end=-1;
    for(let i=start;i>=0&&i<source.length;i++){
     const ch=source[i];
     if(quote){if(escaped)escaped=false;else if(ch==='\\')escaped=true;else if(ch==='"')quote=false;continue}
     if(ch==='"'){quote=true;continue}
     if(ch==='{')depth++;
     else if(ch==='}'&&!--depth){end=i+1;break}
    }
    if(end>start){try{manifest=JSON.parse(source.slice(start,end))}catch(_){manifest={}}}
   }
  }
  const used=new Set();
  for(const elements of Object.values(manifest.pages||{}))for(const el of elements)
   if((el.type==='audio'||el.type==='video')&&el.mediaId)used.add(el.mediaId);
  for(const id of manifest.musicIds||[])if(id)used.add(id);if(manifest.musicId)used.add(manifest.musicId);
  for(const id of used){const src=manifest.media?.[id]?.src;if(!src||!archive.file(src))throw Error('阅读版缺少音视频文件：'+(src||id))}
  if(!confirm(`检测到 ${ordered.length} 张阅读版内页、${used.size} 件媒体。将把书页恢复为可以继续添加图层的锁定底图。\n\n原先合成的照片和文字无法拆开单独修改，当前编辑草稿将被覆盖。确定吗？`))return;
  if(window.SpecialHistory){try{await window.SpecialHistory.create(doc,'从阅读版恢复前',{force:true})}catch(e){throw Error('覆盖前安全快照失败：'+e.message+'。请先导出完整工程 ZIP。')}}
  status('正在从3D阅读版提取书页…');
  const original=async name=>({bg:'#f7f2e9',flattenedImported:true,elements:[{
   id:'rescued-'+name.split('/').pop(),type:'image',src:await blobAsDataURL(await archive.file(name).async('blob')),
   x:0,y:0,w:W,h:H,fit:'contain',opacity:1,rotation:0,locked:true,role:'imported-artwork'
  }]});
  const slides=[];
  for(const entry of ordered){
   const slide=await original(entry.name),found=(manifest.pages||{})[entry.name.split('/').pop()]||[];
   for(const el of found)if((el.type==='audio'||el.type==='video')&&el.mediaId){
    slide.elements.push({id:'restored-media-'+el.mediaId,type:el.type,mediaId:el.mediaId,
      x:el.x,y:el.y,w:el.w,h:el.h,rotation:el.rotation||0,opacity:1,
      title:el.title||'',style:el.style||'cassette',poster:el.poster||'',interactiveOnly:true});
   }
   slides.push(slide);
  }
  const cover=await original('assets/pages/front-cover.jpg'),back=await original('assets/pages/back-cover.jpg');
  for(const id of used){
   const meta=manifest.media[id],binary=await archive.file(meta.src).async('blob');
   const name=meta.src.split('/').pop();
   await MediaStore.put(db,new File([binary],name,{type:meta.type||binary.type}),id);
  }
  doc={slides,cover,back,musicId:manifest.musicId||null,musicIds:manifest.musicIds||[...(manifest.musicId?[manifest.musicId]:[])],musicSettings:musicSettings(manifest.musicSettings)};await writeDb(activeDocKey(),doc);
  localStorage.setItem(COUNT_KEY,String(slides.length));sessionStorage.setItem('special-v9-focus','0');location.reload();
 }catch(e){console.error(e);alert('从阅读版找回书页失败：'+e.message)}
}
let syncTimer=null;
function isPristineImported(slide,file){return !!slide?.flattenedImported && slide.elements?.length===1 && slide.elements[0]?.role==='imported-artwork' && slide.elements[0].src==='assets/pages/'+file}
let resyncRequested=false;
async function sync3d(){if(!ready3d||!window.setBookPageArtwork)return;if(syncing){resyncRequested=true;return}syncing=true;try{
 const mobile=window.matchMedia('(max-width:800px)').matches;
 for(let i=0;i<doc.slides.length;i++){
   const file=`page-${String(i+1).padStart(2,'0')}.jpg`;
   // Keep the supplied 1760px print for unchanged pages instead of downscaling it.
   if(isPristineImported(doc.slides[i],file))continue;
   const v=await render(doc.slides[i],true,mobile?1.5:1);
   window.setBookPageArtwork(file,v);
 }
 for(const [file,slide] of [['front-cover.jpg',doc.cover],['back-cover.jpg',doc.back]]){
   if(isPristineImported(slide,file))continue;
   window.setBookPageArtwork(file,await render(slide,true,mobile?1.5:1));
 }
 }catch(e){console.error('3D sync',e)}finally{syncing=false;await syncMedia();if(resyncRequested){resyncRequested=false;setTimeout(sync3d,0)}}}

function zipFilename(i){return `assets/pages/page-${String(i+1).padStart(2,'0')}.jpg`}
function downloadBlob(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),3000)}
function canvasBlob(c,type='image/jpeg',quality=.90){return new Promise((resolve,reject)=>c.toBlob(b=>b?resolve(b):reject(Error('无法生成图片，可能内存不足')),type,quality))}
const exportQualitySelect=$('readerExportQuality');
if(exportQualitySelect){
  try { const saved=localStorage.getItem('special-v122-export-quality');if(['1','1.5','2'].includes(saved))exportQualitySelect.value=saved; } catch (_) {}
  exportQualitySelect.addEventListener('change',()=>{try{localStorage.setItem('special-v122-export-quality',exportQualitySelect.value)}catch(_){}});
}

async function exportCurrentPageImage(){
 const b=$('exportPageImage');if(b){b.disabled=true;b.textContent='正在生成…'}
 const scale=Number(exportQualitySelect?.value)||1.5;
 try{
  const slide=activeSlide();if(!slide)throw Error('没有可导出的书页');
  status('正在渲染当前页高清图片 · '+scale+'×…');
  await fontReady();
  const pageCanvas=await render(slide,true,scale);
  const blob=await canvasBlob(pageCanvas,'image/png',1);
  const bookTitle=(getActiveBook()?.title||'特别出演').replace(/[\\/:*?"<>|\s·]+/g,'_');
  const label=(getSlideLabel(current)||'page').replace(/[\\/:*?"<>|\s·]+/g,'_');
  downloadBlob(blob,bookTitle+'_'+label+'_'+scale+'x.png');
  status('✓ 已导出当前页照片（'+pageCanvas.width+' × '+pageCanvas.height+'）');
 }catch(e){console.error(e);alert('导出当前页失败：'+e.message);status('导出当前页失败：'+e.message)}
 finally{if(b){b.disabled=false;b.textContent='🖼 导出当前页'}}
}
function showBooksManager(){
 const backdrop=document.createElement('div');backdrop.className='photo-edit-backdrop';
 backdrop.innerHTML='<section class="books-modal-dialog" role="dialog" aria-modal="true" aria-label="书目管理：新建与切换纪念册"><header class="photo-edit-header"><div><b>我的书目 · 新建与切换</b><small>每本书独立保存排版、封面与页数；手账素材、自定义字体跨书共享</small></div><button type="button" data-action="close" title="关闭">✕</button></header><div class="books-modal-body"><div class="books-list" data-books-list></div><div class="book-create-card"><h3>＋ 创建新书目</h3><div class="book-create-grid"><label>书目名称<input type="text" data-new-title placeholder="例如：2026 旅行日记" value="新的纪念册"></label><label>封面副标题<input type="text" data-new-subtitle placeholder="例如：OUR MEMORY · 2026" value="OUR MEMORY"></label><label>初始内页数<select data-new-pages><option value="4">4 页（2 跨页）</option><option value="8" selected>8 页（4 跨页）</option><option value="16">16 页（8 跨页）</option><option value="24">24 页（12 跨页）</option><option value="40">40 页（20 跨页）</option></select></label><label>创建方式<select data-new-source><option value="blank">空白手帐本（默认封面与封底）</option><option value="clone">复制当前书目作为模板</option></select></label></div><div class="photo-edit-buttons" style="margin:2px 0 0"><button type="button" data-action="create-book" class="photo-edit-primary">＋ 创建并打开新书目</button></div></div></div></section>';
 document.body.append(backdrop);
 const close=()=>backdrop.remove();
 backdrop.querySelector('[data-action="close"]').onclick=close;
 backdrop.onclick=e=>{if(e.target===backdrop)close()};
 const listEl=backdrop.querySelector('[data-books-list]');
 function renderList(){
  const list=getBooksIndex(),curId=getActiveBookId();
  listEl.innerHTML='';
  list.forEach(book=>{
   const row=document.createElement('div');row.className='book-item'+(book.id===curId?' is-active':'');
   const meta=document.createElement('div');meta.className='book-item-meta';
   const dt=book.updatedAt?new Date(book.updatedAt).toLocaleString().slice(0,16):'';
   meta.innerHTML='<strong>'+(book.title||'未命名书目')+(book.id===curId?' · 当前编辑':'')+'</strong><small>'+(book.pages||0)+' 页'+(dt?' · 更新于 '+dt:'')+'</small>';
   const acts=document.createElement('div');acts.className='book-item-actions';
   if(book.id!==curId){
    const openBtn=document.createElement('button');openBtn.className='primary';openBtn.textContent='打开这本书';
    openBtn.onclick=async()=>{
     if(db)await writeDb(activeDocKey(),doc);
     const saved=db?await readDb(book.docKey):null;
     const targetPages=saved?.slides?.length||book.pages||8;
     localStorage.setItem(ACTIVE_BOOK_KEY,book.id);
     localStorage.setItem(COUNT_KEY,String(targetPages));
     sessionStorage.setItem('special-v9-focus','0');
     location.reload();
    };
    acts.append(openBtn);
   }
   const renBtn=document.createElement('button');renBtn.textContent='重命名';
   renBtn.onclick=()=>{
    const next=prompt('输入新的书目名称：',book.title||'');
    if(!next||!next.trim())return;
    const all=getBooksIndex(),item=all.find(x=>x.id===book.id);
    if(item){item.title=next.trim();saveBooksIndex(all);if(book.id===curId){const brand=document.querySelector('.ppt-brand b');if(brand)brand.textContent=item.title}}
    renderList();
   };
   acts.append(renBtn);
   if(book.id!=='default'){
    const delBtn=document.createElement('button');delBtn.textContent='删除';
    delBtn.onclick=async()=>{
     if(!confirm('确定删除书目「'+book.title+'」吗？删除后该书目内的排版将无法找回。'))return;
     if(db)await deleteDbKey(book.docKey);
     const next=getBooksIndex().filter(x=>x.id!==book.id);
     saveBooksIndex(next);
     if(book.id===curId){
      const fallback=next[0];
      localStorage.setItem(ACTIVE_BOOK_KEY,fallback.id);
      localStorage.setItem(COUNT_KEY,String(fallback.pages||40));
      sessionStorage.setItem('special-v9-focus','0');
      location.reload();
      return;
     }
     renderList();
    };
    acts.append(delBtn);
   }
   row.append(meta,acts);listEl.append(row);
  });
 }
 renderList();
 backdrop.querySelector('[data-action="create-book"]').onclick=async()=>{
  const title=(backdrop.querySelector('[data-new-title]').value||'').trim()||'新的纪念册';
  const subtitle=(backdrop.querySelector('[data-new-subtitle]').value||'').trim()||'OUR MEMORY';
  const pages=Math.max(2,Number(backdrop.querySelector('[data-new-pages]').value)||8);
  const source=backdrop.querySelector('[data-new-source]').value;
  if(db)await writeDb(activeDocKey(),doc);
  const newId='book_'+rand(),newKey='doc:'+newId;
  let newDoc;
  if(source==='clone'){
   newDoc=clone(doc);
   const titleEl=newDoc.cover?.elements?.find(e=>e.type==='text');
   if(titleEl)titleEl.text=title;
  }else{
   newDoc={slides:Array.from({length:pages},blank),cover:{...coverTemplate(),elements:coverTemplate().elements.map(e=>e.text==='特别出演'?{...e,text:title}:e.text==='THE CITY WE KEEP'?{...e,text:subtitle}:e)},back:unfinishedTemplate()};
  }
  if(db)await writeDb(newKey,newDoc);
  const list=getBooksIndex();
  list.push({id:newId,title,subtitle,docKey:newKey,pages:newDoc.slides.length,updatedAt:Date.now()});
  saveBooksIndex(list);
  localStorage.setItem(ACTIVE_BOOK_KEY,newId);
  localStorage.setItem(COUNT_KEY,String(newDoc.slides.length));
  sessionStorage.setItem('special-v9-focus','0');
  location.reload();
 };
}
async function exportReader(){if(typeof JSZip==='undefined'){status('ZIP 库加载失败，请通过本地服务器运行');return}const scale=Number(exportQualitySelect?.value)||1.5;const b=$('exportZip');b.disabled=true;b.textContent='正在导出…';status(`准备已排版书页 · ${scale}× 高清`);try{
 const zip=new JSZip();const assets=['book.css','book.js','media-player.js','mobile-reader.js','reader-experience.js','reader-experience.css','reader-startup.js','glb-reader.js','walkman-dock.js','walkman-boot.js','walkman-dock.css','scene-layout.js','scene-layout.css','scene-layout-default.js','artistic-atmosphere.js','artistic-atmosphere.css','assets/props/nanjing-pcb.png','WALKMAN26_MIT_LICENSE.txt','assets/vendor/three-r128.min.js','assets/vendor/walkman/three.module.js','assets/vendor/walkman/walkman.js','assets/vendor/walkman/display.js','assets/vendor/walkman/tween.js','assets/vendor/walkman/geometries/RoundedBoxGeometry.js','assets/paper/cloth.webp','assets/paper/coldpress.webp','assets/paper/ep-back.webp','assets/paper/ep-front.webp','assets/paper/felt.webp','assets/paper/gloss.webp','assets/paper/laid.webp','assets/paper/matte.webp','assets/paper/newsprint.webp',...Array.from({length:8},(_,i)=>`assets/paper/leaf${i+1}.webp`)];
 for(const path of assets){if(path==='scene-layout-default.js')continue;const res=await fetch(path);if(!res.ok)throw Error('读取网站素材失败：'+path);zip.file(path,await res.blob())}
 zip.file('scene-layout-default.js','window.SPECIAL_SCENE_LAYOUT_DEFAULT='+JSON.stringify(window.SpecialSceneLayout?.getAll?.() || window.SPECIAL_SCENE_LAYOUT_DEFAULT || {})+';');
 // WALKMAN model assembled from original MIT Three.js source; no GLB asset to package.
 // A tiny miniature remains on distant cover boards while high-res art is unloaded.
 // It is regenerated from the actual edited cover so custom colours remain accurate.
 for(const [name,slide] of [['front-cover.jpg',doc.cover],['back-cover.jpg',doc.back]]){
   const full=await render(slide,true,scale);
   zip.file('assets/pages/'+name,await canvasBlob(full,'image/jpeg',.89));
   const mini=document.createElement('canvas');mini.width=96;mini.height=128;
   mini.getContext('2d').drawImage(full,0,0,mini.width,mini.height);
   zip.file('assets/pages/'+name.replace('.jpg','-preview.jpg'),await canvasBlob(mini,'image/jpeg',.82));
 }
 for(let i=0;i<doc.slides.length;i++){
  status(`生成书页与目录预览 ${i+1}/${doc.slides.length}`);
  const pageCanvas=await render(doc.slides[i],true,scale);
  zip.file(zipFilename(i),await canvasBlob(pageCanvas,'image/jpeg',.89));
  const mini=document.createElement('canvas');mini.width=280;mini.height=Math.round(280*H/W);
  mini.getContext('2d').drawImage(pageCanvas,0,0,mini.width,mini.height);
  zip.file(zipFilename(i).replace('.jpg','-preview.jpg'),await canvasBlob(mini,'image/jpeg',.79));
 }
 const manifest=await createMediaManifest(false,zip),n=doc.slides.length;
 const data=`window.PHOTOBOOK={id:'special-appearance-ppt-v11',title:'特别出演',pageWidth:880,pageHeight:1180,frontCover:{file:'front-cover.jpg',alt:'特别出演'},backCover:{file:'back-cover.jpg',alt:'特别出演封底'},spreads:Array.from({length:${n/2}},(_,i)=>({id:'spread-'+(i+1),left:{file:'page-'+String(i*2+1).padStart(2,'0')+'.jpg',alt:'书页'},right:{file:'page-'+String(i*2+2).padStart(2,'0')+'.jpg',alt:'书页'}}))};\nwindow.SPECIAL_MEDIA_MANIFEST=${JSON.stringify(manifest)};`;
 zip.file('book-data.js',data);
 const response=await fetch('reader.html');if(!response.ok)throw Error('找不到 reader.html 模板');zip.file('index.html',await response.text());
 zip.file('README.txt','特别出演 V12.17 · 3D 多媒体阅读版，含书页目录、阅读进度和双指放大。\n请将 ZIP 解压后上传静态 HTTPS 网站服务。\n直接双击 index.html (file://) 可能受浏览器限制。\n音视频使用点击播放，背景音乐需要手动开启。\n本包包含私密照片及音视频，未经授权请勿公开上传。\n视频建议 H.264/AAC MP4，音频建议 MP3。');
 status('正在压缩阅读版网站…');const blob=await zip.generateAsync({type:'blob',compression:'DEFLATE',compressionOptions:{level:4}});downloadBlob(blob,'特别出演_V12.3.1_封面边框修复阅读版.zip');status(`✓ ${scale}× 高清阅读版已导出，支持邻页预加载`)
 }catch(e){console.error(e);alert('导出失败：'+e.message);status('导出失败：'+e.message)}finally{b.disabled=false;b.textContent='↓ 导出阅读版'}}
async function backup(){if(db)await writeDb(activeDocKey(),doc);downloadBlob(new Blob([JSON.stringify({version:12,slides:doc.slides,cover:doc.cover,back:doc.back,musicId:doc.musicId||null,musicIds:doc.musicIds||[],musicSettings:musicSettings(doc.musicSettings),created:new Date().toISOString()},null,2)],{type:'application/json'}),'特别出演_V11_排版数据备份_不含音视频.json')}
async function restore(file){try{const data=JSON.parse(await file.text());if(!Array.isArray(data.slides)||!data.slides.length||data.slides.length>80||data.slides.length%2)throw Error('文件不是可用的 V9 备份');if(!confirm('导入会覆盖当前排版。确定吗？'))return;if(window.SpecialHistory){try{await window.SpecialHistory.create(doc,'导入排版 JSON 前',{force:true})}catch(e){throw Error('导入前自动安全快照失败：'+e.message+'。请先导出完整工程 ZIP。')}}const importedDoc={slides:data.slides,cover:migrateCover(data.cover),back:migrateBack(data.back),musicId:data.musicId||null,musicIds:data.musicIds||[...(data.musicId?[data.musicId]:[])],musicSettings:musicSettings(data.musicSettings)};await writeDb(activeDocKey(),importedDoc);doc=importedDoc;if(doc.slides.length!==window.PHOTOBOOK.spreads.length*2){localStorage.setItem(COUNT_KEY,String(doc.slides.length));sessionStorage.setItem('special-v9-focus','0');location.reload();return}choose(0);renderThumbs();status('✓ 完整工程已恢复')}catch(e){alert('导入失败：'+e.message)}}
async function restoreImportedPages(){
 const project=importedReaderDraft(12);if(!project){alert('此安装包没有内置的已导入书页');return}
 if(!confirm('这会覆盖此浏览器保存的现有草稿，并恢复上传的 12 张高清书页底图。\n建议先点「完整工程 ZIP」备份。确定继续吗？'))return;
 try { if(window.SpecialHistory)await window.SpecialHistory.create(doc,'恢复原始上传页前',{force:true});await writeDb(activeDocKey(),project);doc=project;localStorage.setItem(COUNT_KEY,String(doc.slides.length));sessionStorage.setItem('special-v9-focus','0');location.reload(); }
 catch(e){alert('恢复失败：'+e.message)}
}
// V12.9: safe page-level operations. A single cross-page operation can be undone
// until the next edit; the original editable elements and media references are kept.
let lastCrossPage=null;
function refreshPageTargets(){
 const pick=$('pageTargetSelect');if(!pick)return;
 const previous=Number(pick.value),options=[];
 for(let i=0;i<doc.slides.length;i++)if(i!==current)options.push(i);
 pick.replaceChildren();
 for(const i of options){const o=document.createElement('option');o.value=String(i);o.textContent=getSlideLabel(i);pick.append(o)}
 const preferred=options.includes(previous)?previous:options.includes(current+1)?current+1:options[0];
 if(preferred!==undefined)pick.value=String(preferred);
 const valid=current>=0&&options.length>0;
 for(const id of ['copyPageTo','copyElementsTo','moveElementsTo'])$(id).disabled=!valid;
 $('undoCrossPage').disabled=!lastCrossPage;
}
function pageTarget(){const n=Number($('pageTargetSelect')?.value);if(current<0||!Number.isInteger(n)||n<0||n>=doc.slides.length||n===current){status('请先选择正文页和另一张目标页');return null}return n}
function duplicateWithIds(elements){const groups=new Map();return elements.map(el=>{
 const e=clone(el);e.id=rand();if(e.groupId){if(!groups.has(e.groupId))groups.set(e.groupId,'grp-'+rand());e.groupId=groups.get(e.groupId)}return e;
})}
function rememberCrossPage(from,to){lastCrossPage={from,to,source:clone(doc.slides[from]),target:clone(doc.slides[to])}}
function finishCrossPage(to,items){
 const from=current;undoStack=[];redoStack=[];persist();choose(to);drawThumbnail(to);if(from!==to)drawThumbnail(from);
 if(items?.length){const ids=new Set(items.map(e=>e.id));selectElements(activeSlide().elements.map((el,i)=>ids.has(el.id)?i:-1).filter(i=>i>=0),{expandGroup:false});properties();schedule()}
 refreshPageTargets();
}
function copyPageToTarget(){const to=pageTarget();if(to===null)return;
 const from=current,target=doc.slides[to];
 if(!confirm(`复制 ${getSlideLabel(from)} 的背景和全部图层到 ${getSlideLabel(to)}？\n\n目标页目前有 ${target.elements.length} 个图层，将被覆盖。\n操作后可点「撤销上次跨页操作」。`))return;
 rememberCrossPage(from,to);
 doc.slides[to]={...clone(doc.slides[from]),elements:duplicateWithIds(doc.slides[from].elements)};
 finishCrossPage(to);status(`✓ 已复制整页到 ${getSlideLabel(to)}，可撤销`);
}
function transferElementsToTarget(moveMode){const to=pageTarget();if(to===null)return;
 const entries=selectedEditable().filter(({el})=>!el.hidden&&el.role!=='imported-artwork');
 if(!entries.length){status('请先选择未锁定的照片、文字或手账素材');return}
 const from=current,ids=new Set(entries.map(({el})=>el.id)),items=duplicateWithIds(entries.map(({el})=>el));
 if(!confirm(`${moveMode?'移动':'复制'} ${items.length} 个选中图层：\n${getSlideLabel(from)} → ${getSlideLabel(to)}\n\n目标页原有内容会保留，元素位置和图层可编辑性不变。确定吗？`))return;
 rememberCrossPage(from,to);
 if(moveMode)doc.slides[from].elements=doc.slides[from].elements.filter(e=>!ids.has(e.id));
 doc.slides[to].elements.push(...items);
 finishCrossPage(to,items);
 status(`✓ 已${moveMode?'移动':'复制'} ${items.length} 个图层到 ${getSlideLabel(to)}，可撤销`);
}
function undoCrossPage(){if(!lastCrossPage){status('没有可撤销的跨页操作');return}
 const op=lastCrossPage;lastCrossPage=null;
 doc.slides[op.from]=op.source;doc.slides[op.to]=op.target;
 undoStack=[];redoStack=[];persist();choose(op.from);drawThumbnail(op.from);drawThumbnail(op.to);refreshPageTargets();status('✓ 已撤销上次跨页操作，两页内容已恢复');
}
function reloadAt(idx){lastCrossPage=null;localStorage.setItem(COUNT_KEY,String(doc.slides.length));sessionStorage.setItem('special-v9-focus',String(clamp(idx,0,doc.slides.length-1)));writeDb(DOC_KEY,doc).then(()=>location.reload()).catch(e=>alert('新增失败：'+e.message))}
function insertSpread(){if(current<0){alert('请先选择一张正文页，再新增跨页');return}if(doc.slides.length>=80){alert('最多支持 80 张内页');return}
 let at=Math.floor(current/2)*2+2;
 const end=doc.slides.length-2,lastLeft=doc.slides[end],lastRight=doc.slides[end+1];
 const isCredits=lastLeft?.elements?.some(e=>e.type==='text'&&e.text==='未完待续')&&lastRight?.elements?.some(e=>e.type==='text'&&e.text==='STARRING');
 if(isCredits)at=Math.min(at,end); // 新记忆始终插在片尾字幕之前
 doc.slides.splice(at,0,blank(),blank());reloadAt(at)}
function dupSpread(){if(current<0){alert('封面和封底不可复制为跨页');return}if(doc.slides.length>=80){alert('最多支持 80 张内页');return}const at=Math.floor(current/2)*2;doc.slides.splice(at+2,0,clone(doc.slides[at]),clone(doc.slides[at+1]));reloadAt(at+2)}
function delSpread(){if(current<0){alert('封面和封底不可删除');return}if(doc.slides.length<=2){alert('至少保留一组跨页');return}if(!confirm('确认删除当前跨页的左右两张书页？'))return;const at=Math.floor(current/2)*2;doc.slides.splice(at,2);reloadAt(Math.min(at,doc.slides.length-1))}
// V12.13: overview of all pages; order changes preserve exact slide object references
// (including editable layers, media IDs, filter values and embedded image data).
let overviewSelection=0, overviewBusy=false, overviewDragging=null, lastPageOrder=null;
let overviewCheckpoint=false, overviewPreviewCache=new WeakMap(), overviewObserver=null;
const overviewOpen=()=>!!$('pageOverview')&&!$('pageOverview').hidden;
function overviewMessage(txt){$('pageOverviewStatus').textContent=txt;}
function overviewButtons(){
 const valid=Number.isInteger(overviewSelection)&&overviewSelection>=0&&overviewSelection<doc.slides.length;
 for(const id of ['pageOverviewInsertBefore','pageOverviewInsertAfter','pageOverviewMove'])$(id).disabled=!valid||overviewBusy;
 for(const id of ['pageOverviewMakeCover','pageOverviewMakeBack'])$(id).disabled=!valid||overviewBusy;
 $('pageOverviewSwapEnds').disabled=overviewBusy;
 $('pageOverviewUndo').disabled=!lastPageOrder||overviewBusy;
 $('pageOverviewTarget').disabled=!valid||overviewBusy;
}
function overviewCard(index,side){
 const fixed=index<0;
 const card=document.createElement('div');card.className='v1213-page-card'+(fixed?' v1218-bookend':'');
 card.dataset.overviewIndex=String(index);card.setAttribute('role','button');card.tabIndex=0;
 card.draggable=true;card.setAttribute('aria-pressed',String(overviewSelection===index));
 const from=$('slideList').querySelector(fixed?`canvas[data-special="${index}"]`:`canvas[data-slide="${index}"]`);
 const thumb=document.createElement('canvas');thumb.width=100;thumb.height=134;
 if(from){try{thumb.getContext('2d').drawImage(from,0,0,100,134)}catch(_){}}
 const slide=fixed?(index===-1?doc.cover:doc.back):doc.slides[index];
 thumb._previewSlide=slide;
 const cached=overviewPreviewCache.get(slide);
 if(cached){try{thumb.getContext('2d').drawImage(cached,0,0,100,134)}catch(_){}}
 const title=document.createElement('strong');title.textContent=fixed?(index===-1?'封面 · 可交换':'封底 · 可交换'):`第 ${index+1} 页`;
 const info=document.createElement('span');info.textContent=fixed?'点击选择 / 拖动与正文页交换':(side||((index%2)?'右页':'左页'))+' · 点击选择 / 拖动排序';
 card.append(thumb,title,info);
 card.addEventListener('click',()=>selectOverviewPage(index));
 card.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();selectOverviewPage(index)}});
 card.addEventListener('dragstart',e=>{if(overviewBusy){e.preventDefault();return}overviewDragging=index;e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',String(index));card.classList.add('v1213-dragging')});
 card.addEventListener('dragend',()=>{overviewDragging=null;clearOverviewDropStyles()});
 card.addEventListener('dragover',e=>{if(overviewDragging===null||overviewDragging===index||overviewBusy)return;e.preventDefault();e.dataTransfer.dropEffect='move';clearOverviewDropStyles();card.classList.add('v1213-drag-over')});
 card.addEventListener('dragleave',e=>{if(!card.contains(e.relatedTarget))card.classList.remove('v1213-drag-over')});
 card.addEventListener('drop',e=>{e.preventDefault();const source=overviewDragging;overviewDragging=null;clearOverviewDropStyles();if(Number.isInteger(source)&&source!==index)moveOverviewSlot(source,index)});
 return card;
}
function clearOverviewDropStyles(){$('pageOverviewGrid').querySelectorAll('.v1213-dragging,.v1213-drag-over').forEach(el=>el.classList.remove('v1213-dragging','v1213-drag-over'))}
function renderOverviewGrid(){if(!overviewOpen())return;
 if(overviewObserver){overviewObserver.disconnect();overviewObserver=null}
 const list=$('pageOverviewGrid');list.replaceChildren();
 const bookends=document.createElement('div');bookends.className='v1213-bookends';bookends.append(overviewCard(-1),overviewCard(-2));list.append(bookends);
 for(let i=0;i<doc.slides.length;i+=2){
  const block=document.createElement('div');block.className='v1213-spread';
  const label=document.createElement('p');label.className='v1213-spread-title';label.textContent=`跨页 ${String(i/2+1).padStart(2,'0')} · 左 / 右`;
  const pair=document.createElement('div');pair.className='v1213-spread-pages';pair.append(overviewCard(i,'左页'),overviewCard(i+1,'右页'));
  block.append(label,pair);list.append(block);
 }
 const target=$('pageOverviewTarget'),saved=target.value;target.replaceChildren();
 for(let i=0;i<doc.slides.length;i++){const opt=document.createElement('option');opt.value=String(i);opt.textContent=`第 ${i+1} 页（${i%2?'右':'左'}）`;target.append(opt)}
 target.value=String(saved!==''&&Number.isInteger(+saved)&&+saved<doc.slides.length?+saved:overviewSelection);
 // Lazy-render thumbnails for visible spreads. The sidebar canvas may not yet be loaded
 // when the overview first opens; always generate previews from the actual editable slides.
 const loadThumb=async node=>{
  const slide=node._previewSlide;if(!slide)return;
  let ready=overviewPreviewCache.get(slide);
  if(!ready){try{ready=await render(slide,false,.20);overviewPreviewCache.set(slide,ready)}catch(e){console.warn('书页缩略图生成失败',e);return}}
  if(node.isConnected&&node._previewSlide===slide){const c=node.getContext('2d');c.clearRect(0,0,node.width,node.height);c.drawImage(ready,0,0,node.width,node.height)}
 };
 const thumbs=list.querySelectorAll('.v1213-page-card canvas');
 if(typeof IntersectionObserver==='function'){
  overviewObserver=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting){overviewObserver?.unobserve(entry.target);loadThumb(entry.target)}},{root:$('pageOverview').querySelector('.v1213-overview-scroll'),rootMargin:'180px'});
  thumbs.forEach(node=>overviewObserver.observe(node));
 }else thumbs.forEach(loadThumb);
 overviewButtons();
}
function selectOverviewPage(i){if(overviewBusy||(![-2,-1].includes(i)&&(i<0||i>=doc.slides.length)))return;overviewSelection=i;choose(i);renderOverviewGrid();overviewMessage(i===-1?'已选择封面，可与任意书页或封底交换':i===-2?'已选择封底，可与任意书页或封面交换':`已选择第 ${i+1} 页 · ${i%2?'右页':'左页'}`);}
function openOverview(){overviewSelection=current;overviewCheckpoint=false;overviewPreviewCache=new WeakMap();$('pageOverview').hidden=false;renderOverviewGrid();$('pageOverview').querySelector('.v1213-dialog').focus();overviewMessage('拖动页面排序；手机端可选目标位置后点击「移动单页」。');}
function closeOverview(){if(overviewBusy)return;$('pageOverview').hidden=true;overviewDragging=null;if(overviewObserver){overviewObserver.disconnect();overviewObserver=null}}
async function snapshotBeforePageChange(reason,force=false){
 if(!db)throw Error('本机存储尚未就绪。请先保存完整工程 ZIP。');
 if(!window.SpecialHistory?.create)throw Error('缺少 V12.11 历史功能，请先完整更新到 V12.13。');
 // One verified snapshot per overview session keeps dragging responsive, while insertion
 // (which changes the physical sheet count) always creates a fresh checkpoint.
 if(overviewCheckpoint&&!force)return;
 await window.SpecialHistory.create(doc,'书页管理前 · '+reason,{force:true});
 overviewCheckpoint=true;
}
function reorderDomPages(from,to){
 const list=$('slideList'),rows=Array.from(list.querySelectorAll('.slide-item')).filter(b=>b.querySelector('canvas[data-slide]'));
 const moving=rows[from],target=rows[to];if(!moving||!target)throw Error('缩略图列表尚未准备好');
 if(from<to)list.insertBefore(moving,target.nextSibling);else list.insertBefore(moving,target);
 Array.from(list.querySelectorAll('canvas[data-slide]')).forEach((c,i)=>{
  c.dataset.slide=String(i);const item=c.closest('.slide-item');
  item.querySelector('.slide-index').textContent=String(i+1).padStart(2,'0');
  item.querySelector('.slide-name').textContent=getSlideLabel(i);
 });
}
function commitReorder(from,to){
 const old=doc.slides.slice();const [slide]=doc.slides.splice(from,1);doc.slides.splice(to,0,slide);
 try{reorderDomPages(from,to)}catch(e){doc.slides=old;renderThumbs();throw e}
 lastPageOrder={slides:old,focus:from};
 lastCrossPage=null;undoStack=[];redoStack=[];overviewSelection=to;
 choose(to);persist();refreshPageTargets();
 if(overviewOpen())renderOverviewGrid();
}
// V12.18: cover/back are physical roles, not permanent ownership of artwork.
// Swaps preserve every slide object, including all editable layers and imported source URLs.
async function moveOverviewSlot(from,to){
 if(overviewBusy||from===to)return;
 if(from>=0&&to>=0){await reorderOverviewPage(from,to);return}
 const valid=i=>i===-1||i===-2||(Number.isInteger(i)&&i>=0&&i<doc.slides.length);
 if(!valid(from)||!valid(to))return;
 const role=from===-1||to===-1?'cover':'back';
 const page=from>=0?from:to;
 await swapBookend(role,page,from,to);
}
async function assignBookend(role){
 const page=overviewSelection;
 if(page<0||page>=doc.slides.length)return;
 await swapBookend(role,page,page,role==='cover'?-1:-2);
}
async function swapBookend(role,page,from,to){
 if(overviewBusy)return;
 const opposite=(from===-1&&to===-2)||(from===-2&&to===-1);
 if(!opposite&&(page<0||page>=doc.slides.length))return;
 const name=opposite?'封面与封底':role==='cover'?'封面':'封底';
 if(!confirm(opposite?'交换封面与封底的位置？两张书页的图层将全部保留。':`将第 ${page+1} 页与${name}交换？原${name}会保留在第 ${page+1} 页，所有图层和媒体都不会删除。`))return;
 overviewBusy=true;overviewButtons();overviewMessage('正在创建交换前的安全历史…');
 let old=null;
 try{
  await snapshotBeforePageChange(`交换${name}`);
  old={slides:doc.slides.slice(),cover:doc.cover,back:doc.back,focus:from};
  if(opposite){const tmp=doc.cover;doc.cover=doc.back;doc.back=tmp;doc.cover.reassignedBookend=true;doc.back.reassignedBookend=true;overviewSelection=to;}
  else{const tmp=doc[role];doc[role]=doc.slides[page];doc.slides[page]=tmp;doc[role].reassignedBookend=true;overviewSelection=role==='cover'?-1:-2;}
  lastPageOrder=old;lastCrossPage=null;undoStack=[];redoStack=[];
  renderThumbs();choose(overviewSelection);persist();renderOverviewGrid();
  overviewMessage(`✓ 已交换${name}，原画面及独立图层均已保留。`);
  status(`✓ ${name}已重新指定；退出编辑后同步 3D 摄影书`);
 }catch(e){if(old){doc.slides=old.slides;doc.cover=old.cover;doc.back=old.back;renderThumbs();}overviewMessage('交换失败：'+e.message);status('交换未完成：'+e.message)}
 finally{overviewBusy=false;overviewButtons()}
}
async function reorderOverviewPage(from,to){
 if(overviewBusy||from===to)return;
 if(!Number.isInteger(from)||!Number.isInteger(to)||from<0||to<0||from>=doc.slides.length||to>=doc.slides.length)return;
 overviewBusy=true;overviewButtons();overviewMessage('正在创建重排前安全历史…');
 try{
  await snapshotBeforePageChange(`第 ${from+1} 页移到第 ${to+1} 页`);
  commitReorder(from,to);overviewMessage(`✓ 第 ${from+1} 页已移动到第 ${to+1} 页；图层保持独立可编辑，不刷新网页。`);
  status(`✓ 已调整书页顺序：第 ${from+1} 页 → 第 ${to+1} 页`);
 }catch(e){overviewMessage('移动失败：'+e.message);status('书页移动未完成：'+e.message)}
 finally{overviewBusy=false;overviewButtons()}
}
function hasEndingCredits(){const s=doc.slides;return s.length>=2 && s[s.length-2]?.elements?.some(e=>e.type==='text'&&e.text==='未完待续') && s[s.length-1]?.elements?.some(e=>e.type==='text'&&e.text==='STARRING')}
async function insertOverviewBlank(after){
 if(overviewBusy)return;
 const idx=overviewSelection;if(idx<0||idx>=doc.slides.length)return;
 if(doc.slides.length>78){overviewMessage('目前最多 80 张正文页，已没有插入空白页的空间。');return}
 const keepEnding=hasEndingCredits();
 const requestedAt=idx+(after?1:0);
 const at=keepEnding?Math.min(requestedAt,doc.slides.length-2):requestedAt;
 if(!confirm(`将在第 ${at+1} 页的位置插入一张空白页。\n\n3D 精装书要求内页为偶数，因此还会在末尾附近自动补一张空白页（共增加 2 页）。原有书页不会被删除。${requestedAt!==at?'\n\n为保留片尾字幕，将插入位置调整到片尾双页之前。':''}\n\n新增页面后需要重建 3D 书结构，编辑器将重新打开。确定吗？`))return;
 overviewBusy=true;overviewButtons();overviewMessage('正在建立插入前的历史备份…');
 try{
  await snapshotBeforePageChange(`在第 ${at+1} 页插入空白页`,true);
  const originalOrder=doc.slides.slice();
  doc.slides.splice(at,0,blank());
  // The second blank is a physical-book companion; keep the ending credits at the end.
  const companion=keepEnding?Math.max(at+1,doc.slides.length-2):doc.slides.length;
  doc.slides.splice(companion,0,blank());
  if(doc.slides.length%2||doc.slides.length>80){doc.slides=originalOrder;throw Error('页数校验异常')}
  try{sessionStorage.setItem('special-v1213-flash',`✓ 插入完成：第 ${at+1} 页为新空白页，另补一张配对空白页。`)}catch(_){}
  reloadAt(at);
 }catch(e){overviewMessage('插入失败：'+e.message);status('未能插入书页：'+e.message)}
 finally{overviewBusy=false;overviewButtons()}
}
async function undoOverviewOrder(){if(overviewBusy||!lastPageOrder)return;
 overviewBusy=true;overviewButtons();overviewMessage('正在撤销上次排序…');
 try{
  await snapshotBeforePageChange('撤销书页调整');
  const previous=lastPageOrder;doc.slides=previous.slides.slice();if(previous.cover)doc.cover=previous.cover;if(previous.back)doc.back=previous.back;lastPageOrder=null;
  overviewSelection=previous.focus;lastCrossPage=null;undoStack=[];redoStack=[];
  renderThumbs();choose(previous.focus);persist();renderOverviewGrid();
  overviewMessage('✓ 已恢复调整前的书页顺序');status('✓ 书页排序已撤销');
 }catch(e){overviewMessage('撤销失败：'+e.message)}finally{overviewBusy=false;overviewButtons()}
}
function setupPageOverview(){
 $('openPageOverview').onclick=openOverview;
 $('closePageOverview').onclick=closeOverview;
 $('pageOverview').addEventListener('click',e=>{if(e.target===$('pageOverview'))closeOverview()});
 $('pageOverviewInsertBefore').onclick=()=>insertOverviewBlank(false);
 $('pageOverviewInsertAfter').onclick=()=>insertOverviewBlank(true);
 $('pageOverviewMove').onclick=()=>reorderOverviewPage(overviewSelection,Number($('pageOverviewTarget').value));
 $('pageOverviewMakeCover').onclick=()=>assignBookend('cover');
 $('pageOverviewMakeBack').onclick=()=>assignBookend('back');
 $('pageOverviewSwapEnds').onclick=()=>moveOverviewSlot(-1,-2);
 $('pageOverviewUndo').onclick=undoOverviewOrder;
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&overviewOpen()){e.preventDefault();closeOverview()}});
}
// V12.10: move ONE interior page, without reloading the document or re-rendering every thumbnail.
function shiftPage(delta){
 if(current<0){status('封面／封底请在「全部书页总览」中与正文页交换');return}
 const from=current,to=from+delta;
 if(to<0||to>=doc.slides.length){status('已经到达书页边界');return}
 const list=$('slideList');
 const rows=Array.from(list.querySelectorAll('.slide-item')).filter(b=>b.querySelector('canvas[data-slide]'));
 const row=rows[from],other=rows[to];
 if(!row||!other)return;
 const [moved]=doc.slides.splice(from,1);doc.slides.splice(to,0,moved);
 if(delta>0)list.insertBefore(other,row);else list.insertBefore(row,other);
 const ordered=Array.from(list.querySelectorAll('canvas[data-slide]'));
 ordered.forEach((c,i)=>{
   c.dataset.slide=String(i);
   const item=c.closest('.slide-item');
   item.querySelector('.slide-index').textContent=String(i+1).padStart(2,'0');
   item.querySelector('.slide-name').textContent=getSlideLabel(i);
 });
 lastCrossPage=null;undoStack=[];redoStack=[];
 current=to;resetSelection();snapGuides=[];
 $('editingLabel').textContent=getSlideLabel(current);
 list.querySelectorAll('.slide-item').forEach(b=>b.classList.toggle('active',b.querySelector('canvas[data-slide]')?.dataset.slide===String(current)));
 row.scrollIntoView({block:'nearest'});
 persist();refreshPageTargets();properties();redrawLive();
 status(`✓ 已将原第 ${from+1} 页移动到第 ${to+1} 页（单页移动，无需刷新）`);
}
// In the editor, navigate by one page at a time, including the cover and back cover.
function stepEditPage(delta){
 const i=current===-1?-1:current===-2?doc.slides.length:current;
 const to=clamp(i+delta,-1,doc.slides.length);
 choose(to===doc.slides.length?-2:to);
}
// Same continuous background soundtrack in the studio and 3D reader; no modal player.
async function syncStudioMusic(){
 const button=$('studioMusicToggle'),picker=$('musicPlaylistSelect');if(!button)return;
 const state=window.SpecialMedia?.musicState?.()||{available:false,playing:false};
 button.textContent=!(doc.musicIds||[]).length?'♫ 添加背景音乐':state.playing?'♫ 暂停背景音乐':'♫ 播放背景音乐';
 button.setAttribute('aria-pressed',String(state.playing));
 button.title='背景音乐独立于书页录音；播放后可编辑、翻页、关闭编辑器，不会中断';
 if(!picker||!db)return;
 const all=await MediaStore.all(db),names=new Map();picker.replaceChildren();
 for(const id of doc.musicIds||[]){const item=all.find(m=>m.id===id);if(!item)continue;const base=(item.name||'背景音乐').replace(/\.[^.]+$/,'');const count=(names.get(base)||0)+1;names.set(base,count);const option=document.createElement('option');option.value=id;option.textContent=count>1?`${base} (${count})`:base;picker.append(option);}
 picker.disabled=!picker.options.length;if((doc.musicIds||[]).includes(doc.musicId))picker.value=doc.musicId;
}
window.addEventListener('special:musicstate',syncStudioMusic);
// V12.9: replace existing photos without moving or resizing their frames.
let imageReplacePending=null;
function startImageReplace(){
 const targets=selectedEditable().filter(({el})=>el.type==='image'&&el.role!=='imported-artwork');
 if(!targets.length){status('先在画布或图层面板选中需要替换的照片（可多选）');return}
 imageReplacePending={slide:activeSlide(),page:current,ids:targets.map(({el})=>el.id)};
 const input=$('replacePhotoInput');input.value='';input.click();
}
async function preparePhoto(file){
 if(!file||!['image/jpeg','image/png','image/webp','image/avif'].includes(file.type))throw Error('请选择 JPG、PNG、WebP 或 AVIF 图片：'+(file?.name||''));
 const img=await createImageBitmap(file);
 try{
  const scale=Math.min(1,1800/Math.max(img.width,img.height));
  const c=document.createElement('canvas');c.width=Math.max(1,Math.round(img.width*scale));c.height=Math.max(1,Math.round(img.height*scale));
  const g=c.getContext('2d',{willReadFrequently:true});g.clearRect(0,0,c.width,c.height);g.drawImage(img,0,0,c.width,c.height);
  let transparent=false;
  if(file.type!=='image/jpeg'){
   const pixels=g.getImageData(0,0,c.width,c.height).data;
   for(let j=3;j<pixels.length;j+=4)if(pixels[j]<254){transparent=true;break}
  }
  return {src:transparent?c.toDataURL('image/png'):c.toDataURL('image/jpeg',.90),transparent,width:img.width,height:img.height};
 }finally{img.close?.()}
}
async function handleImageReplace(files){
 const job=imageReplacePending;imageReplacePending=null;
 if(!job||!files.length)return;
 if(activeSlide()!==job.slide||current!==job.page){alert('已切换书页，请重新选中要替换的照片');return}
 if(files.length!==job.ids.length){alert(`已选 ${job.ids.length} 个照片图层，但上传了 ${files.length} 个文件。\n请一一对应后重试，当前书页未修改。`);return}
 const targets=job.ids.map(id=>job.slide.elements.find(el=>el.id===id));
 if(targets.some(el=>!el||el.type!=='image'||el.locked||el.role==='imported-artwork')){alert('部分图片图层已变更或被锁定，请重新选择');return}
 const names=files.map((f,i)=>`${i+1}. ${f.name} → 第 ${job.slide.elements.indexOf(targets[i])+1} 层`).join('\n');
 if(!confirm(`将按图层从下到上的顺序替换 ${files.length} 张照片：\n\n${names}\n\n保留原位置、大小、旋转、透明度及显示方式；新图重置裁剪和取景。确定吗？`))return;
 try{
  status(`正在处理 ${files.length} 张替换图片…`);
  // Finish decoding every file before touching the project: all-or-nothing.
  const prepared=[];for(const file of files)prepared.push(await preparePhoto(file));
  if(activeSlide()!==job.slide||current!==job.page||job.ids.some((id,i)=>job.slide.elements.find(el=>el.id===id)!==targets[i]))throw Error('处理期间书页或图层发生变化，请重新选择');
  modify(()=>targets.forEach((el,i)=>Object.assign(el,{src:prepared[i].src,crop:{x:0,y:0,w:1,h:1},zoom:1,offsetX:0,offsetY:0})));
  status(`✓ 已替换 ${files.length} 张照片；排版位置和旋转保持不变`);
 }catch(err){console.error(err);alert('替换失败，未修改原图层：'+err.message)}
}
// V12.11: independent local version history, separate from the main V9 IndexedDB.
let historyWorking=false;
const fmtBytes=v=>!Number.isFinite(v)?'未知':v>=1024**3?(v/1024**3).toFixed(1)+' GB':v>=1024**2?(v/1024**2).toFixed(1)+' MB':(v/1024).toFixed(0)+' KB';
function historyMessage(msg){const el=$('historyStatus');if(el)el.textContent=msg}
async function updateHistoryList(){const api=window.SpecialHistory,host=$('historyVersions');if(!api||!host)return;
 try{const rows=await api.list();host.replaceChildren();if(!rows.length){const p=document.createElement('p');p.textContent='暂无历史版本。编辑后的首次快照约 90 秒生成，此后最多每 20 分钟记录一次。';host.append(p)}
 for(const row of rows){const item=document.createElement('div');item.className='v1211-version';const info=document.createElement('div');info.className='v1211-version-info';const title=document.createElement('strong');title.textContent=new Date(row.created).toLocaleString('zh-CN',{hour12:false});const note=document.createElement('small');note.textContent=`${row.reason||'历史版本'} · ${row.slideCount} 页 · ${row.filled} 页有内容`;info.append(title,note);
 const restore=document.createElement('button');restore.textContent='恢复';restore.type='button';restore.onclick=()=>restoreHistory(row.id);
 const del=document.createElement('button');del.textContent='删除';del.type='button';del.className='v1211-delete';del.onclick=async()=>{if(!confirm('确定删除这个历史版本？操作不可撤销。'))return;try{await api.remove(row.id);await updateHistoryList()}catch(e){alert('删除失败：'+e.message)}};item.append(info,restore,del);host.append(item)}
 const usage=await api.estimate();$('historyUsage').textContent=usage?`浏览器总存储：${fmtBytes(usage.usage)} / ${fmtBytes(usage.quota)}（${Math.round(usage.ratio*100)}%）`:'无法读取浏览器剩余空间；仍建议定期下载完整工程 ZIP';
 }catch(e){historyMessage('无法读取历史：'+e.message)}
}
async function manualHistory(){if(historyWorking)return;historyWorking=true;const b=$('historyCreate');b.disabled=true;
 try{await writeDb(activeDocKey(),doc);const row=await window.SpecialHistory.create(doc,'手动标记');historyMessage(row.skipped?'当前排版与最近快照相同，未重复保存':'✓ 已创建手动历史快照');await updateHistoryList()}
 catch(e){alert('快照失败，现有工程未被修改：'+e.message)}finally{historyWorking=false;b.disabled=false}
}
async function restoreHistory(id){if(historyWorking)return;if(!confirm('将所选历史版本的「书页排版」恢复到当前编辑器。\n恢复前将自动创建当前版本的安全快照。\n注意：历史不包含独立的字体、素材库、音视频文件；换设备仍须使用完整工程 ZIP。确定继续？'))return;
 historyWorking=true;try{
  const result=await window.SpecialHistory.restore(id); // Validate snapshot assets before altering live draft.
  await window.SpecialHistory.create(doc,'恢复历史版本前',{force:true});
  clearTimeout(pendingSave);const restoredDoc={slides:result.project.slides,cover:migrateCover(result.project.cover),back:migrateBack(result.project.back),musicId:result.project.musicId||null,musicIds:result.project.musicIds||[...(result.project.musicId?[result.project.musicId]:[])],musicSettings:musicSettings(result.project.musicSettings)};await writeDb(activeDocKey(),restoredDoc);doc=restoredDoc;
  localStorage.setItem(COUNT_KEY,String(doc.slides.length));sessionStorage.setItem('special-v9-focus','0');location.reload();
 }catch(e){alert('恢复停止，原工程保持不变：'+e.message)}finally{historyWorking=false}
}
async function inspectProject(){const host=$('historyReport');host.hidden=false;host.textContent='正在检查……';
 try{const pages=[doc.cover,...doc.slides,doc.back],imgs=[],missing=[],mediaIds=new Set(),fonts=new Set();let images=0,texts=0;
 for(const page of pages)for(const el of page?.elements||[]){if(el.type==='image'){images++;for(const field of ['src','poster','cutoutOriginalSrc']){const value=el[field];if(!value)continue;if(value.startsWith('blob:'))missing.push('发现临时图片链接（'+field+'），备份可能缺图');else if(/^(assets\/|site-data\/)/.test(value))imgs.push(value)}}
 if(el.type==='text'){texts++;const match=/UserFont_[A-Za-z0-9_-]+/.exec(el.family||'');if(match)fonts.add(match[0])}
 if((el.type==='audio'||el.type==='video')&&el.mediaId)mediaIds.add(el.mediaId)}
 for(const id of doc.musicIds||[])if(id)mediaIds.add(id);if(doc.musicId)mediaIds.add(doc.musicId);
 for(const src of new Set(imgs)){try{const r=await fetch(src,{cache:'no-store'});if(!r.ok)missing.push('图片无法读取：'+src)}catch(_){missing.push('图片无法读取：'+src)}}
 if(db)for(const id of mediaIds){const record=await MediaStore.get(db,id);if(!record?.blob)missing.push('媒体缺失：'+id)}
 for(const name of fonts)if(!installedFonts.some(f=>f.family.includes(name)))missing.push('自定义字体可能缺失：'+name);
 const stats=projectStats(doc);const report=[`书页：${doc.slides.length} 张正文（${stats.content} 张含内容）`,`图层：${images} 张图片、${texts} 段文字`,`媒体引用：${mediaIds.size} 个；自定义字体引用：${fonts.size} 种`,`浏览器已能读取的外部图片：${new Set(imgs).size} 个`];
 report.push(missing.length?`\n发现 ${missing.length} 项可能的问题：\n`+missing.slice(0,18).join('\n')+(missing.length>18?'\n…还有更多':''):'\n✓ 当前引用检查未发现缺失。');
 report.push('\n说明：这是当前浏览器的引用检查，不能替代「完整工程 ZIP」导出及解压恢复验证。');host.textContent=report.join('\n');historyMessage(missing.length?'⚠ 检查发现潜在缺失，请先处理':'✓ 已完成当前工程引用检查')
 }catch(e){host.textContent='检查失败：'+e.message}
}
async function initHistory(){const api=window.SpecialHistory;if(!api)return historyMessage('历史功能文件未加载');
 try{await api.start(()=>doc,historyMessage);await updateHistoryList();historyMessage('自动保存已开启 · 历史最多 8 个；每 20 分钟至多新增一次')}
 catch(e){historyMessage('历史功能不可用：'+e.message+'。原有自动保存不受影响')}
}
function bindHistory(){const api=window.SpecialHistory;if(!api)return;
 $('historyCreate').onclick=manualHistory;$('historyRefresh').onclick=updateHistoryList;$('historyInspect').onclick=inspectProject;
}
function bind(){
 bindHistory();
 $('openStudio').onclick=()=>{$('ppt').hidden=false;choose(current);renderThumbs();syncStudioMusic()};$('closeStudio').onclick=()=>{$('ppt').hidden=true;status('正在同步到 3D 精装书');sync3d()};$('saveDraft').onclick=()=>writeDb(DOC_KEY,doc).then(()=>{status('✓ 已手动保存');window.SpecialHistory?.markDirty()}).catch(e=>status('保存失败：'+e.message));
 $('addVideo').onclick=()=>{if(current<0){alert('请先选择正文书页');return}mediaReplaceFor=null;$('videoInput').click()};
 $('addAudio').onclick=()=>{if(current<0){alert('请先选择正文书页');return}mediaReplaceFor=null;$('audioInput').click()};
 for(const [type,id] of [['video','videoInput'],['audio','audioInput']])$(id).onchange=async e=>{const file=e.target.files?.[0];e.target.value='';if(!file)return;try{await addMediaFile(file,type)}catch(err){mediaReplaceFor=null;alert('导入失败：'+err.message)}};
 $('mediaPosterInput').onchange=async e=>{const file=e.target.files?.[0];e.target.value='';if(!file)return;const el=activeSlide().elements[selected];if(el?.type!=='video')return;try{const poster=await posterFromImage(file);modify(()=>{el.poster=poster});status('✓ 视频封面已更换')}catch(err){alert(err.message)}};
 $('studioMusicToggle').onclick=async()=>{
  if(!(doc.musicIds||[]).length){$('musicInput').click();return}
  try{await window.SpecialMedia?.toggleMusic?.()}catch(e){alert('背景音乐无法播放：'+e.message)}
  syncStudioMusic();
 };
 // V12.15: persistent soundtrack settings, exported with the editable project.
 const controls={volume:$('bgMusicVolume'),fade:$('bgMusicFade'),duck:$('bgMusicDuck'),loop:$('bgMusicLoop')};
 function updateMusicControls(){const s=musicSettings(doc.musicSettings);controls.volume.value=String(Math.round(s.volume*100));$('bgMusicVolumeOut').textContent=Math.round(s.volume*100)+'%';controls.fade.value=String(s.fadeMs);controls.duck.value=String(s.duckVolume);controls.loop.checked=s.loop;}
 function changeMusicSettings(){doc.musicSettings=musicSettings({volume:Number(controls.volume.value)/100,fadeMs:Number(controls.fade.value),duckVolume:Number(controls.duck.value),loop:controls.loop.checked});$('bgMusicVolumeOut').textContent=Math.round(doc.musicSettings.volume*100)+'%';persist();window.SpecialMedia?.setMusicSettings?.(doc.musicSettings);}
 Object.values(controls).forEach(el=>el.addEventListener(el===controls.volume?'input':'change',changeMusicSettings));updateMusicControls();
 $('checkMediaFiles').onclick=async()=>{const out=$('mediaCheckStatus');out.textContent='检查中…';try{if(!db)throw Error('本地媒体数据库尚未就绪');const refs=referencedMedia(),n=refs.ids.size,media=await MediaStore.all(db),index=new Map(media.map(x=>[x.id,x]));const missing=[];for(const id of refs.ids){const item=index.get(id);if(!item||!(item.blob instanceof Blob)||item.blob.size===0)missing.push(id);}
 if(missing.length)throw Error('缺少 '+missing.length+' 个文件：'+missing.slice(0,3).join('、')+'。请先恢复原工程备份。');
 const oversized=media.filter(m=>refs.ids.has(m.id)&&m.blob.size>25*1024*1024);out.textContent=`✓ ${n} 件引用媒体均存在（含背景音乐 ${(doc.musicIds||[]).length} 首）。`+(oversized.length?` 注意：${oversized.length} 个文件超过 Cloudflare Pages 单文件 25 MiB 限制，完整站点上传前需要压缩或转存。`:'');
 }catch(e){out.textContent='⚠ '+e.message;} };
 $('setMusic').onclick=()=>$('musicInput').click();$('musicPlaylistSelect').onchange=async e=>{const id=e.target.value;if(!id)return;await window.SpecialMedia?.selectMusic?.(id);doc.musicId=id;persist();await syncMedia();await syncStudioMusic()};
 $('musicInput').onchange=async e=>{const files=[...(e.target.files||[])];e.target.value='';if(!files.length)return;try{if(files.some(file=>/\.ncm$/i.test(file.name)))throw Error('网易云 .ncm 是会员专属加密格式，网页播放器无法直接播放。请使用可导入其他播放器的 MP3、M4A、OGG 或 WAV 文件。');if(files.some(file=>!mediaAllowed(file,'audio')))throw Error('请选择有效的 MP3、M4A、OGG 或 WAV 音频文件');const added=[];for(const file of files){const item=await MediaStore.put(db,file);added.push(item.id)}doc.musicIds=[...new Set([...(doc.musicIds||[]),...added])];if(added.length)doc.musicId=added[0];persist();await syncMedia();await syncStudioMusic();status(`✓ 已添加 ${added.length} 首音乐，可在列表中切换`)}catch(err){alert(err.message)}};
 $('removeMusicTrack').onclick=async()=>{const ids=doc.musicIds||[];if(!doc.musicId||!ids.includes(doc.musicId))return;doc.musicIds=ids.filter(id=>id!==doc.musicId);doc.musicId=doc.musicIds[0]||null;persist();if(doc.musicId)await window.SpecialMedia?.selectMusic?.(doc.musicId);await syncMedia();await syncStudioMusic();status(doc.musicId?'✓ 已移除曲目':'✓ 已移除全部音乐')};
 $('clearMusic').onclick=async()=>{doc.musicIds=[];doc.musicId=null;persist();await syncMedia();await syncStudioMusic();status('✓ 已移除全部背景音乐')};
 $('backupFull').onclick=fullBackup;$('restoreFull').onclick=()=>$('fullInput').click();$('fullInput').onchange=e=>{const file=e.target.files?.[0];e.target.value='';if(file)restoreFull(file)};$('recoverReader').onclick=()=>$('readerZipInput').click();$('readerZipInput').onchange=e=>{const file=e.target.files?.[0];e.target.value='';if(file)recoverReaderZip(file)};
 $('addText').onclick=()=>addElement(T('双击修改文字',125,180,625,145,66,'#45362f',serif));$('addShape').onclick=()=>addElement(S(170,235,430,270,'#c0c8af'));
 $('addPhoto').onclick=()=>{selected=-1;$('photoInput').click()};$('replaceCoverPhoto').onclick=()=>{choose(-1);selected=doc.cover.elements.findIndex(e=>e.role==='cover-photo'||e.role==='imported-artwork');if(selected<0){alert('当前封面没有照片槽，请先在右侧应用「紫金 · 可编辑封面」模板');return}$('photoInput').click()};$('photoInput').onchange=async e=>{
 const file=e.target.files?.[0];if(!file)return;
 try{
  if(!file.type.startsWith('image/'))throw Error('请选择图片格式');
  status('正在读取本地照片…');
  const {src,transparent,width,height}=await preparePhoto(file);
  const fit=transparent?'contain':'cover';
  const obj=activeSlide().elements[selected];
  if(obj&&(obj.type==='image'||obj.type==='placeholder'))modify(()=>{
    Object.assign(obj,{type:'image',src,fit,crop:{x:0,y:0,w:1,h:1},zoom:1,offsetX:0,offsetY:0});
  });
  else{
    const w=transparent?460:620,h=transparent?Math.round(w*height/width):730;
    addElement({...P(Math.round((W-w)/2),220,w,Math.min(800,h)),type:'image',src,fit,crop:{x:0,y:0,w:1,h:1},zoom:1,offsetX:0,offsetY:0});
  }
  status(transparent?'✓ 透明 PNG 已原样保留 Alpha（不会出现黑色背景）':'✓ 图片已放入画布；双击可裁剪并移动取景');
 }catch(err){alert('无法打开图片：'+err.message)}
 e.target.value='';
};
 $('replacePhotoInput').onchange=async e=>{const files=Array.from(e.target.files||[]);e.target.value='';await handleImageReplace(files)};
 $('replaceSelectedPhotos').onclick=startImageReplace;
 $('fontFamily').onchange=e=>{const el=activeSlide().elements[selected];if(el?.type==='text')setProp('family',e.target.value);else status('先选中一段文字，再选择字体')};
 $('fontSize').onchange=e=>{if(activeSlide().elements[selected]?.type==='text')setProp('size',clamp(+e.target.value,10,220))};
 $('fillColor').oninput=e=>{const el=activeSlide().elements[selected];if(el?.type==='text')setProp('color',e.target.value);if(el?.type==='shape')setProp('fill',e.target.value)};
 $('undo').onclick=undo;$('redo').onclick=redo;$('duplicateEl').onclick=duplicateEl;$('deleteEl').onclick=removeSelected;
 $('importFont').onclick=()=>$('fontInput').click();
 $('fontInput').multiple=true;
 $('fontInput').onchange=async e=>{
  const files=Array.from(e.target.files||[]);e.target.value='';if(!files.length)return;
  let ok=0;
  for(const file of files)if(await loadCustomFont(file,{selectAfter:true}))ok++;
  if(ok)await persistFonts();
  status('✓ 导入 '+ok+' 款字体；已加入下拉列表，刷新网页仍会保留');
 };
 $('copyPageTo').onclick=copyPageToTarget;$('copyElementsTo').onclick=()=>transferElementsToTarget(false);$('moveElementsTo').onclick=()=>transferElementsToTarget(true);$('undoCrossPage').onclick=undoCrossPage;
 setupPageOverview();$('addSpread').onclick=insertSpread;$('copySpread').onclick=dupSpread;$('removeSpread').onclick=delSpread;$('moveSpreadUp').onclick=()=>shiftPage(-1);$('moveSpreadDown').onclick=()=>shiftPage(1);$('prevEditPage').onclick=()=>stepEditPage(-1);$('nextEditPage').onclick=()=>stepEditPage(1);
 $('clearSlide').onclick=()=>{if(confirm('清空'+getSlideLabel(current)+'的所有元素？'))modify(()=>{setActiveSlide(blank());selected=-1})};
 $('restoreImportedPages').onclick=restoreImportedPages;$('backupJson').onclick=backup;$('restoreJson').onclick=()=>$('jsonInput').click();$('jsonInput').onchange=e=>{const file=e.target.files?.[0];if(file)restore(file);e.target.value=''};
 if($('openBooksModal'))$('openBooksModal').onclick=showBooksManager;if($('exportPageImage'))$('exportPageImage').onclick=exportCurrentPageImage;$('exportZip').onclick=exportReader;document.querySelectorAll('.right-tab').forEach(btn=>btn.onclick=()=>changeTab(btn.dataset.tab));
}
async function init(){bind();templatePreview();initStickers();stickerNodes();initCollageToolbox();const curBook=getActiveBook();const brandEl=document.querySelector('.ppt-brand b');if(brandEl&&curBook?.title)brandEl.textContent=curBook.title;doc=activeDocKey()===DOC_KEY?(importedReaderDraft()||doc):doc;try{db=await openDb();const seeded=await window.SpecialSiteSeed?.install(db,readDb,writeDb);if(activeDocKey()===DOC_KEY&&(seeded?.state==='installed'||seeded?.state==='upgraded')&&seeded.pages&&seeded.pages!==window.PHOTOBOOK.spreads.length*2){try{localStorage.setItem(COUNT_KEY,String(seeded.pages))}catch(_){}let reloaded='';try{reloaded=sessionStorage.getItem('special-v13-reloaded')||''}catch(_){}if(reloaded!==String(seeded.pages)){try{sessionStorage.setItem('special-v13-reloaded',String(seeded.pages));sessionStorage.setItem('special-v1213-flash',`✓ 已自动同步最新预置工程：${seeded.pages} 页`)}catch(_){}location.reload();return}}try{sessionStorage.removeItem('special-v13-reloaded')}catch(_){}if(seeded?.state==='installed')status(`✓ 已载入线上预置工程：${seeded.pages} 页、${seeded.stickers} 件素材、${seeded.fonts} 款字体`);else if(seeded?.state==='upgraded')status(`✓ 已同步最新预置工程：${seeded.pages} 页、${seeded.stickers} 件素材、${seeded.fonts} 款字体`);const saved=await readDb(activeDocKey());if(saved?.slides?.length){doc={...saved,cover:migrateCover(saved.cover),back:migrateBack(saved.back)};const need=window.PHOTOBOOK.spreads.length*2;if(doc.slides.length>need)doc.slides.length=need;while(doc.slides.length<need)doc.slides.push(blank())}const lib=await readDb(STICKER_LIB_KEY);if(Array.isArray(lib))personalStickers=lib.filter(x=>x&&typeof x.data==='string');const folders=await readDb(STICKER_FOLDERS_KEY);if(Array.isArray(folders))stickerFolders=folders.filter(f=>f&&typeof f.id==='string'&&typeof f.name==='string');showPersonalStickers();const templates=await readDb(COLLAGE_TEMPLATE_KEY);if(Array.isArray(templates))collageTemplates=templates.filter(x=>x&&Array.isArray(x.elements)&&typeof x.name==='string').slice(0,COLLAGE_TEMPLATE_LIMIT);drawCollageTemplates();await loadSavedFonts();await initHistory()}catch(err){console.error(err);status('浏览器存储可能被禁用，建议使用 ZIP 备份')}showPersonalStickers();
 // Restore persisted soundtrack settings AFTER IndexedDB draft is loaded.
 const loadedMusic=musicSettings(doc.musicSettings);$('bgMusicVolume').value=String(Math.round(loadedMusic.volume*100));$('bgMusicVolumeOut').textContent=Math.round(loadedMusic.volume*100)+'%';$('bgMusicFade').value=String(loadedMusic.fadeMs);$('bgMusicDuck').value=String(loadedMusic.duckVolume);$('bgMusicLoop').checked=loadedMusic.loop;
 let f=0;try{f=+(sessionStorage.getItem('special-v9-focus')||0);sessionStorage.removeItem('special-v9-focus')}catch(e){}current=clamp(f,0,doc.slides.length-1);try{const flash=sessionStorage.getItem('special-v1213-flash');if(flash){sessionStorage.removeItem('special-v1213-flash');status(flash)}}catch(_){}$('editingLabel').textContent=getSlideLabel(current);renderThumbs();properties();schedule();await fontReady();schedule();dbReady=true;if(!Array.isArray(doc.musicIds)){const library=doc.musicId&&db?await MediaStore.all(db):[];doc.musicIds=[...new Set([...(doc.musicId?[doc.musicId]:[]),...library.filter(m=>m.type?.startsWith('audio/')).map(m=>m.id)])]}else if(doc.musicId&&!doc.musicIds.includes(doc.musicId))doc.musicIds.push(doc.musicId);await writeDb(activeDocKey(),doc);await syncMedia();await syncStudioMusic();if(ready3d)sync3d();
}
window.addEventListener('flipbook:ready',()=>{ready3d=true;if(dbReady)sync3d()});document.addEventListener('DOMContentLoaded',init);
window.PPT_V11={getProject:()=>doc,renderSlide:render,selectPage:choose,createMediaManifest};
window.PPT_V10=window.PPT_V11;
})();

// V12.10: Resizable, collapsible desktop workbench. Never mutates book project data.
(()=>{'use strict';
 const ppt=document.getElementById('ppt');if(!ppt)return;
 const key='special-appearance-v1210-workbench';
 const $=id=>document.getElementById(id);
 const initial={left:206,right:292,top:88,hideLeft:false,hideRight:false,compact:true};
 let saved={};try{saved=JSON.parse(localStorage.getItem(key)||'{}')||{}}catch(_){/* storage optional */}
 const state={...initial,...saved};
 const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
 const mobile=()=>matchMedia('(max-width:800px)').matches;
 const persist=()=>{try{localStorage.setItem(key,JSON.stringify(state))}catch(_){/* private mode */}};
 function apply(){
  state.left=clamp(Number(state.left)||206,120,440);
  state.right=clamp(Number(state.right)||292,185,480);
  state.top=clamp(Number(state.top)||88,74,260);
  const max=Math.max(360,window.innerWidth-340);
  if(state.left+state.right>max){const excess=state.left+state.right-max;state.right=Math.max(185,state.right-excess)}
  ppt.style.setProperty('--studio-left-size',state.left+'px');
  ppt.style.setProperty('--studio-right-size',state.right+'px');
  ppt.style.setProperty('--studio-left-effective',state.hideLeft?'0px':state.left+'px');
  ppt.style.setProperty('--studio-right-effective',state.hideRight?'0px':state.right+'px');
  ppt.style.setProperty('--studio-top-size',state.top+'px');
  ppt.classList.toggle('v1210-hide-left',state.hideLeft);
  ppt.classList.toggle('v1210-hide-right',state.hideRight);
  ppt.classList.toggle('v1210-compact',state.compact);
  for(const [id,on] of [['toggleLeftPanel',!state.hideLeft],['toggleRightPanel',!state.hideRight],['toggleCompactMode',state.compact]]){
   $(id)?.setAttribute('aria-pressed',String(on));
  }
  $('toggleCompactMode').textContent=state.compact?'⤡ 显示提示':'⤢ 简洁';
 }
 function toggle(name){state[name]=!state[name];apply();persist()}
 $('toggleLeftPanel')?.addEventListener('click',()=>toggle('hideLeft'));
 $('toggleRightPanel')?.addEventListener('click',()=>toggle('hideRight'));
 $('toggleCompactMode')?.addEventListener('click',()=>toggle('compact'));
 function resizeHandle(element,kind){if(!element)return;
  let drag=null;
  element.addEventListener('pointerdown',e=>{
   if(mobile()||e.button!==0)return;
   const bounds=ppt.getBoundingClientRect();
   drag={id:e.pointerId,startX:e.clientX,startY:e.clientY,left:state.left,right:state.right,top:state.top};
   element.setPointerCapture(e.pointerId);element.classList.add('dragging');e.preventDefault();
  });
  element.addEventListener('pointermove',e=>{
   if(!drag||drag.id!==e.pointerId)return;
   const other=kind==='left'?(state.hideRight?0:state.right):(state.hideLeft?0:state.left);
   const maxWidth=Math.max(kind==='left'?120:185,window.innerWidth-other-380);
   if(kind==='left')state.left=clamp(drag.left+e.clientX-drag.startX,120,Math.min(440,maxWidth));
   else if(kind==='right')state.right=clamp(drag.right+drag.startX-e.clientX,185,Math.min(480,maxWidth));
   else state.top=clamp(drag.top+e.clientY-drag.startY,74,260);
   apply();e.preventDefault();
  });
  const end=e=>{if(!drag||drag.id!==e.pointerId)return;drag=null;element.classList.remove('dragging');persist()};
  element.addEventListener('pointerup',end);element.addEventListener('pointercancel',end);
  element.addEventListener('dblclick',()=>{state[kind]=initial[kind];apply();persist()});
  element.addEventListener('keydown',e=>{
   if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home'].includes(e.key))return;
   if(e.key==='Home')state[kind]=initial[kind];
   else if(kind==='top')state.top+=e.key==='ArrowDown'?12:e.key==='ArrowUp'?-12:0;
   else if(kind==='left')state.left+=e.key==='ArrowRight'?12:e.key==='ArrowLeft'?-12:0;
   else state.right+=e.key==='ArrowLeft'?12:e.key==='ArrowRight'?-12:0;
   apply();persist();e.preventDefault();e.stopPropagation();
  });
 }
 resizeHandle(ppt.querySelector('.v1210-resize-left'),'left');
 resizeHandle(ppt.querySelector('.v1210-resize-right'),'right');
 resizeHandle(ppt.querySelector('.v1210-resize-top'),'top');
 window.addEventListener('resize',()=>{if(!mobile())apply()});
 // Close floating backup menu when user clicks elsewhere, without deleting its buttons.
 document.addEventListener('pointerdown',e=>{
  const details=ppt.querySelector('.v1210-backup-menu');
  if(details?.open&&!details.contains(e.target))details.open=false;
 });
 apply();
})();
