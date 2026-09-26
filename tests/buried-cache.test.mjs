import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.module.js';
import {makeScenery} from '../dist/world.js';
import {IslandGame, RAPIER} from '../dist/simulation.js';
import {Survival} from '../dist/survival.js';
import {BuriedCache, BUNKER_SITE, bunkerExposed} from '../dist/buried-cache.js';
import {captureGameState, applyGameState, validateSave, saveToStorage, SaveGameError} from '../dist/save-game.js';

await RAPIER.init();
function context() {
  const scene = new THREE.Scene(); makeScenery(scene);
  const game = new IslandGame(scene);
  game.inventory = {stone: 0, strips: [], ropes: [{length: 3, quality: 83}], copperCutter: true, ore: 1, cooked: 0};
  game.player.root.position.set(BUNKER_SITE.x, .22, BUNKER_SITE.z + 1);
  const exploration = {holes: [], tool: 'axe'};
  game.buriedCache = new BuriedCache(game, exploration);
  const life = {state: new Survival(Math.random, game.inventory)};
  return {game, exploration, life};
}
const hole = (level = 4) => ({...BUNKER_SITE, level, pyramid: false, flood: null});

test('cache is discovered only at its site at depth four, or in an existing building foundation', () => {
  assert.equal(bunkerExposed([hole(3)]), false);
  assert.equal(bunkerExposed([{...hole(), x: 4}]), false);
  assert.equal(bunkerExposed([{...hole(), pyramid: true}]), false);
  assert.equal(bunkerExposed([hole()]), true);
  assert.equal(bunkerExposed([], [{...BUNKER_SITE, type: 'shelter'}]), true);
});

test('missing cutter, separate short ropes, distance and interrupted actions cost nothing', () => {
  const {game, exploration} = context(), cache = game.buriedCache;
  assert.equal(cache.recover(), false);
  exploration.holes.push(hole());
  for (const [key, value] of [['copperCutter', false], ['ropes', [{length: 1, quality: 80}, {length: 1, quality: 80}]]]) {
    const before = game.inventory[key]; game.inventory[key] = value;
    const saved = structuredClone(game.inventory);
    assert.equal(cache.recover(), false); assert.deepEqual(game.inventory, saved); game.inventory[key] = before;
  }
  for (const [key, value] of [['swimming', true], ['grounded', false], ['swing', .4], ['cooldown', .2]]) {
    const before = game[key]; game[key] = value;
    assert.equal(cache.recover(), false); game[key] = before;
  }
  game.player.root.position.x = 8; assert.equal(cache.recover(), false);
  assert.equal(game.inventory.ropes[0].length, 3); assert.equal(game.inventory.ore, 1);
});

test('reward is paid once and preserves rope remainder, quality and permanent cutter', () => {
  const {game, exploration} = context(), cache = game.buriedCache; exploration.holes.push(hole());
  assert.equal(cache.recover(), true); assert.equal(cache.recover(), false);
  assert.deepEqual(game.inventory.ropes, [{length: 1, quality: 83}]);
  assert.equal(game.inventory.copperCutter, true);
  assert.equal(game.inventory.ore, 4); assert.equal(game.inventory.cooked, 2);
});

test('spent two-metre rope is removed and exceeding inventory bounds cannot consume it', () => {
  const {game, exploration} = context(), cache = game.buriedCache; exploration.holes.push(hole());
  game.inventory.ropes[0].length = 2; game.inventory.ore = 1e6;
  assert.equal(cache.recover(), false); assert.equal(game.inventory.ropes[0].length, 2);
  game.inventory.ore = 0; assert.equal(cache.recover(), true); assert.deepEqual(game.inventory.ropes, []);
});

test('undiscovered, uncovered and looted cache survive real island save/reload without duplicate reward', () => {
  for (const stage of ['hidden', 'uncovered', 'claimed']) {
    const before = context();
    if (stage !== 'hidden') before.exploration.holes.push(hole());
    if (stage === 'claimed') before.game.buriedCache.recover();
    const save = captureGameState(before), after = context();
    applyGameState(after, save);
    assert.equal(after.game.buriedCache.revealed, stage !== 'hidden');
    assert.equal(after.game.buriedCache.claimed, stage === 'claimed');
    assert.deepEqual(after.game.inventory.ropes, before.game.inventory.ropes);
    if (stage === 'claimed') { assert.equal(after.game.buriedCache.recover(), false); assert.equal(after.game.inventory.ore, 4); }
  }
});

test('v1–v5 saves migrate with unopened cache and retain their existing camp over the site', () => {
  const ctx = context(), source = captureGameState(ctx);
  for (const version of [1, 2, 3, 4, 5]) {
    const old = structuredClone(source); old.schemaVersion = version; delete old.bunker;
    old.world.buildings.push({...BUNKER_SITE, type: 'shelter', rotation: 0});
    const after = context(); applyGameState(after, old);
    assert.equal(after.game.buriedCache.claimed, false); assert.equal(after.game.buriedCache.revealed, true);
    assert.equal(after.game.buildings[0].x, BUNKER_SITE.x);
  }
});

test('malformed or impossible claimed state cannot overwrite a valid slot', () => {
  const ctx = context(), original = captureGameState(ctx), values = new Map();
  const storage = {getItem: k => values.get(k) ?? null, setItem: (k, v) => values.set(k, v)};
  saveToStorage(storage, original); const previous = [...values];
  for (const bunker of [undefined, {}, {claimed: 1}, {claimed: true}]) {
    assert.throws(() => saveToStorage(storage, {...original, bunker}), SaveGameError);
    assert.deepEqual([...values], previous);
  }
  assert.equal(validateSave(original).schemaVersion, 6);
});
