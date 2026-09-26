import assert from 'node:assert/strict';
import chromium from '@sparticuz/chromium';
import {chromium as playwright} from 'playwright-core';
import {createServer} from 'node:http';
import {createReadStream, statSync, mkdtempSync, mkdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {resolve, extname} from 'node:path';
import {SAVE_SCHEMA_VERSION} from '../../dist/save-game.js';

const root = resolve(process.env.HRA_QA_DIST ?? fileURLToPath(new URL('../../dist/', import.meta.url)));
const output = process.env.HRA_QA_OUTPUT ?? mkdtempSync(resolve(tmpdir(), 'hra-buried-cache-'));
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

    async function seed(save) {
      await page.goto(`${url}/fixture`);
      await page.evaluate(s => { localStorage.clear(); localStorage.setItem('trosechnik.save.v1', JSON.stringify(s)); }, save);
      await page.goto(url); await page.locator('#loading').waitFor({state: 'hidden'});
    }
    async function snapshot() {
      if (await page.locator('#bagPanel').isHidden()) await click('#bagBtn');
      await click('#saveNow');
      const s = await page.evaluate(() => JSON.parse(localStorage.getItem('trosechnik.save.v1')));
      await click('#bagClose'); return s;
    }
    base.schemaVersion = 5; delete base.bunker;
    base.starter = {stage: 3, handle: false, binding: false, shovel: true, shotgun: false, piles: [0, 0, 0]};
    base.player = {x: -.7, z: -.78, y: .22, heading: Math.PI};
    base.clock = {hour: 12, speed: 0}; base.exploration.tool = 'shovel';
    base.inventory.copperCutter = true; base.inventory.ropes = [{length: 1, quality: 83}, {length: 1, quality: 90}];
    await seed(base);
    await click('#bagBtn'); await click('#bunkerOpen');
    assert.match(await page.locator('#bunkerStory').innerText(), /čtvrté vrstvy/);
    assert.equal(await page.locator('#bunkerRecover').isHidden(), true);
    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'bunkerClose');
    await click('#bunkerClose');
    const cdp = await context.newCDPSession(page);
    for (let level = 1; level <= 4; level++) {
      await page.waitForFunction(() => !document.getElementById('bunkerOpen').disabled);
      if (touch) {
        const b = await page.locator('.chop').boundingBox();
        await cdp.send('Input.dispatchTouchEvent', {type: 'touchStart', touchPoints: [{x: b.x + b.width / 2, y: b.y + b.height / 2, id: 1}]});
        await page.waitForTimeout(470);
        await cdp.send('Input.dispatchTouchEvent', {type: 'touchEnd', touchPoints: []});
      } else { await page.keyboard.down('f'); await page.waitForTimeout(470); await page.keyboard.up('f'); }
      await page.waitForTimeout(1400);
      await page.waitForFunction(() => !document.getElementById('bunkerOpen').disabled);
      const s = await snapshot(); assert.equal(s.world.holes[0]?.level, level);
    }
    const dug = await snapshot(); assert.equal(dug.schemaVersion, SAVE_SCHEMA_VERSION); assert.equal(dug.bunker.claimed, false);
    await page.reload(); await page.locator('#loading').waitFor({state: 'hidden'});
    await click('#bagBtn'); await click('#bunkerOpen');
    assert.match(await page.locator('#bunkerTitle').innerText(), /K–03/);
    assert.equal(await page.locator('#bunkerRecover').isEnabled(), false, 'two separate ropes cannot lift the crate');
    assert.match(await page.locator('#bunkerNeeds').innerText(), /spoj lano/);
    await click('#bunkerClose');
    // This fixture supplies a joined rope; the full workshop journey is a separate test.
    dug.inventory.ropes = [{length: 3, quality: 83}, {length: 1, quality: 90}];
    await seed(dug);
    if (touch) await page.setViewportSize({width: 568, height: 320});
    await click('#bagBtn'); await click('#bunkerOpen');
    await page.locator('#bunkerRecover').scrollIntoViewIfNeeded();
    assert.equal(await page.locator('#bunkerRecover').isEnabled(), true);
    assert.match(await page.locator('#bunkerNeeds').innerText(), /Vše je připravené/);
    if (!touch) {
      await page.keyboard.press('Shift+Tab');
      assert.equal(await page.evaluate(() => document.activeElement.id), 'bunkerRecover');
      await page.keyboard.press('Tab');
      assert.equal(await page.evaluate(() => document.activeElement.id), 'bunkerClose');
      await page.keyboard.press('Tab');
      assert.equal(await page.evaluate(() => document.activeElement.id), 'bunkerRecover');
      const changes = await page.locator('#bunkerNeeds').evaluate(element => new Promise(resolve => {
        let count = 0;
        const observer = new MutationObserver(records => count += records.length);
        observer.observe(element, {childList: true, subtree: true, characterData: true});
        setTimeout(() => { observer.disconnect(); resolve(count); }, 800);
      }));
      assert.equal(changes, 0, 'unchanged live status must not be rewritten every refresh');
    }
    await page.screenshot({path: resolve(output, `${label}-ready.png`)});
    await click('#bunkerRecover');
    assert.equal(await page.locator('#bunkerRecover').isHidden(), true);
    assert.equal(await page.evaluate(() => document.activeElement.id), 'bunkerClose');
    await click('#bunkerClose');
    if (touch) await page.setViewportSize({width: 390, height: 844});
    const recovered = await snapshot();
    assert.equal(recovered.bunker.claimed, true);
    assert.equal(recovered.inventory.ore, dug.inventory.ore + 3);
    assert.equal(recovered.inventory.cooked, dug.inventory.cooked + 2);
    assert.deepEqual(recovered.inventory.ropes, [{length: 1, quality: 83}, {length: 1, quality: 90}]);
    await page.reload(); await page.locator('#loading').waitFor({state: 'hidden'});
    const restored = await snapshot();
    assert.deepEqual(restored.bunker, recovered.bunker);
    assert.deepEqual(restored.inventory.ropes, recovered.inventory.ropes);
    assert.equal(restored.inventory.ore, recovered.inventory.ore);
    assert.equal(restored.inventory.cooked, recovered.inventory.cooked);
    await click('#bagBtn'); await click('#bunkerOpen');
    assert.equal(await page.locator('#bunkerRecover').isHidden(), true);
    await page.screenshot({path: resolve(output, `${label}-claimed.png`)});
    assert.equal(errors.length, 0, errors.join('\n'));
    console.log(JSON.stringify({label, bunker: restored.bunker, ore: restored.inventory.ore, cooked: restored.inventory.cooked, ropes: restored.inventory.ropes, errors}));
    await page.goto(`${url}/fixture`);
  }
} finally { await browser.close(); await new Promise(done => server.close(done)); }
