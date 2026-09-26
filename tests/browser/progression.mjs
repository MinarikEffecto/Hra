import assert from 'node:assert/strict';
import chromium from '@sparticuz/chromium';
import {chromium as playwright} from 'playwright-core';
import {createServer} from 'node:http';
import {createReadStream, statSync, mkdtempSync, mkdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {resolve, extname} from 'node:path';

const root = resolve(process.env.HRA_QA_DIST ?? fileURLToPath(new URL('../../dist/', import.meta.url)));
const output = process.env.HRA_QA_OUTPUT ?? mkdtempSync(resolve(tmpdir(), 'hra-progression-'));
mkdirSync(output, {recursive:true});
const prefix = 'progression';
const profile = mkdtempSync(resolve(output, 'profile-'));
console.log('Artifacts:', output);
const mime = {'.html':'text/html','.js':'text/javascript','.css':'text/css','.mp3':'audio/mpeg'};
const server = createServer((req,res) => {
  const pathname = decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  const file = resolve(root, `.${pathname === '/' ? '/index.html' : pathname}`);
  if (!file.startsWith(`${root}/`)) {res.writeHead(403);res.end();return;}
  try {statSync(file);} catch {res.writeHead(404);res.end();return;}
  res.setHeader('Content-Type', mime[extname(file)] ?? 'application/octet-stream');
  createReadStream(file).pipe(res);
});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
let context;
const log = (...data) => console.log(new Date().toISOString(), ...data);
try {
  context = await playwright.launchPersistentContext(profile, {
    args:chromium.args,executablePath:await chromium.executablePath(),headless:true,
    viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1,
  });
  const page = await context.newPage(), errors=[];
  page.on('pageerror',error => {errors.push(`pageerror: ${error.message}`);log('ERROR',errors.at(-1));});
  page.on('console',message => {if(message.type()==='error'){errors.push(`console: ${message.text()}`);log('ERROR',errors.at(-1));}});
  page.on('requestfailed',req => {errors.push(`requestfailed: ${req.url()} ${req.failure()?.errorText}`);log('ERROR',errors.at(-1));});
  await page.goto(`http://127.0.0.1:${server.address().port}/`,{waitUntil:'load',timeout:30000});
  await page.locator('#loading').waitFor({state:'hidden',timeout:25000});
  const cdp = await context.newCDPSession(page);
  let touchID=0;
  async function touchDown(selector, id) {
    const box=await page.locator(selector).boundingBox();
    return {x:box.x+box.width/2,y:box.y+box.height/2,id};
  }
  async function moveInput(ix,iz,seconds) {
    const b=await page.locator('#joystick').boundingBox(),x=b.x+b.width/2,y=b.y+b.height/2,r=b.width*.32;
    const id=++touchID;
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,id}]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+ix*r,y:y+iz*r,id}]});
    await page.waitForTimeout(Math.max(1,Math.round(seconds*1000)));
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  }
  async function move(dx,dz,seconds) {
    const scale=Math.hypot(dx,dz)||1, wx=dx/scale,wz=dz/scale;
    await moveInput((wx-wz)/Math.SQRT2,(wx+wz)/Math.SQRT2,seconds);
  }
  async function snapshot() {
    await page.locator('#bagBtn').tap();
    await page.locator('#saveNow').tap();
    const result=await page.evaluate(()=>JSON.parse(localStorage.getItem('trosechnik.save.v1')));
    result.availableWood=Number(await page.locator('#wood').innerText());
    await page.locator('#bagClose').tap();
    return result;
  }
  async function holdAxe(seconds) {
    const point=await touchDown('.chop',++touchID);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point]});
    await page.waitForTimeout(seconds*1000);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  }
  async function fellPalm(index,label,current) {
    let state=current;
    for(let attempt=0;attempt<4&&state.world.trees[index].state==='standing';attempt++){
      const hpBefore=state.world.trees[index].hp;
      await holdAxe(6.5);
      await page.waitForTimeout(1800);
      state=await snapshot();
      log(`${label}-chop`,JSON.stringify({attempt:attempt+1,hpBefore,tree:state.world.trees[index],wood:state.resources.wood}));
      if(state.world.trees[index].hp>=hpBefore&&state.world.trees[index].state==='standing')throw Error(`${label}: axe did not hit tree`);
    }
    assert.notEqual(state.world.trees[index].state,'standing',`${label}: palm should be chopped`);
    return state;
  }
  async function screenshot(label) {await page.screenshot({path:resolve(output,`${prefix}-${label}.png`)});}
  async function go(x,z,tolerance=.7) {
    for(let i=0;i<28;i++){
      const s=await snapshot(),dx=x-s.player.x,dz=z-s.player.z,d=Math.hypot(dx,dz);
      log('path',JSON.stringify({target:[x,z],current:[s.player.x,s.player.z],distance:d}));
      if(d<=tolerance)return s;
      await move(dx,dz,Math.min(.75,Math.max(.17,(d-tolerance/2)/2.8)));
    }
    throw Error(`Cannot reach ${x},${z}`);
  }
  let s=await snapshot();
  log('start',JSON.stringify({player:s.player,wood:s.resources.wood,inventory:s.inventory,trees:s.world.trees.slice(0,4),driftwood:s.world.driftwood,errors}));
  await screenshot('00-start');
  // First palm is left of the spawn. Approach to just over one metre.
  if(s.world.trees[0].state==='standing'){
    s=await go(-.9,1.65,.15);
    log('first-palm-near',JSON.stringify({player:s.player,tree:s.world.trees[0],target:await page.locator('#target').innerText()}));
    s=await fellPalm(0,'first-palm',s);
  }
  log('first-palm-felled',JSON.stringify({player:s.player,wood:s.resources.wood,tree:s.world.trees[0],target:await page.locator('#target').innerText()}));
  await screenshot('01-first-felled');
  if(s.availableWood<5 && !s.world.buildings.some(b=>b.type==='fire')){
    await go(-2.6,.9,.5);
    await go(-3.5,.2,.5);
    await go(-4.6,-.6,.5);
  }
  s=await snapshot();
  log('first-palm-collected',JSON.stringify({player:s.player,wood:s.resources.wood,leaves:s.resources.leaves,tree:s.world.trees[0],errors}));
  await screenshot('02-first-collected');
  if(s.world.trees[2].state==='standing'){
    s=await go(-4.35,-.45,.15);
    log('second-palm-near',JSON.stringify({player:s.player,target:await page.locator('#target').innerText()}));
    s=await fellPalm(2,'second-palm',s);
    log('second-palm-felled',JSON.stringify({player:s.player,wood:s.resources.wood,tree:s.world.trees[2]}));
    await screenshot('03-second-felled');
  }
  if(s.availableWood<7 && !s.world.buildings.some(b=>b.type==='fire')){
    await go(-4.15,-1.8,.65);
    await go(-4.2,-2.6,.65);
    await go(-4.3,-3.4,.65);
    s=await snapshot();
    log('second-palm-collected',JSON.stringify({player:s.player,wood:s.resources.wood}));
  }
  assert.ok(s.availableWood>=7||s.world.buildings.some(b=>b.type==='fire'),'need fire plus two spare wood');
  if(!s.world.buildings.some(b=>b.type==='fire')){
    await page.locator('#buildBtn').tap();
    assert.ok(await page.locator('.recipe[data-type="fire"]').isEnabled());
    await page.locator('.recipe[data-type="fire"]').tap();
    await page.locator('#game').tap({position:{x:195,y:470}});
    s=await snapshot();
    log('fire-placement',JSON.stringify({player:s.player,wood:s.resources.wood,buildings:s.world.buildings,toast:await page.locator('#toast').innerText()}));
    await screenshot('04-fire');
    assert.ok(s.world.buildings.some(b=>b.type==='fire'),'fire placement failed');
  }
  if(s.world.holes.length===0 || s.world.holes[0].level<4){
    if(s.world.holes.length===0) s=await go(-2.2,-1.8,.42);
    if(!String(await page.locator('#tool').getAttribute('aria-label')).startsWith('Lopata'))await page.locator('#tool').tap();
    assert.equal(await page.locator('.chop').getAttribute('aria-label'),'Kopat');
    const existing=s.world.holes[0]?.level??0;
    for(let level=existing+1;level<=4;level++){
      const point=await touchDown('.chop',++touchID);
      await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point]});
      await page.waitForTimeout(600);
      await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
      await page.waitForTimeout(600);
      s=await snapshot();
      log('dig',JSON.stringify({level,hole:s.world.holes[0],clay:s.inventory.clay,ore:s.inventory.ore}));
      assert.equal(s.world.holes[0]?.level,level,'dig step failed or extra dig');
    }
    await screenshot('05-four-digs');
  }
  assert.ok(s.world.holes.some(h=>!h.pyramid&&h.level>=4),'ordinary hole needed');
  assert.ok((s.inventory.clay>=3&&s.inventory.ore>=1)||s.world.buildings.some(b=>b.type==='furnace'),'clay and ore needed');
  if(!s.world.buildings.some(b=>b.type==='furnace')){
  await go(1.4,1.2,.55);
  s=await snapshot();
  log('near-fire',JSON.stringify({player:s.player,fire:s.world.buildings.find(b=>b.type==='fire'),technologyButtonVisible:await page.locator('#techOpen').isVisible()}));
  assert.ok(await page.locator('#techOpen').isVisible(),'cannot open fire technology');
  if(s.inventory.charcoal===0 && s.inventory.ingot===0 && !s.inventory.copperCutter && s.technology.job===null){
    await page.locator('#techOpen').tap();
    log('charcoal-panel',JSON.stringify({open:await page.locator('#techPanel').isVisible(),stock:await page.locator('#techStock').innerText(),disabled:await page.locator('[data-tech="charcoal"]').isDisabled()}));
    await page.waitForFunction(()=>!document.querySelector('[data-tech="charcoal"]').disabled,null,{timeout:12000});
    await page.locator('[data-tech="charcoal"]').tap();
    await page.locator('#techClose').tap();
    s=await snapshot();
    log('charcoal-started',JSON.stringify({wood:s.resources.wood,job:s.technology.job}));
    assert.equal(s.technology.job?.kind,'charcoal');
    await screenshot('06-charcoal-started');
  }
  if(s.technology.job?.kind==='charcoal'){
    for(let attempt=0;attempt<12&&s.technology.job?.kind==='charcoal';attempt++){
      await page.waitForTimeout(3200);
      s=await snapshot();
      log('charcoal-progress',JSON.stringify({remaining:s.technology.job?.remaining,charcoal:s.inventory.charcoal,ash:s.inventory.ash}));
    }
    log('charcoal-completed',JSON.stringify({wood:s.resources.wood,charcoal:s.inventory.charcoal,ash:s.inventory.ash,job:s.technology.job}));
    assert.ok(s.inventory.charcoal>=1&&s.inventory.ash>=1,'charcoal job did not finish');
    await screenshot('07-charcoal-completed');
  }
  await page.reload({waitUntil:'load'});
  await page.locator('#loading').waitFor({state:'hidden',timeout:25000});
  s=await snapshot();
  log('reload-fire-and-dig',JSON.stringify({player:s.player,wood:s.resources.wood,clay:s.inventory.clay,ore:s.inventory.ore,charcoal:s.inventory.charcoal,ash:s.inventory.ash,hole:s.world.holes[0],buildings:s.world.buildings,errors}));
  assert.ok(s.world.holes.some(h=>!h.pyramid&&h.level>=4));
  assert.ok(s.world.buildings.some(b=>b.type==='fire'));
  await screenshot('08-reloaded');
  }
  if(s.world.trees[1].state==='standing'){
    for(let i=0;i<3&&!String(await page.locator('#tool').getAttribute('aria-label')).startsWith('Sekera');i++)await page.locator('#tool').tap();
    assert.equal(await page.locator('.chop').getAttribute('aria-label'),'Sekat');
    s=await go(2.35,.75,.22);
    log('third-palm-near',JSON.stringify({player:s.player,target:await page.locator('#target').innerText()}));
    assert.ok((await page.locator('#target').innerText()).includes('palmu'),'not within palm range');
    s=await fellPalm(1,'third-palm',s);
    log('third-palm-felled',JSON.stringify({player:s.player,wood:s.resources.wood,tree:s.world.trees[1]}));
    await screenshot('09-third-felled');
  }
  if(s.availableWood<8){
    await go(3.3,.2,.65);
    await go(4.2,-.4,.65);
    await go(5.2,-1,.65);
    s=await snapshot();
    log('third-palm-collected',JSON.stringify({player:s.player,wood:s.resources.wood}));
  }
  if(s.world.trees[7].state==='standing'){
    s=await go(4.6,1.45,.15);
    log('fourth-palm-near',JSON.stringify({player:s.player,target:await page.locator('#target').innerText()}));
    assert.ok((await page.locator('#target').innerText()).includes('palmu'),'not within fourth palm range');
    s=await fellPalm(7,'fourth-palm',s);
    log('fourth-palm-felled',JSON.stringify({player:s.player,wood:s.resources.wood,tree:s.world.trees[7]}));
    await screenshot('10-fourth-felled');
  }
  if(s.availableWood<12 && !s.world.buildings.some(b=>b.type==='furnace')){
    await go(6.2,2.05,.65);
    await go(7.2,2.6,.65);
    await go(8.2,3.2,.65);
    s=await snapshot();
    log('fourth-palm-collected',JSON.stringify({player:s.player,wood:s.resources.wood,driftwood:s.world.driftwood}));
  }
  assert.ok(s.availableWood>=12||s.world.buildings.some(b=>b.type==='furnace'),'need 4 furnace and 8 bench wood');
  log('four-palms',JSON.stringify({wood:s.resources.wood,trees:[0,2,1,7].map(i=>s.world.trees[i]),player:s.player}));
  await screenshot('11-four-palms');
  if(!s.world.buildings.some(b=>b.type==='furnace')){
    await page.locator('#buildBtn').tap();
    assert.ok(await page.locator('.recipe[data-type="furnace"]').isEnabled(),'furnace recipe disabled');
    await page.locator('.recipe[data-type="furnace"]').tap();
    await page.locator('#game').tap({position:{x:155,y:470}});
    s=await snapshot();
    log('furnace-placement',JSON.stringify({player:s.player,wood:s.resources.wood,clay:s.inventory.clay,ash:s.inventory.ash,buildings:s.world.buildings,placeHidden:await page.locator('#place').isHidden()}));
    await screenshot('12-furnace');
    assert.ok(s.world.buildings.some(b=>b.type==='furnace'),'furnace placement failed');
  }
  if(s.inventory.ingot===0&&!s.inventory.copperCutter){
  const furnace=s.world.buildings.find(b=>b.type==='furnace');
  if(Math.hypot(s.player.x-furnace.x,s.player.z-furnace.z)>=2){
    await go(3.5,1.3,.55);
    await go(3.8,3.3,.55);
    await go(1.85,3.8,.55);
  }
  s=await snapshot();
  log('near-furnace',JSON.stringify({player:s.player,furnace,techButtonVisible:await page.locator('#techOpen').isVisible()}));
  assert.ok(Math.hypot(s.player.x-furnace.x,s.player.z-furnace.z)<2,'not within furnace reach');
  if(s.inventory.ingot===0&&!s.inventory.copperCutter&&s.technology.job===null){
    await page.locator('#techOpen').tap();
    log('copper-panel',JSON.stringify({open:await page.locator('#techPanel').isVisible(),stock:await page.locator('#techStock').innerText(),disabled:await page.locator('[data-tech="copper"]').isDisabled()}));
    await page.waitForFunction(()=>!document.querySelector('[data-tech="copper"]').disabled,null,{timeout:12000});
    await page.locator('[data-tech="copper"]').tap();
    await page.locator('#techClose').tap();
    s=await snapshot();
    log('smelting-started',JSON.stringify({ore:s.inventory.ore,charcoal:s.inventory.charcoal,job:s.technology.job}));
    assert.equal(s.technology.job?.kind,'copper');
    await screenshot('13-smelting-started');
    await page.reload({waitUntil:'load'});
    await page.locator('#loading').waitFor({state:'hidden',timeout:25000});
    s=await snapshot();
    log('smelting-reloaded',JSON.stringify({player:s.player,job:s.technology.job,buildings:s.world.buildings}));
    assert.equal(s.technology.job?.kind,'copper','active smelt lost on reload');
    await screenshot('14-smelting-reloaded');
  }
  if(s.technology.job?.kind==='copper'){
    for(let attempt=0;attempt<8&&s.technology.job?.kind==='copper';attempt++){
      await page.waitForTimeout(3200);
      s=await snapshot();
      log('smelting-progress',JSON.stringify({remaining:s.technology.job?.remaining,ingot:s.inventory.ingot}));
    }
    log('smelting-completed',JSON.stringify({ingot:s.inventory.ingot,ore:s.inventory.ore,charcoal:s.inventory.charcoal,job:s.technology.job}));
    assert.equal(s.inventory.ingot,1,'smelting did not produce ingot');
    await screenshot('15-ingot');
  }
  }
  assert.ok(s.inventory.ingot>=1||s.inventory.copperCutter,'need ingot for cutter');
  if(!s.world.buildings.some(b=>b.type==='workbench')){
    await page.locator('#buildBtn').tap();
    assert.ok(await page.locator('.recipe[data-type="workbench"]').isEnabled(),'bench recipe disabled');
    await page.locator('.recipe[data-type="workbench"]').tap();
    await page.locator('#game').tap({position:{x:235,y:470}});
    s=await snapshot();
    log('bench-placement',JSON.stringify({player:s.player,wood:s.resources.wood,buildings:s.world.buildings,placeHidden:await page.locator('#place').isHidden()}));
    await screenshot('16-bench');
    assert.ok(s.world.buildings.some(b=>b.type==='workbench'),'bench placement failed');
  }
  const bench=s.world.buildings.find(b=>b.type==='workbench');
  if(Math.hypot(s.player.x-bench.x,s.player.z-bench.z)>=2){
    if(s.player.x<3&&s.player.z<3.2)await go(1.85,3.8,.55);
    await go(3.8,3.3,.55);
    await go(4.8,1.55,.4);
  }
  s=await snapshot();
  log('near-bench',JSON.stringify({player:s.player,bench,techButtonVisible:await page.locator('#techOpen').isVisible()}));
  assert.ok(Math.hypot(s.player.x-bench.x,s.player.z-bench.z)<2,'not within bench reach');
  if(!s.inventory.copperCutter){
    await page.locator('#techOpen').tap();
    log('cutter-panel',JSON.stringify({open:await page.locator('#techPanel').isVisible(),stock:await page.locator('#techStock').innerText(),disabled:await page.locator('[data-tech="cutter"]').isDisabled()}));
    await page.waitForFunction(()=>!document.querySelector('[data-tech="cutter"]').disabled,null,{timeout:12000});
    await page.locator('[data-tech="cutter"]').tap();
    await page.locator('#techClose').tap();
    s=await snapshot();
    log('cutter-crafted',JSON.stringify({ingot:s.inventory.ingot,copperCutter:s.inventory.copperCutter,wood:s.resources.wood,buildings:s.world.buildings,guide:await page.locator('#guideAction').innerText()}));
    assert.equal(s.inventory.copperCutter,true,'cutter not crafted');
    await screenshot('17-cutter');
  }
  await page.reload({waitUntil:'load'});
  await page.locator('#loading').waitFor({state:'hidden',timeout:25000});
  s=await snapshot();
  log('FINAL-restored',JSON.stringify({schema:s.schemaVersion,wood:s.resources.wood,clay:s.inventory.clay,ore:s.inventory.ore,charcoal:s.inventory.charcoal,ash:s.inventory.ash,ingot:s.inventory.ingot,copperCutter:s.inventory.copperCutter,hole:s.world.holes[0],buildings:s.world.buildings,trees:[0,1,2,7].map(i=>s.world.trees[i]),player:s.player,guide:await page.locator('#guideAction').innerText(),errors}));
  assert.equal(s.inventory.copperCutter,true,'restored cutter lost');
  assert.equal(s.world.buildings.length,3,'restored building count wrong');
  assert.equal(s.world.holes[0]?.level,4,'restored four dig levels lost');
  await screenshot('18-final-reloaded');
  const unexpected=errors.filter(error=>!error.includes('fonts.googleapis.com')&&!error.includes('ERR_EMPTY_RESPONSE'));
  assert.equal(unexpected.length,0,`unexpected browser errors: ${unexpected.join('; ')}`);
  log('PASS full unseeded mobile progression',JSON.stringify({unexpectedErrors:unexpected}));

  async function fiberDrag(x1,y1,x2,y2) {
    const b=await page.locator('#fiberCanvas').boundingBox(), id=++touchID;
    const p=(x,y)=>({x:b.x+b.width*x,y:b.y+b.height*y,id});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[p(x1,y1)]});
    for(let i=1;i<=14;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[p(x1+(x2-x1)*i/14,y1+(y2-y1)*i/14)]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  }
  for(let rope=0;rope<2;rope++){
    await page.locator('#workbenchAction').tap();
    await page.locator('[data-fiber-action="leaf"]').tap();
    await fiberDrag(.1,.43,.9,.43);await fiberDrag(.1,.57,.9,.57);
    assert.match(await page.locator('#fiberStatus').innerText(),/4 prameny hotov/);
    await page.locator('#fiberNext').tap();
    for(let i=0;i<6;i++)await fiberDrag(i%2?.73:.27,.8,.5,.8);
    assert.match(await page.locator('#fiberStatus').innerText(),/Lano hotové/);
    if(rope===0)await page.locator('#fiberClose').tap();
  }
  await page.locator('#fiberNext').tap();
  await fiberDrag(.42,.5,.5,.5);await fiberDrag(.58,.5,.5,.5);
  assert.match(await page.locator('#fiberStatus').innerText(),/2 m/);
  await screenshot('19-joined-rope');
  await page.locator('#fiberClose').tap();s=await snapshot();
  assert.equal(s.inventory.ropes.length,1);assert.equal(s.inventory.ropes[0].length,2);
  assert.equal(s.inventory.strips.length,2);
  await page.reload({waitUntil:'load'});await page.locator('#loading').waitFor({state:'hidden',timeout:25000});
  s=await snapshot();assert.equal(s.inventory.ropes[0].length,2);assert.equal(s.inventory.strips.length,2);
  assert.equal(s.inventory.copperCutter,true);
  log('PASS mobile new game to saved joined rope',JSON.stringify({cutter:s.inventory.copperCutter,ropes:s.inventory.ropes,strips:s.inventory.strips}));
  await screenshot('20-rope-restored');
  assert.equal(errors.filter(error=>error.startsWith('pageerror:')).length,0,'uncaught JavaScript errors');
  await cdp.detach();
} finally {
  await context?.close();
  await new Promise(done=>server.close(done));
}
