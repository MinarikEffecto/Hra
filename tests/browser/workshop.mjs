import assert from 'node:assert/strict';
import chromium from '@sparticuz/chromium';
import {chromium as playwright} from 'playwright-core';
import {createServer} from 'node:http';
import {createReadStream,statSync,mkdtempSync,mkdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {resolve,extname} from 'node:path';
const root=resolve(process.env.HRA_QA_DIST ?? fileURLToPath(new URL('../../dist/',import.meta.url)));
const output=process.env.HRA_QA_OUTPUT ?? mkdtempSync(resolve(tmpdir(),'hra-workshop-'));
mkdirSync(output,{recursive:true});
console.log('Artifacts:',output);
const fixture=`<!DOCTYPE html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"><script type="module">
import {createFiberCrafting} from '/fiber-crafting.js';
window.fixture={leaves:3,inventory:{vine:2,strips:[],ropes:[]}};
window.workshop=createFiberCrafting(fixture,{canCraft:()=>true});workshop.open('bench');
</script>`;
const server=createServer((req,res)=>{const path=new URL(req.url,'http://localhost').pathname;if(path==='/'){res.setHeader('Content-Type','text/html');res.end(fixture);return;}const file=resolve(root,'.'+path);if(!file.startsWith(root+'/')){res.writeHead(403);res.end();return;}try{statSync(file);}catch{res.writeHead(404);res.end();return;}res.setHeader('Content-Type',extname(file)==='.css'?'text/css':'text/javascript');createReadStream(file).pipe(res);});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await playwright.launch({args:chromium.args,executablePath:await chromium.executablePath(),headless:true});
try{
 for(const [label,width,height,touch] of [['desktop',1280,800,false],['desktop-short',960,600,false],['portrait',390,844,true],['landscape',844,390,true],['small',320,568,true],['short-portrait',390,480,true],['small-landscape',568,320,true]]){
  if(process.argv[2]&&process.argv[2]!==label)continue;
  const context=await browser.newContext({viewport:{width,height},isMobile:touch,hasTouch:touch,deviceScaleFactor:1});
  const page=await context.newPage();page.setDefaultTimeout(15000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`http://127.0.0.1:${server.address().port}/`);await page.locator('#fiberWorkshop').waitFor({state:'visible'});
  const cdp=await context.newCDPSession(page);
  async function drag(x1,y1,x2,y2){const b=await page.locator('#fiberCanvas').boundingBox();const p=(x,y)=>({x:b.x+b.width*x,y:b.y+b.height*y,id:1});
   if(touch){await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[p(x1,y1)]});for(let i=1;i<=12;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[p(x1+(x2-x1)*i/12,y1+(y2-y1)*i/12)]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}
   else{const a=p(x1,y1),z=p(x2,y2);await page.mouse.move(a.x,a.y);await page.mouse.down();await page.mouse.move(z.x,z.y,{steps:12});await page.mouse.up();}}
  async function click(selector){if(touch)await page.locator(selector).tap();else await page.locator(selector).click();}
  await click('[data-fiber-action="leaf"]');await drag(.1,.43,.9,.43);await drag(.1,.57,.9,.57);
  assert.match(await page.locator('#fiberStatus').innerText(),/3 prameny hotov/);
  const next=await page.locator('#fiberNext').boundingBox();assert.ok(next.y>=0&&next.y+next.height<=height,`${label} hidden next button`);
  await click('#fiberNext');await page.waitForFunction(()=>document.getElementById('fiberTitle').textContent.includes('Spleť'));for(let i=0;i<6;i++)await drag(i%2?.73:.27,.8,.5,.8);
  await page.screenshot({path:resolve(output,`layout-${label}.png`),timeout:30000});
  const status=await page.locator('#fiberStatus').innerText();const box=await page.locator('#fiberCanvas').boundingBox();
  console.log(JSON.stringify({label,width,height,canvas:box,status,errors}));
  assert.match(status,/Lano hotové/,`${label}: ${status}`);assert.equal(errors.length,0);
  // Keep contexts until browser shutdown (single-process Chromium).
 }
}finally{await browser.close();await new Promise(r=>server.close(r));}
