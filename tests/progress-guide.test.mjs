import test from 'node:test';
import assert from 'node:assert/strict';
import {firstSmeltingGoal} from '../dist/progress-guide.js';
import {Technology} from '../dist/technology.js';

function startingState() {
  const game = {
    wood: 0, inventory: {clay: 0, ore: 0, ash: 0, charcoal: 0, ingot: 0, copperCutter: false},
    buildings: [], trees: [{kind: 'palm', state: 'standing'}], logs: [],
    player: {root: {position: {x: 0, z: 0}}},
  };
  const exploration = {holes: []};
  const technology = new Technology(game);
  const goal = () => firstSmeltingGoal(game, technology, exploration, {touch: true});
  return {game, technology, exploration, goal};
}

test('the next action follows the real first charcoal, excavation and smelting loop', () => {
  const {game, technology, exploration, goal} = startingState();
  assert.equal(goal().key, 'wood-na ohniště');
  assert.match(goal().action, /podrž sekeru/);
  game.wood = 5;
  assert.equal(goal().key, 'fire');
  const fire = {type: 'fire', x: 0, z: 0};
  game.buildings.push(fire);
  game.wood = 1;
  assert.equal(goal().key, 'wood-na uhlí');
  game.wood = 2;
  assert.equal(goal().key, 'charcoal');
  assert.match(goal().action, /Otevři Výrobu/);
  assert.equal(technology.start('charcoal', fire), true);
  assert.equal(goal().key, 'burning');
  assert.equal(technology.tick(6), true);
  assert.equal(goal().key, 'dig');
  assert.match(goal().stock, /Jíl 0\/3 · Ruda 0\/1 · jáma 0\/4/);
  exploration.holes.push({level: 50, pyramid: true}, {level: 2, pyramid: false});
  assert.match(goal().stock, /jáma 2\/4/);
  game.inventory.clay = 3;
  game.inventory.ore = 1;
  assert.equal(goal().key, 'wood-na pec');
  game.wood = 4;
  assert.equal(goal().key, 'furnace');
  game.wood = 0;
  game.inventory.clay = 0;
  game.inventory.ash = 0;
  const furnace = {type: 'furnace', x: 10, z: 10};
  game.buildings.push(furnace);
  assert.equal(goal().key, 'copper'); // a built furnace does not need more clay or ash
  assert.match(goal().action, /Přijdi k peci/);
  game.player.root.position.x = 10;
  game.player.root.position.z = 10;
  assert.match(goal().action, /Otevři Výrobu/);
  assert.equal(technology.start('copper', furnace), true);
  assert.equal(goal().key, 'smelting');
  technology.tick(8);
  assert.equal(goal().key, 'wood-na ponk');
  game.wood = 8;
  assert.equal(goal().key, 'bench');
  const bench = {type: 'workbench', x: 10, z: 10};
  game.buildings.push(bench);
  assert.equal(goal().key, 'cutter');
  assert.equal(technology.craftCutter(bench), true);
  assert.equal(goal().key, 'done');
});

test('restored or spent branches choose a usable instruction without claiming stale progress', () => {
  const {game, technology, exploration, goal} = startingState();
  game.buildings.push({type: 'furnace', x: 0, z: 0});
  game.inventory.ore = 1;
  game.inventory.ash = 0;
  assert.equal(goal().key, 'wood-na ohniště');
  game.buildings.push({type: 'fire', x: 0, z: 0});
  game.wood = 2;
  assert.equal(goal().key, 'charcoal');
  technology.job = {kind: 'charcoal', remaining: 2.3, building: game.buildings[1]};
  assert.match(goal().stock, /Zbývá 3 s/);
  technology.tick(2.3);
  assert.equal(goal().key, 'copper');
  game.inventory.ore = 0;
  exploration.holes.push({pyramid: false, level: 4});
  assert.equal(goal().key, 'dig');
  assert.match(goal().stock, /jáma 0\/3/); // a finished hole cannot yield that ore again
  exploration.holes.push({pyramid: false, level: 3});
  assert.match(goal().stock, /jáma 0\/3/); // its third layer already yielded ore
  exploration.holes.push({pyramid: false, level: 2});
  assert.match(goal().stock, /jáma 2\/3/);
  game.inventory.ore = 1;
  game.inventory.charcoal = 0;
  game.wood = 0;
  game.trees[0].state = 'gone';
  game.logs.push({});
  assert.equal(goal().key, 'wood-na uhlí');
  assert.match(goal().action, /Posbírej/);
  game.logs.length = 0;
  game.trees[0].state = 'falling';
  assert.match(goal().action, /Počkej na dopad palmy/);
  game.trees[0].state = 'gone';
  assert.match(goal().action, /není k dispozici/);
});

test('the guide directs a wood-starved island to renewable shore driftwood', () => {
  const {game, goal} = startingState();
  game.trees[0].state = 'gone';
  game.driftwood = {snapshot: () => ({available: true, remaining: 0})};
  assert.match(goal().action, /východním břehu/);
  game.driftwood.snapshot = () => ({available: false, remaining: 38.4});
  assert.match(goal().action, /39 s hraní/);
  assert.match(goal().help, /2 dřeva/);
});
