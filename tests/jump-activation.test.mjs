import test from "node:test";
import assert from "node:assert/strict";
import { ACTIVATION_GAP_TICKS, LONG_FALL_TICKS, advanceAirborneHistory, decideOpeningPress } from "../behavior_packs/windglider_bp/scripts/jump-activation.js";

test("a quick second press after takeoff starts opening", () => {
  assert.equal(ACTIVATION_GAP_TICKS, 8);
  assert.equal(LONG_FALL_TICKS, 16);
  const first = decideOpeningPress({ currentTick: 100, canStart: false });
  assert.deepEqual(first, { allow: false, nextPressTick: 100 });
  const second = decideOpeningPress({ currentTick: 104, previousPressTick: first.nextPressTick, canStart: true });
  assert.equal(second.allow, true);
});

test("a later press during a short hop starts a new pair instead of opening the sail", () => {
  const secondHop = decideOpeningPress({ currentTick: 109, previousPressTick: 100, canStart: true, airborneTicks: LONG_FALL_TICKS - 1 });
  assert.deepEqual(secondHop, { allow: false, nextPressTick: 109 });
  assert.equal(decideOpeningPress({ currentTick: 112, previousPressTick: 109, canStart: true, airborneTicks: LONG_FALL_TICKS - 1 }).allow, true);
});

test("a duplicate press in the same tick cannot open or reset the pair", () => {
  assert.deepEqual(decideOpeningPress({ currentTick: 100, previousPressTick: 100, canStart: true }), {
    allow: false,
    nextPressTick: 100,
  });
});

test("a long fall opens with one press even after the takeoff window expired", () => {
  assert.equal(decideOpeningPress({ currentTick: 250, previousPressTick: 100, canStart: true, airborneTicks: LONG_FALL_TICKS - 1 }).allow, false);
  assert.equal(decideOpeningPress({ currentTick: 251, previousPressTick: 100, canStart: true, airborneTicks: LONG_FALL_TICKS }).allow, true);
  assert.equal(decideOpeningPress({ currentTick: 252, canStart: true, airborneTicks: LONG_FALL_TICKS }).allow, true);
});

test("a short fall from a ledge needs two presses", () => {
  const first = decideOpeningPress({ currentTick: 250, canStart: true, airborneTicks: 3 });
  assert.equal(first.allow, false);
  assert.equal(decideOpeningPress({ currentTick: 254, previousPressTick: first.nextPressTick, canStart: true, airborneTicks: 7 }).allow, true);
});

test("airborne time keeps counting across item selection and resets on landing", () => {
  let history = { airborneTicks: 0, wasOnGround: true };
  for (let tick = 0; tick < LONG_FALL_TICKS; tick++) {
    history = advanceAirborneHistory(history, false);
  }
  assert.equal(history.airborneTicks, LONG_FALL_TICKS);
  assert.equal(history.justLeftGround, false);
  history = advanceAirborneHistory(history, true);
  assert.deepEqual(history, { airborneTicks: 0, wasOnGround: true, justLeftGround: false });
});

test("closing in mid-air permits reopening with one press", () => {
  assert.equal(decideOpeningPress({ currentTick: 400, canStart: true, reopenReady: true }).allow, true);
  assert.equal(decideOpeningPress({ currentTick: 400, canStart: false, reopenReady: true }).allow, false);
});

test("the activation window includes exactly eight ticks", () => {
  assert.equal(decideOpeningPress({ currentTick: 108, previousPressTick: 100, canStart: true }).allow, true);
  assert.equal(decideOpeningPress({ currentTick: 109, previousPressTick: 100, canStart: true }).allow, false);
});
