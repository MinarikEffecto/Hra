export const BUNKER_SITE = Object.freeze({x: -.7, z: -1.7});
export const BUNKER_DEPTH = 4;
export const BUNKER_REWARD = Object.freeze({ore: 3, cooked: 2});

export function bunkerHole(holes) {
  return holes.find(h => !h.pyramid && h.level >= BUNKER_DEPTH &&
    Math.hypot(h.x - BUNKER_SITE.x, h.z - BUNKER_SITE.z) <= .8);
}

// A camp already built over this place has exposed its foundation. This also
// keeps old saves with a building here playable without moving their buildings.
export function bunkerExposed(holes, buildings = []) {
  return !!bunkerHole(holes) || buildings.some(b => Math.hypot(b.x - BUNKER_SITE.x, b.z - BUNKER_SITE.z) < 1.15);
}

export function validateBunker(raw, holes, buildings = []) {
  if (!raw || typeof raw !== 'object' || typeof raw.claimed !== 'boolean') throw Error('Neplatný stav skrýše');
  if (raw.claimed && !bunkerExposed(holes, buildings)) throw Error('Skrýš ještě nebyla odkryta');
  return {claimed: raw.claimed};
}

export class BuriedCache {
  constructor(game, exploration) { this.game = game; this.exploration = exploration; this.claimed = false; }
  get revealed() { return bunkerExposed(this.exploration.holes, this.game.buildings); }
  get near() {
    const p = this.game.player.root.position;
    return Math.hypot(p.x - BUNKER_SITE.x, p.z - BUNKER_SITE.z) < 2;
  }
  get ropeIndex() { return this.game.inventory.ropes.findIndex(r => r.length >= 2); }
  get recoveryReason() {
    if (this.claimed) return 'Zásoby už jsou vyzvednuté.';
    if (!this.revealed) return 'Nejprve odkryj poklop.';
    if (!this.near) return 'Vrať se k poklopu.';
    if (!this.game.grounded || this.game.swimming) return 'Postav se na suché místo u poklopu.';
    if (this.game.swing || this.game.pendingHit || this.game.cooldown) return 'Nejprve dokonči pohyb nástroje.';
    if (!this.game.inventory.copperCutter) return 'U ponku vyrob měděný řezák.';
    if (this.ropeIndex < 0) return 'V dílně spoj lano do jednoho kusu dlouhého alespoň 2 m.';
    if (Object.entries(BUNKER_REWARD).some(([key, n]) => (this.game.inventory[key] ?? 0) + n > 1e6))
      return 'Nejprve spotřebuj část rudy nebo jídla; zásoby se už nevejdou.';
    return '';
  }
  get canRecover() { return !this.recoveryReason; }
  recover() {
    if (!this.canRecover) return false;
    const index = this.ropeIndex, rope = this.game.inventory.ropes[index];
    rope.length -= 2;
    if (rope.length === 0) this.game.inventory.ropes.splice(index, 1);
    this.claimed = true;
    for (const [key, n] of Object.entries(BUNKER_REWARD)) this.game.inventory[key] = (this.game.inventory[key] ?? 0) + n;
    this.game.requestSave?.();
    return true;
  }
  snapshot() { return {claimed: this.claimed}; }
  restore(raw) { this.claimed = validateBunker(raw, this.exploration.holes, this.game.buildings).claimed; }
}
