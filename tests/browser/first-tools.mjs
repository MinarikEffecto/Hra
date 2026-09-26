import assert from 'node:assert/strict';
import chromium from '@sparticuz/chromium';
import {chromium as playwright} from 'playwright-core';
import {createServer} from 'node:http';
import {createReadStream, statSync, mkdtempSync, mkdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {resolve, extname} from 'node:path';
import {firstToolsSteps, craftTool} from './first-tools-steps.mjs';
import {SAVE_SCHEMA_VERSION} from '../../dist/save-game.js';

const root = resolve(process.env.HRA_QA_DIST ?? fileURLToPath(new URL('../../dist/', import.meta.url)));
const output = process.env.HRA_QA_OUTPUT ?? mkdtempSync(resolve(tmpdir(), 'hra-first-tools-'));
mkdirSync(output, {recursive: true}); console.log('Artifacts:', output);
const mime = {'.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.mp3': 'audio/mpeg'};
const server = createServer((req, res) => {
  const path = new URL(req.url, 'http://localhost').pathname;
  if (path === '/fixture') { res.setHeader('Content-Type', 'text/html'); res.end('<!doctype html>'); return; }
  const file = resolve(root, `.${path === '/' ? '/index.html' : path}`);
  if (!file.startsWith(`${root}/`)) { res.writeHead(403); res.end(); return; }
  try { statSync(file); } catch { res.writeHead(404); res.end(); return; }
  res.setHeader('Content-Type', mime[extname(file)] ?? 'application/octet-stream'); createReadStream(file).pipe(res);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const url = `http://127.0.0.1:${server.address().port}`;
const browser = await playwright.launch({args: chromium.args, executablePath: await chromium.executablePath(), headless: true});
try {
  for (const [label, width, height, touch] of [['desktop', 1280, 800, false], ['portrait', 390, 844, true]]) {
    if (process.argv[2] && process.argv[2] !== label) continue;
    const context = await browser.newContext({viewport: {width, height}, isMobile: touch, hasTouch: touch, deviceScaleFactor: 1});
    await context.route('https://fonts.googleapis.com/**', route => route.abort());
    const page = await context.newPage(), errors = [];
    page.setDefaultTimeout(20000);
    page.on('pageerror', e => errors.push(e.message));
    page.on('requestfailed', req => { if (req.url().startsWith(url)) errors.push(`${req.url()}: ${req.failure()?.errorText}`); });
    await page.goto(`${url}/fixture`); await page.evaluate(() => localStorage.clear()); await page.goto(url);
    await page.locator('#loading').waitFor({state: 'hidden'});
    const cdp = await context.newCDPSession(page);
    const click = async selector => touch ? page.locator(selector).tap() : page.locator(selector).click();
    async function snapshot() {
      if (await page.locator('#bagPanel').isHidden()) await click('#bagBtn');
      await click('#saveNow');
      const s = await page.evaluate(() => JSON.parse(localStorage.getItem('trosechnik.save.v1')));
      s.availableWood = Number(await page.locator('#wood').innerText());
      await click('#bagClose'); return s;
    }
    async function move(dx, dz, seconds) {
      const length = Math.hypot(dx, dz) || 1, ix = (dx - dz) / length / Math.SQRT2, iz = (dx + dz) / length / Math.SQRT2;
      if (touch) {
        const b = await page.locator('#joystick').boundingBox(), x = b.x + b.width / 2, y = b.y + b.height / 2, r = b.width * .32;
        await cdp.send('Input.dispatchTouchEvent', {type: 'touchStart', touchPoints: [{x, y, id: 1}]});
        await cdp.send('Input.dispatchTouchEvent', {type: 'touchMove', touchPoints: [{x: x + ix * r, y: y + iz * r, id: 1}]});
        await page.waitForTimeout(seconds * 1000);
        await cdp.send('Input.dispatchTouchEvent', {type: 'touchEnd', touchPoints: []});
      } else {
        // Choose the closest of the eight WASD directions, then correct on the next step.
        const ax = Math.abs(ix), az = Math.abs(iz), keys = [];
        if (ax > az * .4) keys.push(ix > 0 ? 'd' : 'a');
        if (az > ax * .4) keys.push(iz > 0 ? 's' : 'w');
        for (const key of keys) await page.keyboard.down(key);
        await page.waitForTimeout(seconds * 1000);
        for (const key of keys) await page.keyboard.up(key);
      }
    }
    async function go(x, z, tolerance = .5) {
      for (let i = 0; i < 36; i++) {
        const s = await snapshot(), dx = x - s.player.x, dz = z - s.player.z, d = Math.hypot(dx, dz);
        if (d <= tolerance) return s;
        await move(dx, dz, Math.min(.65, Math.max(.08, (d - tolerance / 2) / 3.1)));
      }
      throw Error(`cannot reach ${x}, ${z}`);
    }
    async function holdTool(seconds) {
      if (touch) {
        const b = await page.locator('.chop').boundingBox();
        await cdp.send('Input.dispatchTouchEvent', {type: 'touchStart', touchPoints: [{x: b.x + b.width / 2, y: b.y + b.height / 2, id: 2}]});
        await page.waitForTimeout(seconds * 1000);
        await cdp.send('Input.dispatchTouchEvent', {type: 'touchEnd', touchPoints: []});
      } else { await page.keyboard.down('f'); await page.waitForTimeout(seconds * 1000); await page.keyboard.up('f'); }
    }
    const screenshot = name => page.screenshot({path: resolve(output, `${label}-${name}.png`)});
    const log = (...args) => console.log(label, ...args);
    const io = {page, click, snapshot, go, holdTool, screenshot, log};
    await screenshot('start');
    await firstToolsSteps(io, {returnToSpawn: false, shortViewport: touch});
    await holdTool(7); await page.waitForTimeout(1500);
    let s = await snapshot(); assert.equal(s.world.trees[7].state, 'gone');
    for (const [x, z] of [[6.2, 1.9], [7.2, 1.3], [8, 1.1]]) await go(x, z, .6);
    s = await snapshot(); assert.ok(s.availableWood >= 2);
    await craftTool(io, 'shovel');
    assert.match(await page.locator('#tool').getAttribute('aria-label'), /Lopata/);
    await go(4.2, 3, .25);
    await holdTool(.55); await page.waitForTimeout(800);
    s = await snapshot();
    assert.ok(s.world.holes.length > 0 && s.inventory.clay >= 1, 'crafted shovel must dig');
    await page.reload(); await page.locator('#loading').waitFor({state: 'hidden'});
    s = await snapshot();
    assert.equal(s.schemaVersion, SAVE_SCHEMA_VERSION); assert.equal(s.starter.stage, 3); assert.equal(s.starter.shovel, true);
    assert.equal(s.starter.shotgun, false); assert.equal(s.exploration.tool, 'shovel');
    assert.equal(errors.length, 0, errors.join('\n'));
    await screenshot('saved-tools');
    console.log(JSON.stringify({label, stage: s.starter.stage, shovel: s.starter.shovel, clay: s.inventory.clay, wood: s.resources.wood, errors}));
    await page.goto(`${url}/fixture`);
  }
} finally { await browser.close(); await new Promise(r => server.close(r)); }
