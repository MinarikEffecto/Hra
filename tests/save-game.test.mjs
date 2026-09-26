import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.module.js';
import {makeScenery} from '../dist/world.js';
import {RAPIER, IslandGame, COSTS} from '../dist/simulation.js';
import {DRIFTWOOD_POSITION, DRIFTWOOD_RESPAWN_SECONDS, DRIFTWOOD_WOOD} from '../dist/driftwood.js';
import {Survival} from '../dist/survival.js';
import {createIslandLife} from '../dist/life.js';
import {
  SAVE_SCHEMA_VERSION, SaveGameError, captureGameState, applyGameState, isSaveCompatibleWithIsland,
  validateSave, exportSave, saveToStorage, readFromStorage,
} from '../dist/save-game.js';

await RAPIER.init();

function freshIsland() {
  const scene = new THREE.Scene();
  makeScenery(scene);
  const game = new IslandGame(scene);
  game.inventory = {coconut: 0, fish: 0, seafood: 0, cooked: 0, shell: 0, coin: 0,
    pearl: 0, chest: 0, relic: 0, feather: 0, meat: 0, vine: 0, strips: [], ropes: []};
  const life = {state: new Survival(Math.random, game.inventory)};
  let tool = 'axe';
  const tools = ['axe', 'shovel', 'shotgun'];
  const exploration = {holes: [], pyramid: new THREE.Group(), get tool() { return tool; },
    select(direction = 1) { tool = tools[(tools.indexOf(tool) + direction + tools.length) % tools.length]; }};
  return {game, life, exploration};
}

function memoryStorage() {
  const values = new Map();
  return {getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, String(value)), values};
}

function islandWithLife() {
  const nodes = new Map();
  const node = id => {
    if (!nodes.has(id)) nodes.set(id, {id, classList: {toggle() {}}, setAttribute() {}, after() {}});
    return nodes.get(id);
  };
  globalThis.document = {createElement: () => node(Symbol()), getElementById: node};
  globalThis.addEventListener = () => {};
  const island = freshIsland();
  island.life = createIslandLife(island.game.scene, island.game,
    {toast() {}, hud() {}, sound() {}, noise() {}, tone() {}, wakeAudio() {}});
  return island;
}

test('a real island survives a save/reload with inventory, workshop outputs, bench, excavation and survival state', () => {
  const before = freshIsland();
  const {game, life, exploration} = before;
  game.wood = COSTS.workbench + 2;
  assert.equal(game.build('workbench', 2, 3, Math.PI / 2), true);
  game.inventory.vine = 3;
  game.inventory.strips.push(84, 82, 80);
  game.inventory.ropes.push({length: 2, quality: 78}, {length: 1, quality: 92});
  game.logs.push({collecting: true}); // a dropped log is credited on reload
  game.spawnLeaves(0, 0, 2, new THREE.Vector3(1, 0, 0));
  game.trees[0].hp = 2;
  game.bushes[0].hp = 1;
  game.bushes[0].root.scale.setScalar(.9);
  game.player.root.position.set(1, .22, -1);
  game.player.root.rotation.y = .4;
  exploration.select(1);
  exploration.holes.push({x: -1, z: -2, level: 3, pyramid: false,
    flood: {height: -.06, sourceX: -1.4, sourceZ: -2.3}});
  life.state.satiety = 69;
  life.state.torch = true;
  life.state.lit = true;
  life.getCoconutCounts = () => game.trees.map((_, i) => i === 0 ? 1 : 3);
  life.getPendingCoconuts = () => 2;
  life.getPendingAnimalDrops = () => ({feather: 4, meat: 1, shell: 0});
  life.getWildlifeState = () => ({birds: [false, true, true], creatures: [true, true, false, true]});
  before.dayCycle = {state: {hour: 7.5, speed: .25}};

  const saved = captureGameState(before, new Date('2026-09-25T20:00:00.000Z'));
  assert.equal(saved.schemaVersion, SAVE_SCHEMA_VERSION);
  assert.deepEqual(saved.world.layout.trees[0], [Math.round(game.trees[0].x * 1000), Math.round(game.trees[0].z * 1000)]);
  assert.deepEqual(saved.world.layout.bushes[0], [Math.round(game.bushes[0].x * 1000), Math.round(game.bushes[0].z * 1000)]);
  const after = freshIsland();
  after.life.restoreCoconuts = counts => { after.life.coconuts = counts; };
  after.life.restoreWildlife = saved => { after.life.wildlife = saved; };
  after.exploration.restoreFloods = holes => { after.exploration.savedFloods = holes; };
  after.dayCycle = {restore(saved) { this.state = saved; }};
  applyGameState(after, exportSave(saved));
  assert.equal(after.game.wood, 3); // 2 held + 1 log awaiting pickup
  assert.equal(after.game.leaves, 2); // uncollected leaves remain available
  assert.deepEqual(after.game.inventory.ropes, [{length: 2, quality: 78}, {length: 1, quality: 92}]);
  assert.deepEqual(after.game.inventory.strips, [84, 82, 80]);
  assert.equal(after.game.inventory.vine, 3);
  assert.equal(after.game.inventory.coconut, 2);
  assert.equal(after.game.inventory.feather, 4);
  assert.equal(after.game.inventory.meat, 1);
  assert.deepEqual(after.life.wildlife.birds, [false, true, true]);
  assert.deepEqual(after.life.wildlife.creatures, [true, true, false, true]);
  assert.equal(after.life.coconuts[0], 1);
  assert.equal(after.game.buildings.length, 1);
  assert.equal(after.game.buildings[0].type, 'workbench');
  assert.equal(after.game.buildings[0].visual.rotation.y, Math.PI / 2);
  assert.equal(after.game.canBuild('fire', 2, 3), false); // restored collider/occupied site
  assert.equal(after.game.trees[0].hp, 2);
  assert.equal(after.game.bushes[0].hp, 1);
  assert.equal(after.game.bushes[0].root.scale.x, .9);
  assert.equal(after.exploration.holes[0].level, 3);
  assert.deepEqual(after.exploration.savedFloods[0].flood, {height: -.06, sourceX: -1.4, sourceZ: -2.3});
  assert(after.game.scene.userData.terrain.heightAt(-1, -2) < .22);
  assert.equal(after.exploration.tool, 'shovel');
  assert.equal(after.life.state.satiety, 69);
  assert.equal(after.life.state.lit, true);
  assert.deepEqual(after.dayCycle.state, {hour: 7.5, speed: .25});
  assert.deepEqual(after.game.player.root.position.toArray(), [1, .22, -1]);
  assert.throws(() => applyGameState(after, saved), SaveGameError); // cannot double-spawn buildings
});

test('a felled palm is not resurrected and its resources do not vanish mid-fall', () => {
  const before = freshIsland();
  const tree = before.game.trees[0];
  tree.hp = 0;
  tree.state = 'falling';
  const saved = captureGameState(before);
  const after = freshIsland();
  applyGameState(after, saved);
  assert.equal(after.game.trees[0].state, 'gone');
  assert.equal(after.game.trees[0].root.visible, false);
  assert.equal(after.game.trees[0].body, null);
  assert.equal(after.game.wood, 5);
  assert.equal(after.game.leaves, 6);
});

test('coconuts on a falling palm survive reload and older broken saves recover them', () => {
  const before = islandWithLife();
  const tree = before.game.trees[0];
  tree.hp = 1; // A shotgun shot reduces a standing palm to one hit point.
  before.game.hit(tree);
  assert.equal(tree.state, 'falling');
  assert.equal(before.life.getCoconutCounts()[0], 2);
  assert.equal(before.life.getPendingCoconuts(), 1);

  const saved = captureGameState(before);
  assert.equal(saved.inventory.coconut, 3);
  assert.equal(saved.world.coconuts[0], 0);
  const after = islandWithLife();
  applyGameState(after, saved);
  assert.equal(after.game.trees[0].root.visible, false);
  assert.equal(after.life.getCoconutCounts()[0], 0);
  assert.equal(after.game.inventory.coconut, 3);

  const olderMidFall = structuredClone(saved);
  olderMidFall.inventory.coconut = 1;
  olderMidFall.world.coconuts[0] = 2;
  const recovered = islandWithLife();
  applyGameState(recovered, olderMidFall);
  assert.equal(recovered.game.inventory.coconut, 3);
  assert.equal(recovered.life.getCoconutCounts()[0], 0);
});

test('shore driftwood is collected by approach, waits through save/reload, then replenishes', () => {
  const before = freshIsland();
  const events = [];
  before.game.event = type => events.push(type);
  const {x, z} = DRIFTWOOD_POSITION;
  assert.equal(before.game.canBuild('fire', x, z), false); // the pickup cannot be covered by a new building
  before.game.player.root.position.set(x, .22, z);
  before.game.update(.016);
  assert.equal(before.game.wood, DRIFTWOOD_WOOD);
  assert.deepEqual(before.game.driftwood.snapshot(), {available: false, remaining: DRIFTWOOD_RESPAWN_SECONDS});
  assert.equal(before.game.driftwood.visual.visible, false);
  before.game.update(0); // pausing does not spend the wait or grant another log
  assert.equal(before.game.driftwood.remaining, DRIFTWOOD_RESPAWN_SECONDS);
  before.game.update(.016);
  assert.equal(before.game.wood, DRIFTWOOD_WOOD);
  assert.equal(events.filter(type => type === 'driftwoodPickup').length, 1);

  const saved = captureGameState(before);
  const after = freshIsland();
  applyGameState(after, exportSave(saved));
  assert.equal(after.game.wood, DRIFTWOOD_WOOD);
  assert.equal(after.game.driftwood.visual.visible, false);
  after.game.player.root.position.set(0, .22, 0);
  after.game.update(DRIFTWOOD_RESPAWN_SECONDS - .1);
  assert.equal(after.game.driftwood.available, false);
  after.game.update(.1);
  assert.equal(after.game.driftwood.available, true);
  assert.equal(after.game.driftwood.visual.visible, true);
  after.game.player.root.position.set(x, .22, z);
  after.game.update(.016);
  assert.equal(after.game.wood, DRIFTWOOD_WOOD * 2);
  assert.equal(after.game.driftwood.available, false);
});

test('v1 and older v2 positions start with a pickup; malformed cooldown is rejected', () => {
  const old = captureGameState(freshIsland());
  delete old.world.driftwood;
  delete old.world.layout;
  for (const schemaVersion of [1, 2]) {
    const input = {...old, schemaVersion};
    const migrated = validateSave(input);
    assert.deepEqual(migrated.world.driftwood, {available: true, remaining: 0});
    const island = freshIsland();
    applyGameState(island, input);
    assert.equal(island.game.driftwood.visual.visible, true);
  }
  assert.throws(() => validateSave({...old, world: {...old.world, driftwood: {available: false, remaining: 91}}}), SaveGameError);
  assert.throws(() => validateSave({...old, world: {...old.world, driftwood: {available: true, remaining: 1}}}), SaveGameError);
});

test('the deepest permitted ordinary excavation can be saved and restored', () => {
  const before = freshIsland();
  const hole = {
    x: 0, z: 0, level: 50, pyramid: false,
    depth: .24 * 50 + .035 * Math.max(0, 50 - 4) ** 1.28,
    radius: .56 + .27 * Math.sqrt(50),
  };
  before.exploration.holes.push(hole);
  before.game.scene.userData.terrain.setHole(hole);
  const depth = before.game.scene.userData.terrain.heightAt(0, 0);
  assert(depth < -10, 'deep hole must exercise the former save bound');
  before.game.player.root.position.set(0, depth, 0);
  const save = captureGameState(before);
  assert.equal(save.player.y, depth);
  const after = freshIsland();
  applyGameState(after, save);
  assert.equal(after.exploration.holes[0].level, 50);
  assert.equal(after.game.player.root.position.y, depth);
  assert.equal(after.game.scene.userData.terrain.heightAt(0, 0), depth);
});

test('shot wildlife stays dead and its airborne drops survive save/reload', () => {
  const before = islandWithLife();
  let requested = 0;
  before.game.requestSave = () => requested++;
  before.game.shootables[0].onShot();
  assert.equal(before.game.shootables[0].alive, false);
  assert.equal(requested, 1);
  assert.deepEqual(before.life.getPendingAnimalDrops(), {feather: 4, meat: 1, shell: 0});
  const after = islandWithLife();
  applyGameState(after, captureGameState(before));
  assert.equal(after.game.shootables[0].alive, false);
  assert.equal(after.game.shootables[0].root.visible, false);
  assert.equal(after.game.inventory.feather, 4);
  assert.equal(after.game.inventory.meat, 1);
  assert.deepEqual(after.life.getPendingAnimalDrops(), {feather: 0, meat: 0, shell: 0});
});

test('a ready fish trap and cooking timer continue after reload', () => {
  const before = freshIsland();
  before.game.wood = COSTS.fire + COSTS.trap;
  assert.equal(before.game.build('fire', 2, 3), true);
  assert.equal(before.game.build('trap', 7, 0), true);
  const fire = before.game.buildings[0];
  const trap = before.game.buildings[1];
  before.life.state.traps.set(trap, {wait: 12, catch: 'seafood'});
  before.life.state.cooking = {fire, kind: 'fish', remaining: 3};
  const after = freshIsland();
  applyGameState(after, captureGameState(before));
  assert.deepEqual(after.life.state.traps.get(after.game.buildings[1]), {wait: 12, catch: 'seafood'});
  assert.equal(after.life.state.cooking.fire, after.game.buildings[0]);
  assert.equal(after.life.state.cooking.remaining, 3);
  assert.equal(after.life.state.update(4, after.game.buildings), true);
  assert.equal(after.game.inventory.cooked, 1);
  assert.equal(after.life.state.collect(after.game.buildings[1]), true);
  assert.equal(after.game.inventory.seafood, 1);
});

test('malformed and future saves leave a valid stored position intact; backup can recover it', () => {
  const storage = memoryStorage();
  const first = captureGameState(freshIsland(), new Date('2026-09-25T20:00:00.000Z'));
  const later = structuredClone(first);
  later.savedAt = '2026-09-25T20:10:00.000Z';
  later.inventory.ropes.push({length: 3, quality: 88});
  saveToStorage(storage, first);
  assert.throws(() => saveToStorage(storage, '{broken'), SaveGameError);
  assert.throws(() => saveToStorage(storage, {...later, schemaVersion: 999}), SaveGameError);
  assert.deepEqual(readFromStorage(storage).save, first);

  saveToStorage(storage, later);
  const primary = storage.getItem('trosechnik.save.v1');
  storage.setItem('trosechnik.save.v1', '{broken');
  const recovered = readFromStorage(storage);
  assert.equal(recovered.source, 'backup');
  assert.deepEqual(recovered.save, first);
  assert.equal(recovered.errors.length, 1);
  assert.throws(() => validateSave({...later, inventory: {...later.inventory, ropes: [{length: -2, quality: 80}]}}), SaveGameError);
  assert.throws(() => validateSave({...later, player: {...later.player, x: 12.5, z: 12.5}}), SaveGameError);
  assert.equal(primary, JSON.stringify(later));
});

test('recovering a compatible backup never overwrites a primary from a future schema', () => {
  const storage = memoryStorage();
  const backup = captureGameState(freshIsland());
  const future = structuredClone(backup);
  future.schemaVersion = SAVE_SCHEMA_VERSION + 1;
  future.inventory.ingot = 9;
  const primaryBytes = JSON.stringify(future);
  const backupBytes = JSON.stringify(backup);
  storage.setItem('trosechnik.save.v1', primaryBytes);
  storage.setItem('trosechnik.save.backup.v1', backupBytes);

  const recovered = readFromStorage(storage);
  assert.equal(recovered.source, 'backup');
  assert.equal(recovered.futurePrimary, true);
  assert.deepEqual(recovered.save, backup);
  assert.throws(() => saveToStorage(storage, recovered.save), SaveGameError);
  assert.equal(storage.getItem('trosechnik.save.v1'), primaryBytes);
  assert.equal(storage.getItem('trosechnik.save.backup.v1'), backupBytes);

  // Choosing a valid import file is an explicit replacement of the protected slot.
  saveToStorage(storage, recovered.save, {overwriteFuture: true});
  assert.equal(JSON.parse(storage.getItem('trosechnik.save.v1')).schemaVersion, SAVE_SCHEMA_VERSION);
});

test('wrong island layout is rejected before modifying game state', () => {
  const data = captureGameState(freshIsland());
  data.world.trees.pop();
  const after = freshIsland();
  assert.throws(() => applyGameState(after, data), SaveGameError);
  assert.equal(after.game.wood, 0);
  assert.equal(after.game.buildings.length, 0);
  assert.equal(after.game.trees[0].state, 'standing');
});

test('same-count palm or bush reorder is rejected before changing player, inventory, or world', () => {
  const source = freshIsland();
  source.game.player.root.position.set(2, .22, 3);
  source.game.wood = 7;
  source.game.trees[0].hp = 0;
  source.game.trees[0].state = 'gone';
  source.game.bushes[0].hp = 0;
  source.game.bushes[0].state = 'gone';
  const saved = captureGameState(source);
  assert.deepEqual(validateSave(exportSave(saved)).world.layout, saved.world.layout);

  for (const kind of ['trees', 'bushes']) {
    const target = freshIsland();
    [target.game[kind][0], target.game[kind][1]] = [target.game[kind][1], target.game[kind][0]];
    assert.equal(isSaveCompatibleWithIsland(saved, target.game), false);
    assert.throws(() => applyGameState(target, saved), SaveGameError);
    assert.equal(target.game.wood, 0);
    assert.deepEqual(target.game.player.root.position.toArray(), [.5, .22, 2.5]);
    assert.equal(target.game[kind][0].state, 'standing');
    assert.equal(target.game.buildings.length, 0);
  }
});

test('sub-millimetre variation from different JS math engines keeps the same layout', () => {
  const source = freshIsland();
  const saved = captureGameState(source);
  const target = freshIsland();
  target.game.bushes[21].z += 1e-12;
  assert.equal(isSaveCompatibleWithIsland(saved, target.game), true);
  target.game.bushes[21].z += .01;
  assert.equal(isSaveCompatibleWithIsland(saved, target.game), false);
});

test('unsigned v1 and older v2 positions retain player progress using the historical count check', () => {
  const source = freshIsland();
  source.game.player.root.position.set(2, .22, 3);
  source.game.wood = 7;
  source.game.trees[0].hp = 2;
  const signed = captureGameState(source);
  for (const schemaVersion of [1, 2]) {
    const old = structuredClone(signed);
    old.schemaVersion = schemaVersion;
    delete old.world.layout;
    const migrated = validateSave(old);
    assert.equal(migrated.world.layout, undefined);
    const target = freshIsland();
    assert.equal(isSaveCompatibleWithIsland(migrated, target.game), true);
    applyGameState(target, old);
    assert.deepEqual(target.game.player.root.position.toArray(), [2, .22, 3]);
    assert.equal(target.game.wood, 7);
    assert.equal(target.game.trees[0].hp, 2);
    assert.deepEqual(captureGameState(target).world.layout, signed.world.layout);
  }
});

test('malformed ordered coordinates cannot replace a valid position', () => {
  const storage = memoryStorage();
  const original = captureGameState(freshIsland());
  saveToStorage(storage, original);
  for (const layout of [
    {trees: original.world.layout.trees.slice(1), bushes: original.world.layout.bushes},
    {trees: [[NaN, 0], ...original.world.layout.trees.slice(1)], bushes: original.world.layout.bushes},
  ]) {
    assert.throws(() => saveToStorage(storage, {...original, world: {...original.world, layout}}), SaveGameError);
  }
  assert.deepEqual(readFromStorage(storage).save, original);
});

test('same-count reordered primary falls back to signed backup and cannot replace it on autosave', () => {
  const storage = memoryStorage();
  const current = freshIsland();
  const compatible = captureGameState(current);
  const differentIsland = freshIsland();
  [differentIsland.game.trees[0], differentIsland.game.trees[1]] =
    [differentIsland.game.trees[1], differentIsland.game.trees[0]];
  const reordered = captureGameState(differentIsland);
  const isCompatible = save => isSaveCompatibleWithIsland(save, current.game);
  saveToStorage(storage, compatible, {isCompatible});
  saveToStorage(storage, reordered, {isCompatible});
  const restored = readFromStorage(storage, {isCompatible});
  assert.equal(restored.source, 'backup');
  assert.deepEqual(restored.save, compatible);
  assert.equal(restored.errors.length, 1);
  const resumed = structuredClone(restored.save);
  resumed.resources.wood = 4;
  saveToStorage(storage, resumed, {isCompatible});
  assert.deepEqual(validateSave(storage.getItem('trosechnik.save.backup.v1')), compatible);
  assert.deepEqual(readFromStorage(storage, {isCompatible}).save, resumed);
});

test('a valid-schema save from an older island layout falls back to the compatible backup', () => {
  const storage = memoryStorage();
  const compatible = captureGameState(freshIsland());
  const differentLayout = structuredClone(compatible);
  differentLayout.world.trees.pop();
  differentLayout.world.coconuts.pop();
  differentLayout.world.layout.trees.pop();
  saveToStorage(storage, compatible);
  saveToStorage(storage, differentLayout);
  const result = readFromStorage(storage, {
    isCompatible: save => save.world.trees.length === compatible.world.trees.length,
  });
  assert.equal(result.source, 'backup');
  assert.deepEqual(result.save, compatible);
  assert.equal(result.errors.length, 1);
  // A later autosave of the restored position must preserve the only compatible backup.
  const resumed = structuredClone(result.save);
  resumed.resources.wood = 4;
  const isCompatible = save => save.world.trees.length === compatible.world.trees.length;
  saveToStorage(storage, resumed, {isCompatible});
  assert.deepEqual(validateSave(storage.getItem('trosechnik.save.backup.v1')), compatible);
  assert.deepEqual(readFromStorage(storage, {isCompatible}).save, resumed);
});
