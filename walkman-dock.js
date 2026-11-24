/* Special Appearance V12.19.4 — original WALKMAN '26 geometry by GordenSun (MIT).
   Reads official upstream ES modules via jsDelivr. Local music stays in SpecialMedia;
   never imports the upstream audio/playlist or sends user audio to a third party.
   Upstream: https://github.com/GordenSun/Walkman   Copyright (c) 2026 GordenSun */
import * as THREE from 'three';
import { Walkman } from './assets/vendor/walkman/walkman.js';
import { DotDisplay } from './assets/vendor/walkman/display.js';
import { updateTweens, clamp } from './assets/vendor/walkman/tween.js';
const api=window.SpecialBookScene,media=window.SpecialMedia;
if(api&&media){
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
const fineShadows=matchMedia('(min-width: 741px)').matches;
const dock=document.getElementById('v12191-dock'),canvas=document.getElementById('v12191-canvas'),status=document.getElementById('v12191-status');
const trigger=document.getElementById('v12191-fallback'),info=document.getElementById('v12191-title');
try{
 const renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'low-power'});
 renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.6));renderer.setClearColor(0x000000,0);
 renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.3;
 // The photobook uses a nearly overhead camera at 1 radian elevation.
 // Match that camera instead of the old steep three-quarter product-shot angle.
 const scene=new THREE.Scene();const camera=new THREE.PerspectiveCamera(30,1,.05,100);
 const bookElevation=1.0;
 const cameraDirection=new THREE.Vector3(0,Math.sin(bookElevation),Math.cos(bookElevation)).normalize();
 const framingTarget=new THREE.Vector3(0,.16,0);
 let frameDistance=12;
 const hover={x:0,y:0,tx:0,ty:0};
 const hoverAllowed=()=>!reduce && !matchMedia('(pointer:coarse)').matches && !document.body.classList.contains('sa-scene-arrange');
 document.addEventListener('pointermove',e=>{
   if(e.pointerType!=='mouse'||!hoverAllowed()){hover.tx=0;hover.ty=0;return;}
   // Very small parallax, matched to the photo book's own pointer-follow effect.
   hover.tx=clamp((e.clientX/innerWidth-.5)*2,-1,1);
   hover.ty=clamp((e.clientY/innerHeight-.5)*2,-1,1);
 },{passive:true});
 window.addEventListener('blur',()=>{hover.tx=hover.ty=0});
 camera.position.copy(framingTarget).addScaledVector(cameraDirection,12);camera.lookAt(framingTarget);
 scene.add(new THREE.AmbientLight(0xfff0e2,1.45));
 const a=new THREE.DirectionalLight(0xffe6c0,3.1);a.position.set(-3,9,6);a.castShadow=fineShadows;a.shadow.mapSize.set(1024,1024);a.shadow.camera.left=-5;a.shadow.camera.right=5;a.shadow.camera.top=5;a.shadow.camera.bottom=-5;a.shadow.bias=-.001;a.shadow.radius=4;scene.add(a);
 const b=new THREE.DirectionalLight(0xbab0cf,1.65);b.position.set(5,3,-4);scene.add(b);renderer.shadowMap.enabled=fineShadows;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
 const display=new DotDisplay(),walkman=new Walkman(display.texture);
 // The original WALKMAN is modeled upright in its local XY plane (front = +Z).
 // V12.19.3 rotated walkman.group directly, but the upstream Walkman.update()
 // overwrites that rotation every frame, standing the device up again!
 // Keep the physical 90-degree lay-flat transform on a PARENT mount, which
 // upstream animations cannot override. Its back then lies parallel to the
 // photobook pages and to the tabletop (world XZ plane).
 const turntable=new THREE.Group();scene.add(turntable);
 const lieFlatMount=new THREE.Group();turntable.add(lieFlatMount);
 lieFlatMount.rotation.x=-Math.PI/2;
 const modelOffset=new THREE.Group();lieFlatMount.add(modelOffset);
 modelOffset.add(walkman.group);
 walkman.group.rotation.set(0,0,0);
 // Keep body centered without writing to the animated object's own position.
 const rawBox=new THREE.Box3().setFromObject(walkman.group);
 if(rawBox.isEmpty())throw Error('WALKMAN 模型几何体为空');
 const rawCenter=rawBox.getCenter(new THREE.Vector3());
 modelOffset.position.set(-rawCenter.x,-rawCenter.y,-rawCenter.z);
 walkman.group.traverse(obj=>{if(obj.isMesh){obj.castShadow=true;obj.receiveShadow=true;}});
 // Place its physical back on the table and let the shadow fall immediately
 // beneath it. This is a geometric placement, NOT a camera-angle illusion.
 const restedBounds=new THREE.Box3().setFromObject(turntable);
 turntable.position.y=.018-restedBounds.min.y;
 turntable.rotation.y=0; // its long axis points the same way as book pages
 const deckBounds=new THREE.Box3().setFromObject(turntable);
 const floor=new THREE.Mesh(new THREE.PlaneGeometry(15,15),new THREE.ShadowMaterial({color:0x0c0809,opacity:.46}));
 floor.rotation.x=-Math.PI/2;floor.position.y=-.005;floor.receiveShadow=true;scene.add(floor);
 // Place the floor in the transparent 3D pass. The felt desk stays visible
 // behind it and the contact shadow remains aligned with the body.
 const look=turntable.rotation;
 const alignToTable=()=>{
   // Tilt controls are relative to the original lay-flat mounting position.
   // Put the lowest corner back on the table after rotation, never float it.
   turntable.position.y=0;
   const b=new THREE.Box3().setFromObject(turntable);
   if(Number.isFinite(b.min.y)) turntable.position.y=.018-b.min.y;
 };
 function arrangePlayer(rot={}){
   const val=(n,lo,hi)=>Number.isFinite(+n)?Math.max(lo,Math.min(hi,+n)):0;
   look.set(THREE.MathUtils.degToRad(val(rot.pitch,-32,32)),
     THREE.MathUtils.degToRad(val(rot.yaw,-180,180)),
     THREE.MathUtils.degToRad(val(rot.roll,-32,32)));
   alignToTable();fit();
 }
 window.addEventListener('special:scene-layout',e=>arrangePlayer(e.detail?.mp3||{}));
 let songLabel='';
 function setSongLabel(name){const next=String(name||'背景音乐').trim().slice(0,70);if(next===songLabel)return;songLabel=next;walkman.setTapeName(next);}
 let ready=false,turned=false,knobStart=null,press=null,last=performance.now(),acc=0;
 const state=()=>media.musicState?.()||{playing:false,available:false,volume:.4};
 const sync=()=>{const st=state();trigger.setAttribute('aria-pressed',String(st.playing));trigger.textContent=st.playing?'Ⅱ':'▶';trigger.title=st.playing?'暂停背景音乐':'播放背景音乐';trigger.setAttribute('aria-label',trigger.title);info.textContent=st.title||'背景音乐';info.title=info.textContent;setSongLabel(st.title||'背景音乐');walkman.setKnob(st.volume??.4);};
 window.addEventListener('special:musicstate',sync);sync();
 async function toggle(){if(!state().available){status.textContent='请先在编辑器设置背景音乐';return;}try{await media.toggleMusic();status.textContent='';}catch(e){status.textContent='请点击播放按钮允许音乐播放';}}
 // Music fallback uses classic bootstrap, so CDN failures do not disable audio.
 const bounds=new THREE.Box3().setFromObject(turntable),size=bounds.getSize(new THREE.Vector3());
 if(!Number.isFinite(size.y)||size.y<=0)throw Error('WALKMAN 模型几何体为空');
 // Actual world-space bounding-box fit: every chassis corner has padding at
 // any dock aspect ratio. This avoids a cut-off top-left corner when enlarged.
 const cameraRight=new THREE.Vector3(1,0,0);
 const cameraUp=new THREE.Vector3(0,Math.cos(bookElevation),-Math.sin(bookElevation));
 function fit(){const r=canvas.getBoundingClientRect();if(r.width<5||r.height<5)return;
   const liveBounds=new THREE.Box3().setFromObject(turntable);
   const bbCorners=[];for(const x of [liveBounds.min.x,liveBounds.max.x])for(const y of [liveBounds.min.y,liveBounds.max.y])for(const z of [liveBounds.min.z,liveBounds.max.z])bbCorners.push(new THREE.Vector3(x,y,z));
   renderer.setSize(Math.round(r.width),Math.round(r.height),false);camera.aspect=r.width/r.height;
   const tan=Math.tan(THREE.MathUtils.degToRad(camera.fov*.5));
   let distance=1;for(const corner of bbCorners){const rel=corner.clone().sub(framingTarget);
     const front=rel.dot(cameraDirection),horizontal=Math.abs(rel.dot(cameraRight)),vertical=Math.abs(rel.dot(cameraUp));
     distance=Math.max(distance,front+horizontal/(tan*camera.aspect*.82),front+vertical/(tan*.82));}
   frameDistance=distance*1.04; camera.position.copy(framingTarget).addScaledVector(cameraDirection,frameDistance);camera.lookAt(framingTarget);
   camera.near=Math.max(.01,distance*.002);camera.far=Math.max(100,distance*6);camera.updateProjectionMatrix();}
 const observer=new ResizeObserver(fit);observer.observe(canvas);fit();
 arrangePlayer(window.SpecialSceneLayout?.getCurrent?.().mp3 || {yaw:0,pitch:0,roll:0});
 const pointer=new THREE.Vector2(),ray=new THREE.Raycaster();
 function hit(e){const r=canvas.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);
   ray.setFromCamera(pointer,camera);const hits=ray.intersectObjects(walkman.hitTargets,true);for(const h of hits){let obj=h.object;while(obj){if(obj.userData.action)return obj.userData.action;obj=obj.parent;}}
   return ray.intersectObject(walkman.group,true).length?'play':null;}
 let start=null;
 canvas.addEventListener('pointerdown',e=>{const action=hit(e);start={id:e.pointerId,x:e.clientX,y:e.clientY,action};canvas.setPointerCapture(e.pointerId);
   if(action){walkman.pressVisual(action);if(action==='knob')knobStart={y:e.clientY,volume:state().volume??.4};}
 });
 canvas.addEventListener('pointermove',e=>{if(start&&e.pointerId===start.id){const dx=e.clientX-start.x,dy=e.clientY-start.y;
   if(knobStart){const volume=clamp(knobStart.volume+(knobStart.y-e.clientY)*.006,0,1);media.setMusicSettings?.({volume});return;}
   if(e.shiftKey&&Math.abs(dx)+Math.abs(dy)>8){turned=true;look.y=clamp(look.y+dx*.0015,-.15,.15);start.x=e.clientX;start.y=e.clientY;}return;}
   canvas.style.cursor=hit(e)?'pointer':'grab';
 });
 async function operate(action){if(!action)return;
   switch(action){case 'play':case 'stop':case 'ff':case 'rew':await toggle();break;
   case 'door':case 'eject':case 'cassette':if(walkman.tapeIn){if(state().playing)await toggle();await walkman.eject();}else await walkman.insert();break;
   case 'knob':break;default:await toggle();}}
 canvas.addEventListener('pointerup',async e=>{if(!start||start.id!==e.pointerId)return;let action=start.action;walkman.releaseVisual(action);start=null;
   if(knobStart){knobStart=null;return;}
   if(!turned){await operate(action);}turned=false;});
 canvas.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();toggle();}});
 canvas.addEventListener('pointercancel',()=>{if(start?.action)walkman.releaseVisual(start.action);start=null;knobStart=null;turned=false;});
 canvas.addEventListener('wheel',e=>{if(hit(e)==='knob'){e.preventDefault();media.setMusicSettings?.({volume:clamp((state().volume??.4)-Math.sign(e.deltaY)*.05,0,1)});}}, {passive:false});
 dock.classList.add('is-ready');status.textContent='';
 // Automated physical tape insertion is visual only. Audio starts only after user gesture.
 walkman.insert().catch(()=>{});
 function frame(now){requestAnimationFrame(frame);const dt=Math.min(.06,(now-last)/1000);last=now;
   if(!api.isReading()||document.hidden){dock.hidden=true;return;}dock.hidden=false;
    if(window.SpecialBookReader?.isBusy?.()){return;}
   acc+=dt;if(acc<(innerWidth<740?1/30:1/45))return;const elapsed=Math.min(.06,acc);acc=0;
   updateTweens(elapsed);const playing=state().playing;
   if(!hoverAllowed()){hover.tx=0;hover.ty=0;}
   hover.x+=(hover.tx-hover.x)*Math.min(1,elapsed*5.5);
   hover.y+=(hover.ty-hover.y)*Math.min(1,elapsed*5.5);
   // Viewing-direction parallax instead of rotating chassis; the Walkman remains on the table.
   camera.position.copy(framingTarget).addScaledVector(cameraDirection,frameDistance)
     .add(new THREE.Vector3(hover.x*frameDistance*.025,hover.y*frameDistance*-.015,0));
   camera.lookAt(framingTarget);
   const st={playing,seekDir:0,progress:playing?((now/1000)/220)%1:0,vu:[0,0,0],index:0,count:1,time:0,duration:0,title:songLabel,tapeIn:walkman.tapeIn};
   // The original demo's "breathing" animation moves/rotates the whole
   // chassis like it is levitating. Suppress it while keeping reels/LEDs alive.
   walkman.update(elapsed,st,true);display.update(elapsed,st);renderer.render(scene,camera);
 }
 requestAnimationFrame(frame);ready=true;
}catch(e){console.error('WALKMAN ’26:',e);dock.classList.add('is-error');status.textContent='3D 随身听无法启动，仍可用下方按钮播放';}
}
