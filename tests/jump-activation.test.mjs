import test from "node:test";
import assert from "node:assert/strict";
import { ACTIVATION_GAP_TICKS, decideOpeningPress } from "../behavior_packs/windglider_bp/scripts/jump-activation.js";

test("a quick second press after takeoff starts opening", () => {
  assert.equal(ACTIVATION_GAP_TICKS, 8);
  const first = decideOpeningPress({ currentTick: 100, canStart: false });
  assert.deepEqual(first, { allow: false, nextPressTick: 100 });
  const second = decideOpeningPress({ currentTick: 104, previousPressTick: first.nextPressTick, canStart: true });
  assert.equal(second.allow, true);
});

test("a later hop starts a new pair instead of opening the sail", () => {
  const secondHop = decideOpeningPress({ currentTick: 109, previousPressTick: 100, canStart: true, isFalling: true });
  assert.deepEqual(secondHop, { allow: false, nextPressTick: 109 });
  assert.equal(decideOpeningPress({ currentTick: 112, previousPressTick: 109, canStart: true }).allow, true);
});

test("a duplicate press in the same tick cannot open or reset the pair", () => {
  assert.deepEqual(decideOpeningPress({ currentTick: 100, previousPressTick: 100, canStart: true }), {
    allow: false,
    nextPressTick: 100,
  });
});

test("walking off a ledge still allows a single falling press", () => {
  assert.equal(decideOpeningPress({ currentTick: 250, canStart: true, isFalling: true }).allow, true);
  assert.equal(decideOpeningPress({ currentTick: 250, canStart: true, isFalling: false }).allow, false);
});

test("closing in mid-air permits reopening with one press", () => {
  assert.equal(decideOpeningPress({ currentTick: 400, canStart: true, reopenReady: true }).allow, true);
  assert.equal(decideOpeningPress({ currentTick: 400, canStart: false, reopenReady: true }).allow, false);
});

test("the activation window includes exactly eight ticks", () => {
  assert.equal(decideOpeningPress({ currentTick: 108, previousPressTick: 100, canStart: true }).allow, true);
  assert.equal(decideOpeningPress({ currentTick: 109, previousPressTick: 100, canStart: true }).allow, false);
});
