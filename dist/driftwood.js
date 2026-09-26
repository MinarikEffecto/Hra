import * as THREE from './vendor/three.module.js';
import {GROUND, logMesh, frond} from './world.js';

export const DRIFTWOOD_WOOD = 2;
export const DRIFTWOOD_LEAVES = 2;
export const DRIFTWOOD_RESPAWN_SECONDS = 90;
export const DRIFTWOOD_POSITION = Object.freeze({x: 6.2, z: 5.4});

// One fixed shoreline pickup. The timer advances only while the simulation runs,
// so closing the page or working in the paused workshop cannot consume the wait.
export class Driftwood {
  constructor(scene, terrain) {
    this.available = true;
    this.remaining = 0;
    const {x, z} = DRIFTWOOD_POSITION;
    this.baseY = Math.max(-.12, terrain?.heightAt(x, z) ?? GROUND) + .2;
    this.visual = new THREE.Group();
    this.visual.position.set(x, this.baseY, z);
    const log = logMesh(1.1);
    log.rotation.z = Math.PI / 2;
    log.rotation.y = -.3;
    this.visual.add(log);
    for (const side of [-1, 1]) {
      const leaf = frond(this.visual, 1.2, .34, side < 0 ? 0x6bb548 : 0x8bc85b);
      leaf.position.set(-.46, .14, side * .25);
      leaf.rotation.y = side * .55;
      leaf.rotation.z = -.08;
    }
    const marker = new THREE.Mesh(new THREE.RingGeometry(.64, .72, 32),
      new THREE.MeshBasicMaterial({color: 0xffe8a2, transparent: true, opacity: .85, side: THREE.DoubleSide}));
    marker.rotation.x = -Math.PI / 2;
    marker.position.y = -.16;
    this.visual.add(marker);
    scene.add(this.visual);
  }

  snapshot() { return {available: this.available, remaining: this.remaining}; }

  restore(state) {
    this.available = state.available;
    this.remaining = state.remaining;
    this.visual.visible = state.available;
  }

  update(dt, player, elapsed) {
    if (dt <= 0) return null;
    let returned = false;
    if (!this.available) {
      this.remaining = Math.max(0, this.remaining - dt);
      if (this.remaining > 0) return null;
      this.available = true;
      this.visual.visible = true;
      returned = true;
    }
    this.visual.position.y = this.baseY + Math.sin(elapsed * 2) * .035;
    const {x, z} = DRIFTWOOD_POSITION;
    if (Math.hypot(player.x - x, player.z - z) < 1.3) {
      this.available = false;
      this.remaining = DRIFTWOOD_RESPAWN_SECONDS;
      this.visual.visible = false;
      return 'collected';
    }
    return returned ? 'returned' : null;
  }
}
