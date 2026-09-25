import * as THREE from './vendor/three.module.js';
import {GROUND,inside,islandRadius,ball,rod,mesh,mat,box} from './world.js?v=21';
import {createFiberCrafting} from './fiber-crafting.js?v=22';

const SEA_LEVEL=-.095;
const PYRAMID_REVEAL_DEPTH=7;
const PYRAMID={x:2.15,z:-2.15};
const lootMeta={shell:['🐚','Mušle'],coin:['🪙','Mince'],pearl:['◉','Perla'],chest:['🎁','Truhla'],relic:['🗿','Relikvie']};

export function createExploration(scene,game,{sound,noise}){
 const $=id=>document.getElementById(id),player=game.player,inventory=game.inventory;
 let tool='axe',digTime=0,gunTime=0,pending=null,walkBlend=0,bagTick=0,workshop=null;
 const holes=[],sand=[],finds=[],floods=[],terrain=scene.userData.terrain;

 for(const leg of player.legs){ball(leg,0,-.35,.065,.12,0x77503b,[.95,.65,1.6]);rod(leg,[-.07,-.31,.17],[.07,-.31,.17],.012,0xe6cba1);}
 box(player.body,0,.49,.005,.41,.055,.32,0x855b38);box(player.body,0,.49,.174,.08,.06,.018,0xe4bc68);for(let i=0;i<3;i++)ball(player.body,0,.6+i*.085,.18,.014,0xa88e60);rod(player.body,[-.16,.84,.1],[.14,.84,.1],.045,0xe18454);const scarf=box(player.body,.1,.75,.19,.075,.19,.025,0xe18454);scarf.rotation.z=-.18;
 const head=player.body.children.find(o=>o.isGroup&&o.position.y>1),eyes=[];if(head){eyes.push(...head.children.filter(o=>o.geometry?.type==='IcosahedronGeometry'&&o.position.z>.22&&Math.abs(o.position.x)>.07));for(const x of [-.095,.095])rod(head,[x-.028,.08,.231],[x+.028,.084,.231],.012,0x624231);const smile=mesh(new THREE.TorusGeometry(.045,.009,4,12,Math.PI),mat(0xa65f45),head,0,-.083,.245);smile.rotation.z=Math.PI;}
 const shovel=new THREE.Group();shovel.position.copy(player.axe.position);player.arms[1].add(shovel);rod(shovel,[0,-.2,0],[0,.55,.09],.029,0xb38a56);ball(shovel,0,-.3,0,.17,0x9dbbbc,[.8,1.3,.22]);rod(shovel,[-.07,.55,.09],[.07,.55,.09],.025,0x7f583b);shovel.visible=false;
 const shotgun=new THREE.Group();shotgun.position.set(0,-.18,.03);player.arms[1].add(shotgun);box(shotgun,0,.03,.28,.12,.13,.56,0x704728);box(shotgun,0,.04,.72,.085,.085,.48,0x59666a);box(shotgun,0,-.11,.06,.1,.28,.16,0x8c5a31);const muzzle=ball(shotgun,0,.04,.99,.12,0xffd45d);muzzle.material=muzzle.material.clone();muzzle.material.emissive=new THREE.Color(0xff8b2b);muzzle.material.emissiveIntensity=3;muzzle.visible=false;shotgun.visible=false;
 const digMarkerMaterial=new THREE.MeshBasicMaterial({color:0xffefad,transparent:true,opacity:.9,side:THREE.DoubleSide,depthWrite:false});
 const digMarker=mesh(new THREE.RingGeometry(.2,.27,40),digMarkerMaterial,scene);digMarker.rotation.x=-Math.PI/2;digMarker.renderOrder=5;digMarker.visible=false;
 player.root.traverse(o=>{if(o.geometry?.type==='IcosahedronGeometry'){const radius=o.geometry.parameters.radius;o.geometry.dispose();o.geometry=new THREE.IcosahedronGeometry(radius,2);o.material=o.material.clone();o.material.flatShading=false;o.material.roughness=.72;}});

 // A seven-step buried stone pyramid. Only its cap breaks the sand at first.
 const pyramid=new THREE.Group();pyramid.position.set(PYRAMID.x,GROUND-1.87,PYRAMID.z);pyramid.rotation.y=Math.PI/4;scene.add(pyramid);
 const stone=[0xb8a77c,0xc2b38a,0xcbbc91,0xd4c79f];
 for(let i=0;i<5;i++){const size=2.25-i*.42,y=.15+i*.31;const tier=box(pyramid,0,y,0,size,.3,size,stone[i%stone.length]);tier.geometry=new THREE.BoxGeometry(size,.3,size,2,1,2);}
 const cap=mesh(new THREE.ConeGeometry(.28,.42,4),mat(0xe0c67b,{roughness:.75}),pyramid,0,1.72,0);cap.rotation.y=Math.PI/4;
 const glint=ball(pyramid,0,1.88,0,.045,0xffdf77);glint.material=glint.material.clone();glint.material.emissive=new THREE.Color(0xffc64d);glint.material.emissiveIntensity=1.2;

 const shovelIcon='<svg viewBox="0 0 32 32" width="25" height="25" aria-hidden="true"><path d="M12 3h8v5l-4 3-4-3z" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="M16 10v11" stroke="#9b703d" stroke-width="3"/><path d="M10 20h12v5l-6 5-6-5z" fill="#749ba1" stroke="currentColor" stroke-width="1.5"/></svg>';
 const tools=['axe','shovel','shotgun'],originalChop=game.chop.bind(game);game.chop=()=>tool==='shovel'?dig():tool==='shotgun'?shoot():originalChop();
 function select(direction=1){if(game.craftingOpen||game.swing||digTime||gunTime||game.pendingHit)return;const index=(tools.indexOf(tool)+direction+tools.length)%tools.length;tool=tools[index];player.axe.visible=tool==='axe';shovel.visible=tool==='shovel';shotgun.visible=tool==='shotgun';const icon=tool==='axe'?'🪓':tool==='shovel'?shovelIcon:'🔫',label=tool==='axe'?'Sekera':tool==='shovel'?'Lopata':'Brokovnice',action=tool==='axe'?'Sekat':tool==='shovel'?'Kopat':'Vystřelit';$('tool').innerHTML=icon;$('tool').setAttribute('aria-label',`${label}. Přepnout nástroj`);$('tool').setAttribute('aria-pressed',String(tool!=='axe'));document.querySelector('.chop').innerHTML=icon;document.querySelector('.chop').setAttribute('aria-label',action);}
 $('tool').onclick=()=>select(1);addEventListener('keydown',e=>{if(e.key.toLowerCase()==='q'&&!e.repeat&&!['INPUT','SELECT','BUTTON'].includes(e.target.tagName))select(1);});

 function shoot(){
  if(game.cooldown>0||gunTime>0)return false;game.cooldown=.58;gunTime=.28;muzzle.visible=true;sound('shot');const p=player.root.position,a=player.root.rotation.y,dx=Math.sin(a),dz=Math.cos(a);let target=null,best=Infinity;
  const consider=(object,type,range)=>{const root=object.root||object,tx=root.position.x-p.x,tz=root.position.z-p.z,d=Math.hypot(tx,tz);if(!d||d>range)return;const dot=(tx*dx+tz*dz)/d;if(dot<.82)return;const score=(1-dot)*16+d/range;if(score<best){best=score;target={object,type,root};}};
  for(const tree of game.trees)if(tree.state==='standing')consider(tree,'tree',7.5);for(const animal of game.shootables||[])if(animal.alive)consider(animal,animal.type,15);
  if(target?.type==='tree'){target.object.hp=1;game.hit(target.object);}else target?.object.onShot?.();
  const end=target?target.root.position.clone():new THREE.Vector3(p.x+dx*9,p.y+.8,p.z+dz*9),start=new THREE.Vector3(p.x,p.y+1,p.z).add(new THREE.Vector3(dx*.5,0,dz*.5)),geometry=new THREE.BufferGeometry().setFromPoints([start,end]),line=new THREE.Line(geometry,new THREE.LineBasicMaterial({color:0xffdf8b,transparent:true,opacity:.75}));scene.add(line);setTimeout(()=>{scene.remove(line);geometry.dispose();line.material.dispose();},55);return true;
 }

 function nearestHole(x,z){let best=null,d=Infinity;for(const h of holes){const n=Math.hypot(h.x-x,h.z-z),reach=Math.max(1.05,(h.radius||.8)*.72);if(n<reach&&n<d){best=h;d=n;}}return best;}
 function digTarget(){
  const p=player.root.position,a=player.root.rotation.y,x=p.x+Math.sin(a)*.92,z=p.z+Math.cos(a)*.92;
  const blocked=!inside(x,z,.75)||game.trees.some(t=>t.state!=='gone'&&Math.hypot(t.x-x,t.z-z)<.75)||game.buildings.some(b=>Math.hypot(b.x-x,b.z-z)<1.15);
  const pyramid=Math.hypot(x-PYRAMID.x,z-PYRAMID.z)<1.45;
  const hole=pyramid?holes.find(h=>h.pyramid):nearestHole(x,z);
  return {x:pyramid?PYRAMID.x:hole?.x??x,z:pyramid?PYRAMID.z:hole?.z??z,a,hole,pyramid,valid:!blocked&&game.grounded&&(!hole||hole.level<50)&&(hole||holes.length<100)};
 }
 function dig(){
  if(game.cooldown>0||digTime>0||!game.grounded)return false;
  const p=player.root.position,{x,z,a,valid,pyramid}=digTarget();
  if(!valid)return false;
  let hole=pyramid?holes.find(h=>h.pyramid):nearestHole(x,z);
  if(pyramid){if(!hole){hole={x:PYRAMID.x,z:PYRAMID.z,level:0,pyramid:true,visual:new THREE.Group()};scene.add(hole.visual);holes.push(hole);}}
  if(!hole){hole={x,z,level:0,pyramid:false,visual:new THREE.Group()};scene.add(hole.visual);holes.push(hole);}
  game.targetAngle=a;game.cooldown=.82;game.swing=.82;digTime=.82;pending={hole,at:.39,from:new THREE.Vector2(p.x,p.z)};return true;
 }

 function rebuildCrater(h){
  // The deformable terrain itself is the excavation. Remove all old decorative rims.
  while(h.visual.children.length){const o=h.visual.children.pop();o.geometry?.dispose();}
  h.visual.position.set(h.x,0,h.z);
 }

 function throwSand(h,from){
  const count=Math.min(56,24+h.level*3),base=Math.atan2(h.z-from.y,h.x-from.x);
  for(let i=0;i<count;i++){const a=base+(Math.random()-.5)*2.3,speed=1.2+Math.random()*2.2,m=ball(scene,h.x+(Math.random()-.5)*.22,terrain.heightAt(h.x,h.z)+.12,h.z+(Math.random()-.5)*.22,.025+Math.random()*.045,i%4?0xe7cc89:0xd8b875);m.castShadow=false;sand.push({m,v:new THREE.Vector3(Math.sin(a)*speed,1.8+Math.random()*2.3,Math.cos(a)*speed),life:0,rest:false});}
  while(sand.length>190){const old=sand.shift();scene.remove(old.m);old.m.geometry.dispose();}
 }

 function addLoot(kind,x,z){
  inventory[kind]++;const root=new THREE.Group(),baseY=terrain.heightAt(x,z);root.position.set(x,baseY,z);root.userData.baseY=baseY;scene.add(root);
  if(kind==='chest'){box(root,0,.16,0,.45,.28,.32,0x9e642e);box(root,0,.32,0,.46,.12,.34,0xba813e);for(const side of [-1,1])box(root,side*.15,.23,0,.035,.34,.35,0xe9be54);box(root,0,.22,.18,.075,.08,.025,0xffd36d);}
  else if(kind==='coin'){const m=mesh(new THREE.CylinderGeometry(.15,.15,.035,20),mat(0xffcf4f,{metalness:.5,roughness:.3}),root);m.rotation.x=Math.PI/2;}
  else if(kind==='pearl'){ball(root,0,.12,0,.14,0xffeee0);}
  else if(kind==='relic'){ball(root,0,.22,0,.2,0xe5be56,[.75,1.4,.55]);ball(root,0,.45,0,.12,0xe5be56);}
  else{ball(root,0,.1,0,.17,0xf3b9a3,[1,.5,1.1]);for(let i=0;i<5;i++)rod(root,[0,.12,-.1],[(i-2)*.06,.12,.12],.01,0xffe8cf);}
  finds.push({root,age:0});sound('pickup');showLoot(`${lootMeta[kind][0]} +1`);updateBag();
 }
 function showLoot(label){$('loot').textContent=`${label}  →  🎒`;$('loot').hidden=false;clearTimeout(showLoot.timer);showLoot.timer=setTimeout(()=>{$('loot').hidden=true;},1800);}
 const nearWorkbench=()=>game.buildings.some(b=>b.type==='workbench'&&Math.hypot(b.x-player.root.position.x,b.z-player.root.position.z)<2);
 let bagSignature='';
 function updateBag(){
  const strips=inventory.strips?.length||0,ropes=inventory.ropes?.length||0,ropeLength=inventory.ropes?.reduce((n,r)=>n+r.length,0)||0,atBench=nearWorkbench();
  const ropeDetail=ropes?inventory.ropes.map(r=>`${r.length} m / ${r.quality} %`).join(' · '):'';
  const entries=[['🪵','Dřevo',game.wood],['🍃','Listí',game.leaves,'leaf'],['🌿','Liána',inventory.vine,'vine'],['〰️','Proužky',strips,'braid'],['🪢',ropeLength?`Lana ${ropeLength} m · ${ropeDetail}`:'Lano',ropes,'join'],['🥥','Kokosy',inventory.coconut],['🐟','Ryby',inventory.fish],['🦐','Plody moře',inventory.seafood],['🍢','Opečené jídlo',inventory.cooked],['🪶','Pírka',inventory.feather],['🥩','Maso',inventory.meat],...Object.entries(lootMeta).map(([k,[icon,name]])=>[icon,name,inventory[k]])];
  const signature=JSON.stringify([atBench,entries]);
  if(signature===bagSignature)return;
  bagSignature=signature;
  $('bagContents').innerHTML=entries.map(([icon,name,n,action])=>{const enough=action==='braid'?n>=3:action==='join'?n>=2:n>0,enabled=enough&&atBench;return action?`<button class="bagItem" data-workshop="${action}" ${enabled?'':'disabled'} aria-label="${name}, ${n||0}. ${atBench?'Otevřít výrobu u ponku':'Vyžaduje pracovní ponk'}"><span>${icon}</span><small>${name}${atBench?'':' · u ponku'}</small><b>${n||0}</b></button>`:`<div><span>${icon}</span><small>${name}</small><b>${n||0}</b></div>`}).join('');$('bagTotal').textContent=entries.reduce((n,e)=>n+(e[2]||0),0);
 }
 function toggleBag(open=$('bagPanel').hidden){if(open)updateBag();$('bagPanel').hidden=!open;$('bagBtn').setAttribute('aria-expanded',String(open));}
 let lastTouchOpen=0;function openBagWorkshop(e){const item=e.target.closest?.('[data-workshop]');if(!item||item.disabled)return false;e.preventDefault();lastTouchOpen=performance.now();workshop.open(item.dataset.workshop);return true;}
 $('bagBtn').onclick=()=>toggleBag();$('bagClose').onclick=()=>toggleBag(false);$('bagContents').addEventListener('pointerup',e=>{if(e.pointerType!=='mouse')openBagWorkshop(e);});$('bagContents').addEventListener('click',e=>{if(performance.now()-lastTouchOpen>500)openBagWorkshop(e);});workshop=createFiberCrafting(game,{sound,onInventoryChange:()=>{updateBag();$('leaves').textContent=game.leaves;game.requestSave?.();},closeBag:()=>toggleBag(false),canCraft:nearWorkbench});game.openFiberCrafting=action=>workshop.open(action);updateBag();

 function startFlood(h,sourceX,sourceZ,startHeight){
  if(h.flood)return h.flood;const bottom=terrain.heightAt(h.x,h.z),material=new THREE.MeshPhysicalMaterial({color:0x35b7bd,transparent:true,opacity:.42,roughness:.15,metalness:.05,depthWrite:false});const surface=mesh(new THREE.CircleGeometry(1,48),material,scene,sourceX,startHeight,sourceZ);surface.rotation.x=-Math.PI/2;surface.scale.setScalar(.04);surface.renderOrder=3;surface.castShadow=false;
  const ripples=[];for(let i=0;i<3;i++){const ring=mesh(new THREE.RingGeometry(.82,.88,40),new THREE.MeshBasicMaterial({color:0xd9ffff,transparent:true,opacity:.35,side:THREE.DoubleSide,depthWrite:false}),scene,sourceX,startHeight+.01,sourceZ);ring.rotation.x=-Math.PI/2;ring.renderOrder=4;ripples.push(ring);}
  h.flood={hole:h,surface,ripples,height:Math.max(bottom+.025,startHeight),phase:Math.random()*5,sourceX,sourceZ};floods.push(h.flood);sound('water');return h.flood;
 }
 function maybeFlood(h){
  if(h.flood)return;const a=Math.atan2(h.z,h.x),edge=islandRadius(a),touchesSea=Math.hypot(h.x,h.z)+h.radius>=edge-.08,bottom=terrain.heightAt(h.x,h.z);if(!touchesSea||bottom>=SEA_LEVEL-.06)return;const radial=Math.max(.001,Math.hypot(h.x,h.z)),sourceX=h.x/radial*(edge-.18),sourceZ=h.z/radial*(edge-.18);startFlood(h,sourceX,sourceZ,bottom+.025);
 }
 function spreadWater(){
  for(const source of [...floods])for(const h of holes){if(h.flood||!h.radius)continue;const dx=source.hole.x-h.x,dz=source.hole.z-h.z,d=Math.hypot(dx,dz),reach=source.surface.scale.x+h.radius*.78;if(d>reach)continue;const bottom=terrain.heightAt(h.x,h.z),midX=(source.hole.x+h.x)/2,midZ=(source.hole.z+h.z)/2,saddle=terrain.heightAt(midX,midZ);if(source.height<saddle+.025||source.height<bottom+.035)continue;const ux=dx/Math.max(.001,d),uz=dz/Math.max(.001,d),sourceX=h.x+ux*h.radius*.7,sourceZ=h.z+uz*h.radius*.7;startFlood(h,sourceX,sourceZ,Math.max(bottom+.025,Math.min(source.height,SEA_LEVEL)));
  }
 }
 game.waterDepthAt=(x,z)=>{let depth=0;for(const f of floods){const r=f.surface.scale.x;if(Math.hypot(x-f.hole.x,z-f.hole.z)<r)depth=Math.max(depth,f.height-terrain.heightAt(x,z));}if(terrain.baseHeight(x,z)<SEA_LEVEL)depth=Math.max(depth,SEA_LEVEL-terrain.heightAt(x,z));return depth;};

 function uncover({hole,from}){
  hole.level++;hole.depth=.24*hole.level+.035*Math.max(0,hole.level-4)**1.28;hole.radius=.56+.27*Math.sqrt(hole.level);terrain.setHole(hole);rebuildCrater(hole);throwSand(hole,from);maybeFlood(hole);spreadWater();sound('dig');if(navigator.vibrate)navigator.vibrate([18,25,12]);
  if(hole.pyramid){
   const reveal=Math.min(hole.level,PYRAMID_REVEAL_DEPTH)/PYRAMID_REVEAL_DEPTH,target=GROUND-1.87+reveal*1.69;pyramid.userData.targetY=target;
   if(hole.level===2)addLoot('coin',hole.x+.3,hole.z);else if(hole.level===4)addLoot('pearl',hole.x-.25,hole.z+.15);else if(hole.level===PYRAMID_REVEAL_DEPTH){addLoot('relic',hole.x,hole.z-.3);showLoot('🗿 Pyramida odkryta  →  🎒 relikvie');}
  }else{const r=Math.random(),kind=r<.08?'chest':r<.18?'pearl':r<.45?'coin':r<.72?'shell':null;if(kind)addLoot(kind,hole.x,hole.z);}
  game.requestSave?.();
 }

 return {dig,select,get tool(){return tool},inventory,holes,floods,pyramid,restoreFloods(savedHoles=[]){savedHoles.forEach((saved,i)=>{if(saved.flood&&holes[i])startFlood(holes[i],saved.flood.sourceX,saved.flood.sourceZ,saved.flood.height);});for(const h of holes)maybeFlood(h);spreadWater();},update(dt){
  const marker=digTarget();digMarker.visible=tool==='shovel'&&!game.craftingOpen;if(digMarker.visible){digMarker.position.set(marker.x,terrain.heightAt(marker.x,marker.z)+.028,marker.z);digMarkerMaterial.color.set(marker.valid?0xffefad:0xf06f61);digMarker.scale.setScalar(.96+Math.sin(game.elapsed*5)*.04);}
  if(pending){pending.at-=dt;if(pending.at<=0){uncover(pending);pending=null;}}digTime=Math.max(0,digTime-dt);gunTime=Math.max(0,gunTime-dt);muzzle.visible=gunTime>.2;const moving=game.walk!==0;walkBlend=THREE.MathUtils.damp(walkBlend,moving?1:0,9,dt);const t=game.elapsed;
  player.body.rotation.z=Math.sin(game.walk)*.045*walkBlend;player.body.rotation.y=Math.sin(game.walk)*.05*walkBlend;player.body.position.y=Math.abs(Math.sin(game.walk))*.045*walkBlend+Math.sin(t*2.1)*.009;player.body.scale.y=1+Math.sin(t*2.1)*.008;player.body.rotation.x=game.swimming?.42:digTime?Math.sin((.82-digTime)/.82*Math.PI)*.42:game.swing?Math.sin((.5-game.swing)/.5*Math.PI)*.09:walkBlend*.045;
  if(digTime){const phase=(.82-digTime)/.82;player.arms[1].rotation.x=-.3-Math.sin(phase*Math.PI)*2;player.arms[0].rotation.x=-.3-Math.sin(phase*Math.PI)*.5;}else if(tool==='shotgun')player.arms[1].rotation.x=-1.18+(gunTime?Math.sin(gunTime/.28*Math.PI)*.35:0);if(!game.grounded&&!game.swimming)player.legs.forEach((leg,i)=>leg.rotation.x=.45+(i?-.15:.15));
  if(head){head.rotation.y=Math.sin(t*.6)*.055*(1-walkBlend);head.rotation.x=-player.body.rotation.x*.35;const blink=t%4.7>4.55?.15:1;eyes.forEach(e=>e.scale.y=blink);}
  pyramid.position.y=THREE.MathUtils.damp(pyramid.position.y,pyramid.userData.targetY??GROUND-1.87,3.5,dt);glint.scale.setScalar(.7+Math.sin(t*4)*.25);glint.rotation.y=t;
  for(let i=sand.length-1;i>=0;i--){const p=sand[i];p.life+=dt;if(p.rest){p.m.scale.multiplyScalar(Math.exp(-dt*2.8));if(p.m.scale.x<.06){scene.remove(p.m);p.m.geometry.dispose();sand.splice(i,1);}continue;}p.v.y-=8.5*dt;p.m.position.addScaledVector(p.v,dt);p.v.x*=Math.exp(-dt*.65);p.v.z*=Math.exp(-dt*.65);p.m.rotation.x+=p.v.z*dt*3;p.m.rotation.z-=p.v.x*dt*3;const landing=terrain.heightAt(p.m.position.x,p.m.position.z)+.035;if(p.m.position.y<=landing){p.m.position.y=landing;if(p.v.y<-.9){p.v.y=-p.v.y*.22;p.v.x*=.63;p.v.z*=.63;}else{p.v.set(0,0,0);p.rest=true;p.m.scale.y=.55;}}}
  spreadWater();
  for(const f of floods){const bottom=terrain.heightAt(f.hole.x,f.hole.z);f.height=Math.max(f.height,bottom+.02);f.height=Math.min(SEA_LEVEL,f.height+dt*(.075+Math.min(f.hole.radius,3)*.012));const fill=THREE.MathUtils.clamp((f.height-bottom)/Math.max(.01,SEA_LEVEL-bottom),0,1),waterRadius=f.hole.radius*Math.sqrt(fill)*.82;const spread=Math.pow(fill,.45);f.surface.position.x=THREE.MathUtils.lerp(f.sourceX,f.hole.x,spread);f.surface.position.z=THREE.MathUtils.lerp(f.sourceZ,f.hole.z,spread);f.surface.position.y=f.height+Math.sin(t*1.7+f.phase)*.006;f.surface.scale.setScalar(Math.max(.04,waterRadius));f.surface.material.opacity=.3+fill*.28;for(let i=0;i<f.ripples.length;i++){const ring=f.ripples[i],wave=(t*.22+i/3+f.phase)%1;ring.position.x=f.surface.position.x;ring.position.z=f.surface.position.z;ring.position.y=f.surface.position.y+.008;ring.scale.setScalar(Math.max(.04,waterRadius*(.35+wave*.65)));ring.material.opacity=(1-wave)*.22*fill;}}
  for(let i=finds.length-1;i>=0;i--){const f=finds[i];f.age+=dt;f.root.position.y=f.root.userData.baseY+.25+Math.min(f.age,1)*.65;f.root.rotation.y+=dt*1.8;f.root.scale.setScalar(f.age<1.6?1:Math.max(0,1-(f.age-1.6)*2));if(f.age>2.1){scene.remove(f.root);f.root.traverse(o=>o.geometry?.dispose());finds.splice(i,1);}}
  bagTick-=dt;if(bagTick<=0){bagTick=.3;updateBag();}
 }};
}
