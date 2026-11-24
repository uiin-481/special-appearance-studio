/* Special Appearance V12.15 · full-book music and voice/video ducking. */
(function(){'use strict';
const DEFAULT={volume:.42,loop:true,fadeMs:650,duckVolume:.16};
const clamp=(n,a,b)=>Math.max(a,Math.min(b,Number.isFinite(Number(n))?Number(n):a));
const clean=s=>({volume:clamp(s?.volume??DEFAULT.volume,0,1),loop:s?.loop!==false,fadeMs:clamp(s?.fadeMs??DEFAULT.fadeMs,0,4000),duckVolume:clamp(s?.duckVolume??DEFAULT.duckVolume,0,1)});
let manifest=window.SPECIAL_MEDIA_MANIFEST||{pages:{},media:{},musicId:null,musicIds:[]},settings=clean(manifest.musicSettings),background=null,active=null,currentPage=null,fadeId=0,playlistDeclared=Array.isArray(manifest.musicIds);
const lookup=id=>manifest.media?.[id]?.src||null;
const musicIds=()=>[...new Set((manifest.musicIds?.length?manifest.musicIds:[manifest.musicId]).filter(id=>id&&lookup(id)))];
function musicLabel(id){const item=manifest.media?.[id]||{};const raw=item.title||item.name||'背景音乐';return String(raw).replace(/\.(mp3|m4a|aac|flac|wav|ogg|opus|wma)$/i,'').trim()||'背景音乐';}
function trackName(){
  const id=manifest.musicId;
  if(!id)return '未设置音乐';
  const item=manifest.media?.[id]||{};
  const linked=Object.values(manifest.pages||{}).flat().find(el=>el?.mediaId===id&&el?.title);
  const raw=item.title||item.name||manifest.musicTitle||linked?.title||'';
  const basename=String(raw).split(/[\/]/).pop().replace(/\.(mp3|m4a|aac|flac|wav|ogg|opus|wma)$/i,'').trim();
  return basename||'背景音乐';
}
const container=document.createElement('div');container.className='sa-media-root';
container.innerHTML='<div class="sa-music-controls" id="sa-music-controls" hidden><button id="sa-music" class="sa-music-btn" type="button" aria-label="播放背景音乐" aria-pressed="false">♫ 播放背景音乐</button><select id="sa-music-select" class="sa-music-select" aria-label="选择背景音乐" title="选择背景音乐"></select><label class="sa-music-volume" for="sa-music-volume">音量 <input id="sa-music-volume" type="range" min="0" max="100" value="42" aria-label="阅读背景音乐音量"></label></div><div id="sa-media-overlay" class="sa-media-overlay" hidden><div class="sa-media-backdrop"></div><section class="sa-media-dialog" role="dialog" aria-modal="true" aria-label="回忆播放器"><div class="sa-media-heading"><span class="sa-media-kicker">SPECIAL APPEARANCE · MEMORY</span><button class="sa-media-close" type="button" aria-label="关闭播放器">✕</button></div><div class="sa-media-slot"></div><div class="sa-media-title"></div></section></div>';
document.body.append(container);
const controls=container.querySelector('#sa-music-controls'),btn=container.querySelector('#sa-music'),volInput=container.querySelector('#sa-music-volume'),musicSelect=container.querySelector('#sa-music-select'),overlay=container.querySelector('#sa-media-overlay'),slot=container.querySelector('.sa-media-slot'),heading=container.querySelector('.sa-media-title'),closeBtn=container.querySelector('.sa-media-close');
let ducked=false;
function state(){return{available:!!background,playing:!!background&&!background.paused,volume:settings.volume,loop:settings.loop,ducked:ducked&&!!active,title:trackName(),musicId:manifest.musicId||null,musicIds:musicIds(),settings:{...settings}}}
function renderMusicSelect(){const ids=musicIds(),names=new Map();musicSelect.replaceChildren();for(const id of ids){const base=musicLabel(id),number=(names.get(base)||0)+1;names.set(base,number);const option=document.createElement('option');option.value=id;option.textContent=number>1?`${base} (${number})`:base;musicSelect.append(option);}musicSelect.hidden=ids.length<2;if(ids.includes(manifest.musicId))musicSelect.value=manifest.musicId;}
function emit(){const st=state();btn.setAttribute('aria-pressed',String(st.playing));btn.textContent=st.playing?'♫ 暂停背景音乐':'♫ 播放背景音乐';btn.setAttribute('aria-label',btn.textContent);controls.hidden=!st.available;volInput.value=Math.round(settings.volume*100);renderMusicSelect();window.dispatchEvent(new CustomEvent('special:musicstate',{detail:st}));}
function targetVolume(){return settings.volume*(ducked?settings.duckVolume:1)}
function animateVolume(target,ms=settings.fadeMs){if(!background)return;cancelAnimationFrame(fadeId);const player=background;target=clamp(target,0,1);const from=player.volume,start=performance.now();if(ms<=0||Math.abs(from-target)<.002){player.volume=target;return}function tick(now){if(background!==player)return;const t=Math.min(1,(now-start)/ms),e=t*t*(3-2*t);player.volume=clamp(from+(target-from)*e,0,1);if(t<1)fadeId=requestAnimationFrame(tick);}fadeId=requestAnimationFrame(tick);}
function applySettings(s,{update=true}={}){settings=clean({...settings,...s});if(background){background.loop=settings.loop;animateVolume(targetVolume(),update?Math.min(350,settings.fadeMs):0);}emit();return state();}
function disposeMusic(){cancelAnimationFrame(fadeId);if(background){background.pause();background.removeAttribute('src');background.load();}background=null;}
function initMusic(){disposeMusic();const src=manifest.musicId&&lookup(manifest.musicId);if(src){background=new Audio();background.src=src;background.preload='metadata';background.loop=settings.loop;background.volume=settings.volume;background.addEventListener('play',emit);background.addEventListener('pause',emit);background.addEventListener('error',()=>{btn.textContent='音乐文件无法播放';btn.setAttribute('aria-pressed','false');window.dispatchEvent(new CustomEvent('special:musicerror',{detail:{musicId:manifest.musicId}}));});}emit();}
async function selectMusic(id){if(!musicIds().includes(id))throw Error('音乐不存在');const wasPlaying=!!background&&!background.paused;if(id===manifest.musicId)return state();manifest.musicId=id;initMusic();if(wasPlaying)return playMusic();return state();}
async function playMusic(){if(!background)throw Error('请先设置背景音乐');if(!background.paused){emit();return state()}
 const p=background;background.volume=0;try{await p.play();animateVolume(targetVolume());emit();return state()}catch(err){p.volume=targetVolume();emit();throw err;}}
async function toggleMusic(){if(!background)throw Error('请先设置背景音乐');if(!background.paused){cancelAnimationFrame(fadeId);background.pause();emit();return state();}return playMusic();}
btn.addEventListener('click',()=>toggleMusic().catch(err=>{btn.textContent='点击重试播放';console.warn('背景音乐播放失败',err)}));
volInput.addEventListener('input',()=>applySettings({volume:Number(volInput.value)/100}));
musicSelect.addEventListener('change',()=>selectMusic(musicSelect.value).catch(err=>console.warn('切换背景音乐失败',err)));
function setDuck(flag){if(ducked===flag)return;ducked=flag;animateVolume(targetVolume(),settings.fadeMs);emit();}
function close(){if(!active)return;const p=active;active=null;p.pause();p.removeAttribute('src');p.load();slot.replaceChildren();overlay.hidden=true;document.body.classList.remove('sa-media-playing');setDuck(false);closeBtn.blur();}
closeBtn.addEventListener('click',close);container.querySelector('.sa-media-backdrop').addEventListener('click',close);
document.addEventListener('keydown',e=>{if(overlay.hidden)return;if(e.key==='Escape'){e.stopImmediatePropagation();e.preventDefault();close();}else if(e.key==='Tab'){e.preventDefault();closeBtn.focus()}},true);
function openMedia(el){const src=lookup(el.mediaId);if(!src){alert('这段回忆暂时无法加载，请检查媒体文件。');return false;}
 close();const player=document.createElement(el.type==='video'?'video':'audio');player.controls=true;player.preload='metadata';player.playsInline=true;player.src=src;player.setAttribute('controlsList','nodownload');player.addEventListener('play',()=>setDuck(true));player.addEventListener('pause',()=>setDuck(false));player.addEventListener('ended',()=>setDuck(false));player.addEventListener('error',()=>{setDuck(false);heading.textContent='无法播放：请检查文件格式或网络连接';});
 if(el.type==='video'){player.poster=el.poster||'';player.className='sa-video'}else{const art=document.createElement('div');art.className='sa-audio-art '+(el.style||'cassette');art.textContent=el.style==='vinyl'?'◉':el.style==='postcard'?'✉':'▣';slot.append(art);player.className='sa-audio-player';}
 slot.append(player);heading.textContent=el.title||'一段值得珍藏的回忆';overlay.hidden=false;document.body.classList.add('sa-media-playing');active=player;closeBtn.focus({preventScroll:true});player.play().catch(()=>{/* Mobile requires pressing native play. */});return true;
}
function hit(file,uv){if(!file||!uv||!manifest.pages?.[file])return null;const x=uv.x*(manifest.pageWidth||880),y=(1-uv.y)*(manifest.pageHeight||1180);const els=manifest.pages[file];for(let j=els.length-1;j>=0;j--){const el=els[j];if(!el||el.hidden||el.opacity===0)continue;const cx=el.x+el.w/2,cy=el.y+el.h/2,rad=-(el.rotation||0)*Math.PI/180;const dx=x-cx,dy=y-cy;const rx=Math.cos(rad)*dx-Math.sin(rad)*dy,ry=Math.sin(rad)*dx+Math.cos(rad)*dy;if(Math.abs(rx)<=el.w/2&&Math.abs(ry)<=el.h/2)return(el.type==='video'||el.type==='audio')&&lookup(el.mediaId)?el:null;}return null;}
function setManifest(next){const oldSrc=manifest.musicId&&lookup(manifest.musicId);const wasPlaying=!!background&&!background.paused;manifest=next||{pages:{},media:{}};playlistDeclared=Array.isArray(manifest.musicIds);if(!manifest.musicIds?.length&&manifest.musicId)manifest.musicIds=[manifest.musicId];if(!manifest.musicIds?.includes(manifest.musicId))manifest.musicId=musicIds()[0]||null;settings=clean(manifest.musicSettings);const src=manifest.musicId&&lookup(manifest.musicId);if(oldSrc!==src||!!background!==!!src){initMusic();/* Do not auto-play replacement music without a gesture. */}else{if(background){background.loop=settings.loop;animateVolume(targetVolume(),wasPlaying?settings.fadeMs:0);}emit();}}
window.addEventListener('special:pagechange',e=>{const page=e.detail?.spread;if(currentPage!==null&&currentPage!==page)close();currentPage=page;});
window.SpecialMedia={hit,open:openMedia,close,setManifest,getManifest:()=>manifest,toggleMusic,selectMusic,musicState:state,playlistDeclared:()=>playlistDeclared,setMusicSettings:applySettings};setManifest(manifest);
})();
