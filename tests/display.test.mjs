import test from "node:test";
import assert from "node:assert/strict";
import { ensureDisplay, positionDisplay } from "../behavior_packs/windglider_bp/scripts/display.js";

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

test("the sail follows the player above the head and keeps its heading", () => {
  const teleports = [];
  const player = { location: { x: 4, y: 30, z: -2 } };
  const record = { displayEntity: { isValid: true, teleport: (...args) => teleports.push(args) } };
  assert.equal(positionDisplay(player, record, 45), true);
  assert.deepEqual(teleports[0], [{ x: 4, y: 31.8, z: -2 }, { rotation: { x: 0, y: 45 } }]);
});
