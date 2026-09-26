// One active station job at a time. Inputs leave the inventory when a job starts;
// the output is granted once when the remaining play time reaches zero.
export const TECH_RECIPES = Object.freeze({
  charcoal: {station: 'fire', seconds: 6, input: {wood: 2}, output: {charcoal: 1, ash: 1}},
  copper: {station: 'furnace', seconds: 8, input: {ore: 1, charcoal: 1}, output: {ingot: 1}},
});

export function excavationYield(level, pyramid = false) {
  if (pyramid) return null;
  return level === 3 ? 'ore' : [1, 2, 4].includes(level) ? 'clay' : null;
}

export class Technology {
  constructor(game, onChange = () => {}) {
    this.game = game;
    this.onChange = onChange;
    this.job = null;
  }

  canStart(kind, building) {
    const recipe = TECH_RECIPES[kind];
    return !!recipe && !this.job && this.game.buildings.includes(building) &&
      building.type === recipe.station && Object.entries(recipe.input).every(([key, amount]) =>
        (key === 'wood' ? this.game.wood : this.game.inventory[key]) >= amount);
  }

  start(kind, building) {
    if (!this.canStart(kind, building)) return false;
    const recipe = TECH_RECIPES[kind];
    for (const [key, amount] of Object.entries(recipe.input)) {
      if (key === 'wood') this.game.wood -= amount;
      else this.game.inventory[key] -= amount;
    }
    this.job = {kind, building, remaining: recipe.seconds};
    this.onChange('start', kind);
    return true;
  }

  tick(dt) {
    if (!this.job || !Number.isFinite(dt) || dt <= 0) return false;
    this.job.remaining = Math.max(0, this.job.remaining - dt);
    if (this.job.remaining > 0) return false;
    const {kind} = this.job;
    this.job = null; // clear first, so a callback/save cannot collect twice
    for (const [key, amount] of Object.entries(TECH_RECIPES[kind].output)) this.game.inventory[key] += amount;
    this.onChange('complete', kind);
    return true;
  }

  craftCutter(building) {
    if (!this.game.buildings.includes(building) || building.type !== 'workbench' ||
        this.game.inventory.copperCutter || this.game.inventory.ingot < 1) return false;
    this.game.inventory.ingot--;
    this.game.inventory.copperCutter = true;
    this.onChange('cutter', 'copperCutter');
    return true;
  }
}
