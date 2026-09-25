export function createTechnologyUI(game, technology, {toast, sound, hud}) {
  const $ = id => document.getElementById(id);
  $('interact').insertAdjacentHTML('afterend', '<button id="techOpen" type="button" hidden aria-label="Otevřít výrobu u ohniště, pece nebo ponku">⚒ Výroba</button>');
  document.body.insertAdjacentHTML('beforeend', `<section id="techPanel" class="techPanel" hidden role="dialog" aria-modal="true" aria-labelledby="techTitle">
    <div class="techCard"><div class="techHead"><div><small>TÁBOROVÉ ŘEMESLO</small><h2 id="techTitle">Uhlí a měď</h2></div><button id="techClose" type="button" aria-label="Zavřít výrobu">✕</button></div>
    <p>U obyčejné díry najdeš jíl v 1., 2. a 4. vrstvě, měděnou rudu ve 3. vrstvě. Hotový řezák dává čtyři prameny z listu nebo liány místo tří.</p>
    <div id="techProgress" role="status" aria-live="polite"></div>
    <div class="techActions"><button type="button" data-tech="charcoal"><strong>⚫ Vypálit uhlí a popel</strong><small>Ohniště · 2 🪵 · 6 s → 1 uhlí + 1 popel</small></button>
      <button type="button" data-tech="copper"><strong>🟠 Vytavit měď</strong><small>Pec · 1 ruda + 1 uhlí · 8 s → 1 ingot</small></button>
      <button type="button" data-tech="cutter"><strong>✂️ Měděný řezák</strong><small>Ponk · 1 ingot → trvalý nástroj pro vlákna</small></button></div>
    <p id="techStock" class="techStock"></p></div></section>`);
  const panel = $('techPanel'), openButton = $('techOpen');
  const near = type => game.buildings.find(b => b.type === type &&
    Math.hypot(b.x - game.player.root.position.x, b.z - game.player.root.position.z) < 2);
  function refresh() {
    openButton.hidden = !technology.job && !['fire', 'furnace', 'workbench'].some(near);
    const job = technology.job;
    openButton.textContent = job ? `⏳ ${Math.ceil(job.remaining)} s · Výroba` : '⚒ Výroba';
    $('techProgress').textContent = job ?
      `${job.kind === 'charcoal' ? 'Dřevo se pálí' : 'Měď se taví'} · zbývá ${Math.ceil(job.remaining)} s. Můžeš odejít; výroba pokračuje při hraní.` :
      'Žádná výroba neprobíhá. Suroviny se spotřebují až při spuštění.';
    const inv = game.inventory;
    $('techStock').textContent = `Zásoby: 🪵 ${game.wood} · 🟫 ${inv.clay} · 🪨 ${inv.ore} · ⚫ ${inv.charcoal} · ⬜ ${inv.ash} · 🟠 ${inv.ingot}`;
    panel.querySelector('[data-tech="charcoal"]').disabled = !near('fire') || !technology.canStart('charcoal', near('fire'));
    panel.querySelector('[data-tech="copper"]').disabled = !near('furnace') || !technology.canStart('copper', near('furnace'));
    panel.querySelector('[data-tech="cutter"]').disabled = !near('workbench') || inv.copperCutter || inv.ingot < 1;
  }
  function close() { panel.hidden = true; game.craftingOpen = false; document.body.classList.remove('crafting-open'); refresh(); openButton.focus(); }
  function open() {
    if (openButton.hidden) return;
    $('bagPanel').hidden = true; $('bagBtn').setAttribute('aria-expanded', 'false');
    panel.hidden = false; game.craftingOpen = true; document.body.classList.add('crafting-open');
    refresh(); $('techClose').focus();
  }
  openButton.onclick = open;
  $('techClose').onclick = close;
  panel.querySelector('.techActions').onclick = event => {
    const button = event.target.closest('[data-tech]');
    if (!button || button.disabled) return;
    const kind = button.dataset.tech;
    const success = kind === 'cutter' ? technology.craftCutter(near('workbench')) :
      technology.start(kind, near(kind === 'charcoal' ? 'fire' : 'furnace'));
    if (success) {
      sound('build'); hud();
      toast(kind === 'cutter' ? 'Měděný řezák je hotový. Z jednoho listu nyní získáš čtyři prameny.' :
        kind === 'charcoal' ? 'Dřevo se pálí na uhlí a popel.' : 'Měděná ruda se taví.');
    }
    refresh();
  };
  addEventListener('keydown', event => { if (!panel.hidden && event.key === 'Escape') { event.preventDefault(); close(); } });
  let uiTick = 0;
  return {refresh, update(dt) { uiTick -= dt; if (uiTick <= 0) { uiTick = .2; refresh(); } }};
}
