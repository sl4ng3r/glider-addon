import test from "node:test";
import assert from "node:assert/strict";
import { hasWallContact } from "../behavior_packs/windglider_bp/scripts/wall-collision.js";

function playerWith({ hitAt = [], shoulderHit = false, throwRay = false } = {}) {
  const rays = [];
  const player = {
    location: { x: 12, y: 64, z: 8 },
    getVelocity: () => { throw new Error("commanded velocity is not a collision measurement"); },
    dimension: {
      getBlockFromRay(origin, direction, options) {
        rays.push({ origin, direction, options });
        if (throwRay) throw new Error("chunk unloaded");
        return hitAt.some((height) => Math.abs(origin.y - (64 + height)) < 1e-9)
          || (shoulderHit && origin.x > 12.2) ? { block: {} } : undefined;
      },
    },
  };
  return { player, rays };
}

test("closes after a head-on collision with a wall at torso height", () => {
  const { player, rays } = playerWith({ hitAt: [0.9] });
  assert.equal(hasWallContact(player, { x: 0, z: 1 }, player.location, 2), true);
  assert.deepEqual(rays[0].direction, { x: 0, y: 0, z: 1 });
  assert.equal(rays[0].options.includePassableBlocks, false);
  assert.equal(rays[0].options.includeLiquidBlocks, false);
  assert.equal(rays[0].options.maxDistance, 1);
});

test("checks upper-body collisions too", () => {
  const { player, rays } = playerWith({ hitAt: [1.5] });
  assert.equal(hasWallContact(player, { x: 0, z: 1 }, player.location, 2), true);
  assert.ok(rays.length >= 2);
});

test("a nearby wall does not close the sail while forward motion continues", () => {
  const { player, rays } = playerWith({ hitAt: [0.9] });
  assert.equal(hasWallContact(player, { x: 0, z: 1 }, { x: 12, y: 64.1, z: 7.7 }, 4), false);
  assert.equal(rays.length, 0);
});

test("slow motion without a wall and the first gliding ticks do not close the sail", () => {
  const { player, rays } = playerWith({ hitAt: [0.9] });
  assert.equal(hasWallContact(player, { x: 0, z: 1 }, player.location, 0), false);
  assert.equal(hasWallContact(player, { x: 0, z: 1 }, player.location, 1), false);
  assert.equal(hasWallContact(player, { x: 0, z: 1 }, undefined, 3), false);
  assert.equal(rays.length, 0);
  const clear = playerWith().player;
  assert.equal(hasWallContact(clear, { x: 0, z: 1 }, clear.location, 2), false);
});

test("uses flight heading rather than camera direction", () => {
  const { player, rays } = playerWith({ hitAt: [0.9] });
  assert.equal(hasWallContact(player, { x: 1, z: 0 }, { x: 11.7, y: 64, z: 8 }, 2), false);
  assert.equal(rays.length, 0);
  assert.equal(hasWallContact(player, { x: 0, z: 1 }, player.location, 2), true);
});

test("detects a wall at the player's shoulder when the center ray misses", () => {
  const { player, rays } = playerWith({ shoulderHit: true });
  assert.equal(hasWallContact(player, { x: 0, z: 1 }, player.location, 2), true);
  assert.ok(rays.some(({ origin }) => origin.x > 12.2));
});

test("raycast errors leave the flight active", () => {
  const { player } = playerWith({ throwRay: true });
  assert.equal(hasWallContact(player, { x: 0, z: 1 }, player.location, 2), false);
});
