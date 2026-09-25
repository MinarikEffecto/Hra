import test from 'node:test';
import assert from 'node:assert/strict';
import {createFiberCrafting} from '../dist/fiber-crafting.js';

function workshopFixture(canvasWidth, canvasHeight) {
  const nodes = new Map();
  const handlers = new Map();
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
  globalThis.addEventListener = () => {};
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
  return {nodes, canvas, choices, game, workshop, select, drag, cut, braid, get changed() { return changed; }};
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
  f.workshop.close();
  assert.equal(f.game.leaves, 2);
});
