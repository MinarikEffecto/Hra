import * as THREE from './vendor/three.module.js';
import {box, ball} from './world.js?v=23';
import {BUNKER_SITE} from './buried-cache.js';

export function createBuriedCacheUI(game, {toast, sound, hud}) {
  const cache = game.buriedCache, $ = id => document.getElementById(id);
  const root = new THREE.Group(); game.scene.add(root);
  const clue = box(root, 0, .025, 0, .38, .045, .24, 0x946b4c); clue.rotation.y = .35;
  const hatch = new THREE.Group(); root.add(hatch);
  box(hatch, 0, .04, 0, 1.05, .09, 1.05, 0x526262);
  box(hatch, 0, .095, 0, .7, .025, .055, 0xcaa158);
  for (const x of [-.4, .4]) for (const z of [-.4, .4]) ball(hatch, x, .105, z, .045, 0xb6b8a2);
  const handle = box(hatch, 0, .14, .27, .25, .08, .055, 0xc0b598);
  const open = document.createElement('button'); open.id = 'bunkerOpen'; open.type = 'button'; open.hidden = true;
  $('bagContents').before(open);
  const panel = document.createElement('section'); panel.id = 'bunkerPanel'; panel.className = 'techPanel'; panel.hidden = true;
  panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-modal', 'true'); panel.setAttribute('aria-labelledby', 'bunkerTitle');
  panel.innerHTML = `<div class="techCard"><div class="techHead"><div><small>NÁLEZ NA OSTROVĚ</small><h2 id="bunkerTitle">Záhada v písku</h2></div><button id="bunkerClose" type="button" aria-label="Zavřít nález">✕</button></div><div id="bunkerDrawing" aria-hidden="true">K–03</div><p id="bunkerStory"></p><p id="bunkerNeeds" role="status"></p><button id="bunkerRecover" type="button">Upevnit lano a vyzvednout zásoby</button></div>`;
  document.body.append(panel);
  function refresh() {
    const revealed = cache.revealed;
    root.position.set(BUNKER_SITE.x, game.terrain.heightAt(BUNKER_SITE.x, BUNKER_SITE.z) + .02, BUNKER_SITE.z);
    clue.visible = !revealed; hatch.visible = revealed;
    handle.material.color.set(cache.claimed ? 0x79b68a : 0xc0b598);
    open.hidden = !cache.near && !revealed;
    open.textContent = cache.claimed ? 'K–03 · zásoby vyzvednuté' : revealed ? 'Prozkoumat odkrytý poklop K–03' : 'Prohlédnout rezavý plech';
    $('bunkerTitle').textContent = revealed ? 'Zásobovací šachta K–03' : 'Záhada v písku';
    $('bunkerDrawing').classList.toggle('cacheClaimed', cache.claimed);
    $('bunkerStory').textContent = !revealed ? 'Z písku vykukuje roh rezavého plechu. Pod ním může být něco většího. Postav se poblíž, zamiř lopatou na plech a kopej do čtvrté vrstvy.' :
      cache.claimed ? 'Bedna je prázdná. Na štítku stálo „Pobřežní stanice K–03“. Za šachtou pokračují zamčené dveře. Zatím jsi prozkoumal jen zásobovací skrýš.' :
      'Pod pískem je starý vojenský poklop. Za poškozeným zámkem leží bedna s měděnou rudou a zásobami jídla. Řezák uvolní zámek; spojeným lanem vytáhneš bednu.';
    $('bunkerNeeds').textContent = cache.claimed ? 'Získáno jednou: 3 měděné rudy + 2 porce jídla. Dva metry lana zůstaly upevněné v šachtě.' :
      !revealed ? 'Vezmi lopatu. Nález zůstane odkrytý i po načtení hry.' :
      `${cache.near ? 'Jsi u poklopu' : 'Vrať se k poklopu'} · Řezák ${game.inventory.copperCutter ? 'hotový' : 'chybí'} · Jeden kus lana alespoň 2 m ${cache.ropeIndex >= 0 ? 'připravený' : 'chybí'}. Spotřeba: 2 m lana; řezák zůstane.`;
    $('bunkerRecover').hidden = !revealed || cache.claimed;
    $('bunkerRecover').disabled = !cache.canRecover;
  }
  function close() { panel.hidden = true; game.craftingOpen = false; document.body.classList.remove('crafting-open'); $('bagBtn').focus(); }
  open.onclick = () => {
    if (game.swing || game.pendingHit || game.cooldown) { toast('Nejprve dokonči pohyb nástroje.'); return; }
    $('bagPanel').hidden = true; $('bagBtn').setAttribute('aria-expanded', 'false'); panel.hidden = false; game.craftingOpen = true; document.body.classList.add('crafting-open'); refresh(); $('bunkerClose').focus();
  };
  $('bunkerClose').onclick = close;
  $('bunkerRecover').onclick = () => { if (cache.recover()) { hud(); sound('pickup'); toast('K–03: získal jsi 3 rudy a 2 porce jídla.'); refresh(); } };
  addEventListener('keydown', e => { if (!panel.hidden && e.key === 'Escape') { e.preventDefault(); close(); } });
  let known = cache.revealed, noticed = false, timer = 0;
  refresh();
  return {update(dt) {
    timer -= dt; if (timer > 0) return; timer = .25;
    if (cache.revealed && !known) { known = true; toast('Pod pískem je poklop K–03! Prozkoumej nález v batohu.'); sound('build'); }
    else if (cache.near && !noticed && !known) { noticed = true; toast('V písku je rezavý plech. Prohlédni nález v batohu.'); }
    refresh();
  }};
}
