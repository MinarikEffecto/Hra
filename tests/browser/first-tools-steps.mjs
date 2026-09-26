import assert from 'node:assert/strict';

export async function craftTool({page, click}, id) {
  await click('#bagBtn');
  await click('#starterOpen');
  const button = page.locator(`[data-starter="${id}"]`);
  await button.scrollIntoViewIfNeeded();
  assert.equal(await button.isEnabled(), true, `cannot craft ${id}`);
  await click(`[data-starter="${id}"]`);
  assert.equal(await button.isDisabled(), true, `${id} should not be repeatable`);
  await click('#starterClose');
}

// Uses only real input and reads the test profile's own save for assertions.
export async function firstToolsSteps(io, {returnToSpawn = true, shortViewport = false} = {}) {
  const {page, click, snapshot, go, holdTool, screenshot, log = console.log} = io;
  let s = await snapshot();
  assert.equal(s.starter.stage, 0);
  assert.equal(s.exploration.tool, 'hands');
  assert.equal(s.resources.wood, 0);
  assert.equal(s.inventory.stone, 0);
  await click('#tool');
  assert.match(await page.locator('#tool').getAttribute('aria-label'), /Holé ruce/);
  await go(-.4, 3.9, .4);
  await go(2.4, 2.4, .4);
  s = await snapshot(); assert.ok(s.inventory.stone >= 4);
  await craftTool(io, 'flake');
  assert.match(await page.locator('#tool').getAttribute('aria-label'), /Ostrý úštěp/);
  await go(4.6, 3.4, .45);
  await go(5.6, 5, .35);
  s = await snapshot();
  assert.ok(s.resources.wood >= 2 && s.resources.leaves >= 2, 'collect driftwood for first tools');
  await craftTool(io, 'chopper');
  await go(4.65, 2.3, .12);
  await holdTool(1);
  await page.waitForTimeout(800);
  s = await snapshot();
  assert.ok(s.world.trees[7].hp < 4 && s.world.trees[7].hp > 0, 'chopper must hit the palm');
  await craftTool(io, 'handle');
  s = await snapshot();
  assert.equal(s.starter.stage, 2); assert.equal(s.starter.handle, true); assert.equal(s.starter.binding, false);
  log('partial-axe', JSON.stringify({starter: s.starter, wood: s.resources.wood, stone: s.inventory.stone}));
  await page.reload(); await page.locator('#loading').waitFor({state: 'hidden'});
  const restored = await snapshot();
  assert.equal(restored.starter.stage, 2); assert.equal(restored.starter.handle, true);
  assert.equal(restored.exploration.tool, 'chopper');
  if (shortViewport) await page.setViewportSize({width: 568, height: 320});
  await craftTool(io, 'binding');
  await click('#bagBtn'); await click('#starterOpen');
  await page.locator('[data-starter="axe"]').scrollIntoViewIfNeeded();
  await screenshot('axe-ready');
  await click('[data-starter="axe"]'); await click('#starterClose');
  if (shortViewport) await page.setViewportSize({width: 390, height: 844});
  s = await snapshot();
  assert.equal(s.starter.stage, 3); assert.equal(s.starter.shovel, false); assert.equal(s.starter.shotgun, false);
  assert.equal(s.starter.handle, false); assert.equal(s.starter.binding, false);
  assert.equal(s.exploration.tool, 'axe');
  log('first-axe', JSON.stringify({starter: s.starter, wood: s.resources.wood, stone: s.inventory.stone}));
  if (returnToSpawn) {
    await go(4.6, 3.4, .4); await go(2.4, 2.4, .4); await go(.5, 2.5, .4);
  }
  return s;
}
