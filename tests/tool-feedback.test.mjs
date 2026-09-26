import test from 'node:test';
import assert from 'node:assert/strict';
import {toolFeedback} from '../dist/tool-feedback.js';

const palm = {state: 'standing', hp: 3};
const bush = {kind: 'bush', state: 'standing', hp: 1};

test('cutting prompts and markers respect the held tool and its reachable targets', () => {
  assert.equal(toolFeedback({tool: 'flake', target: palm}).highlight, false);
  for (const tool of ['flake', 'chopper', 'axe']) {
    const feedback = toolFeedback({tool, target: bush});
    assert.equal(feedback.highlight, true);
    assert.match(feedback.text, /F · posekat keř · 1\/2/);
  }
  for (const tool of ['chopper', 'axe']) {
    assert.equal(toolFeedback({tool, target: palm}).highlight, true);
    assert.equal(toolFeedback({tool, target: {...palm, state: 'falling'}}).highlight, false);
  }
  const touch = toolFeedback({tool: 'chopper', target: palm, mobile: true});
  assert.match(touch.text, /^Sekáč · Podrž akci · pokácet palmu · 3\/4$/);
});

test('hands, shovel and shotgun never suggest chopping a nearby palm', () => {
  const hands = toolFeedback({tool: 'hands', target: palm});
  assert.match(hands.text, /kameny/);
  assert.equal(hands.highlight, false);
  const shovel = toolFeedback({tool: 'shovel', target: palm, mobile: true});
  assert.match(shovel.text, /kopat/);
  assert.equal(shovel.highlight, false);
  assert.match(toolFeedback({tool: 'shovel', digAllowed: false}).text, /Tady kopat nelze/);
  assert.match(toolFeedback({tool: 'shotgun', target: palm}).text, /vystřelit/);
  assert.equal(toolFeedback({tool: 'shotgun', target: palm}).highlight, false);
});

test('crafting and building hide action prompts and harvest markers', () => {
  for (const tool of ['hands', 'flake', 'chopper', 'axe', 'shovel', 'shotgun']) {
    assert.deepEqual(toolFeedback({tool, target: palm, paused: true}), {text: '', highlight: false});
  }
});
