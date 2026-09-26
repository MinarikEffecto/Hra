export const STONE_RESPAWN_SECONDS = 60;
export const STONE_PILES = Object.freeze([{x: -.4, z: 3.9}, {x: 2.4, z: 2.4}, {x: -1.5, z: -.4}]);
export const HAND_TOOLS = ['hands', 'flake', 'chopper', 'axe'];
export const TOOL_LABELS = {hands: 'Holé ruce', flake: 'Ostrý úštěp', chopper: 'Provizorní sekáč', axe: 'Sekera', shovel: 'Lopata', shotgun: 'Brokovnice'};
export const STARTER_RECIPES = Object.freeze({
  flake: {label: 'Ostrý úštěp', hint: 'Otloukáním dvou kamenů získáš ostří. Poseká keře.', input: {stone: 2}, stage: 0, next: 1},
  chopper: {label: 'Provizorní sekáč', hint: 'Úštěp a dřevěný úchop. Dokáže pokácet palmu.', input: {stone: 1, wood: 1}, stage: 1, next: 2},
  handle: {label: 'Opracovat násadu', hint: 'Připrav pevnější násadu pro sekeru.', input: {wood: 1}, stage: 2, part: 'handle'},
  binding: {label: 'Připravit vazbu', hint: 'Dva listy poslouží jako jednoduchá vazba násady.', input: {leaves: 2}, stage: 2, part: 'binding'},
  axe: {label: 'Sestavit sekeru', hint: 'Spoj sekáč, opracovanou násadu a vazbu. Kácení bude rychlejší.', input: {}, stage: 2, next: 3, parts: true},
  shovel: {label: 'Vyrobit lopatu', hint: 'Se sekerou opracuješ lopatu pro hledání jílu a rudy.', input: {wood: 2, stone: 1}, stage: 3, unlock: 'shovel'},
  shotgun: {label: 'Sestavit brokovnici', hint: 'Pokročilé herní vybavení. Vyžaduje ponk a vytavenou měď.', input: {wood: 2, ingot: 2, rope: 1}, stage: 3, unlock: 'shotgun', station: 'workbench'},
});

export function starterState(legacy = false) {
  return {stage: legacy ? 3 : 0, handle: false, binding: false, shovel: legacy, shotgun: legacy, piles: STONE_PILES.map(() => 0)};
}

export function validateStarterState(raw) {
  if (!raw || typeof raw !== 'object' || !Number.isInteger(raw.stage) || raw.stage < 0 || raw.stage > 3)
    throw Error('Neplatný postup prvních nástrojů');
  for (const key of ['handle', 'binding', 'shovel', 'shotgun']) if (typeof raw[key] !== 'boolean') throw Error('Neplatné vybavení');
  if ((raw.handle || raw.binding) && raw.stage !== 2) throw Error('Díly sekery neodpovídají postupu');
  if ((raw.shovel || raw.shotgun) && raw.stage !== 3) throw Error('Pokročilé vybavení vyžaduje sekeru');
  if (!Array.isArray(raw.piles) || raw.piles.length !== STONE_PILES.length ||
    raw.piles.some(n => !Number.isFinite(n) || n < 0 || n > STONE_RESPAWN_SECONDS)) throw Error('Neplatný stav kamenů');
  return {stage: raw.stage, handle: raw.handle, binding: raw.binding, shovel: raw.shovel, shotgun: raw.shotgun, piles: [...raw.piles]};
}

export function availableTools(state) {
  return [HAND_TOOLS[state.stage], ...(state.shovel ? ['shovel'] : []), ...(state.shotgun ? ['shotgun'] : [])];
}

export class StarterTools {
  constructor(game) { this.game = game; this.state = starterState(); }
  get tool() { return HAND_TOOLS[this.state.stage]; }
  get chopCooldown() { return this.state.stage === 2 ? 1.15 : this.state.stage === 1 ? .9 : .66; }
  canHarvest(tree) { return this.state.stage >= (tree.kind === 'bush' ? 1 : 2); }
  tools() { return availableTools(this.state); }
  snapshot() { return {...this.state, piles: [...this.state.piles]}; }
  restore(raw) { this.state = validateStarterState(raw); }

  count(key) {
    return key === 'wood' || key === 'leaves' ? this.game[key] : key === 'rope' ?
      this.game.inventory.ropes.reduce((n, rope) => n + rope.length, 0) : this.game.inventory[key] ?? 0;
  }

  done(kind) {
    const r = STARTER_RECIPES[kind], s = this.state;
    return !!r && (r.next ? s.stage >= r.next : r.part ? s.stage > 2 || s[r.part] : !!s[r.unlock]);
  }

  canCraft(kind) {
    if (!Object.hasOwn(STARTER_RECIPES, kind)) return false;
    const r = STARTER_RECIPES[kind], s = this.state, p = this.game.player.root.position;
    return s.stage === r.stage && !this.done(kind) && (!r.parts || s.handle && s.binding) &&
      (!r.station || this.game.buildings.some(b => b.type === r.station && Math.hypot(b.x - p.x, b.z - p.z) < 2)) &&
      Object.entries(r.input).every(([key, amount]) => this.count(key) >= amount);
  }

  craft(kind) {
    if (!this.canCraft(kind)) return false;
    const r = STARTER_RECIPES[kind];
    for (const [key, amount] of Object.entries(r.input)) {
      if (key === 'wood' || key === 'leaves') this.game[key] -= amount;
      else if (key === 'rope') {
        // One metre from the first piece, preserving the remaining length and quality.
        this.game.inventory.ropes[0].length -= amount;
        if (!this.game.inventory.ropes[0].length) this.game.inventory.ropes.shift();
      } else this.game.inventory[key] -= amount;
    }
    if (r.next) this.state.stage = r.next;
    if (r.part) this.state[r.part] = true;
    if (r.unlock) this.state[r.unlock] = true;
    if (r.parts) this.state.handle = this.state.binding = false;
    this.game.refreshTools?.(r.unlock || this.tool);
    this.game.event('starterCraft', kind);
    this.game.requestSave?.();
    return true;
  }

  tick(dt) {
    if (!Number.isFinite(dt) || dt <= 0) return;
    const p = this.game.player.root.position;
    for (const [i, point] of STONE_PILES.entries()) {
      this.state.piles[i] = Math.max(0, this.state.piles[i] - dt);
      if (this.state.piles[i] || Math.hypot(point.x - p.x, point.z - p.z) >= 1 || !this.game.grounded || this.game.swimming) continue;
      this.game.inventory.stone = (this.game.inventory.stone ?? 0) + 2;
      this.state.piles[i] = STONE_RESPAWN_SECONDS;
      this.game.event('stonePickup');
      this.game.requestSave?.();
    }
  }
}
