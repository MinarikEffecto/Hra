import test from 'node:test';
import assert from 'node:assert/strict';
import {createFiberCrafting} from '../dist/fiber-crafting.js';

function workshopFixture(canvasWidth, canvasHeight) {
  const nodes = new Map();
  const handlers = new Map();
  const globalHandlers = new Map();
  const context = new Proxy({createLinearGradient: () => ({addColorStop() {}})}, {
    get(target, key) { return key in target ? target[key] : () => {}; },
    set(target, key, value) { target[key] = value; return true; },
  });
  function node(id) {
    if (!nodes.has(id)) nodes.set(id, {
      id, hidden: false, disabled: false, textContent: '', dataset: {},
      addEventListener(name, fn) { handlers.set(`${id}:${name}`, fn); },
      dispatch(name, event) { handlers.get(`${id}:${name}`)?.(event); },
      setPointerCapture() {}, focus() {},
    });
    return nodes.get(id);
  }
  for (const id of ['fiberWorkshop','fiberCanvas','fiberChoices','fiberTitle','fiberInstruction',
    'fiberStatus','fiberReset','fiberNext','fiberClose','fiberLeafCount','fiberVineCount',
    'fiberStripCount','fiberRopeCount']) node(id);
  const canvas = node('fiberCanvas');
  canvas.getContext = () => context;
  canvas.getBoundingClientRect = () => ({left: 0, top: 0, width: canvasWidth, height: canvasHeight});
  const choices = node('fiberChoices');
  const actions = Object.fromEntries(['leaf','vine','braid','join'].map(action => [action, {
    disabled: false, dataset: {fiberAction: action}, closest: () => actions[action],
  }]));
  choices.querySelector = selector => actions[selector.match(/"(.*?)"/)[1]];
  globalThis.document = {getElementById: node, body: {classList: {add() {}, remove() {}}}};
  globalThis.devicePixelRatio = 2;
  globalThis.requestAnimationFrame = fn => fn();
  globalThis.addEventListener = (name, fn) => globalHandlers.set(name, fn);
  const game = {leaves: 2, inventory: {vine: 2, strips: [], ropes: []}, craftingOpen: false};
  let changed = 0;
  const workshop = createFiberCrafting(game, {canCraft: () => true, onInventoryChange: () => changed++});
  function select(action, pointerType = 'touch') {
    assert.equal(choices.hidden, false);
    const event = {pointerType, target: actions[action], preventDefault() {}};
    choices.dispatch(pointerType === 'mouse' ? 'click' : 'pointerup', event);
  }
  let pointerId = 0;
  function drag(from, to, steps = 10) {
    const id = ++pointerId;
    const event = p => ({pointerId: id, clientX: p.x, clientY: p.y, preventDefault() {}});
    canvas.dispatch('pointerdown', event(from));
    for (let i = 1; i <= steps; i++) canvas.dispatch('pointermove', event({x: from.x + (to.x-from.x)*i/steps, y: from.y + (to.y-from.y)*i/steps}));
    canvas.dispatch('pointerup', event(to));
  }
  function cut() {
    drag({x: canvasWidth*.1, y: canvasHeight*.43}, {x: canvasWidth*.9, y: canvasHeight*.43});
    drag({x: canvasWidth*.1, y: canvasHeight*.57}, {x: canvasWidth*.9, y: canvasHeight*.57});
  }
  function braid() {
    for (let i = 0; i < 6; i++) drag({x: canvasWidth*(i%2 ? .73 : .27), y: canvasHeight*.8}, {x: canvasWidth*.5, y: canvasHeight*.8});
  }
  return {nodes, canvas, choices, game, workshop, select, drag, cut, braid,
    resize(width, height) { canvasWidth = width; canvasHeight = height; globalHandlers.get('resize')?.(); },
    get changed() { return changed; }};
}

for (const [label, width, height] of [['mobile portrait', 350, 480], ['mobile landscape', 500, 300], ['desktop', 800, 500]]) {
  test(`workbench pointer flow at ${label}: cancel, cut, braid and join preserve inventory`, () => {
    const f = workshopFixture(width, height);
    assert.equal(f.workshop.open('bench'), true);
    f.select('leaf', label === 'desktop' ? 'mouse' : 'touch');
    f.drag({x: width*.1, y: height*.43}, {x: width*.9, y: height*.43});
    f.workshop.close();
    assert.equal(f.game.leaves, 2, 'unfinished work never spends material');
    assert.equal(f.game.inventory.strips.length, 0);

    f.workshop.open('bench'); f.select('leaf'); f.cut();
    assert.equal(f.game.leaves, 1);
    assert.equal(f.game.inventory.strips.length, 3);
    f.nodes.get('fiberNext').onclick(); f.braid();
    assert.equal(f.game.inventory.strips.length, 0);
    assert.deepEqual(f.game.inventory.ropes.map(r => r.length), [1]);
    assert(f.game.inventory.ropes[0].quality > 60);

    f.workshop.close(); f.workshop.open('bench'); f.select('vine'); f.cut();
    assert.equal(f.game.inventory.vine, 1);
    f.nodes.get('fiberNext').onclick(); f.braid();
    assert.equal(f.game.inventory.ropes.length, 2);
    f.nodes.get('fiberNext').onclick();
    f.drag({x: width*.42, y: height*.5}, {x: width*.5, y: height*.5});
    f.drag({x: width*.58, y: height*.5}, {x: width*.5, y: height*.5});
    assert.deepEqual(f.game.inventory.ropes.map(r => r.length), [2]);
    assert(f.game.inventory.ropes[0].quality > 50);
    assert(f.changed >= 5);
  });
}

test('an off-material cut is rejected and orientation change keeps valid partial work', () => {
  let width = 350, height = 480;
  const f = workshopFixture(width, height);
  f.workshop.open('bench'); f.select('leaf');
  f.drag({x: 30, y: 12}, {x: 310, y: 12});
  assert.equal(f.nodes.get('fiberStatus').textContent, 'Řez musí vést plynule téměř přes celou délku.');
  f.drag({x: 35, y: height*.43}, {x: 315, y: height*.43});
  assert.match(f.nodes.get('fiberStatus').textContent, /Řezy 1 \/ 2/);
  f.resize(500, 300);
  assert.equal(f.canvas.width, 1000);
  assert.match(f.nodes.get('fiberStatus').textContent, /Řezy 1 \/ 2 · po otočení/);
  f.drag({x: 50, y: 300*.57}, {x: 450, y: 300*.57});
  assert.equal(f.game.leaves, 1, 'second cut after resize completes the material');
  assert.equal(f.game.inventory.strips.length, 3);
  f.workshop.close();
  assert.equal(f.game.leaves, 1);
});

test('a perfect cut and braid keep strand and rope quality within the saved range', () => {
  const previousRandom = Math.random;
  Math.random = () => .9999;
  try {
    const f = workshopFixture(350, 480);
    f.workshop.open('bench'); f.select('leaf'); f.cut();
    assert(f.game.inventory.strips.every(q => q >= 0 && q <= 100));
    f.nodes.get('fiberNext').onclick(); f.braid();
    assert(f.game.inventory.ropes[0].quality <= 100);
  } finally { Math.random = previousRandom; }
});

test('the copper cutter makes an extra strip per leaf, which remains after braiding', () => {
  const f = workshopFixture(350, 480);
  f.game.inventory.copperCutter = true;
  f.workshop.open('bench'); f.select('leaf'); f.cut();
  assert.equal(f.game.inventory.strips.length, 4);
  assert.equal(f.game.leaves, 1);
  f.nodes.get('fiberNext').onclick(); f.braid();
  assert.equal(f.game.inventory.strips.length, 1);
  assert.equal(f.game.inventory.ropes.length, 1);
});

test('the first mouse selection works immediately after a fast page load', () => {
  const originalPerformance = globalThis.performance;
  globalThis.performance = {now: () => 100};
  try {
    const f = workshopFixture(800, 500);
    f.workshop.open('bench');
    f.select('leaf', 'mouse');
    assert.equal(f.canvas.hidden, false, 'a mouse click with no preceding touch must select material');
    f.cut();
    assert.equal(f.game.leaves, 1);
    assert.equal(f.game.inventory.strips.length, 3);
    f.workshop.close(); f.workshop.open('bench'); f.select('vine', 'mouse');
    assert.equal(f.canvas.hidden, false, 'two mouse clicks must not suppress each other');
    f.cut(); assert.equal(f.game.inventory.vine, 1);
  } finally {
    globalThis.performance = originalPerformance;
  }
});

test('touch actions advance after cutting without waiting for a synthesized click', () => {
  const f = workshopFixture(366, 270);
  const tap = id => f.nodes.get(id).dispatch('pointerup', {pointerType: 'touch', preventDefault() {}});
  f.workshop.open('bench'); f.select('leaf'); f.cut();
  tap('fiberNext'); f.braid();
  assert.equal(f.game.inventory.ropes.length, 1);
  let stopped = false;
  f.nodes.get('fiberNext').dispatch('click', {preventDefault() {}, stopImmediatePropagation() { stopped = true; }});
  assert.equal(stopped, true, 'the compatibility click cannot also close the just-finished stage');
  tap('fiberClose');
  assert.equal(f.workshop.isOpen, false);
});
