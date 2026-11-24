/* V12.19: compact offline GLB 2.0 static model reader (no external JS CDN).
 * Supports embedded PBR meshes/textures and transforms; no Draco/skin/animation. */
(function(){'use strict';const T=window.THREE;if(!T)return;
const ct={5120:Int8Array,5121:Uint8Array,5122:Int16Array,5123:Uint16Array,5125:Uint32Array,5126:Float32Array};
const nc={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT4:16};
window.SpecialGLB=async function(input){const buf=input instanceof ArrayBuffer?input:await input.arrayBuffer(),dv=new DataView(buf);
 if(dv.getUint32(0,true)!==0x46546c67||dv.getUint32(4,true)!==2)throw Error('只接受 glTF 2.0 的 GLB 文件');
 let offset=12,doc,bin;while(offset+8<=buf.byteLength){const len=dv.getUint32(offset,true),kind=dv.getUint32(offset+4,true);offset+=8;
  if(offset+len>buf.byteLength)throw Error('GLB 数据损坏');if(kind===0x4e4f534a)doc=JSON.parse(new TextDecoder().decode(new Uint8Array(buf,offset,len)));
  if(kind===0x004e4942)bin=new Uint8Array(buf,offset,len);offset+=len;}
 if(!doc||!bin||doc.extensionsRequired?.length)throw Error('模型缺少网格数据或包含暂不支持的扩展');
 const views=doc.bufferViews||[],ac=doc.accessors||[];
 function attribute(idx){const a=ac[idx],v=views[a.bufferView],Type=ct[a.componentType],n=nc[a.type];if(!v||!Type||!n||a.sparse)throw Error('顶点格式不兼容');
  const st=v.byteStride||Type.BYTES_PER_ELEMENT*n,base=bin.byteOffset+(v.byteOffset||0),pos=base+(a.byteOffset||0);
  if(pos%Type.BYTES_PER_ELEMENT||st%Type.BYTES_PER_ELEMENT)throw Error('模型字节未对齐');
  if(st===Type.BYTES_PER_ELEMENT*n)return new T.BufferAttribute(new Type(bin.buffer,pos,a.count*n),n,!!a.normalized);
  const array=new Type(bin.buffer,base,Math.floor(v.byteLength/Type.BYTES_PER_ELEMENT));
  return new T.InterleavedBufferAttribute(new T.InterleavedBuffer(array,st/Type.BYTES_PER_ELEMENT),n,(a.byteOffset||0)/Type.BYTES_PER_ELEMENT,!!a.normalized);
 }
 function imageSource(idx){const img=doc.images?.[idx];if(!img)return null;if(img.uri)return img.uri;
  const v=views[img.bufferView];if(!v)return null;const bytes=new Uint8Array(bin.buffer,bin.byteOffset+(v.byteOffset||0),v.byteLength);
  return URL.createObjectURL(new Blob([bytes],{type:img.mimeType||'image/png'}));}
 const images=(doc.images||[]).map((_,i)=>imageSource(i));
 const textures=(doc.textures||[]).map(t=>{const uri=images[t.source];if(!uri)return null;
  const tex=new T.TextureLoader().load(uri,()=>{if(uri.startsWith('blob:'))URL.revokeObjectURL(uri)});tex.flipY=false;return tex;});
 const mats=(doc.materials||[]).map(m=>{const p=m.pbrMetallicRoughness||{},c=p.baseColorFactor||[1,1,1,1];
  const material=new T.MeshStandardMaterial({color:new T.Color(c[0],c[1],c[2]),roughness:p.roughnessFactor??1,metalness:p.metallicFactor??1,
   transparent:m.alphaMode==='BLEND'||c[3]<1,opacity:c[3],side:m.doubleSided?T.DoubleSide:T.FrontSide});
  if(p.baseColorTexture&&textures[p.baseColorTexture.index]){material.map=textures[p.baseColorTexture.index];material.map.encoding=T.sRGBEncoding;}
  if(m.normalTexture&&textures[m.normalTexture.index])material.normalMap=textures[m.normalTexture.index];
  if(m.emissiveFactor)material.emissive.setRGB(...m.emissiveFactor);
  if(m.alphaMode==='MASK')material.alphaTest=m.alphaCutoff??.5;
  return material;});
 const meshes=(doc.meshes||[]).map(item=>(item.primitives||[]).map(p=>{const g=new T.BufferGeometry();const a=p.attributes||{};
  if(a.POSITION===undefined)throw Error('模型缺少位置数据');g.setAttribute('position',attribute(a.POSITION));
  if(a.NORMAL!==undefined)g.setAttribute('normal',attribute(a.NORMAL));
  if(a.TEXCOORD_0!==undefined)g.setAttribute('uv',attribute(a.TEXCOORD_0));
  if(p.indices!==undefined)g.setIndex(attribute(p.indices));if(a.NORMAL===undefined)g.computeVertexNormals();
  const mesh=new T.Mesh(g,mats[p.material]||new T.MeshStandardMaterial({color:0xc7b5b7,roughness:.55}));mesh.castShadow=true;
  if(p.mode!==undefined&&p.mode!==4)mesh.visible=false;return mesh;}));
 const nodes=(doc.nodes||[]).map(n=>{const g=new T.Group();g.name=n.name||'';
  if(n.translation)g.position.fromArray(n.translation);if(n.rotation)g.quaternion.fromArray(n.rotation);
  if(n.scale)g.scale.fromArray(n.scale);if(n.matrix)g.applyMatrix4(new T.Matrix4().fromArray(n.matrix));
  if(n.mesh!==undefined)meshes[n.mesh].forEach(m=>g.add(m));return g;});
 (doc.nodes||[]).forEach((n,i)=>(n.children||[]).forEach(idx=>nodes[i].add(nodes[idx])));
 const root=new T.Group(),specified=doc.scenes?.[doc.scene??0]?.nodes;
 const parented=new Set((doc.nodes||[]).flatMap(n=>n.children||[]));
 (specified||nodes.map((n,i)=>i).filter(i=>!parented.has(i))).forEach(i=>root.add(nodes[i]));
 return root;};})();
