import * as THREE from './vendor/three.module.js';
import {GROUND} from './world.js?v=23';
import {PALM_GROWTH_SECONDS} from './palm-growth.js';

export function createPalmGrowthUI(game, growth, {toast, sound}) {
  const section = document.createElement('section');
  section.id = 'palmGrowth';
  section.setAttribute('aria-label', 'Obnova palem');
  section.innerHTML = '<strong>🌱 Obnova palem</strong><p id="palmGrowthInfo"></p><button id="plantPalmInBag" type="button">Zasadit kokos · 1 🥥</button>';
  document.getElementById('bagPanel').append(section);
  const info = section.querySelector('p');
  const bagButton = section.querySelector('button');
  const action = document.createElement('button');
  action.id = 'plantPalm';
  action.type = 'button';
  action.textContent = '🌱';
  document.querySelector('.survivalActions').append(action);

  const marker = new THREE.Mesh(new THREE.RingGeometry(.38, .44, 32),
    new THREE.MeshBasicMaterial({color: 0xa9ec70, transparent: true, opacity: .9, side: THREE.DoubleSide, depthWrite: false}));
  marker.rotation.x = -Math.PI / 2;
  game.scene.add(marker);
  let timer = 0;
  function blocked() {
    return game.craftingOpen || !document.getElementById('build').hidden || !document.getElementById('place').hidden;
  }
  function refresh() {
    const tree = growth.nearest(), reason = growth.reason(tree), entries = growth.snapshot();
    const label = reason || 'Zasadit kokos · 1 🥥';
    action.hidden = !tree || blocked();
    action.disabled = bagButton.disabled = !!reason || blocked();
    action.title = label;
    action.setAttribute('aria-label', label);
    info.textContent = (tree ? reason || `Zasaď 1 kokos u označeného pařezu. Palma doroste za ${PALM_GROWTH_SECONDS / 60} minuty hraní.` :
      `Přijdi s kokosem k pařezu a klepni na 🌱. Růst trvá ${PALM_GROWTH_SECONDS / 60} minuty hraní.`) +
      (entries.length ? ` Zasazeno: ${entries.length}. Nejbližší dozrání za ${Math.ceil(Math.min(...entries.map(p => p.remaining)))} s hraní.` : '');
    marker.visible = !!tree && !blocked();
    if (tree) {
      marker.position.set(tree.x, GROUND + .026, tree.z);
      marker.material.color.set(tree.state === 'growing' ? 0x8bdf62 : reason ? 0xffd387 : 0xa9ec70);
    }
  }
  function plant() {
    if (blocked()) return;
    const tree = growth.nearest();
    if (growth.plant(tree)) {
      sound('rustle');
      toast('Kokos zasazen. Palma doroste za 3 minuty hraní.');
    } else toast(growth.reason(tree));
    refresh();
  }
  action.onclick = bagButton.onclick = plant;
  refresh();
  return {refresh, update(dt) { timer -= dt; if (timer <= 0) { timer = .25; refresh(); } }};
}
