import * as THREE from './vendor/three.module.js';
import {GROUND, makeBuilding} from './world.js?v=23';
import {RAPIER, COSTS} from './simulation.js';
import {TECH_RECIPES} from './technology.js';
import {DRIFTWOOD_RESPAWN_SECONDS} from './driftwood.js';
import {PALM_GROWTH_SECONDS, isPlantingSiteClear} from './palm-growth.js';

export const SAVE_SCHEMA_VERSION = 4;
export const SAVE_WORLD_ID = 'trosechnik-maly-ostrov-1';
// Keep the original slot names so existing browser positions remain discoverable.
export const SAVE_KEY = 'trosechnik.save.v1';
export const BACKUP_KEY = 'trosechnik.save.backup.v1';

const LEGACY_COUNTERS = ['coconut', 'fish', 'seafood', 'cooked', 'shell', 'coin', 'pearl', 'chest', 'relic', 'feather', 'meat', 'vine'];
const NEW_COUNTERS = ['clay', 'ore', 'charcoal', 'ash', 'ingot'];
const COUNTERS = [...LEGACY_COUNTERS, ...NEW_COUNTERS];
const TREE_STATES = ['standing', 'gone'];
const TOOLS = ['axe', 'shovel', 'shotgun'];
const MAX_JSON_LENGTH = 2_000_000;

export class SaveGameError extends Error {
  constructor(message, code = 'INVALID_SAVE') { super(message); this.name = 'SaveGameError'; this.code = code; }
}

function requireObject(value, name) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new SaveGameError(`${name}: očekáván objekt`);
  return value;
}

function requireArray(value, name, max) {
  if (!Array.isArray(value) || value.length > max) throw new SaveGameError(`${name}: neplatné pole`);
  return value;
}

function requireNumber(value, name, min, max, integer = false) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max || (integer && !Number.isInteger(value))) {
    throw new SaveGameError(`${name}: neplatné číslo`);
  }
  return value;
}

function requireBoolean(value, name) {
  if (typeof value !== 'boolean') throw new SaveGameError(`${name}: očekávána logická hodnota`);
  return value;
}

function requireChoice(value, choices, name) {
  if (!choices.includes(value)) throw new SaveGameError(`${name}: nepodporovaná hodnota`);
  return value;
}

function position(value, name, max = 12.5) {
  const p = requireObject(value, name);
  return {x: requireNumber(p.x, `${name}.x`, -max, max), z: requireNumber(p.z, `${name}.z`, -max, max)};
}

// Tree state and coconut counts are indexed by the generation order of the island.
// Keep ordered millimetre coordinates rather than a hash. Quantization avoids
// last-bit differences in trigonometry across JS engines while distinguishing
// any meaningful layout reorder before restoring state.
function islandLayout(game) {
  return Object.fromEntries(['trees', 'bushes'].map(kind =>
    [kind, game[kind].map(item => [Math.round(item.x * 1000), Math.round(item.z * 1000)])]));
}

export function isSaveCompatibleWithIsland(save, game) {
  if (save.world.trees.length !== game.trees.length || save.world.bushes.length !== game.bushes.length) return false;
  if (save.world.plantings?.some(p => !isPlantingSiteClear(game.trees[p.treeIndex], save.world.buildings, save.world.holes))) return false;
  // Saves written before the layout field was introduced have only a count check.
  if (!save.world.layout) return true;
  const current = islandLayout(game);
  return ['trees', 'bushes'].every(kind => save.world.layout[kind].every(([x, z], i) =>
    x === current[kind][i][0] && z === current[kind][i][1]));
}

// Rebuild a plain, bounded data object. The original input is never mutated or trusted.
export function validateSave(raw) {
  let data = raw;
  if (typeof data === 'string') {
    if (data.length > MAX_JSON_LENGTH) throw new SaveGameError('Uložená hra je příliš velká');
    try { data = JSON.parse(data); } catch { throw new SaveGameError('Uložená hra není platný JSON'); }
  }
  data = requireObject(data, 'save');
  if (![1, 2, 3, SAVE_SCHEMA_VERSION].includes(data.schemaVersion)) {
    throw new SaveGameError('Nepodporovaná verze uložené hry',
      typeof data.schemaVersion === 'number' && Number.isFinite(data.schemaVersion) && data.schemaVersion > SAVE_SCHEMA_VERSION ? 'FUTURE_SCHEMA' : 'INVALID_SAVE');
  }
  const legacy = data.schemaVersion === 1;
  if (data.worldId !== SAVE_WORLD_ID) throw new SaveGameError('Pozice patří do jiné verze ostrova');
  if (typeof data.savedAt !== 'string' || !Number.isFinite(Date.parse(data.savedAt))) throw new SaveGameError('Neplatný čas uložení');

  const player = requireObject(data.player, 'player');
  const resources = requireObject(data.resources, 'resources');
  const inventory = requireObject(data.inventory, 'inventory');
  const world = requireObject(data.world, 'world');
  const survival = requireObject(data.survival, 'survival');
  const pos = position(player, 'player');
  if (Math.hypot(pos.x, pos.z) >= 12.2) throw new SaveGameError('Hráč je mimo hratelnou oblast');

  const clean = {
    schemaVersion: SAVE_SCHEMA_VERSION, worldId: SAVE_WORLD_ID, savedAt: new Date(data.savedAt).toISOString(),
    player: {...pos, y: requireNumber(player.y, 'player.y', -30, 20), heading: requireNumber(player.heading, 'player.heading', -1e6, 1e6)},
    resources: {wood: requireNumber(resources.wood, 'resources.wood', 0, 1e6, true), leaves: requireNumber(resources.leaves, 'resources.leaves', 0, 1e6, true)},
    inventory: {},
    world: {buildings: [], trees: [], bushes: [], holes: [], coconuts: [], plantings: []},
    clock: {hour: requireNumber(requireObject(data.clock, 'clock').hour, 'clock.hour', 0, 24), speed: requireChoice(data.clock.speed, [0, .25, 1, 4], 'clock.speed')},
    survival: {satiety: requireNumber(survival.satiety, 'survival.satiety', 0, 100), torch: requireBoolean(survival.torch, 'survival.torch'), lit: requireBoolean(survival.lit, 'survival.lit'), traps: [], cooking: null, wildlife: null},
    exploration: {tool: requireChoice(requireObject(data.exploration, 'exploration').tool, TOOLS, 'exploration.tool')},
    technology: {job: null},
  };
  if (clean.survival.lit && !clean.survival.torch) throw new SaveGameError('Rozsvícená louč musí existovat');
  const wildlife = requireObject(survival.wildlife, 'survival.wildlife');
  const birds = requireArray(wildlife.birds, 'survival.wildlife.birds', 3);
  const creatures = requireArray(wildlife.creatures, 'survival.wildlife.creatures', 4);
  if (birds.length !== 3 || creatures.length !== 4) throw new SaveGameError('Nesprávný počet zvířat');
  clean.survival.wildlife = {birds: birds.map((v,i) => requireBoolean(v, `survival.wildlife.birds[${i}]`)),
    creatures: creatures.map((v,i) => requireBoolean(v, `survival.wildlife.creatures[${i}]`))};
  for (const key of LEGACY_COUNTERS) clean.inventory[key] = requireNumber(inventory[key], `inventory.${key}`, 0, 1e6, true);
  for (const key of NEW_COUNTERS) clean.inventory[key] = legacy ? 0 : requireNumber(inventory[key], `inventory.${key}`, 0, 1e6, true);
  clean.inventory.copperCutter = legacy ? false : requireBoolean(inventory.copperCutter, 'inventory.copperCutter');
  clean.inventory.strips = requireArray(inventory.strips, 'inventory.strips', 10000)
    .map((n, i) => requireNumber(n, `inventory.strips[${i}]`, 0, 100));
  clean.inventory.ropes = requireArray(inventory.ropes, 'inventory.ropes', 10000).map((entry, i) => {
    const r = requireObject(entry, `inventory.ropes[${i}]`);
    return {length: requireNumber(r.length, `inventory.ropes[${i}].length`, 1, 10000, true), quality: requireNumber(r.quality, `inventory.ropes[${i}].quality`, 0, 100)};
  });

  clean.world.buildings = requireArray(world.buildings, 'world.buildings', 100).map((entry, i) => {
    const b = requireObject(entry, `world.buildings[${i}]`);
    return {...position(b, `world.buildings[${i}]`), type: requireChoice(b.type, legacy ? Object.keys(COSTS).filter(type => type !== 'furnace') : Object.keys(COSTS), `world.buildings[${i}].type`), rotation: requireNumber(b.rotation, `world.buildings[${i}].rotation`, -1e6, 1e6)};
  });
  for (const kind of ['trees', 'bushes']) {
    clean.world[kind] = requireArray(world[kind], `world.${kind}`, 100).map((entry, i) => {
      const t = requireObject(entry, `world.${kind}[${i}]`);
      const hp = requireNumber(t.hp, `world.${kind}[${i}].hp`, 0, kind === 'trees' ? 4 : 2, true);
      const state = requireChoice(t.state, TREE_STATES, `world.${kind}[${i}].state`);
      if ((state === 'standing') !== (hp > 0)) throw new SaveGameError(`world.${kind}[${i}]: stav neodpovídá zdraví`);
      return {hp, state};
    });
  }
  // Optional in v1 and v2 positions. Do not manufacture a signature
  // during migration: the old save cannot prove its original object ordering.
  if (world.layout !== undefined) {
    const layout = requireObject(world.layout, 'world.layout');
    clean.world.layout = {};
    for (const kind of ['trees', 'bushes']) {
      const points = requireArray(layout[kind], `world.layout.${kind}`, 100);
      if (points.length !== clean.world[kind].length) throw new SaveGameError(`world.layout.${kind}: nesprávný počet`);
      clean.world.layout[kind] = points.map((point, i) => {
        const coordinates = requireArray(point, `world.layout.${kind}[${i}]`, 2);
        if (coordinates.length !== 2) throw new SaveGameError(`world.layout.${kind}[${i}]: nesprávné souřadnice`);
        return coordinates.map((value, axis) => requireNumber(value, `world.layout.${kind}[${i}][${axis}]`, -12500, 12500, true));
      });
    }
  }
  clean.world.coconuts = requireArray(world.coconuts, 'world.coconuts', 100)
    .map((count, i) => requireNumber(count, `world.coconuts[${i}]`, 0, 3, true));
  if (clean.world.coconuts.length !== clean.world.trees.length) throw new SaveGameError('Počet kokosů neodpovídá palmám');
  // Older versions contain no seedlings. Version 4 keeps their palm slot and
  // active play time, so older clients protect this save as a future schema.
  if (data.schemaVersion >= 4) {
    clean.world.plantings = requireArray(world.plantings, 'world.plantings', clean.world.trees.length).map((entry, i) => {
      const p = requireObject(entry, `world.plantings[${i}]`);
      const treeIndex = requireNumber(p.treeIndex, `world.plantings[${i}].treeIndex`, 0, clean.world.trees.length - 1, true);
      if (clean.world.trees[treeIndex].state !== 'gone' || clean.world.coconuts[treeIndex] !== 0)
        throw new SaveGameError('Sazenice nesmí současně být dospělou palmou nebo nést kokosy');
      return {treeIndex, remaining: requireNumber(p.remaining, `world.plantings[${i}].remaining`, 0, PALM_GROWTH_SECONDS)};
    });
    if (new Set(clean.world.plantings.map(p => p.treeIndex)).size !== clean.world.plantings.length)
      throw new SaveGameError('Na jednom místě je více sazenic');
  }
  // Older mid-fall saves may mark a palm gone while leaving coconuts on its
  // invisible crown. Recover those coconuts when reading either save schema.
  for (const [i, tree] of clean.world.trees.entries()) {
    if (tree.state !== 'gone' || !clean.world.coconuts[i]) continue;
    clean.inventory.coconut = requireNumber(clean.inventory.coconut + clean.world.coconuts[i], 'inventory.coconut', 0, 1e6, true);
    clean.world.coconuts[i] = 0;
  }
  // Optional in older v1/v2 saves. Once written, validate both fields so a
  // corrupt cooldown cannot be used to replace the last good position.
  if (world.driftwood === undefined) clean.world.driftwood = {available: true, remaining: 0};
  else {
    const driftwood = requireObject(world.driftwood, 'world.driftwood');
    const available = requireBoolean(driftwood.available, 'world.driftwood.available');
    const remaining = requireNumber(driftwood.remaining, 'world.driftwood.remaining', 0, DRIFTWOOD_RESPAWN_SECONDS);
    if (available ? remaining !== 0 : remaining <= 0) throw new SaveGameError('Nesprávný stav naplaveniny');
    clean.world.driftwood = {available, remaining};
  }
  clean.world.holes = requireArray(world.holes, 'world.holes', 100).map((entry, i) => {
    const h = requireObject(entry, `world.holes[${i}]`);
    const flood = h.flood === null ? null : requireObject(h.flood, `world.holes[${i}].flood`);
    return {...position(h, `world.holes[${i}]`), level: requireNumber(h.level, `world.holes[${i}].level`, 1, 50, true), pyramid: requireBoolean(h.pyramid, `world.holes[${i}].pyramid`),
      flood: flood ? {height: requireNumber(flood.height, `world.holes[${i}].flood.height`, -30, .5),
        sourceX: requireNumber(flood.sourceX, `world.holes[${i}].flood.sourceX`, -12.5, 12.5),
        sourceZ: requireNumber(flood.sourceZ, `world.holes[${i}].flood.sourceZ`, -12.5, 12.5)} : null};
  });
  if (clean.world.layout && clean.world.plantings.some(p => {
    const [x, z] = clean.world.layout.trees[p.treeIndex];
    return !isPlantingSiteClear({x: x / 1000, z: z / 1000}, clean.world.buildings, clean.world.holes);
  })) throw new SaveGameError('Sazenice zasahuje do stavby nebo výkopu');
  for (const [i, item] of requireArray(survival.traps, 'survival.traps', 100).entries()) {
    const t = requireObject(item, `survival.traps[${i}]`);
    const buildingIndex = requireNumber(t.buildingIndex, `survival.traps[${i}].buildingIndex`, 0, clean.world.buildings.length - 1, true);
    if (clean.world.buildings[buildingIndex].type !== 'trap' || clean.survival.traps.some(s => s.buildingIndex === buildingIndex)) throw new SaveGameError('Neplatná nebo duplicitní past');
    clean.survival.traps.push({buildingIndex, wait: requireNumber(t.wait, `survival.traps[${i}].wait`, -1e6, 1e6), catch: requireChoice(t.catch, [null, 'fish', 'seafood'], `survival.traps[${i}].catch`)});
  }
  if (survival.cooking !== null) {
    const c = requireObject(survival.cooking, 'survival.cooking');
    const buildingIndex = requireNumber(c.buildingIndex, 'survival.cooking.buildingIndex', 0, clean.world.buildings.length - 1, true);
    if (clean.world.buildings[buildingIndex].type !== 'fire') throw new SaveGameError('Vaření vyžaduje ohniště');
    clean.survival.cooking = {buildingIndex, kind: requireChoice(c.kind, ['fish', 'seafood'], 'survival.cooking.kind'), remaining: requireNumber(c.remaining, 'survival.cooking.remaining', 0, 8)};
  }
  if (!legacy) {
    const tech = requireObject(data.technology, 'technology');
    if (tech.job !== null) {
      const job = requireObject(tech.job, 'technology.job');
      const kind = requireChoice(job.kind, Object.keys(TECH_RECIPES), 'technology.job.kind');
      const buildingIndex = requireNumber(job.buildingIndex, 'technology.job.buildingIndex', 0, clean.world.buildings.length - 1, true);
      if (clean.world.buildings[buildingIndex].type !== TECH_RECIPES[kind].station) throw new SaveGameError('Výroba vyžaduje správnou stanici');
      clean.technology.job = {kind, buildingIndex, remaining: requireNumber(job.remaining, 'technology.job.remaining', 0, TECH_RECIPES[kind].seconds)};
    }
  }
  return clean;
}

export function captureGameState({game, life, exploration, dayCycle, technology}, now = new Date()) {
  if (!game || !life || !exploration) throw new SaveGameError('K uložení chybí herní stav');
  const state = life.state ?? life;
  const inventory = Object.fromEntries(COUNTERS.map(key => [key, game.inventory[key] ?? 0]));
  inventory.coconut += life.getPendingCoconuts?.() ?? 0;
  for (const [kind, count] of Object.entries(life.getPendingAnimalDrops?.() ?? {})) inventory[kind] += count;
  inventory.strips = [...(game.inventory.strips ?? [])];
  inventory.ropes = (game.inventory.ropes ?? []).map(r => ({length: r.length, quality: r.quality}));
  inventory.copperCutter = game.inventory.copperCutter ?? false;
  const coconuts = [...(life.getCoconutCounts?.() ?? game.trees.map(() => 3))];
  // A falling palm is restored as gone, so its attached coconuts must join the
  // pending drops in the inventory rather than remain on an invisible tree.
  for (const [i, tree] of game.trees.entries()) {
    if (tree.state !== 'falling') continue;
    inventory.coconut += coconuts[i];
    coconuts[i] = 0;
  }
  const falling = game.trees.filter(t => t.state === 'falling').length;
  const buildings = game.buildings.map(b => ({type: b.type, x: b.x, z: b.z, rotation: b.visual.rotation.y}));
  const buildingIndex = b => game.buildings.indexOf(b);
  const p = game.player.root;
  const result = {
    schemaVersion: SAVE_SCHEMA_VERSION, worldId: SAVE_WORLD_ID, savedAt: new Date(now).toISOString(),
    player: {x: p.position.x, y: p.position.y, z: p.position.z, heading: p.rotation.y},
    clock: dayCycle?.state ?? {hour: 16.5, speed: 1},
    // Transient fallen logs and leaves become collected resources on load. A fall in progress
    // has not spawned its five logs/six leaves yet; count those once as well.
    resources: {wood: game.wood + game.logs.length + 5 * falling, leaves: game.leaves + game.leafDrops.length + 6 * falling},
    inventory,
    world: {buildings, driftwood: game.driftwood.snapshot(), layout: islandLayout(game), plantings: game.palmGrowth?.snapshot() ?? [],
      trees: game.trees.map(t => ({hp: t.state === 'standing' ? t.hp : 0, state: t.state === 'standing' ? 'standing' : 'gone'})),
      bushes: game.bushes.map(b => ({hp: b.state === 'standing' ? b.hp : 0, state: b.state === 'standing' ? 'standing' : 'gone'})),
      coconuts,
      holes: exploration.holes.map(h => ({x: h.x, z: h.z, level: h.level, pyramid: !!h.pyramid,
        flood: h.flood ? {height: h.flood.height, sourceX: h.flood.sourceX, sourceZ: h.flood.sourceZ} : null})).filter(h => h.level > 0)},
    survival: {satiety: state.satiety, torch: state.torch, lit: state.lit,
      wildlife: life.getWildlifeState?.() ?? {birds: [true,true,true], creatures: [true,true,true,true]},
      traps: [...state.traps].map(([b, s]) => ({buildingIndex: buildingIndex(b), wait: s.wait, catch: s.catch})),
      cooking: state.cooking ? {buildingIndex: buildingIndex(state.cooking.fire), kind: state.cooking.kind, remaining: state.cooking.remaining} : null},
    exploration: {tool: exploration.tool},
    technology: {job: technology?.job ? {kind: technology.job.kind, buildingIndex: buildingIndex(technology.job.building), remaining: technology.job.remaining} : null},
  };
  return validateSave(result);
}

function restoreBuilding(game, data) {
  const visual = makeBuilding(data.type);
  visual.position.set(data.x, GROUND, data.z);
  visual.rotation.y = data.rotation;
  game.scene.add(visual);
  const building = {type: data.type, x: data.x, z: data.z, visual, collisionRadius: ['workbench', 'furnace'].includes(data.type) ? .95 : undefined};
  game.buildings.push(building);
  const body = game.world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(data.x, GROUND + .2, data.z));
  game.world.createCollider(RAPIER.ColliderDesc.cylinder(.2, data.type === 'shelter' ? .8 : ['workbench', 'furnace'].includes(data.type) ? .72 : .45), body);
  return building;
}

// Apply to a newly initialized IslandGame, after exploration and life have been created.
// Validate the complete file and world layout before any in-memory state is changed.
export function applyGameState({game, life, exploration, dayCycle, technology}, raw) {
  const save = validateSave(raw);
  if (!game || !life || !exploration || game.buildings.length || exploration.holes.length ||
      !isSaveCompatibleWithIsland(save, game) ||
      (save.world.plantings.length && !game.palmGrowth) ||
      (save.technology.job && !technology) ||
      (save.exploration.tool !== exploration.tool && typeof exploration.select !== 'function')) {
    throw new SaveGameError('Uložená pozice neodpovídá čistě spuštěnému ostrovu');
  }
  const state = life.state ?? life;
  game.wood = save.resources.wood;
  game.leaves = save.resources.leaves;
  for (const key of COUNTERS) game.inventory[key] = save.inventory[key];
  game.inventory.strips = [...save.inventory.strips];
  game.inventory.ropes = save.inventory.ropes.map(r => ({...r}));
  game.inventory.copperCutter = save.inventory.copperCutter;
  game.player.root.position.set(save.player.x, save.player.y, save.player.z);
  game.player.root.rotation.y = save.player.heading;
  game.targetAngle = save.player.heading;
  game.driftwood.restore(save.world.driftwood);
  for (const [i, item] of save.world.trees.entries()) {
    const t = game.trees[i]; t.hp = item.hp; t.state = item.state;
    if (item.state === 'gone') { t.root.visible = false; if (t.body) { game.world.removeRigidBody(t.body); t.body = null; } }
  }
  for (const [i, item] of save.world.bushes.entries()) {
    const b = game.bushes[i]; b.hp = item.hp; b.state = item.state;
    b.root.visible = item.state === 'standing';
    if (item.state === 'standing') b.root.scale.setScalar(.8 + item.hp * .1);
  }
  game.palmGrowth?.restore(save.world.plantings);
  life.restoreCoconuts?.(save.world.coconuts);
  for (const b of save.world.buildings) restoreBuilding(game, b);
  if (technology) technology.job = save.technology.job ? {kind: save.technology.job.kind,
    building: game.buildings[save.technology.job.buildingIndex], remaining: save.technology.job.remaining} : null;
  const terrain = game.scene.userData.terrain;
  for (const h of save.world.holes) {
    const hole = {x: h.x, z: h.z, level: h.level, pyramid: h.pyramid, visual: new THREE.Group(),
      depth: .24 * h.level + .035 * Math.max(0, h.level - 4) ** 1.28, radius: .56 + .27 * Math.sqrt(h.level)};
    hole.visual.position.set(h.x, 0, h.z);
    game.scene.add(hole.visual);
    exploration.holes.push(hole);
    terrain.setHole(hole);
    if (h.pyramid && exploration.pyramid) exploration.pyramid.userData.targetY = GROUND - 1.87 + Math.min(h.level, 7) / 7 * 1.69;
  }
  exploration.restoreFloods?.(save.world.holes);
  state.satiety = save.survival.satiety;
  life.restoreWildlife?.(save.survival.wildlife);
  state.torch = save.survival.torch;
  state.lit = save.survival.lit;
  state.traps.clear();
  for (const t of save.survival.traps) state.traps.set(game.buildings[t.buildingIndex], {wait: t.wait, catch: t.catch});
  state.cooking = save.survival.cooking ? {fire: game.buildings[save.survival.cooking.buildingIndex], kind: save.survival.cooking.kind, remaining: save.survival.cooking.remaining} : null;
  if (exploration.tool !== save.exploration.tool) {
    for (let i = 0; i < TOOLS.length && exploration.tool !== save.exploration.tool; i++) exploration.select(1);
  }
  dayCycle?.restore(save.clock);
  return save;
}

export function exportSave(raw) { return `${JSON.stringify(validateSave(raw), null, 2)}\n`; }

// A bad import or an unknown future schema is rejected before touching either storage key.
// A valid and layout-compatible previous primary is copied to backup before replacement.
// When loading fell back to an older compatible backup, the next autosave must not replace
// that last good backup with an incompatible primary.
// A newer primary is protected unless the player explicitly imports a replacement file.
export function saveToStorage(storage, raw, {key = SAVE_KEY, backupKey = BACKUP_KEY, isCompatible = () => true, overwriteFuture = false} = {}) {
  const save = validateSave(raw);
  const previous = storage.getItem(key);
  if (previous !== null) {
    try {
      const oldSave = validateSave(previous);
      if (isCompatible(oldSave)) storage.setItem(backupKey, JSON.stringify(oldSave));
    }
    catch (error) {
      if (!(error instanceof SaveGameError) || (error.code === 'FUTURE_SCHEMA' && !overwriteFuture)) throw error;
    }
  }
  storage.setItem(key, JSON.stringify(save));
  return save;
}

export function readFromStorage(storage, {key = SAVE_KEY, backupKey = BACKUP_KEY, isCompatible = () => true} = {}) {
  const errors = [];
  let futurePrimary = false;
  for (const [source, name] of [['primary', key], ['backup', backupKey]]) {
    const raw = storage.getItem(name);
    if (raw === null) continue;
    try {
      const save = validateSave(raw);
      if (!isCompatible(save)) throw new SaveGameError('Rozložení uloženého ostrova neodpovídá této verzi');
      return {save, source, errors, futurePrimary};
    }
    catch (error) {
      if (source === 'primary' && error instanceof SaveGameError && error.code === 'FUTURE_SCHEMA') futurePrimary = true;
      errors.push({source, message: error.message});
    }
  }
  return {save: null, source: null, errors, futurePrimary};
}
