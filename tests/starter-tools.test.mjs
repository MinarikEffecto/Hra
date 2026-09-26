import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.module.js';
import {makeScenery} from '../dist/world.js';
import {RAPIER, IslandGame} from '../dist/simulation.js';
import {Survival} from '../dist/survival.js';
import {StarterTools, STONE_PILES, STONE_RESPAWN_SECONDS, starterState, validateStarterState} from '../dist/starter-tools.js';
import {firstToolsGoal} from '../dist/progress-guide.js';
import {captureGameState, applyGameState, validateSave, saveToStorage, SaveGameError, SAVE_SCHEMA_VERSION} from '../dist/save-game.js';

await RAPIER.init();

function simple() {
  const events = [];
  const game = {wood: 0, leaves: 0, inventory: {stone: 0, ingot: 0, ropes: []}, buildings: [], trees: [],
    grounded: true, swimming: false, player: {root: {position: {x: 20, z: 20}}}, event: type => events.push(type)};
  game.starterTools = new StarterTools(game);
  return {game, tools: game.starterTools, events};
}

function real() {
  const scene = new THREE.Scene(); makeScenery(scene);
  const game = new IslandGame(scene);
  game.inventory = {stone: 0, strips: [], ropes: []};
  game.starterTools = new StarterTools(game);
  const life = {state: new Survival(Math.random, game.inventory)};
  let tool = 'hands';
  const exploration = {holes: [], get tool() { return tool; }, refreshTools(preferred) {
    const owned = game.starterTools.tools(); tool = owned.includes(preferred) ? preferred : owned.includes(tool) ? tool : owned[0];
  }, select() { const owned = game.starterTools.tools(); tool = owned[(owned.indexOf(tool) + 1) % owned.length]; }};
  game.refreshTools = exploration.refreshTools;
  return {game, life, exploration};
}

test('stones are collected only by approach, replenish after active time, and pause and restore correctly', () => {
  const {game, tools, events} = simple();
  tools.tick(10);
  assert.equal(game.inventory.stone, 0);
  Object.assign(game.player.root.position, STONE_PILES[0]);
  tools.tick(0);
  assert.equal(game.inventory.stone, 0);
  tools.tick(.1);
  assert.equal(game.inventory.stone, 2);
  assert.equal(tools.state.piles[0], STONE_RESPAWN_SECONDS);
  tools.tick(10);
  const saved = tools.snapshot();
  const after = simple(); after.tools.restore(saved);
  Object.assign(after.game.player.root.position, STONE_PILES[0]);
  after.tools.tick(49);
  assert.equal(after.game.inventory.stone, 0);
  after.tools.tick(1);
  assert.equal(after.game.inventory.stone, 2);
  assert.equal(saved.piles[0], 50); // snapshot not mutated
  assert.deepEqual(events, ['stonePickup']);
});

test('the first axe requires each stage and spends ingredients and parts exactly once', () => {
  const {game, tools} = simple();
  assert.deepEqual(tools.tools(), ['hands']);
  assert.equal(tools.craft('axe'), false);
  assert.equal(tools.craft('flake'), false);
  game.inventory.stone = 4;
  assert.equal(tools.craft('flake'), true);
  assert.equal(tools.craft('flake'), false);
  assert.equal(game.inventory.stone, 2);
  assert.equal(tools.canHarvest({kind: 'bush'}), true);
  assert.equal(tools.canHarvest({kind: 'palm'}), false);
  assert.equal(tools.craft('chopper'), false);
  game.wood = 2; game.leaves = 2;
  assert.equal(tools.craft('chopper'), true);
  assert.equal(tools.canHarvest({kind: 'palm'}), true);
  const slow = tools.chopCooldown;
  assert.equal(tools.craft('axe'), false);
  assert.equal(tools.craft('handle'), true);
  assert.equal(tools.craft('handle'), false);
  assert.equal(tools.craft('axe'), false);
  assert.equal(tools.craft('binding'), true);
  assert.equal(tools.craft('binding'), false);
  assert.equal(tools.craft('axe'), true);
  assert.equal(tools.craft('axe'), false);
  assert.equal(game.wood, 0);
  assert.equal(game.leaves, 0);
  assert.equal(game.inventory.stone, 1);
  assert.equal(tools.state.handle, false);
  assert.equal(tools.state.binding, false);
  assert.ok(tools.chopCooldown < slow);
  assert.deepEqual(tools.tools(), ['axe']);
});

test('shovel and advanced equipment are earned; rope remainder and quality survive the recipe', () => {
  const {game, tools} = simple();
  game.wood = 10; game.inventory.stone = 1; game.inventory.ingot = 2;
  game.inventory.ropes = [{length: 3, quality: 82}, {length: 1, quality: 94}];
  assert.equal(tools.craft('shovel'), false);
  tools.state.stage = 3;
  assert.equal(tools.craft('shovel'), true);
  assert.equal(tools.craft('shovel'), false);
  assert.equal(game.wood, 8);
  assert.equal(tools.craft('shotgun'), false); // no workbench
  game.buildings.push({type: 'workbench', x: 20, z: 20});
  assert.equal(tools.craft('shotgun'), true);
  assert.equal(tools.craft('shotgun'), false);
  assert.equal(game.wood, 6);
  assert.equal(game.inventory.ingot, 0);
  assert.deepEqual(game.inventory.ropes, [{length: 2, quality: 82}, {length: 1, quality: 94}]);
  assert.deepEqual(tools.tools(), ['axe', 'shovel', 'shotgun']);
});

test('real island cannot fell a palm with hands or a flake, but the chopper can strike it', () => {
  const {game} = real(), t = game.trees[0];
  game.player.root.position.set(t.x + 1, .22, t.z);
  game.chop(); game.update(.3);
  assert.equal(t.hp, 4);
  game.starterTools.state.stage = 1;
  game.cooldown = 0; game.chop(); game.update(.3);
  assert.equal(t.hp, 4);
  game.starterTools.state.stage = 2;
  game.cooldown = 0; game.chop(); game.update(.3);
  assert.equal(t.hp, 3);
});

test('partial axe parts, stone cooldowns and active tool survive reload without a gift or lost resources', () => {
  const before = real(), tools = before.game.starterTools;
  before.game.inventory.stone = 4; before.game.wood = 2;
  for (const recipe of ['flake', 'chopper', 'handle']) assert.equal(tools.craft(recipe), true);
  tools.state.piles[1] = 32;
  const save = captureGameState(before), after = real();
  assert.equal(save.schemaVersion, SAVE_SCHEMA_VERSION);
  applyGameState(after, save);
  assert.equal(after.exploration.tool, 'chopper');
  assert.deepEqual(after.game.starterTools.snapshot(), tools.snapshot());
  assert.equal(after.game.inventory.stone, 1);
  assert.equal(after.game.wood, 0);
  assert.equal(after.game.starterTools.craft('handle'), false);
  after.game.leaves = 2;
  assert.equal(after.game.starterTools.craft('binding'), true);
  assert.equal(after.game.starterTools.craft('axe'), true);
  const finished = real(); applyGameState(finished, captureGameState(after));
  assert.equal(finished.exploration.tool, 'axe');
  assert.equal(finished.game.starterTools.state.shovel, false);
});

test('old v1–v4 positions keep the axe, shovel and shotgun, including the currently selected tool', () => {
  for (const version of [1, 2, 3, 4]) {
    const ctx = real(); ctx.game.starterTools.restore(starterState(true)); ctx.exploration.refreshTools('shotgun');
    const old = captureGameState(ctx); old.schemaVersion = version;
    delete old.starter; delete old.inventory.stone;
    const after = real(); applyGameState(after, old);
    assert.deepEqual(after.game.starterTools.tools(), ['axe', 'shovel', 'shotgun']);
    assert.equal(after.exploration.tool, 'shotgun');
    assert.equal(after.game.inventory.stone, 0);
  }
});

test('corrupt tool progression cannot replace the existing save or bypass ownership', () => {
  const ctx = real(), original = captureGameState(ctx);
  const values = new Map(), storage = {getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value)};
  saveToStorage(storage, original);
  const snapshot = [...values];
  for (const change of [
    s => { delete s.starter; }, s => { s.starter.stage = 4; }, s => { s.starter.handle = true; },
    s => { s.starter.shotgun = true; }, s => { s.starter.piles = [0]; },
    s => { s.starter.piles[0] = 61; }, s => { s.inventory.stone = -1; },
    s => { s.exploration.tool = 'axe'; },
  ]) {
    const bad = structuredClone(original); change(bad);
    assert.throws(() => saveToStorage(storage, bad), SaveGameError);
    assert.deepEqual([...values], snapshot);
  }
  assert.throws(() => validateStarterState({stage: NaN}));
  assert.equal(validateSave(original).exploration.tool, 'hands');
});

test('the guide cannot send bare hands or a flake to chop a palm for the first wood', () => {
  const {game, tools} = simple();
  game.trees = [{state: 'standing'}];
  game.driftwood = {snapshot: () => ({available: true, remaining: 0})};
  assert.equal(firstToolsGoal(game).key, 'starter-stones');
  game.inventory.stone = 4;
  assert.equal(firstToolsGoal(game).key, 'starter-flake');
  tools.craft('flake');
  assert.match(firstToolsGoal(game).action, /naplavené/);
  game.wood = 2; tools.craft('chopper');
  assert.equal(firstToolsGoal(game).key, 'starter-handle');
  tools.craft('handle');
  assert.equal(firstToolsGoal(game).key, 'starter-leaves');
  game.leaves = 2; tools.craft('binding');
  assert.equal(firstToolsGoal(game).key, 'starter-axe');
  tools.craft('axe'); game.wood = 2;
  assert.equal(firstToolsGoal(game).key, 'starter-shovel');
  tools.craft('shovel');
  assert.equal(firstToolsGoal(game), null);
});
