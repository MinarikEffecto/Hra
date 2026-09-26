import * as THREE from './vendor/three.module.js';
import {GROUND, ball} from './world.js?v=23';
import {STONE_PILES, STARTER_RECIPES, TOOL_LABELS} from './starter-tools.js';

const names = {stone: ['kámen', 'kameny'], wood: ['dřevo', 'dřeva'], leaves: ['list', 'listy'], ingot: ['ingot', 'ingoty'], rope: ['m lana', 'm lana']};
export function createStarterToolsUI(game, exploration, {toast, sound, hud}) {
  const tools = game.starterTools;
  const piles = STONE_PILES.map(({x, z}) => {
    const root = new THREE.Group();
    root.position.set(x, GROUND + .04, z);
    ball(root, -.12, .07, 0, .16, 0x809298, [1.1, .65, 1]);
    ball(root, .14, .06, .09, .13, 0xa9b9b3, [1, .65, 1.25]);
    const ring = new THREE.Mesh(new THREE.RingGeometry(.32, .37, 24), new THREE.MeshBasicMaterial({color: 0xd9f6f5, side: THREE.DoubleSide}));
    ring.rotation.x = -Math.PI / 2; root.add(ring); game.scene.add(root);
    return root;
  });
  const openButton = document.createElement('button');
  openButton.id = 'starterOpen'; openButton.type = 'button'; openButton.textContent = '⚒ Vyrobit nástroj';
  document.querySelector('.bagTitle').after(openButton);
  const panel = document.createElement('section');
  panel.id = 'starterPanel'; panel.className = 'techPanel'; panel.hidden = true;
  panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-modal', 'true'); panel.setAttribute('aria-labelledby', 'starterTitle');
  panel.innerHTML = `<div class="techCard"><div class="techHead"><div><small>OD KAMENE K NÁSTROJI</small><h2 id="starterTitle">Tvoje vybavení</h2></div><button id="starterClose" type="button" aria-label="Zavřít výrobu nástrojů">✕</button></div><p id="starterStock"></p><div id="starterRecipes"></div><p id="starterHint" role="status"></p></div>`;
  document.body.append(panel);
  const recipes = panel.querySelector('#starterRecipes');
  recipes.innerHTML = Object.entries(STARTER_RECIPES).map(([id, r]) => `<button type="button" data-starter="${id}"><strong>${r.label}</strong><small>${Object.entries(r.input).map(([key, amount]) => `${amount} ${names[key][amount === 1 ? 0 : 1]}`).join(' · ') || 'Sekáč + hotová násada + vazba'}</small><span>${r.hint}</span></button>`).join('');

  function refresh() {
    piles.forEach((root, i) => { root.visible = tools.state.piles[i] === 0; });
    panel.querySelector('#starterStock').textContent = `V ruce: ${TOOL_LABELS[exploration.tool]} · Kameny ${tools.count('stone')} · Dřevo ${game.wood} · Listy ${game.leaves} · Násada ${tools.state.handle ? 'hotová' : '—'} · Vazba ${tools.state.binding ? 'hotová' : '—'}`;
    for (const button of recipes.querySelectorAll('button')) {
      const id = button.dataset.starter, done = tools.done(id);
      button.disabled = !tools.canCraft(id);
      button.classList.toggle('starterDone', done);
      button.querySelector('strong').textContent = `${done ? '✓ ' : ''}${STARTER_RECIPES[id].label}`;
    }
  }
  function close() {
    panel.hidden = true; game.craftingOpen = false; document.body.classList.remove('crafting-open');
    document.getElementById('bagBtn').focus();
  }
  openButton.onclick = () => {
    document.getElementById('bagPanel').hidden = true;
    document.getElementById('bagBtn').setAttribute('aria-expanded', 'false');
    panel.hidden = false; game.craftingOpen = true; document.body.classList.add('crafting-open');
    panel.querySelector('#starterHint').textContent = 'Kameny seber přiblížením. Dřevo a listí najdeš také v naplaveninách na východním břehu.';
    refresh(); panel.querySelector('#starterClose').focus();
  };
  panel.querySelector('#starterClose').onclick = close;
  recipes.onclick = event => {
    const button = event.target.closest('[data-starter]');
    if (!button || button.disabled || !tools.craft(button.dataset.starter)) return;
    const kind = button.dataset.starter;
    exploration.refreshTools(['shovel', 'shotgun'].includes(kind) ? kind : undefined);
    hud(); sound('build');
    const label = `${STARTER_RECIPES[kind].label}: hotovo.`;
    panel.querySelector('#starterHint').textContent = label; toast(label); refresh();
  };
  addEventListener('keydown', event => { if (!panel.hidden && event.key === 'Escape') { event.preventDefault(); close(); } });
  let timer = 0;
  refresh();
  return {update(dt) { timer -= dt; if (timer <= 0) { timer = .2; refresh(); } }};
}
