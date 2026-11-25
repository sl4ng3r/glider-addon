import test from "node:test";
import assert from "node:assert/strict";
import {
  THERMAL_CONFIG,
  advanceThermalRoute,
  isActiveHeatSource,
  updraftStrength,
  sampleFireUpdraft,
} from "../behavior_packs/windglider_bp/scripts/fire-updraft.js";

const AIR = { typeId: "minecraft:air", isAir: true };
const place = (typeId, states = {}) => ({
  typeId,
  isAir: false,
  permutation: { getState: (name) => states[name] },
});

function fakeDimension(id = "overworld") {
  const blocks = new Map();
  const dimension = {
    id,
    heightRange: { min: -64, max: 320 },
    reads: 0,
    blocks,
    getBlock({ x, y, z }) {
      this.reads++;
      if (y < this.heightRange.min || y >= this.heightRange.max) throw Error("outside world");
      return blocks.get(`${x},${y},${z}`) ?? AIR;
    },
    set(x, y, z, block) { blocks.set(`${x},${y},${z}`, block); },
  };
  return dimension;
}

const playerLocation = { x: 0.5, y: 69, z: 0.5 };
const sourceLocation = { x: 0, y: 64, z: 0 };

test("normal fire, lit campfire, and visible lava lift an open glider", () => {
  for (const source of [
    place("minecraft:fire"),
    place("minecraft:campfire", { extinguished: false }),
    place("minecraft:lava"),
    place("minecraft:flowing_lava"),
  ]) {
    const dimension = fakeDimension();
    dimension.set(0, 64, 0, source);
    assert.equal(isActiveHeatSource(source), true);
    assert.equal(sampleFireUpdraft({ dimension, playerLocation, currentTick: 10, active: true }).strength, 1, source.typeId);
  }
});

test("extinguished campfires and soul fire produce no lift", () => {
  for (const source of [
    place("minecraft:campfire", { extinguished: true }),
    place("minecraft:soul_fire"),
    place("minecraft:soul_campfire", { extinguished: false }),
    place("minecraft:magma"),
  ]) {
    const dimension = fakeDimension();
    dimension.set(0, 64, 0, source);
    assert.equal(isActiveHeatSource(source), false);
    assert.equal(sampleFireUpdraft({ dimension, playerLocation, currentTick: 10, active: true }).strength, 0);
  }
});

test("updraft fades to zero at its horizontal and vertical bounds", () => {
  assert.equal(THERMAL_CONFIG.innerRadius, 2);
  assert.equal(THERMAL_CONFIG.outerRadius, 3.5);
  assert.equal(THERMAL_CONFIG.fullHeight, 17);
  assert.equal(THERMAL_CONFIG.maxHeight, 24);
  assert.equal(THERMAL_CONFIG.maxDepthBlocks, 25);
  assert.equal(updraftStrength(playerLocation, sourceLocation), 1);
  assert.equal(updraftStrength({ x: 4, y: 69, z: 0.5 }, sourceLocation), 0);
  assert.equal(updraftStrength({ x: 0.5, y: 89, z: 0.5 }, sourceLocation), 0);
  assert.ok(Math.abs(updraftStrength({ x: 3.25, y: 85, z: 0.5 }, sourceLocation) - 2 / 7) < 1e-12);
  for (const location of [
    { x: 2.9, y: 72.9, z: 0.5 },
    { x: 0.5, y: 64.5, z: 0.5 },
    { x: 100, y: 100, z: 100 },
  ]) {
    const strength = updraftStrength(location, sourceLocation);
    assert.ok(strength >= 0 && strength <= 1);
  }
});

test("wider and taller field finds a fire at its new horizontal and depth limits", () => {
  const dimension = fakeDimension();
  dimension.set(0, 64, 0, place("minecraft:fire"));
  const side = sampleFireUpdraft({ dimension, playerLocation: { x: 3.5, y: 69, z: 0.5 }, currentTick: 10, active: true });
  assert.ok(side.strength > 0, "a fire three blocks to the side must be found");
  const high = sampleFireUpdraft({ dimension, playerLocation: { x: 0.5, y: 88, z: 0.5 }, currentTick: 13, active: true });
  assert.ok(high.strength > 0, "a fire 23 blocks below the player must be found");
});

test("cached_source_extinguished_stops_lift", () => {
  const dimension = fakeDimension();
  dimension.set(0, 64, 0, place("minecraft:campfire", { extinguished: false }));
  const first = sampleFireUpdraft({ dimension, playerLocation, currentTick: 10, active: true });
  assert.equal(first.strength, 1);
  dimension.set(0, 64, 0, place("minecraft:campfire", { extinguished: true }));
  const before = dimension.reads;
  const next = sampleFireUpdraft({ dimension, playerLocation, currentTick: 11, cache: first.cache, active: true });
  assert.equal(next.strength, 0);
  assert.ok(dimension.reads - before <= 10, "a cached source should not trigger a full scan");
});

test("roof_and_headroom_block_lift", () => {
  const roofed = fakeDimension();
  roofed.set(0, 64, 0, place("minecraft:fire"));
  roofed.set(0, 67, 0, place("minecraft:stone"));
  assert.equal(sampleFireUpdraft({ dimension: roofed, playerLocation, currentTick: 10, active: true }).strength, 0);

  roofed.set(0, 67, 0, AIR);
  const first = sampleFireUpdraft({ dimension: roofed, playerLocation, currentTick: 11, active: true });
  assert.equal(first.strength, 1);
  roofed.set(0, 67, 0, place("minecraft:stone"));
  assert.equal(sampleFireUpdraft({ dimension: roofed, playerLocation, currentTick: 12, cache: first.cache, active: true }).strength, 0);

  const lowCeiling = fakeDimension();
  lowCeiling.set(0, 64, 0, place("minecraft:fire"));
  lowCeiling.set(0, 71, 0, place("minecraft:stone"));
  assert.equal(sampleFireUpdraft({ dimension: lowCeiling, playerLocation, currentTick: 10, active: true }).strength, 0);
});

test("covered_lava_has_no_lift", () => {
  const dimension = fakeDimension();
  dimension.set(0, 64, 0, place("minecraft:lava"));
  dimension.set(0, 65, 0, place("minecraft:stone"));
  assert.equal(sampleFireUpdraft({ dimension, playerLocation, currentTick: 10, active: true }).strength, 0);
  dimension.set(0, 65, 0, AIR);
  assert.equal(sampleFireUpdraft({ dimension, playerLocation, currentTick: 11, active: true }).strength, 1);
});

test("unavailable_blocks_fail_closed", () => {
  const dimension = fakeDimension();
  dimension.getBlock = () => { throw Error("unloaded chunk"); };
  assert.equal(sampleFireUpdraft({ dimension, playerLocation, currentTick: 10, active: true }).strength, 0);
  const high = fakeDimension();
  high.heightRange.max = 70;
  high.set(0, 64, 0, place("minecraft:fire"));
  assert.equal(sampleFireUpdraft({ dimension: high, playerLocation, currentTick: 10, active: true }).strength, 0);
});

test("throwing block getters stop lift without interrupting the sampler", () => {
  const throwsOnAir = { typeId: "minecraft:air", get isAir() { throw Error("unloaded chunk"); } };
  const throwsOnType = { isAir: false, get typeId() { throw Error("unloaded chunk"); } };
  const blockedHead = fakeDimension();
  blockedHead.set(0, 71, 0, throwsOnAir);
  assert.equal(sampleFireUpdraft({ dimension: blockedHead, playerLocation, currentTick: 10, active: true }).strength, 0);

  const blockedPath = fakeDimension();
  blockedPath.set(0, 64, 0, place("minecraft:fire"));
  blockedPath.set(0, 67, 0, throwsOnAir);
  assert.equal(sampleFireUpdraft({ dimension: blockedPath, playerLocation, currentTick: 10, active: true }).strength, 0);

  const invalidSource = fakeDimension();
  invalidSource.set(0, 64, 0, throwsOnType);
  assert.equal(sampleFireUpdraft({ dimension: invalidSource, playerLocation, currentTick: 10, active: true }).strength, 0);

  const cached = fakeDimension();
  cached.set(0, 64, 0, place("minecraft:fire"));
  const first = sampleFireUpdraft({ dimension: cached, playerLocation, currentTick: 10, active: true });
  cached.set(0, 64, 0, throwsOnType);
  assert.equal(sampleFireUpdraft({ dimension: cached, playerLocation, currentTick: 11, cache: first.cache, active: true }).strength, 0);
});

test("multiple_sources_do_not_stack", () => {
  const dimension = fakeDimension();
  dimension.set(0, 64, 0, place("minecraft:campfire", { extinguished: false }));
  dimension.set(1, 64, 0, place("minecraft:lava"));
  assert.equal(sampleFireUpdraft({ dimension, playerLocation, currentTick: 10, active: true }).strength, 1);
});

test("an uninterrupted row of fires runs out of lift even without gaps between sources", () => {
  let route;
  for (let x = 0; x < 28; x++) {
    const result = advanceThermalRoute(route, { strength: 1, source: { x, y: 64, z: 0 }, currentTick: x });
    assert.equal(result.strength, 1, `lift at X=${x}`);
    route = result.route;
  }
  const next = advanceThermalRoute(route, { strength: 1, source: { x: 28, y: 64, z: 0 }, currentTick: 28 });
  assert.equal(next.strength, 0);
  assert.equal(next.route.resumeAtTick, 228);
});

test("a new band must rise by ten blocks and starts with its own four zones", () => {
  let route;
  for (const [index, y] of [64, 67, 70, 73].entries()) {
    const result = advanceThermalRoute(route, { strength: 1, source: { x: index * 9, y, z: 0 }, currentTick: index * 10 });
    assert.equal(result.strength, 1);
    route = result.route;
  }
  for (const y of [63, 73]) {
    const blocked = advanceThermalRoute(route, { strength: 1, source: { x: 36, y, z: 0 }, currentTick: 40 });
    assert.equal(blocked.strength, 0);
    assert.equal(blocked.route.resumeAtTick, 234);
    route = blocked.route;
  }
  const uphill = advanceThermalRoute(route, { strength: 0.8, source: { x: 45, y: 74, z: 0 }, currentTick: 50 });
  assert.equal(uphill.strength, 0.8);
  assert.equal(uphill.route.bandBaseY, 74);
  assert.equal(uphill.route.zonesUsed, 1);
});

test("same-band sources work again exactly 200 ticks after leaving the fourth zone", () => {
  let route;
  for (let zone = 0; zone < 4; zone++) {
    route = advanceThermalRoute(route, { strength: 1, source: { x: zone * 9, y: 64, z: 0 }, currentTick: zone * 10 }).route;
  }
  const source = { x: 36, y: 64, z: 0 };
  assert.equal(advanceThermalRoute(route, { strength: 1, source, currentTick: 233 }).strength, 0);
  const resumed = advanceThermalRoute(route, { strength: 1, source, currentTick: 234 });
  assert.equal(resumed.strength, 1);
  assert.equal(resumed.route.zonesUsed, 1);
});

test("independent_player_caches", () => {
  const dimension = fakeDimension();
  dimension.set(0, 64, 0, place("minecraft:fire"));
  dimension.set(20, 64, 0, place("minecraft:campfire", { extinguished: false }));
  const first = sampleFireUpdraft({ dimension, playerLocation, currentTick: 10, active: true });
  const otherLocation = { x: 20.5, y: 69, z: 0.5 };
  const second = sampleFireUpdraft({ dimension, playerLocation: otherLocation, currentTick: 10, active: true });
  dimension.set(0, 64, 0, AIR);
  assert.equal(sampleFireUpdraft({ dimension, playerLocation, currentTick: 11, cache: first.cache, active: true }).strength, 0);
  assert.equal(sampleFireUpdraft({ dimension, playerLocation: otherLocation, currentTick: 11, cache: second.cache, active: true }).strength, 1);
});

test("inactive_flight_clears_thermal_cache", () => {
  const dimension = fakeDimension();
  dimension.set(0, 64, 0, place("minecraft:fire"));
  const first = sampleFireUpdraft({ dimension, playerLocation, currentTick: 10, active: true });
  const before = dimension.reads;
  assert.deepEqual(sampleFireUpdraft({ dimension, playerLocation, currentTick: 11, cache: first.cache, active: false }), {
    strength: 0, cache: undefined,
  });
  assert.equal(dimension.reads, before);
});

test("scheduled scans are bounded and dimension changes discard the old source", () => {
  const empty = fakeDimension();
  const first = sampleFireUpdraft({ dimension: empty, playerLocation, currentTick: 10, active: true });
  assert.ok(empty.reads <= 1226, `empty search read ${empty.reads} blocks`);
  const before = empty.reads;
  sampleFireUpdraft({ dimension: empty, playerLocation, currentTick: 11, cache: first.cache, active: true });
  assert.ok(empty.reads - before <= 1, "the next tick must reuse the scheduled no-source result");
  const later = empty.reads;
  sampleFireUpdraft({ dimension: empty, playerLocation, currentTick: 13, cache: first.cache, active: true });
  assert.ok(empty.reads - later > 10, "the scheduled scan should run again after three ticks");

  const fire = fakeDimension();
  fire.set(0, 64, 0, place("minecraft:fire"));
  const cached = sampleFireUpdraft({ dimension: fire, playerLocation, currentTick: 20, active: true }).cache;
  const otherDimension = fakeDimension("nether");
  const result = sampleFireUpdraft({ dimension: otherDimension, playerLocation, currentTick: 21, cache: cached, active: true });
  assert.equal(result.strength, 0);
  assert.equal(result.cache.dimensionId, "nether");
});
