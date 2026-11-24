/* Audio fallback survives any error loading 3-D modules. */
(() => {const button=document.getElementById('v12191-fallback'),dock=document.getElementById('v12191-dock'),info=document.getElementById('v12191-title');if(!button)return;
const state=()=>window.SpecialMedia?.musicState?.()||{available:false,playing:false};
function sync(){const s=state();button.textContent=s.playing?'Ⅱ':'▶';button.title=s.playing?'暂停背景音乐':'播放背景音乐';button.setAttribute('aria-label',button.title);button.setAttribute('aria-pressed',String(!!s.playing));if(info){info.textContent=s.title||'背景音乐';info.title=s.title||'背景音乐';}if(window.SpecialBookScene)dock.hidden=!window.SpecialBookScene.isReading()}
button.addEventListener('click',async()=>{if(!state().available){document.getElementById('v12191-status').textContent='请在编辑器先设置背景音乐';return}try{await window.SpecialMedia.toggleMusic()}catch(e){document.getElementById('v12191-status').textContent='无法播放：请检查音频文件或浏览器权限'}});
window.addEventListener('special:musicstate',sync);window.addEventListener('special:readerviewchange',sync);sync();
})();