// The first metal tool guide is a view of the live game, never saved separately.
// Build and recipe costs come from the same definitions that gate the actions.
import {COSTS, FURNACE_COST} from './simulation.js';
import {TECH_RECIPES} from './technology.js';

function supply(game, key) {
  return key === 'wood' ? game.wood : game.inventory[key] ?? 0;
}

function near(game, type) {
  const p = game.player.root.position;
  return game.buildings.some(b => b.type === type && Math.hypot(b.x - p.x, b.z - p.z) < 2);
}

function woodGoal(game, amount, purpose, touch) {
  const trees = game.trees?.some(t => t.kind !== 'bush' && t.state === 'standing');
  const falling = game.trees?.some(t => t.state === 'falling');
  const logs = game.logs?.length > 0;
  const action = logs ? 'Posbírej ležící polena na ostrově.' :
    falling ? 'Počkej na dopad palmy a seber polena.' :
    trees ? `Pokácej palmu (${touch ? 'podrž sekeru' : 'F'}) a seber dřevo.` :
    'Další dřevo teď na ostrově není k dispozici.';
  return {key: `wood-${purpose}`, action, stock: `Dřevo ${game.wood}/${amount} · ${purpose}`,
    help: logs ? 'Přibliž se k ležícím polenům.' :
      falling ? 'Padající palma nejprve musí dopadnout. Pak se k polenům přibliž.' :
      trees ? 'Přijdi k palmě se sekerou. Polena seber přiblížením.' :
      'S dostupnými zásobami tento postup zatím nejde dokončit.'};
}

function digGoal(game, exploration, needClay) {
  const clay = supply(game, 'clay'), ore = supply(game, 'ore');
  const target = needClay && clay < FURNACE_COST.clay ? 4 : 3;
  // A third layer has already paid its only ore; it cannot satisfy a missing ore.
  const limit = ore < TECH_RECIPES.copper.input.ore ? 3 : 4;
  const holes = exploration.holes.filter(h => !h.pyramid && h.level < limit);
  const layer = Math.max(0, ...holes.map(h => h.level));
  return {key: 'dig', action: `Kopej lopatou mimo pyramidu do ${target}. vrstvy.`,
    stock: `${needClay ? `Jíl ${clay}/${FURNACE_COST.clay} · ` : ''}Ruda ${ore}/${TECH_RECIPES.copper.input.ore} · jáma ${layer}/${target}`,
    help: 'Lopatu přepneš tlačítkem s nástrojem nebo Q. Běžná jáma dává jíl v 1., 2. a 4. vrstvě, rudu ve 3. vrstvě. Jsou-li potřebné vrstvy vyčerpané, začni další jámu.'};
}

/** Pick one actionable instruction from the current state, including restored jobs. */
export function firstSmeltingGoal(game, technology, exploration, {touch = false} = {}) {
  const inv = game.inventory;
  const has = type => game.buildings.some(b => b.type === type);
  const furnace = has('furnace');
  const job = technology.job;
  if (inv.copperCutter) return {key: 'done', action: 'Měděný řezák je hotový.',
    stock: 'První tavicí postup dokončen', help: 'Řezák zlepšuje řezání listů a lián u ponku.'};

  if (inv.ingot >= 1) {
    if (!has('workbench')) {
      if (game.wood < COSTS.workbench) return woodGoal(game, COSTS.workbench, 'na ponk', touch);
      return {key: 'bench', action: 'Otevři stavby ⚒ a umísti pracovní ponk.',
        stock: `Dřevo ${game.wood}/${COSTS.workbench} · ingot ${inv.ingot}/1`,
        help: 'Ponk umísti na volné místo. Stojí 8 dřev.'};
    }
    return {key: 'cutter', action: near(game, 'workbench') ?
      'Otevři Výrobu u ponku a vyrob řezák.' : 'Přijdi k ponku a vyrob řezák.',
      stock: `Ingot ${inv.ingot}/1 · ponk hotový`,
      help: 'U ponku klepni na Výrobu, pak na Měděný řezák. Spotřebuje 1 ingot.'};
  }
  if (job?.kind === 'copper') return {key: 'smelting', action: 'Měď se taví v peci.',
    stock: `Zbývá ${Math.ceil(job.remaining)} s · ruda a uhlí už jsou vložené`,
    help: 'Výroba pokračuje při hraní. Po dokončení přibude ingot do batohu.'};

  const needsCharcoal = inv.charcoal < TECH_RECIPES.copper.input.charcoal ||
    (!furnace && inv.ash < FURNACE_COST.ash);
  if (needsCharcoal) {
    if (job?.kind === 'charcoal') return {key: 'burning', action: 'Dřevo se pálí v ohništi.',
      stock: `Zbývá ${Math.ceil(job.remaining)} s · uhlí a popel po dokončení`,
      help: 'Výroba pokračuje při hraní. Suroviny už byly odečtené.'};
    if (!has('fire')) {
      if (game.wood < COSTS.fire) return woodGoal(game, COSTS.fire, 'na ohniště', touch);
      return {key: 'fire', action: 'Otevři stavby ⚒ a umísti ohniště.',
        stock: `Dřevo ${game.wood}/${COSTS.fire}`, help: 'Ohniště stojí 5 dřev. Umísti ho na volné místo.'};
    }
    if (game.wood < TECH_RECIPES.charcoal.input.wood)
      return woodGoal(game, TECH_RECIPES.charcoal.input.wood, 'na uhlí', touch);
    return {key: 'charcoal', action: near(game, 'fire') ?
      'Otevři Výrobu u ohniště a vypal uhlí.' : 'Přijdi k ohništi a vypal uhlí.',
      stock: `Dřevo ${game.wood}/${TECH_RECIPES.charcoal.input.wood} · uhlí ${inv.charcoal}/1 · popel ${inv.ash}/1`,
      help: 'Ve Výrobě spusť Vypálit uhlí a popel. Trvá 6 sekund a spotřebuje 2 dřeva.'};
  }

  if (inv.ore < TECH_RECIPES.copper.input.ore || (!furnace && inv.clay < FURNACE_COST.clay))
    return digGoal(game, exploration, !furnace);
  if (!furnace) {
    if (game.wood < COSTS.furnace) return woodGoal(game, COSTS.furnace, 'na pec', touch);
    return {key: 'furnace', action: 'Otevři stavby ⚒ a umísti pec.',
      stock: `Dřevo ${game.wood}/${COSTS.furnace} · jíl ${inv.clay}/${FURNACE_COST.clay} · popel ${inv.ash}/${FURNACE_COST.ash}`,
      help: 'Pec stojí 4 dřeva, 3 jíly a 1 popel. Umísti ji na volné místo.'};
  }
  if (job) return {key: 'busy', action: 'Počkej na dokončení probíhající výroby.',
    stock: `Zbývá ${Math.ceil(job.remaining)} s`, help: 'Ve stanici může běžet vždy jen jedna výroba.'};
  return {key: 'copper', action: near(game, 'furnace') ?
    'Otevři Výrobu u pece a vytav měď.' : 'Přijdi k peci a vytav měď.',
    stock: `Ruda ${inv.ore}/${TECH_RECIPES.copper.input.ore} · uhlí ${inv.charcoal}/${TECH_RECIPES.copper.input.charcoal}`,
    help: 'Ve Výrobě spusť Vytavit měď. Trvá 8 sekund a spotřebuje 1 rudu a 1 uhlí.'};
}

export function createProgressGuide(game, technology, exploration, options) {
  const guide = document.getElementById('progressGuide');
  const action = document.getElementById('guideAction');
  const stock = document.getElementById('guideStock');
  const help = document.getElementById('guideHelp');
  let timer = 0;
  function refresh() {
    const goal = firstSmeltingGoal(game, technology, exploration, options);
    if (action.textContent !== goal.action) action.textContent = goal.action;
    if (stock.textContent !== goal.stock) stock.textContent = goal.stock;
    if (help.textContent !== goal.help) help.textContent = goal.help;
    guide.classList.toggle('guideDone', goal.key === 'done');
  }
  refresh();
  return {refresh, update(dt) { timer -= dt; if (timer <= 0) { timer = .3; refresh(); } }};
}
