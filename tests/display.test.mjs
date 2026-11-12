import test from "node:test";
import assert from "node:assert/strict";
import { DISPLAY_Y_OFFSET, DISPLAY_LEAD_DISTANCE, ensureDisplay, positionDisplay } from "../behavior_packs/windglider_bp/scripts/display.js";

test("a transient spawn failure is logged and retried during flight", () => {
  let attempts = 0;
  const errors = [];
  const entity = { isValid: true, playAnimation: () => {}, teleport: () => {} };
  const player = {
    location: { x: 1, y: 20, z: 2 },
    dimension: {
      spawnEntity: () => {
        if (++attempts === 1) throw new Error("restricted execution");
        return entity;
      },
    },
  };
  const record = {};
  const options = { entityId: "glider:display", animationId: "animation.wind_glider.open", onError: (error) => errors.push(error) };
  assert.equal(ensureDisplay(player, record, options), false);
  assert.equal(attempts, 1);
  for (let tick = 0; tick < 20; tick++) assert.equal(ensureDisplay(player, record, options), false);
  assert.equal(errors.length, 1);
  assert.equal(ensureDisplay(player, record, options), true);
  assert.equal(record.displayEntity, entity);
  assert.equal(attempts, 2);
});

test("a rejected animation does not discard a successfully spawned display", () => {
  const entity = { isValid: true, playAnimation: () => { throw new Error("animation rejected"); } };
  const player = { location: { x: 0, y: 0, z: 0 }, dimension: { spawnEntity: () => entity } };
  const errors = [];
  const record = {};
  assert.equal(ensureDisplay(player, record, { entityId: "glider:display", animationId: "animation.wind_glider.open", onError: (error) => errors.push(error) }), true);
  assert.equal(record.displayEntity, entity);
  assert.equal(errors.length, 1);
});

test("opening above the dimension ceiling waits without logging and spawns after descending", () => {
  let spawns = 0;
  const errors = [];
  const entity = { isValid: true };
  const player = {
    location: { x: 273, y: 536, z: -44 },
    dimension: {
      heightRange: { min: -64, max: 320 },
      spawnEntity: () => { spawns++; return entity; },
    },
  };
  const record = {};
  const options = { entityId: "glider:display", onError: (error) => errors.push(error) };
  assert.equal(ensureDisplay(player, record, options), false);
  assert.equal(spawns, 0);
  assert.equal(errors.length, 0);
  assert.equal(record.displayRetryTicks ?? 0, 0);
  player.location.y = 318;
  assert.equal(ensureDisplay(player, record, options), true);
  assert.equal(spawns, 1);
  assert.equal(record.displayEntity, entity);
});

test("an existing display is removed before teleporting above the ceiling", () => {
  let removals = 0;
  let teleports = 0;
  const player = { location: { x: 0, y: 536, z: 0 }, dimension: { heightRange: { min: -64, max: 320 } } };
  const record = { displayEntity: { isValid: true, remove: () => { removals++; }, teleport: () => { teleports++; } } };
  assert.equal(positionDisplay(player, record, 0), false);
  assert.equal(removals, 1);
  assert.equal(teleports, 0);
  assert.equal(record.displayEntity, undefined);
});

test("the sail sits closer above the player and leads in the flight direction", () => {
  const teleports = [];
  const player = { location: { x: 4, y: 30, z: -2 }, dimension: { heightRange: { min: -64, max: 320 } } };
  const record = { displayEntity: { isValid: true, teleport: (...args) => teleports.push(args) } };
  assert.equal(positionDisplay(player, record, 45, { x: 1, z: 0 }), true);
  assert.deepEqual(teleports[0], [
    { x: 4 + DISPLAY_LEAD_DISTANCE, y: 30 + DISPLAY_Y_OFFSET, z: -2 },
    { rotation: { x: 0, y: 45 } },
  ]);
  assert.equal(DISPLAY_Y_OFFSET, 1.12);
  assert.equal(DISPLAY_LEAD_DISTANCE, 0.7);
});
