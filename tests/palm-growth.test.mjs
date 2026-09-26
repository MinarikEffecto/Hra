import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.module.js';
import {makeScenery} from '../dist/world.js';
import {RAPIER, IslandGame} from '../dist/simulation.js';
import {createIslandLife} from '../dist/life.js';
import {PalmGrowth, PALM_GROWTH_SECONDS} from '../dist/palm-growth.js';
import {SAVE_SCHEMA_VERSION, captureGameState, applyGameState, validateSave, exportSave, saveToStorage, isSaveCompatibleWithIsland, SaveGameError} from '../dist/save-game.js';

await RAPIER.init();

function fresh() {
  const nodes = new Map();
  const node = id => {
    if (!nodes.has(id)) nodes.set(id, {classList: {toggle() {}}, setAttribute() {}, after() {}});
    return nodes.get(id);
  };
  globalThis.document = {createElement: () => node(Symbol()), getElementById: node};
  globalThis.addEventListener = () => {};
  const scene = new THREE.Scene();
  makeScenery(scene);
  const events = [];
  const game = new IslandGame(scene, type => events.push(type));
  game.inventory = {coconut: 0, strips: [], ropes: []};
  const exploration = {holes: [], tool: 'axe'};
  const life = createIslandLife(scene, game, {toast() {}, hud() {}, sound() {}, noise() {}, tone() {}, wakeAudio() {}});
  game.palmGrowth = new PalmGrowth(game, exploration);
  return {game, life, exploration, events};
}

function stump(ctx, index = 0) {
  const {game} = ctx, tree = game.trees[index];
  game.player.root.position.set(tree.x + 1, .22, tree.z);
  for (let i = 0; i < 4; i++) game.hit(tree);
  game.spawnLogs(tree);
  return tree;
}

test('planting costs exactly one coconut only at a nearby clear felled palm', () => {
  const ctx = fresh(), {game} = ctx, growth = game.palmGrowth, tree = game.trees[0];
  game.inventory.coconut = 2;
  assert.equal(growth.plant(tree), false); // distant / standing
  stump(ctx);
  game.inventory.coconut = 0;
  assert.equal(growth.plant(tree), false);
  game.inventory.coconut = 2;
  game.buildings.push({type: 'fire', x: tree.x + 1, z: tree.z});
  assert.equal(growth.plant(tree), false);
  game.buildings.length = 0;
  ctx.exploration.holes.push({x: tree.x, z: tree.z, level: 0}); // a pending dig also reserves its site
  assert.equal(growth.plant(tree), false);
  ctx.exploration.holes.length = 0;
  game.grounded = false;
  assert.equal(growth.plant(tree), false);
  game.grounded = true;
  game.swing = .3;
  assert.equal(growth.plant(tree), false);
  game.swing = 0;
  assert.equal(game.inventory.coconut, 2);
  assert.equal(growth.plant(), true);
  assert.equal(growth.plant(tree), false); // double click
  assert.equal(game.inventory.coconut, 1);
  assert.equal(game.trees[0], tree); // stable saved slot and coconut map
  assert.equal(game.trees.length, 12);
  assert.equal(tree.state, 'growing');
  assert.equal(tree.hp, 0);
  assert.equal(tree.body, null);
  assert.equal(ctx.life.getCoconutCounts()[0], 0);
  assert.equal(game.canBuild('fire', tree.x, tree.z), false);
  game.hit(tree);
  assert.equal(tree.hp, 0); // cannot harvest a seedling
});

test('new buildings respect seedling space and accepted nearby placement remains saveable', () => {
  const ctx = fresh(), {game} = ctx, tree = stump(ctx);
  game.inventory.coconut = 1;
  game.palmGrowth.plant(tree);
  game.player.root.position.x = tree.x + 4;
  game.wood = 20;
  assert.equal(game.build('fire', tree.x + 1.65, tree.z), false);
  assert.equal(game.wood, 20);
  assert.equal(game.build('workbench', tree.x + 1.65, tree.z), true);
  const saved = captureGameState(ctx), restored = fresh();
  applyGameState(restored, saved);
  assert.equal(restored.game.trees[0].state, 'growing');
  assert.equal(restored.game.buildings[0].type, 'workbench');
  assert.equal(restored.game.wood, 17); // 12 held + 5 original uncollected logs
});

test('growth pauses, does not trap the player, matures once and yields another harvest', () => {
  const ctx = fresh(), {game, life} = ctx, growth = game.palmGrowth;
  const tree = stump(ctx);
  game.inventory.coconut = 1;
  growth.plant(tree);
  growth.update(0);
  assert.equal(growth.remaining(tree), PALM_GROWTH_SECONDS);
  growth.update(40);
  assert.equal(growth.remaining(tree), 140);
  assert.ok(tree.root.scale.x > .16 && tree.root.scale.x < 1);
  game.player.root.position.set(tree.x, .22, tree.z);
  growth.update(140);
  assert.equal(tree.state, 'growing');
  assert.equal(growth.remaining(tree), 0);
  assert.equal(tree.body, null);
  game.player.root.position.x += 1;
  growth.update(.01);
  assert.equal(tree.state, 'standing');
  assert.equal(tree.hp, 4);
  assert.ok(tree.body);
  assert.equal(tree.root.scale.x, 1);
  assert.equal(life.getCoconutCounts()[0], 3);
  growth.update(999);
  assert.equal(ctx.events.filter(e => e === 'palmGrown').length, 1);
  for (let i = 0; i < 4; i++) game.hit(tree);
  game.spawnLogs(tree);
  assert.equal(game.logs.length, 10);
  assert.equal(game.leafDrops.length, 12);
  assert.equal(life.getPendingCoconuts(), 6);
  assert.equal(life.getCoconutCounts()[0], 0);
  game.inventory.coconut = 1;
  assert.equal(growth.plant(tree), true); // repeatable, no stale fall / notch
  assert.equal(tree.angle, 0);
  assert.equal(tree.cutDirection, null);
});

test('v4 saves resume seedlings and fruit without changing island identity or crediting another harvest', () => {
  const before = fresh(), tree = stump(before);
  before.game.inventory.coconut = 2;
  before.game.palmGrowth.plant(tree);
  before.game.palmGrowth.update(77.5);
  const saved = captureGameState(before);
  assert.equal(saved.schemaVersion, SAVE_SCHEMA_VERSION);
  assert.deepEqual(saved.world.plantings, [{treeIndex: 0, remaining: 102.5}]);
  assert.deepEqual(saved.world.trees[0], {hp: 0, state: 'gone'});
  const after = fresh();
  assert.equal(isSaveCompatibleWithIsland(saved, after.game), true);
  applyGameState(after, exportSave(saved));
  const restored = after.game.trees[0];
  assert.equal(restored.state, 'growing');
  assert.equal(after.game.palmGrowth.remaining(restored), 102.5);
  assert.equal(after.game.wood, 5); // first harvest only
  assert.equal(after.game.leaves, 6);
  assert.equal(after.game.inventory.coconut, 4); // held 2 - planted 1 + pending original 3
  assert.equal(after.life.getCoconutCounts()[0], 0);
  after.game.palmGrowth.update(102.5);
  assert.equal(after.life.getCoconutCounts()[0], 3);
  const grown = captureGameState(after), reloaded = fresh();
  applyGameState(reloaded, grown);
  assert.equal(reloaded.game.trees[0].state, 'standing');
  assert.equal(reloaded.life.getCoconutCounts()[0], 3);
  assert.deepEqual(grown.world.plantings, []);
  assert.deepEqual(grown.world.layout, saved.world.layout);
  assert.equal(reloaded.game.inventory.coconut, 4);
  assert.equal(reloaded.game.wood, 5);
});

test('v1–v3 migrate without inventing seedlings and restore a visible plantable stump', () => {
  const before = fresh();
  stump(before);
  const latest = captureGameState(before);
  for (const schemaVersion of [1, 2, 3]) {
    const old = structuredClone(latest);
    old.schemaVersion = schemaVersion;
    delete old.world.plantings;
    const after = fresh();
    applyGameState(after, old);
    assert.equal(after.game.trees[0].state, 'gone');
    assert.equal(after.game.trees[0].root.visible, true);
    assert.equal(after.game.trees[0].trunk.visible, false);
    assert.deepEqual(after.game.palmGrowth.snapshot(), []);
    assert.equal(after.game.inventory.coconut, 3);
    assert.equal(after.game.palmGrowth.plant(after.game.trees[0]), true);
  }
});

test('invalid growth imports cannot replace the valid slot or its backup', () => {
  const ctx = fresh(), tree = stump(ctx);
  ctx.game.inventory.coconut = 1;
  ctx.game.palmGrowth.plant(tree);
  const saved = captureGameState(ctx);
  const values = new Map(), storage = {getItem: k => values.get(k) ?? null, setItem: (k, v) => values.set(k, v)};
  saveToStorage(storage, saved);
  saveToStorage(storage, saved);
  const original = [...values];
  const variants = [
    s => { delete s.world.plantings; },
    s => { s.world.plantings[0].remaining = -1; },
    s => { s.world.plantings[0].remaining = PALM_GROWTH_SECONDS + 1; },
    s => { s.world.plantings[0].treeIndex = 12; },
    s => { s.world.plantings.push({...s.world.plantings[0]}); },
    s => { s.world.trees[0] = {hp: 4, state: 'standing'}; },
    s => { s.world.coconuts[0] = 1; },
    s => { s.world.buildings.push({type: 'fire', x: tree.x, z: tree.z, rotation: 0}); },
    s => { s.world.holes.push({x: tree.x, z: tree.z, level: 1, pyramid: false, flood: null}); },
  ];
  for (const change of variants) {
    const corrupt = structuredClone(saved);
    change(corrupt);
    assert.throws(() => saveToStorage(storage, corrupt), SaveGameError);
    assert.deepEqual([...values], original);
  }
  const unsigned = structuredClone(saved);
  delete unsigned.world.layout;
  unsigned.world.buildings.push({type: 'fire', x: tree.x, z: tree.z, rotation: 0});
  assert.equal(isSaveCompatibleWithIsland(validateSave(unsigned), fresh().game), false);
});
