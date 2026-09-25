import * as THREE from './vendor/three.module.js';
export const GROUND=.22;
export const palette={sand:0xf4de9e,trunk:0xb88b59,leaf:0x50b843,wood:0xa66e3d,skin:0xeeb485};
const mats=new Map();
export function mat(color,extras={}){const key=JSON.stringify([color,extras]);if(!mats.has(key))mats.set(key,new THREE.MeshStandardMaterial({color,roughness:.86,...extras}));return mats.get(key)}
export function mesh(geometry,material,parent,x=0,y=0,z=0){const m=new THREE.Mesh(geometry,material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;if(parent)parent.add(m);return m}
export function box(parent,x,y,z,w,h,d,color){return mesh(new THREE.BoxGeometry(w,h,d),mat(color),parent,x,y,z)}
export function ball(parent,x,y,z,r,color,scale=[1,1,1]){const m=mesh(new THREE.IcosahedronGeometry(r,1),mat(color,{flatShading:true}),parent,x,y,z);m.scale.set(...scale);return m}
export function rod(parent,a,b,r,color,r2=r,n=8){const av=new THREE.Vector3(...a),bv=new THREE.Vector3(...b);const m=mesh(new THREE.CylinderGeometry(r2,r,av.distanceTo(bv),n,8),mat(color),parent);m.position.copy(av).add(bv).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),bv.sub(av).normalize());return m}
export function islandRadius(a){return 8.1+.38*Math.sin(a*3)+.28*Math.cos(a*5)}
export function inside(x,z,margin=0){return Math.hypot(x,z)<islandRadius(Math.atan2(z,x))-margin}
function terrain(){
 const positions=[],colors=[],bases=[],N=68,size=18,step=size/N;
 const baseHeight=(x,z)=>{const r=Math.hypot(x,z),a=Math.atan2(z,x),edge=islandRadius(a),d=r-edge;if(d<=-.42)return GROUND;if(d>=.62)return -.58;const t=(d+.42)/1.04;return THREE.MathUtils.lerp(GROUND,-.58,t*t*(3-2*t));};
 const colorAt=y=>new THREE.Color(y<-.18?0xd5d49b:y<GROUND-.08?0xe7d49a:0xf5e1a8);
 const vertex=(x,z)=>{const y=baseHeight(x,z),c=colorAt(y);positions.push(x,y,z);bases.push(x,z,y);colors.push(c.r,c.g,c.b);};
 for(let iz=0;iz<N;iz++)for(let ix=0;ix<N;ix++){const x0=-size/2+ix*step,x1=x0+step,z0=-size/2+iz*step,z1=z0+step,cx=(x0+x1)/2,cz=(z0+z1)/2,a=Math.atan2(cz,cx);if(Math.hypot(cx,cz)>islandRadius(a)+.72)continue;vertex(x0,z0);vertex(x1,z0);vertex(x1,z1);vertex(x0,z0);vertex(x1,z1);vertex(x0,z1);}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.computeVertexNormals();
 const surface=new THREE.Mesh(g,new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,side:THREE.DoubleSide}));surface.receiveShadow=true;surface.castShadow=false;
 const holes=[];
 const cutAt=(x,z)=>{let cut=0;for(const h of holes){const q=Math.hypot(x-h.x,z-h.z)/h.radius;if(q<1){const smooth=1-q*q,amount=h.depth*smooth*smooth;cut=Math.max(cut,amount);}}return cut;};
 const heightAt=(x,z)=>baseHeight(x,z)-cutAt(x,z);
 const rebuild=()=>{const a=g.attributes.position,ca=g.attributes.color,deepColor=new THREE.Color(0x8f6842);for(let i=0;i<a.count;i++){const x=bases[i*3],z=bases[i*3+1],base=bases[i*3+2],cut=cutAt(x,z),y=base-cut,c=colorAt(base).lerp(deepColor,Math.min(.82,cut/4));a.setY(i,y);ca.setXYZ(i,c.r,c.g,c.b);}a.needsUpdate=true;ca.needsUpdate=true;g.computeVertexNormals();g.attributes.normal.needsUpdate=true;g.computeBoundingSphere();};
 surface.userData.controller={surface,holes,heightAt,baseHeight,setHole(h){if(!holes.includes(h))holes.push(h);rebuild();}};
 return surface;
}
export function frond(parent,length,width,color=0x52b845){
 const root=new THREE.Group();if(parent)parent.add(root);
 const ps=[],idx=[],rows=19,cols=5,bladeStart=.14;
 const bend=t=>Math.sin(t*Math.PI)*length*.14-t*t*length*.3;
 const leftNotches=new Set([7,13]),rightNotches=new Set([10,15]);
 for(let i=0;i<rows;i++){
  const t=bladeStart+(1-bladeStart)*i/(rows-1),u=(t-bladeStart)/(1-bladeStart),baseWidth=Math.sin(Math.PI*u)**.58*width;
  const left=baseWidth*(leftNotches.has(i)?.5:1),right=baseWidth*(rightNotches.has(i)?.5:1),fold=Math.sin(Math.PI*u)*width*.2;
  for(let c=0;c<cols;c++){const q=c/(cols-1),z=THREE.MathUtils.lerp(-left,right,q),ridge=1-Math.abs(q-.5)*2;ps.push(t*length,bend(t)+fold*ridge,z);}
 }
 for(let i=0;i<rows-1;i++)for(let c=0;c<cols-1;c++){const a=i*cols+c,b=a+cols;idx.push(a,b,b+1,a,b+1,a+1);}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(ps,3));g.setIndex(idx);g.computeVertexNormals();
 const blade=mesh(g,mat(color,{side:THREE.DoubleSide,flatShading:false,roughness:.84}),root);blade.castShadow=false;
 const veinPoints=[];for(let i=0;i<=12;i++){const t=i/12;veinPoints.push(new THREE.Vector3(t*length,bend(t)+(t<bladeStart?0:Math.sin(Math.PI*(t-bladeStart)/(1-bladeStart))*width*.2)+.009,0));}
 mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(veinPoints),12,.012,5,false),mat(0x668d36,{roughness:.9}),root);
 return root;
}
const ovalLeafGeometry=new THREE.SphereGeometry(.5,8,5);
function ovalLeaf(parent,x,y,z,size,color,angle,tilt=0){const leaf=mesh(ovalLeafGeometry,mat(color,{roughness:.8}),parent,x,y,z);leaf.scale.set(size*.48,size*.14,size);leaf.rotation.set(tilt,angle,0);leaf.castShadow=false;return leaf}
export function palm(x,z,h=3.5,phase=0){const root=new THREE.Group();root.position.set(x,GROUND,z);const trunk=new THREE.Group();root.add(trunk);for(let i=0;i<10;i++){let a=i*h/10,b=(i+1)*h/10;rod(trunk,[.025*a*a,a,0],[.025*b*b,b,0],.19-i*.009,i%2?0xae8052:0xbc9364,.18-i*.009,8);if(i<8){let ring=mesh(new THREE.TorusGeometry(.19-i*.009,.014,3,8),mat(0x966e47),trunk,.025*a*a,a,0);ring.rotation.x=Math.PI/2}}
const crown=new THREE.Group();crown.position.set(.025*h*h,h,0);trunk.add(crown);for(let i=0;i<9;i++){const l=frond(crown,1.6+(i%3)*.18,.38,i%2?0x55bd43:0x36a745);l.rotation.y=i*Math.PI*2/9+phase;l.rotation.z=.12+(i%3)*.14}for(let i=0;i<3;i++){const l=frond(crown,1.1,.25,0x7acb45);l.rotation.y=i*2.1;l.rotation.z=.95}for(let i=0;i<3;i++)ball(crown,Math.cos(i*2.1)*.2,-.14,Math.sin(i*2.1)*.2,.19,0x8d723c);return {root,trunk,crown,x,z,h,phase,hp:4,state:'standing',angle:0,velocity:0,shake:0}}
export function createPlayer(){const root=new THREE.Group(),body=new THREE.Group();root.add(body);const legs=[];for(let side of [-1,1]){const pivot=new THREE.Group();pivot.position.set(side*.13,.47,0);body.add(pivot);box(pivot,0,-.06,0,.23,.22,.27,0x326c72);rod(pivot,[0,-.1,0],[0,-.34,0],.072,palette.skin);ball(pivot,0,-.34,.055,.115,palette.skin,[.85,.65,1.4]);legs.push(pivot)}const torso=mesh(new THREE.CylinderGeometry(.22,.19,.43,8),mat(0xf5e8c5),body,0,.66,0);torso.scale.z=.8;box(body,0,.61,-.2,.32,.33,.19,0x97704a);for(let x of [-.13,.13])box(body,x,.67,-.085,.045,.4,.27,0xc79860);const head=new THREE.Group();head.position.y=1.08;body.add(head);ball(head,0,0,0,.265,palette.skin,[1,1.05,.93]);ball(head,0,.1,-.055,.24,0x5a3c2b,[1,.9,1]);ball(head,0,-.03,.239,.055,0xedb285);for(let x of [-.095,.095]){ball(head,x,.025,.227,.025,0x233438,[.75,1,.5]);ball(head,x+.006,.032,.24,.008,0xffffff)}const hat=mesh(new THREE.CylinderGeometry(.36,.37,.055,16),mat(0xe9c97c),head,0,.18,0);mesh(new THREE.CylinderGeometry(.22,.27,.19,12),mat(0xe8c87e),head,0,.28,0);mesh(new THREE.CylinderGeometry(.255,.26,.055,12),mat(0x967044),head,0,.21,0);const arms=[];for(let side of [-1,1]){const arm=new THREE.Group();arm.position.set(side*.245,.79,0);body.add(arm);rod(arm,[0,0,0],[0,-.23,.03],.07,palette.skin);ball(arm,0,-.25,.04,.075,palette.skin);arms.push(arm)}const axe=new THREE.Group();axe.position.set(0,-.24,.05);arms[1].add(axe);rod(axe,[0,-.08,-.03],[0,.46,.1],.028,0x8d5e36);const blade=box(axe,.075,.39,.09,.22,.18,.065,0xa9c1c3);blade.rotation.z=-.15;box(axe,.17,.4,.09,.035,.19,.07,0xe2eded);return {root,body,legs,arms,axe}}
export function logMesh(length=.65){const g=new THREE.Group();mesh(new THREE.CylinderGeometry(.14,.17,length,9),[mat(0xa7794b),mat(0xf1ce87),mat(0xe8c27b)],g);for(let y of [-length/2-.002,length/2+.002]){const ring=mesh(new THREE.TorusGeometry(.09,.006,3,12),mat(0xb99360),g,0,y,0);ring.rotation.x=Math.PI/2}return g}
export function makeBuilding(type){const g=new THREE.Group();if(type==='workbench'){box(g,0,.88,0,1.55,.16,.76,0xa8733f);box(g,0,.73,.31,1.45,.2,.1,0x87562f);for(const x of [-.62,.62])for(const z of [-.25,.25])rod(g,[x,.03,z],[x,.82,z],.065,0x7b4c2d,.075,7);rod(g,[-.62,.34,.27],[.62,.34,.27],.04,0x946039);rod(g,[-.62,.33,-.24],[.62,.33,-.24],.035,0x946039);const coil=mesh(new THREE.TorusGeometry(.2,.026,6,18),mat(0xd3b879),g,-.38,.99,.04);coil.rotation.x=Math.PI/2;box(g,.52,1.01,.06,.22,.15,.24,0x75878a);box(g,.52,1.11,.06,.25,.055,.25,0xa7b6b6);rod(g,[.13,.99,-.12],[.5,.99,-.23],.025,0xb9c7c6);box(g,.09,.99,-.1,.13,.045,.1,0x5e7779);return g}if(type==='fire'){for(let i=0;i<9;i++)ball(g,Math.cos(i*6.28/9)*.57,.15,Math.sin(i*6.28/9)*.57,.2,0x9aa5a0,[1,.7,.9]);rod(g,[-.4,.17,-.24],[.4,.17,.24],.1,0x805b3c);rod(g,[-.4,.2,.24],[.4,.2,-.24],.1,0x936b43);const flame=new THREE.Group();g.add(flame);const f=mesh(new THREE.ConeGeometry(.22,.64,6),mat(0xff9b31,{emissive:0xff6d12,emissiveIntensity:.6}),flame,0,.45,0);mesh(new THREE.ConeGeometry(.12,.4,6),mat(0xffe790,{emissive:0xffc83f,emissiveIntensity:.8}),flame,0,.4,.04);for(let i=0;i<5;i++){const tongue=mesh(new THREE.ConeGeometry(.11,.5+i*.035,7),mat(i%2?0xffbc3e:0xff6d18,{emissive:0xff7315,emissiveIntensity:2}),flame,Math.cos(i*1.26)*.12,.42,Math.sin(i*1.26)*.12)}const sparks=new THREE.Group();for(let i=0;i<8;i++)mesh(new THREE.IcosahedronGeometry(1,0),new THREE.MeshBasicMaterial({color:0xffb34c}),sparks).scale.setScalar(.03);g.add(sparks);g.userData.sparks=sparks;const light=new THREE.PointLight(0xffa443,12,10,1.6);light.position.y=.9;g.add(light);g.userData.flame=flame;g.userData.light=light}else if(type==='trap'){for(let i=0;i<10;i++){let a=i*Math.PI/5;rod(g,[-.6,.35+Math.cos(a)*.29,Math.sin(a)*.29],[.6,.35+Math.cos(a)*.22,Math.sin(a)*.22],.026,0xb89459)}for(let x of [-.57,-.25,.1,.55]){const t=mesh(new THREE.TorusGeometry(.26-(x*.05),.026,4,10),mat(0x9f7b45),g,x,.35,0);t.rotation.y=Math.PI/2}const rope=mesh(new THREE.TorusGeometry(.12,.018,4,10),mat(0xd6bc82),g,-.62,.35,0);rope.rotation.y=Math.PI/2;rod(g,[.5,.2,.2],[.8,.04,.7],.012,0xb39867)}else{for(let x of [-.75,.75])for(let z of [-.6,.6])rod(g,[x,0,z],[x,1.35,z],.06,0xb3824f);rod(g,[0,1.95,-.8],[0,1.95,.8],.075,0x9c7045);for(let z of [-.67,.67]){rod(g,[-.95,1.25,z],[0,1.95,z],.045,0xa27847);rod(g,[0,1.95,z],[.95,1.25,z],.045,0xa27847)}for(let i=0;i<9;i++)box(g,0,.07,-.62+i*.155,1.5,.09,.14,0xbc925b);for(let side of [-1,1])for(let z=-.8;z<=.8;z+=.18){const leaf=frond(g,1.3,.22,z%2?0x739c49:0x6e9846);leaf.position.set(0,1.93,z);leaf.rotation.y=side===1?0:Math.PI;leaf.rotation.z=-.28}box(g,0,.15,0,.7,.03,.75,0xd6c498)}return g}
export function makeScenery(scene){const ground=terrain();scene.add(ground);scene.userData.terrain=ground.userData.controller;let state=272;const random=()=>{state=(state*1664525+1013904223)>>>0;return state/4294967296};scene.userData.bushes=[];for(let i=0;i<26;i++){const a=random()*6.28,r=5.5+random()*2,x=Math.cos(a)*r,z=Math.sin(a)*r,root=new THREE.Group();root.position.set(x,GROUND,z);scene.add(root);const turn=random()*6.28;for(let k=0;k<6;k++){const angle=turn+k*Math.PI/3+(random()-.5)*.22,length=.46+random()*.22,height=.28+random()*.24,ex=Math.sin(angle)*length,ez=Math.cos(angle)*length;rod(root,[0,.04,0],[ex,height,ez],.018,0x5f7d3b,.012,6);for(let j=0;j<3;j++){const t=.38+j*.27,side=j%2?1:-1,lx=ex*t+Math.cos(angle)*side*.055,lz=ez*t-Math.sin(angle)*side*.055,ly=.05+(height-.05)*t,size=.22-j*.018+random()*.025,color=(i+k+j)%3===0?0x4f9f43:(i+j)%2?0x6eb84e:0x5aaa46;ovalLeaf(root,lx,ly,lz,size,color,angle+side*.42,-.1+random()*.22);}}for(let k=0;k<3;k++)ovalLeaf(root,Math.sin(turn+k*2.1)*.12,.46+random()*.12,Math.cos(turn+k*2.1)*.12,.2,k%2?0x7ac257:0x63b34a,turn+k*2.1,.2);scene.userData.bushes.push({root,x,z,hp:2,state:'standing',kind:'bush'});}for(let i=0;i<12;i++){let a=i*2.4,r=6.8+random()*.6;ball(scene,Math.cos(a)*r,.26,Math.sin(a)*r,.28+random()*.25,0x9dadab,[1.2,.75,1])}for(let i=0;i<35;i++){let a=random()*6.28,r=6+random()*1.5;const stone=ball(scene,Math.cos(a)*r,.24,Math.sin(a)*r,.035+random()*.04,0xe8c38b,[1.6,.4,1]);stone.castShadow=false}const dock=new THREE.Group();dock.position.set(-3,.13,6.5);dock.rotation.y=-.1;scene.add(dock);for(let i=0;i<12;i++)box(dock,0,.03,i*.26,1.5,.1,.23,i%3?0xb98554:0xc99866);for(let x of [-.66,.66])for(let z of [.05,1.4,2.85]){rod(dock,[x,-.65,z],[x,.38,z],.065,0x986b45);mesh(new THREE.CylinderGeometry(.09,.09,.04,8),mat(0xd2b486),dock,x,.4,z)}return dock}
export function ocean(scene){const uniforms={uTime:{value:0},uDay:{value:1},uDusk:{value:0}};const material=new THREE.ShaderMaterial({uniforms,vertexShader:`varying vec3 vWorld;void main(){vWorld=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*viewMatrix*vec4(vWorld,1.);}`,fragmentShader:`varying vec3 vWorld;uniform float uTime,uDay,uDusk;float wave(vec2 p){return sin(p.x*2.3+p.y*1.6+uTime*.65)*sin(p.y*2.8-p.x*.8-uTime*.4);}void main(){vec2 p=vWorld.xz;float a=atan(p.y,p.x);float r=8.1+.38*sin(a*3.)+.28*cos(a*5.);float shore=length(p)-r;if(shore<-.43)discard;float shallow=exp(-max(shore,0.)*.4);vec3 col=mix(vec3(.025,.49,.58),vec3(.24,.79,.73),shallow);float w=wave(p);col+=w*.013;float caustic=pow(max(0.,sin(p.x*3.+sin(p.y*2.+uTime*.3))*sin(p.y*3.5+sin(p.x*2.-uTime*.3))),12.);col+=caustic*.11*shallow;float wash=.18+.18*sin(uTime*.85+a*2.);float foam=(1.-smoothstep(.035,.14,abs(shore-wash-.045*sin(a*16.+uTime*1.5))))*.65;float wavefront=pow(max(0.,sin(shore*7.+uTime*1.3+a*.5)),18.)*exp(-max(shore,0.)*1.4)*smoothstep(.25,.7,shore);foam+=wavefront*.22;foam*=smoothstep(-.6,.3,sin(a*31.+uTime*.45));col=mix(col,vec3(.91,.99,.89),foam);float shimmer=pow(max(0.,sin(p.x*5.+p.y*2.+uTime)*sin(p.y*6.-uTime*.8)),45.);col+=shimmer*.2;col=mix(vec3(.009,.024,.065)+col*.07,col,uDay);col=mix(col,col*vec3(1.2,.69,.55)+vec3(.12,.025,.04),uDusk*.65);float reflection=exp(-pow((p.x+p.y*.32+1.)*.3,2.))*pow(max(0.,sin(p.y*9.+sin(p.x*2.)+uTime)),10.);col+=vec3(1.,.33,.08)*reflection*uDusk*.26;gl_FragColor=vec4(col,1.);#include <tonemapping_fragment>\n#include <colorspace_fragment>}`.replace('1.);#include','1.);\n#include')});const m=new THREE.Mesh(new THREE.PlaneGeometry(200,200),material);m.rotation.x=-Math.PI/2;m.position.y=-.12;scene.add(m);return uniforms}

// Deform the actual trunk surface toward the axe, exposing pale wood in the notch.
export function carveTrunk(t,px,pz){
 if(!t.cutDirection)t.cutDirection=new THREE.Vector3(px-t.x,0,pz-t.z).normalize();
 const dir=t.cutDirection,progress=(4-t.hp)/4,depth=progress*.15;
 for(const m of t.trunk.children){
  if(!m.isMesh)continue;
  if(m.geometry.type==='TorusGeometry'){if(m.position.y>.45&&m.position.y<.83)m.visible=false;continue}
  if(m.geometry.type!=='CylinderGeometry')continue;
  m.updateMatrix();const inv=m.matrix.clone().invert();
  if(!m.userData.uncut)m.userData.uncut=m.geometry.attributes.position.array.slice();
  const orig=m.userData.uncut,attr=m.geometry.attributes.position,colors=[];
  for(let i=0;i<attr.count;i++){
   const v=new THREE.Vector3(orig[i*3],orig[i*3+1],orig[i*3+2]).applyMatrix4(m.matrix);
   const center=.025*v.y*v.y,front=(v.x-center)*dir.x+v.z*dir.z;
   const band=Math.max(0,1-Math.abs(v.y-.64)/.19);
   const radial=new THREE.Vector3(v.x-center,0,v.z),r=radial.length();
   const facing=r>.001?radial.dot(dir)/r:0;
   const around=progress+(1-progress)*Math.max(0,facing);
   const amount=Math.min(r*.92,depth*band*around);
   if(r>.001)v.addScaledVector(radial,-amount/r);v.applyMatrix4(inv);attr.setXYZ(i,v.x,v.y,v.z);
   const c=new THREE.Color(amount>.015?0xf4d59a:0xb68b5b);colors.push(c.r,c.g,c.b);
  }
  attr.needsUpdate=true;m.geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));m.geometry.computeVertexNormals();
  if(!m.userData.carved){m.material=m.material.clone();m.material.color.set(0xffffff);m.material.vertexColors=true;m.userData.carved=true}
 }
}

export function singleLeaf(color=0x58aa43){const root=new THREE.Group(),leaf=frond(root,.78,.2,color);leaf.rotation.z=-.1;leaf.position.x=-.08;return root;}
