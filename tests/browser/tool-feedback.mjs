import assert from 'node:assert/strict';
import chromium from '@sparticuz/chromium';
import {chromium as playwright} from 'playwright-core';
import {createServer} from 'node:http';
import {createReadStream, statSync, mkdtempSync, mkdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {resolve, extname} from 'node:path';

const root = resolve(process.env.HRA_QA_DIST ?? fileURLToPath(new URL('../../dist/', import.meta.url)));
const output = process.env.HRA_QA_OUTPUT ?? mkdtempSync(resolve(tmpdir(), 'hra-tool-feedback-'));
mkdirSync(output, {recursive: true}); console.log('Artifacts:', output);
const server = createServer((req, res) => {
  const path = new URL(req.url, 'http://localhost').pathname;
  if (path === '/fixture') { res.setHeader('Content-Type', 'text/html'); res.end('<!doctype html>'); return; }
  const file = resolve(root, `.${path === '/' ? '/index.html' : path}`);
  if (!file.startsWith(root + '/')) { res.writeHead(403); res.end(); return; }
  try { statSync(file); } catch { res.writeHead(404); res.end(); return; }
  res.setHeader('Content-Type', ({'.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.mp3': 'audio/mpeg'})[extname(file)] ?? 'application/octet-stream');
  createReadStream(file).pipe(res);
});
await new Promise(done => server.listen(0, '127.0.0.1', done));
const url = `http://127.0.0.1:${server.address().port}`;
const browser = await playwright.launch({args: chromium.args, executablePath: await chromium.executablePath(), headless: true});
try {
  for (const [label, width, height, touch] of [['desktop', 1280, 800, false], ['portrait', 390, 844, true]]) {
    const context = await browser.newContext({viewport: {width, height}, isMobile: touch, hasTouch: touch, deviceScaleFactor: 1});
    await context.route('https://fonts.googleapis.com/**', route => route.abort());
    const page = await context.newPage(), errors = [];
    page.setDefaultTimeout(20000);
    page.on('pageerror', error => errors.push(error.message));
    page.on('requestfailed', request => { if (request.url().startsWith(url)) errors.push(request.url()); });
    const click = async selector => touch ? page.locator(selector).tap() : page.locator(selector).click();
    await page.goto(`${url}/fixture`); await page.evaluate(() => localStorage.clear());
    await page.goto(url); await page.locator('#loading').waitFor({state: 'hidden'});
    await click('#bagBtn'); await click('#saveNow');
    const base = await page.evaluate(() => JSON.parse(localStorage.getItem('trosechnik.save.v1')));
    const [palmX, palmZ] = base.world.layout.trees[0].map(n => n / 1000);
    const [bushX, bushZ] = base.world.layout.bushes[0].map(n => n / 1000);
    const cases = [
      ['hands', 0, 'hands', .5, 2.5, 0, /Seber označené kameny/],
      ['flake', 1, 'flake', bushX + 1, bushZ, -Math.PI / 2, /Úštěp · .*posekat keř/],
      ['chopper', 2, 'chopper', palmX + 1, palmZ, -Math.PI / 2, /Sekáč · .*pokácet palmu/],
      ['shovel-free', 3, 'shovel', .5, 2.5, 0, /kopat na označeném místě/],
      ['shovel-blocked', 3, 'shovel', palmX + 1, palmZ, -Math.PI / 2, /Tady kopat nelze/],
      ['shotgun', 3, 'shotgun', palmX + 1, palmZ, -Math.PI / 2, /vystřelit ve směru pohledu/],
    ];
    const selectedCase = process.argv[2];
    assert.ok(!selectedCase || cases.some(entry => entry[0] === selectedCase), 'unknown scenario');
    for (const [name, stage, tool, x, z, heading, expected] of cases.filter(entry => !selectedCase || entry[0] === selectedCase)) {
      await page.goto(`${url}/fixture`);
      const save = structuredClone(base);
      save.starter = {stage, handle: false, binding: false, shovel: stage === 3, shotgun: tool === 'shotgun', piles: [0, 0, 0]};
      save.exploration.tool = tool;
      save.player = {x, z, y: .22, heading};
      save.clock = {hour: 12, speed: 0};
      await page.evaluate(data => { localStorage.clear(); localStorage.setItem('trosechnik.save.v1', JSON.stringify(data)); }, save);
      await page.goto(url); await page.locator('#loading').waitFor({state: 'hidden'});
      await page.waitForFunction(() => document.querySelector('.chop').title.length > 0);
      const description = await page.locator('.chop').getAttribute('title');
      assert.match(description, expected, `${label} ${name}`);
      assert.equal(await page.locator('.chop').getAttribute('aria-describedby'), 'target');
      assert.equal(await page.locator('#game').getAttribute('aria-describedby'), 'target');
      assert.equal(await page.locator('#tool').getAttribute('title'), description);
      assert.equal(await page.locator('#target').isVisible(), false, 'compact icon HUD must stay compact');
      const cdp = await context.newCDPSession(page);
      const tree = await cdp.send('Accessibility.getFullAXTree');
      const buttonName = await page.locator(touch ? '.chop' : '#tool').getAttribute('aria-label');
      const action = tree.nodes.find(node => node.role?.value === 'button' && node.name?.value === buttonName && node.description?.value === description);
      assert.ok(action, `${name}: screen reader description missing`);
      await cdp.detach();
      if (['flake', 'chopper', 'shovel-blocked'].includes(name)) await page.screenshot({path: resolve(output, `${label}-${name}.png`)});
      if (name === 'chopper') {
        await click('#bagBtn'); await click('#starterOpen');
        await page.waitForFunction(() => document.getElementById('target').textContent === '');
        await click('#starterClose');
      }
      console.log(JSON.stringify({label, name, description}));
    }
    assert.equal(errors.length, 0, errors.join('\n'));
    await page.goto(`${url}/fixture`);
  }
} finally { await browser.close(); await new Promise(done => server.close(done)); }
