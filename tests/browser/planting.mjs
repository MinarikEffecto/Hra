import assert from 'node:assert/strict';
import chromium from '@sparticuz/chromium';
import {chromium as playwright} from 'playwright-core';
import {createServer} from 'node:http';
import {createReadStream, statSync, mkdtempSync, mkdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {resolve, extname} from 'node:path';

const root = resolve(process.env.HRA_QA_DIST ?? fileURLToPath(new URL('../../dist/', import.meta.url)));
const output = process.env.HRA_QA_OUTPUT ?? mkdtempSync(resolve(tmpdir(), 'hra-planting-'));
mkdirSync(output, {recursive: true});
console.log('Artifacts:', output);
const mime = {'.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.mp3': 'audio/mpeg'};
const server = createServer((req, res) => {
  const path = new URL(req.url, 'http://localhost').pathname;
  if (path === '/fixture') { res.setHeader('Content-Type', 'text/html'); res.end('<!doctype html><title>Test fixture</title>'); return; }
  const file = resolve(root, `.${path === '/' ? '/index.html' : path}`);
  if (!file.startsWith(`${root}/`)) { res.writeHead(403); res.end(); return; }
  try { statSync(file); } catch { res.writeHead(404); res.end(); return; }
  res.setHeader('Content-Type', mime[extname(file)] ?? 'application/octet-stream');
  createReadStream(file).pipe(res);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const url = `http://127.0.0.1:${server.address().port}`;
const browser = await playwright.launch({args: chromium.args, executablePath: await chromium.executablePath(), headless: true});
try {
  for (const [label, width, height, touch] of [['desktop', 1280, 800, false], ['portrait', 390, 844, true], ['short-landscape', 568, 320, true]]) {
    if (process.argv[2] && process.argv[2] !== label) continue;
    const context = await browser.newContext({viewport: {width, height}, isMobile: touch, hasTouch: touch, deviceScaleFactor: 1});
    // External fonts are not part of this gameplay check; avoid network-dependent load waits.
    await context.route('https://fonts.googleapis.com/**', route => route.abort());
    const page = await context.newPage(), errors = [];
    page.setDefaultTimeout(20000);
    page.on('pageerror', error => errors.push(error.message));
    page.on('requestfailed', req => {
      if (req.url().startsWith(url)) errors.push(`${req.url()} ${req.failure()?.errorText}`);
    });
    const click = async selector => touch ? page.locator(selector).tap() : page.locator(selector).click();
    const load = async () => { await page.goto(url); await page.locator('#loading').waitFor({state: 'hidden'}); };
    async function snapshot() {
      if (await page.locator('#bagPanel').isHidden()) await click('#bagBtn');
      await click('#saveNow');
      const result = await page.evaluate(() => JSON.parse(localStorage.getItem('trosechnik.save.v1')));
      await click('#bagClose');
      return result;
    }
    async function seed(save) {
      // Leave the game first: its pagehide autosave must not replace the fixture.
      await page.goto(`${url}/fixture`);
      await page.evaluate(data => { localStorage.clear(); localStorage.setItem('trosechnik.save.v1', JSON.stringify(data)); }, save);
      await load();
    }
    await page.goto(`${url}/fixture`);
    await page.evaluate(() => localStorage.clear());
    await load();
    const base = await snapshot();
    const [x, z] = base.world.layout.trees[0].map(n => n / 1000);
    base.player = {x: x + 1, y: .22, z, heading: -Math.PI / 2};
    base.clock = {hour: 12, speed: 0};
    base.inventory.coconut = 2;
    base.resources = {wood: 0, leaves: 0};
    base.world.trees[0] = {state: 'gone', hp: 0};
    base.world.coconuts[0] = 0;
    base.world.buildings = [{type: 'workbench', x: x + 2.6, z, rotation: 0}];
    base.schemaVersion = 3;
    delete base.world.plantings;
    await seed(base);
    await click('#bagBtn');
    await page.locator('#plantPalmInBag').scrollIntoViewIfNeeded();
    assert.equal(await page.locator('#plantPalmInBag').isEnabled(), true);
    await page.screenshot({path: resolve(output, `${label}-bag.png`)});
    if (label === 'short-landscape') await click('#plantPalmInBag');
    await click('#bagClose');
    if (label !== 'short-landscape') await click('#plantPalm');
    await page.screenshot({path: resolve(output, `${label}-seedling.png`)});
    const planted = await snapshot();
    assert.equal(planted.schemaVersion, 4);
    assert.equal(planted.inventory.coconut, 1);
    assert.equal(planted.world.plantings.length, 1);
    assert.ok(planted.world.plantings[0].remaining > 160 && planted.world.plantings[0].remaining <= 180);
    // A disabled second tap cannot consume another coconut.
    assert.equal(await page.locator('#plantPalm').isDisabled(), true);
    await page.reload();
    await page.locator('#loading').waitFor({state: 'hidden'});
    const resumed = await snapshot();
    assert.equal(resumed.inventory.coconut, 1);
    assert.ok(resumed.world.plantings[0].remaining <= planted.world.plantings[0].remaining);
    assert.equal(resumed.world.coconuts[0], 0);

    // A fixture with one second remaining tests maturity without waiting three minutes.
    const nearMaturity = structuredClone(resumed);
    nearMaturity.world.plantings[0].remaining = 1;
    await seed(nearMaturity);
    for (let i = 0; i < 12; i++) {
      await page.waitForTimeout(500);
      const state = await snapshot();
      if (!state.world.plantings.length) break;
    }
    const grown = await snapshot();
    assert.deepEqual(grown.world.plantings, []);
    assert.deepEqual(grown.world.trees[0], {state: 'standing', hp: 4});
    assert.equal(grown.world.coconuts[0], 3);
    assert.equal(grown.inventory.coconut, 1);
    assert.equal(grown.resources.wood, 0);
    await page.screenshot({path: resolve(output, `${label}-grown.png`)});
    if (touch) {
      const cdp = await context.newCDPSession(page), box = await page.locator('.chop').boundingBox();
      await cdp.send('Input.dispatchTouchEvent', {type: 'touchStart', touchPoints: [{x: box.x + box.width / 2, y: box.y + box.height / 2, id: 1}]});
      await page.waitForTimeout(9500);
      await cdp.send('Input.dispatchTouchEvent', {type: 'touchEnd', touchPoints: []});
    } else {
      await page.keyboard.down('f'); await page.waitForTimeout(9500); await page.keyboard.up('f');
    }
    await page.waitForTimeout(1500);
    const harvested = await snapshot();
    assert.equal(harvested.world.trees[0].state, 'gone');
    assert.equal(harvested.resources.wood, 5);
    assert.equal(harvested.resources.leaves, 6);
    assert.equal(harvested.inventory.coconut, 4);
    await page.reload();
    await page.locator('#loading').waitFor({state: 'hidden'});
    const final = await snapshot();
    assert.equal(final.resources.wood, 5);
    assert.equal(final.inventory.coconut, 4);
    assert.equal(errors.length, 0, errors.join('\n'));
    console.log(JSON.stringify({label, planted: planted.world.plantings[0], final: {wood: final.resources.wood, leaves: final.resources.leaves, coconut: final.inventory.coconut}, errors}));
    await page.goto(`${url}/fixture`); // stop the old 3D loop before checking the next viewport
  }
} finally {
  await browser.close();
  await new Promise(r => server.close(r));
}
