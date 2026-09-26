import {GROUND, palm, rod} from './world.js?v=23';
import RAPIER from './vendor/rapier.es.js';

export const PALM_GROWTH_SECONDS = 180;
export const PLANTING_REACH = 1.8;

export function holeRadius(level) { return .56 + .27 * Math.sqrt(Math.max(1, level)); }

export function isPlantingSiteClear(tree, buildings, holes) {
  return !buildings.some(b => Math.hypot(b.x - tree.x, b.z - tree.z) < (['workbench', 'furnace'].includes(b.type) ? 1.4 : 1.9)) &&
    !holes.some(h => Math.hypot(h.x - tree.x, h.z - tree.z) < holeRadius(h.level) + .6);
}

// Reuse the original palm slots: their order and saved world signature never change.
export class PalmGrowth {
  constructor(game, exploration) {
    this.game = game;
    this.exploration = exploration;
    this.plantings = new Map();
  }

  nearest() {
    const p = this.game.player.root.position;
    let result = null, distance = PLANTING_REACH;
    for (const tree of this.game.trees) {
      if (tree.state !== 'gone' && tree.state !== 'growing') continue;
      const d = Math.hypot(tree.x - p.x, tree.z - p.z);
      if (d < distance) { result = tree; distance = d; }
    }
    return result;
  }

  reason(tree) {
    const {game} = this, p = game.player.root.position;
    if (!game.trees.includes(tree) || Math.hypot(tree.x - p.x, tree.z - p.z) >= PLANTING_REACH)
      return 'Přijdi k pařezu pokácené palmy.';
    if (tree.state === 'growing') return this.remaining(tree) > 0 ?
      `Palma roste. Zbývá ${Math.ceil(this.remaining(tree))} s hraní.` : 'Palma dorostla. Ustup kousek od kmene.';
    if (tree.state !== 'gone') return 'Nejprve nech pokácenou palmu dopadnout.';
    if (game.swing > 0 || game.cooldown > 0) return 'Nejprve dokonči práci s nástrojem.';
    if (!game.grounded || game.swimming || !isPlantingSiteClear(tree, game.buildings, this.exploration.holes))
      return 'Tady nelze sázet. Vyber pařez na volné, suché zemi bez výkopu.';
    if (!(game.inventory.coconut >= 1)) return 'Na zasazení potřebuješ 1 kokos. Seber ho pod palmou.';
    return '';
  }

  plant(tree = this.nearest()) {
    if (this.reason(tree)) return false;
    this.start(tree, PALM_GROWTH_SECONDS);
    this.game.inventory.coconut--;
    this.game.event('palmPlanted', tree);
    this.game.requestSave?.();
    return true;
  }

  showStump(tree) {
    tree.root.visible = true;
    tree.trunk.visible = false;
    if (!tree.stump) tree.stump = rod(tree.root, [0, 0, 0], [0, .21, 0], .21, 0x986e45);
  }

  start(tree, remaining) {
    const fresh = palm(tree.x, tree.z, tree.h, tree.phase);
    const oldRoot = tree.root;
    this.game.scene.remove(oldRoot);
    // Palm geometry is unique; shared cached world materials must stay alive.
    oldRoot.traverse(node => {
      node.geometry?.dispose();
      if (node.userData.carved) node.material.dispose();
    });
    if (tree.body) this.game.world.removeRigidBody(tree.body);
    Object.assign(tree, fresh, {state: 'growing', hp: 0, body: null, stump: null, cutDirection: null});
    tree.crown.children.filter(n => n.geometry?.type === 'IcosahedronGeometry').forEach(n => { n.visible = false; });
    this.game.scene.add(tree.root);
    this.plantings.set(tree, remaining);
    this.scale(tree);
  }

  remaining(tree) { return this.plantings.get(tree) ?? 0; }

  scale(tree) {
    const progress = 1 - this.remaining(tree) / PALM_GROWTH_SECONDS;
    tree.root.scale.setScalar(.16 + .84 * progress);
  }

  snapshot() {
    return [...this.plantings].map(([tree, remaining]) => ({treeIndex: this.game.trees.indexOf(tree), remaining}));
  }

  restore(entries) {
    for (const tree of this.game.trees) if (tree.state === 'gone') this.showStump(tree);
    for (const entry of entries) this.start(this.game.trees[entry.treeIndex], entry.remaining);
  }

  // Pauses with the simulation. A mature palm waits until the player leaves its trunk.
  update(dt) {
    if (!Number.isFinite(dt) || dt <= 0) return;
    for (const [tree, remaining] of this.plantings) {
      const next = Math.max(0, remaining - dt);
      this.plantings.set(tree, next);
      this.scale(tree);
      const p = this.game.player.root.position;
      if (next > 0 || Math.hypot(p.x - tree.x, p.z - tree.z) < .8) continue;
      tree.hp = 4;
      tree.state = 'standing';
      tree.body = this.game.world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(tree.x, GROUND + tree.h / 2, tree.z));
      this.game.world.createCollider(RAPIER.ColliderDesc.cylinder(tree.h / 2, .21), tree.body);
      this.plantings.delete(tree);
      this.game.event('palmGrown', tree);
      this.game.requestSave?.();
    }
  }
}
