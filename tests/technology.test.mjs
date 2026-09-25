import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.module.js';
import {makeScenery} from '../dist/world.js';
import {IslandGame, RAPIER, canAffordBuilding} from '../dist/simulation.js';
import {Survival} from '../dist/survival.js';
import {Technology, excavationYield} from '../dist/technology.js';
import {SAVE_SCHEMA_VERSION, SAVE_KEY, BACKUP_KEY, SaveGameError, validateSave,
  captureGameState, applyGameState, readFromStorage, saveToStorage} from '../dist/save-game.js';

await RAPIER.init();

function island() {
  const scene = new THREE.Scene(); makeScenery(scene);
  const game = new IslandGame(scene);
  game.inventory = {coconut: 0, fish: 0, seafood: 0, cooked: 0, shell: 0, coin: 0,
    pearl: 0, chest: 0, relic: 0, feather: 0, meat: 0, vine: 0,
    clay: 0, ore: 0, charcoal: 0, ash: 0, ingot: 0, copperCutter: false,
    strips: [], ropes: []};
  const life = {state: new Survival(Math.random, game.inventory)};
  const exploration = {holes: [], tool: 'axe', select() {}, pyramid: new THREE.Group()};
  const technology = new Technology(game);
  return {game, life, exploration, technology};
}

test('ordinary excavation reveals a finite, repeatable set of materials; pyramid stays separate', () => {
  assert.deepEqual([1, 2, 3, 4, 5, 50].map(level => excavationYield(level)),
    ['clay', 'clay', 'ore', 'clay', null, null]);
  assert.equal(excavationYield(3, true), null);
});

test('furnace placement atomically pays wood, clay and ash only at a valid site', () => {
  const {game} = island();
  game.wood = 4; game.inventory.clay = 3;
  assert.equal(canAffordBuilding(game, 'furnace'), false);
  assert.equal(game.build('furnace', -2, -2), false);
  assert.deepEqual([game.wood, game.inventory.clay, game.inventory.ash], [4, 3, 0]);
  game.inventory.ash = 1;
  assert.equal(game.build('furnace', 30, 30), false);
  assert.deepEqual([game.wood, game.inventory.clay, game.inventory.ash], [4, 3, 1]);
  assert.equal(game.build('furnace', -2, -2), true);
  assert.deepEqual([game.wood, game.inventory.clay, game.inventory.ash], [0, 0, 0]);
  assert.equal(game.buildings[0].type, 'furnace');
});

test('production refuses missing inputs and a second job, then completes exactly once', () => {
  const {game, technology} = island();
  game.wood = 7;
  assert(game.build('fire', 0, 0));
  const fire = game.buildings[0];
  assert.equal(technology.start('copper', fire), false);
  assert.equal(technology.start('charcoal', {type: 'fire'}), false);
  assert.equal(technology.start('charcoal', fire), true);
  assert.equal(game.wood, 0); // 5 for the fire, 2 reserved for the job
  assert.equal(technology.start('charcoal', fire), false);
  assert.equal(game.inventory.charcoal, 0);
  assert.equal(technology.tick(3), false);
  assert.equal(technology.tick(3), true);
  assert.deepEqual([game.inventory.charcoal, game.inventory.ash], [1, 1]);
  assert.equal(technology.tick(100), false);
  assert.deepEqual([game.inventory.charcoal, game.inventory.ash], [1, 1]);
});

test('v1 migration preserves the old position and v2 rejects malformed jobs before restore', () => {
  const ctx = island();
  ctx.game.inventory.vine = 2; ctx.game.inventory.ropes.push({length: 2, quality: 76});
  const v2 = captureGameState(ctx);
  const v1 = structuredClone(v2);
  v1.schemaVersion = 1;
  for (const key of ['clay', 'ore', 'charcoal', 'ash', 'ingot', 'copperCutter']) delete v1.inventory[key];
  delete v1.technology;
  const migrated = validateSave(JSON.stringify(v1));
  assert.equal(migrated.schemaVersion, SAVE_SCHEMA_VERSION);
  assert.equal(migrated.inventory.vine, 2);
  assert.deepEqual(migrated.inventory.ropes, [{length: 2, quality: 76}]);
  assert.equal(migrated.inventory.clay, 0);
  assert.equal(migrated.inventory.copperCutter, false);
  assert.equal(migrated.technology.job, null);
  const restored = island(); applyGameState(restored, v1);
  assert.deepEqual(restored.game.inventory.ropes, [{length: 2, quality: 76}]);
  const values = new Map([[SAVE_KEY, JSON.stringify(v1)]]);
  const storage = {getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value)};
  assert.deepEqual(readFromStorage(storage).save, migrated);
  saveToStorage(storage, captureGameState(restored));
  assert.equal(JSON.parse(storage.getItem(SAVE_KEY)).schemaVersion, 2);
  assert.deepEqual(JSON.parse(storage.getItem(BACKUP_KEY)), migrated);
  assert.throws(() => validateSave({...v1, inventory: {...v1.inventory, vine: -1}}), SaveGameError);
  assert.throws(() => validateSave({...v2, technology: {job: {kind: 'copper', buildingIndex: 0, remaining: 8}}}), SaveGameError);
  assert.throws(() => validateSave({...v2, inventory: {...v2.inventory, ore: -1}}), SaveGameError);
});

test('mid-job save/reload resumes smelting with inputs already spent and one final ingot', () => {
  const before = island();
  before.game.wood = 9;
  assert(before.game.build('fire', 0, 0));
  before.game.inventory.clay = 3; before.game.inventory.ash = 1;
  assert(before.game.build('furnace', -2, -2));
  before.game.inventory.ore = 1; before.game.inventory.charcoal = 1;
  assert(before.technology.start('copper', before.game.buildings[1]));
  assert.deepEqual([before.game.inventory.ore, before.game.inventory.charcoal, before.game.inventory.ingot], [0, 0, 0]);
  before.technology.tick(3);
  const saved = captureGameState(before);
  assert.deepEqual(saved.technology.job, {kind: 'copper', buildingIndex: 1, remaining: 5});
  const after = island();
  applyGameState(after, JSON.stringify(saved));
  assert.equal(after.technology.job.building, after.game.buildings[1]);
  assert.deepEqual([after.game.inventory.ore, after.game.inventory.charcoal, after.game.inventory.ingot], [0, 0, 0]);
  assert.equal(after.technology.tick(4), false);
  assert.equal(after.technology.tick(1), true);
  assert.equal(after.technology.tick(30), false);
  assert.equal(after.game.inventory.ingot, 1);
  const finished = island(); applyGameState(finished, captureGameState(after));
  assert.equal(finished.technology.job, null);
  assert.equal(finished.game.inventory.ingot, 1);
  const bench = {type: 'workbench'};
  after.game.buildings.push(bench);
  assert.equal(after.technology.craftCutter(bench), true);
  assert.equal(after.technology.craftCutter(bench), false);
  assert.deepEqual([after.game.inventory.ingot, after.game.inventory.copperCutter], [0, true]);
});
