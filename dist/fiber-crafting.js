const $=id=>document.getElementById(id);

export function createFiberCrafting(game,{sound,onInventoryChange,closeBag,canCraft}){
 if(!$('fiberWorkshop'))document.body.insertAdjacentHTML('beforeend','<section id="fiberWorkshop" class="fiberWorkshop" hidden role="dialog" aria-modal="true" aria-labelledby="fiberTitle"><div class="workbench"><div class="workbenchTop"><div><small>PRACOVNÍ PONK</small><h2 id="fiberTitle">Zpracování vláken</h2></div><button id="fiberClose" aria-label="Zavřít dílnu">✕</button></div><p id="fiberInstruction"></p><div id="fiberChoices" class="fiberChoices" hidden><button data-fiber-action="leaf"><span>🍃</span><strong>Palmový list</strong><small id="fiberLeafCount"></small></button><button data-fiber-action="vine"><span>🌿</span><strong>Liána</strong><small id="fiberVineCount"></small></button><button data-fiber-action="braid"><span>〰️</span><strong>Splést prameny</strong><small id="fiberStripCount"></small></button><button data-fiber-action="join"><span>🪢</span><strong>Napojit lana</strong><small id="fiberRopeCount"></small></button></div><canvas id="fiberCanvas" aria-label="Interaktivní pracovní plocha pro řezání, splétání a spojování lana"></canvas><div class="workbenchBottom"><strong id="fiberStatus" role="status"></strong><div><button id="fiberReset">Začít znovu</button><button id="fiberNext" hidden>Pokračovat</button></div></div></div></section>');
 const overlay=$('fiberWorkshop'),canvas=$('fiberCanvas'),ctx=canvas.getContext('2d'),choices=$('fiberChoices'),title=$('fiberTitle'),instruction=$('fiberInstruction'),status=$('fiberStatus'),reset=$('fiberReset'),next=$('fiberNext');
 const inventory=game.inventory;inventory.vine??=0;inventory.strips??=[];inventory.ropes??=[];
 let stage='cut',source='leaf',paths=[],activePath=null,braid=null,join=null,pointerId=null,width=800,height=500;
 const sourceName=()=>source==='vine'?'liánu':'palmový list';
 const point=e=>{const r=canvas.getBoundingClientRect();return {x:(e.clientX-r.left)*width/r.width,y:(e.clientY-r.top)*height/r.height};};
 const roundRect=(x,y,w,h,r)=>{ctx.beginPath();if(ctx.roundRect){ctx.roundRect(x,y,w,h,r);return;}const q=Math.min(r,w/2,h/2);ctx.moveTo(x+q,y);ctx.lineTo(x+w-q,y);ctx.quadraticCurveTo(x+w,y,x+w,y+q);ctx.lineTo(x+w,y+h-q);ctx.quadraticCurveTo(x+w,y+h,x+w-q,y+h);ctx.lineTo(x+q,y+h);ctx.quadraticCurveTo(x,y+h,x,y+h-q);ctx.lineTo(x,y+q);ctx.quadraticCurveTo(x,y,x+q,y);ctx.closePath();};
 const strokePath=(points,color,lineWidth,dash=[])=>{if(points.length<2)return;ctx.beginPath();ctx.moveTo(points[0].x,points[0].y);for(let i=1;i<points.length;i++)ctx.lineTo(points[i].x,points[i].y);ctx.setLineDash(dash);ctx.strokeStyle=color;ctx.lineWidth=lineWidth;ctx.lineCap='round';ctx.lineJoin='round';ctx.stroke();ctx.setLineDash([]);};
 function resize(){const r=canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2),oldWidth=width,oldHeight=height; width=Math.max(1,Math.round(r.width));height=Math.max(1,Math.round(r.height));if(oldWidth!==width||oldHeight!==height){for(const path of paths)for(const p of path.points){p.x*=width/oldWidth;p.y*=height/oldHeight;}activePath=null;pointerId=null;if(stage==='cut'&&paths.length<2)status.textContent=`Řezy ${paths.length} / 2 · po otočení pokračuj novým tahem`;}canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);draw();}
 function backdrop(){const g=ctx.createLinearGradient(0,0,width,height);g.addColorStop(0,'#f3e4be');g.addColorStop(1,'#d8b878');ctx.fillStyle=g;ctx.fillRect(0,0,width,height);ctx.globalAlpha=.16;for(let i=0;i<18;i++){ctx.strokeStyle=i%2?'#76532d':'#fff';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(0,i*31+Math.sin(i)*14);ctx.bezierCurveTo(width*.3,i*31-8,width*.65,i*31+20,width,i*31);ctx.stroke();}ctx.globalAlpha=1;}
 function drawMaterial(){
  const x0=width*.1,x1=width*.9,cy=height*.5,span=x1-x0;
  ctx.save();ctx.shadowColor='#244d2a55';ctx.shadowBlur=22;ctx.shadowOffsetY=10;
  if(source==='leaf'){
   const g=ctx.createLinearGradient(x0,cy,x1,cy);g.addColorStop(0,'#3e8c43');g.addColorStop(.55,'#66b84e');g.addColorStop(1,'#a0ce61');ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(x0,cy);ctx.bezierCurveTo(x0+span*.16,cy-height*.24,x0+span*.72,cy-height*.28,x1,cy);ctx.bezierCurveTo(x0+span*.72,cy+height*.28,x0+span*.16,cy+height*.24,x0,cy);ctx.fill();
   ctx.strokeStyle='#426f35';ctx.lineWidth=10;ctx.beginPath();ctx.moveTo(width*.045,cy);ctx.bezierCurveTo(width*.3,cy-3,width*.62,cy+4,x1,cy);ctx.stroke();ctx.strokeStyle='#a4cd70';ctx.lineWidth=2;ctx.stroke();
  }else{
   ctx.strokeStyle='#4c7e39';ctx.lineWidth=Math.max(46,height*.11);ctx.lineCap='round';ctx.beginPath();ctx.moveTo(x0,cy);ctx.bezierCurveTo(width*.34,cy-height*.08,width*.66,cy+height*.08,x1,cy);ctx.stroke();ctx.strokeStyle='#7eb65a';ctx.lineWidth=Math.max(34,height*.08);ctx.stroke();
  }
  ctx.restore();
  const targets=[height*.43,height*.57];for(const y of targets){ctx.strokeStyle='#f4f2cf99';ctx.lineWidth=2;ctx.setLineDash([9,12]);ctx.beginPath();ctx.moveTo(x0+20,y);ctx.bezierCurveTo(width*.36,y-7,width*.65,y+6,x1-20,y);ctx.stroke();ctx.setLineDash([]);}
  for(const p of paths)strokePath(p.points,'#f4e5ad',7);if(activePath)strokePath(activePath,'#fff4c4',7);
 }
 function braidHandles(){const xs=[width*.27,width*.5,width*.73],y=height*.8;return braid.order.map((strand,position)=>({strand,position,x:xs[position],y}));}
 function drawBraid(){
  const colors=['#6c9e47','#b4c86b','#477b3a'],xs=[width*.27,width*.5,width*.73],top=height*.12,bottom=height*.8;
  ctx.fillStyle='#ffffff75';roundRect(width*.16,height*.075,width*.68,height*.8,28);ctx.fill();
  for(let s=0;s<3;s++){ctx.strokeStyle=colors[s];ctx.lineWidth=20;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(xs[s],top);let current=s;for(let m=0;m<braid.moves;m++){const from=current,to=braid.history[m][s];const y0=top+(bottom-top)*m/7,y1=top+(bottom-top)*(m+1)/7;ctx.bezierCurveTo(xs[from],(y0+y1)/2,xs[to],(y0+y1)/2,xs[to],y1);current=to;}ctx.lineTo(xs[braid.positions[s]],bottom);ctx.stroke();ctx.strokeStyle='#eef2c766';ctx.lineWidth=3;ctx.stroke();}
  const handles=braidHandles(),expected=braid.moves%2===0?0:2;for(const h of handles){ctx.fillStyle=colors[h.strand];ctx.beginPath();ctx.arc(h.x,h.y,28,0,Math.PI*2);ctx.fill();ctx.strokeStyle=h.position===expected?'#fff7bc':'#315f3a66';ctx.lineWidth=h.position===expected?7:3;ctx.stroke();}
  ctx.strokeStyle='#fff7bc';ctx.lineWidth=4;ctx.setLineDash([8,8]);ctx.beginPath();ctx.arc(width*.5,height*.8,48,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);
  if(braid.dragging){const h=handles.find(x=>x.strand===braid.dragging.strand);strokePath([{x:h.x,y:h.y},braid.dragging.point],'#fff4be',9);}
 }
 function drawJoin(){
  const cy=height*.5,left={x:width*.42,y:cy},right={x:width*.58,y:cy},target={x:width*.5,y:cy};ctx.fillStyle='#ffffff75';roundRect(width*.08,height*.16,width*.84,height*.68,28);ctx.fill();
  ctx.strokeStyle='#7b9b55';ctx.lineWidth=22;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(width*.1,cy);ctx.bezierCurveTo(width*.22,cy-height*.12,width*.31,cy+height*.12,left.x,left.y);ctx.stroke();ctx.strokeStyle='#507740';ctx.beginPath();ctx.moveTo(width*.9,cy);ctx.bezierCurveTo(width*.78,cy+height*.12,width*.69,cy-height*.12,right.x,right.y);ctx.stroke();
  for(const [side,p,color] of [['left',left,'#91b863'],['right',right,'#5e8b48']]){const q=join.locked[side]?target:p;ctx.fillStyle=color;ctx.beginPath();ctx.arc(q.x,q.y,25,0,Math.PI*2);ctx.fill();if(!join.locked[side]){ctx.strokeStyle='#fff5bd';ctx.lineWidth=5;ctx.stroke();}}
  ctx.strokeStyle='#fff5bd';ctx.lineWidth=4;ctx.setLineDash([8,8]);ctx.beginPath();ctx.arc(target.x,target.y,50,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);
  if(join.dragging){const start=join.dragging.side==='left'?left:right;strokePath([start,join.dragging.point],'#fff4be',10);}
  if(join.done){ctx.strokeStyle='#e3c478';ctx.lineWidth=8;ctx.beginPath();ctx.arc(target.x,target.y,34,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.arc(target.x-18,target.y,22,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.arc(target.x+18,target.y,22,0,Math.PI*2);ctx.stroke();}
 }
 function draw(){if(stage==='select')return;backdrop();if(stage==='cut')drawMaterial();else if(stage==='braid')drawBraid();else drawJoin();}
 function refreshChoices(){
  $('fiberLeafCount').textContent=`V batohu ${game.leaves}`;$('fiberVineCount').textContent=`V batohu ${inventory.vine}`;$('fiberStripCount').textContent=`Proužky ${inventory.strips.length} / 3`;$('fiberRopeCount').textContent=`Kusy lana ${inventory.ropes.length} / 2`;
  choices.querySelector('[data-fiber-action="leaf"]').disabled=game.leaves<1;choices.querySelector('[data-fiber-action="vine"]').disabled=inventory.vine<1;choices.querySelector('[data-fiber-action="braid"]').disabled=inventory.strips.length<3;choices.querySelector('[data-fiber-action="join"]').disabled=inventory.ropes.length<2;
 }
 function setStage(value){
  stage=value;const selecting=stage==='select';canvas.hidden=selecting;choices.hidden=!selecting;reset.hidden=selecting;next.hidden=true;
  if(selecting){title.textContent='Co položíš na ponk?';instruction.textContent='Vyber materiál nebo pokračuj ve zpracování již připravených vláken a lan.';status.textContent='Ponk je připravený';refreshChoices();}
  if(stage==='cut'){paths=[];activePath=null;title.textContent=`Nařež ${sourceName()}`;instruction.textContent='Veď dva souvislé řezy od jednoho konce ke druhému. Čím rovnější a přesnější budou, tím pevnější vzniknou prameny.';status.textContent='Řezy 0 / 2';reset.textContent='Začít znovu';}
  if(stage==='braid'){braid={order:[0,1,2],positions:[0,1,2],moves:0,history:[],scores:[],dragging:null};title.textContent='Spleť tři prameny';instruction.textContent='Střídavě přetahuj zvýrazněný krajní pramen přes prostřední. Udělej šest přesných překladů.';status.textContent='Překlady 0 / 6';reset.textContent='Rozplést';}
  if(stage==='join'){join={locked:{left:false,right:false},dragging:null,done:false};title.textContent='Napoj dvě lana';instruction.textContent='Přetáhni oba volné konce do středu a vytvoř spoj. Délky obou lan se sečtou.';status.textContent='Spoj konce 0 / 2';reset.textContent='Povolit spoj';}
  draw();if(!selecting)requestAnimationFrame(resize);
 }
 function open(action){
  if(canCraft&&!canCraft())return false;
  if(action==='bench'){overlay.hidden=false;game.craftingOpen=true;closeBag?.();document.body.classList.add('crafting-open');setStage('select');requestAnimationFrame(()=>$('fiberClose').focus());return true;}
  if(action==='leaf'&&game.leaves<1)return;if(action==='vine'&&inventory.vine<1)return;if(action==='braid'&&inventory.strips.length<3)return;if(action==='join'&&inventory.ropes.length<2)return;
  source=action==='vine'?'vine':'leaf';overlay.hidden=false;game.craftingOpen=true;closeBag?.();document.body.classList.add('crafting-open');setStage(action==='braid'?'braid':action==='join'?'join':'cut');requestAnimationFrame(()=>$('fiberClose').focus());return true;
 }
 function close(){overlay.hidden=true;game.craftingOpen=false;document.body.classList.remove('crafting-open');pointerId=null;onInventoryChange?.();}
 function cutScore(points){
  if(points.length<2)return 0;const x0=width*.1,x1=width*.9,first=points[0],last=points.at(-1),leftToRight=first.x<last.x;
  if(Math.abs(first.x-(leftToRight?x0:x1))>width*.16||Math.abs(last.x-(leftToRight?x1:x0))>width*.16)return 0;
  const xMin=Math.min(...points.map(p=>p.x)),xMax=Math.max(...points.map(p=>p.x)),coverage=(xMax-xMin)/(x1-x0);if(coverage<.72)return 0;
  const side=(points.reduce((sum,p)=>sum+p.y,0)/points.length)<height*.5?-.07:.07,guide=height*(.5+side);
  const guideError=points.reduce((sum,p)=>sum+Math.abs(p.y-guide),0)/points.length;
  if(guideError>height*.15)return 0;
  const dx=last.x-first.x||1,straightError=points.reduce((sum,p)=>sum+Math.abs(p.y-(first.y+(p.x-first.x)/dx*(last.y-first.y))),0)/points.length;
  const reverse=points.slice(1).filter((p,i)=>(p.x-points[i].x)*(leftToRight?1:-1)<-width*.025).length;
  return Math.max(0,Math.min(1,coverage*.42+(1-Math.min(1,guideError/(height*.12)))*.32+(1-Math.min(1,straightError/(height*.09)))*.26-reverse*.06));
 }
 function finishCut(){
  if(paths.length!==2)return;const quality=Math.round(paths.reduce((n,p)=>n+p.score,0)/2*100);if(source==='vine')inventory.vine--;else game.leaves--;for(let i=0;i<3;i++)inventory.strips.push(Math.max(25,quality-i*2+Math.round(Math.random()*4)));
  sound?.('rustle');status.textContent=`3 prameny hotové, kvalita ${quality} %`;instruction.textContent='Prameny jsou oddělené. Můžeš je rovnou splést do jednoho lana.';reset.hidden=true;next.hidden=false;next.textContent='Splést prameny';next.onclick=()=>setStage('braid');onInventoryChange?.();
 }
 function finishBraid(){
  const strandQuality=inventory.strips.splice(0,3),motion=braid.scores.reduce((a,b)=>a+b,0)/braid.scores.length,quality=Math.round((strandQuality.reduce((a,b)=>a+b,0)/3*.65+motion*100*.35));inventory.ropes.push({length:1,quality});sound?.('build');status.textContent=`Lano hotové, 1 m, kvalita ${quality} %`;instruction.textContent='Tři prameny jsou spletené. Pokud vyrobíš druhé lano, můžeš oba kusy napojit.';reset.hidden=true;next.hidden=false;next.textContent=inventory.ropes.length>=2?'Napojit dvě lana':'Zavřít dílnu';next.onclick=()=>inventory.ropes.length>=2?setStage('join'):close();onInventoryChange?.();draw();
 }
 function finishJoin(){
  const a=inventory.ropes.shift(),b=inventory.ropes.shift(),quality=Math.round(Math.min(a.quality,b.quality)*.96),length=a.length+b.length;inventory.ropes.push({length,quality});join.done=true;sound?.('build');status.textContent=`Napojené lano, ${length} m, kvalita ${quality} %`;instruction.textContent='Spoj je utažený. Dvě kratší lana jsou nyní jedním delším kusem.';reset.hidden=true;next.hidden=false;next.textContent=inventory.ropes.length>=2?'Napojit další lana':'Zavřít dílnu';next.onclick=()=>inventory.ropes.length>=2?setStage('join'):close();onInventoryChange?.();draw();
 }
 canvas.addEventListener('pointerdown',e=>{
  e.preventDefault();if(pointerId!==null)return;pointerId=e.pointerId;canvas.setPointerCapture(e.pointerId);const p=point(e);
  if(stage==='cut')activePath=[p];
  else if(stage==='braid'){const handle=braidHandles().find(h=>Math.hypot(h.x-p.x,h.y-p.y)<44);if(handle)braid.dragging={strand:handle.strand,position:handle.position,point:p};}
  else if(stage==='join'&&!join.done){const cy=height*.5,candidates=[['left',{x:width*.42,y:cy}],['right',{x:width*.58,y:cy}]],hit=candidates.find(([side,q])=>!join.locked[side]&&Math.hypot(q.x-p.x,q.y-p.y)<45);if(hit)join.dragging={side:hit[0],point:p};}
  draw();
 });
 canvas.addEventListener('pointermove',e=>{if(e.pointerId!==pointerId)return;const p=point(e);if(activePath)activePath.push(p);if(braid?.dragging)braid.dragging.point=p;if(join?.dragging)join.dragging.point=p;draw();});
 function release(e){
  if(e.pointerId!==pointerId)return;const p=point(e);pointerId=null;
  if(stage==='cut'&&activePath){const score=cutScore(activePath),avg=activePath.reduce((n,q)=>n+q.y,0)/activePath.length,slot=avg<height*.5?0:1;if(score<.42)status.textContent='Řez musí vést plynule téměř přes celou délku.';else if(paths.some(q=>q.slot===slot))status.textContent='Druhý řez veď po druhé straně středu.';else{paths.push({points:activePath,score,slot});paths.sort((a,b)=>a.slot-b.slot);status.textContent=`Řezy ${paths.length} / 2, přesnost ${Math.round(score*100)} %`;if(paths.length===2)finishCut();}activePath=null;}
  else if(stage==='braid'&&braid.dragging){const expected=braid.moves%2===0?0:2,target={x:width*.5,y:height*.8},distance=Math.hypot(p.x-target.x,p.y-target.y);if(braid.dragging.position!==expected)status.textContent='Použij zvýrazněný krajní pramen.';else if(distance>62)status.textContent='Přetáhni pramen až do prostředního kruhu.';else{const old=braid.order.slice(),strand=old[expected],middle=old[1];if(expected===0){braid.order=[middle,strand,old[2]];}else{braid.order=[old[0],strand,middle];}braid.positions=Array(3);braid.order.forEach((s,i)=>braid.positions[s]=i);braid.history.push(braid.positions.slice());braid.moves++;braid.scores.push(Math.max(.55,1-distance/90));status.textContent=`Překlady ${braid.moves} / 6`;if(braid.moves===6)finishBraid();}braid.dragging=null;}
  else if(stage==='join'&&join.dragging){const target={x:width*.5,y:height*.5},distance=Math.hypot(p.x-target.x,p.y-target.y);if(distance<58){join.locked[join.dragging.side]=true;status.textContent=`Spoj konce ${Number(join.locked.left)+Number(join.locked.right)} / 2`;if(join.locked.left&&join.locked.right)finishJoin();}else status.textContent='Přesuň konec lana přímo do středového kruhu.';join.dragging=null;}
  draw();
 }
 canvas.addEventListener('pointerup',release);canvas.addEventListener('pointercancel',e=>{if(e.pointerId===pointerId){pointerId=null;activePath=null;if(braid)braid.dragging=null;if(join)join.dragging=null;draw();}});
 let lastChoiceTouch=0;function chooseMaterial(e){const button=e.target.closest?.('[data-fiber-action]');if(!button||button.disabled)return;e.preventDefault();lastChoiceTouch=performance.now();const action=button.dataset.fiberAction;source=action==='vine'?'vine':'leaf';setStage(action==='braid'?'braid':action==='join'?'join':'cut');}
 choices.addEventListener('pointerup',e=>{if(e.pointerType!=='mouse')chooseMaterial(e);});choices.addEventListener('click',e=>{if(performance.now()-lastChoiceTouch>500)chooseMaterial(e);});reset.onclick=()=>setStage(stage);$('fiberClose').onclick=close;addEventListener('resize',()=>{if(!overlay.hidden&&stage!=='select')resize();});addEventListener('keydown',e=>{if(!overlay.hidden&&e.key==='Escape'){e.preventDefault();close();}});
 return {open,close,get isOpen(){return !overlay.hidden;}};
}
