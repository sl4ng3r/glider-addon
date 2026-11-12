import test from "node:test";
import assert from "node:assert/strict";
import {
  GLIDER_CONFIG,
  GLIDER_STATES,
  createPlayerGliderState,
  handleJump,
  tickGlider,
} from "../src/flight/GliderStateMachine.mjs";
import * as runtime from "../behavior_packs/windglider_bp/scripts/flight.js";
import { readFileSync } from "node:fs";

const airborne = {
  selectedGlider: true,
  isOnGround: false,
  airborneTicks: 2,
  justLeftGround: false,
  isInWater: false,
  isFlying: false,
  isSpectator: false,
  isSwimming: false,
  isRiding: false,
  isElytraGliding: false,
  viewDirection: { x: 0, y: -0.2, z: 1 },
  yawDegrees: 0,
};

test("the first jump from the ground does not start the glider", () => {
  const state = createPlayerGliderState();
  const fromGround = handleJump(state, { ...airborne, airborneTicks: 0 });
  assert.equal(fromGround.type, "ignored");
  assert.equal(fromGround.state.state, GLIDER_STATES.IDLE);

  const duringTakeoff = handleJump(state, { ...airborne, airborneTicks: 1, justLeftGround: true });
  assert.equal(duringTakeoff.type, "ignored");
  assert.equal(duringTakeoff.state.state, GLIDER_STATES.IDLE);
});

test("flight tuning and opening animation agree with the runtime pack", () => {
  assert.deepEqual(runtime.GLIDER_CONFIG, GLIDER_CONFIG);
  assert.equal(GLIDER_CONFIG.openingTicks, 6);
  assert.equal(GLIDER_CONFIG.forwardSpeed, 7 / 20);
  assert.equal(GLIDER_CONFIG.descentSpeed, 1.5 / 20);
  assert.equal(GLIDER_CONFIG.maxTurnRate, 16 * Math.PI / 180 / 20);
  assert.equal(GLIDER_CONFIG.cameraTurnRate, 8 * Math.PI / 180 / 20);
  const animations = JSON.parse(readFileSync(new URL("../resource_packs/windglider_rp/animations/wind_glider.animation.json", import.meta.url), "utf8"));
  const opening = animations.animations["animation.wind_glider.open"];
  assert.equal(opening.animation_length, GLIDER_CONFIG.openingTicks / GLIDER_CONFIG.ticksPerSecond);
  assert.deepEqual(opening.bones.root.scale[String(opening.animation_length)], [1, 1, 1]);
});

test("jump starts a 6 tick opening phase after the player is airborne", () => {
  let state = createPlayerGliderState();
  let result = handleJump(state, airborne);
  assert.equal(result.type, "opening-started");
  state = result.state;
  for (let tick = 1; tick < GLIDER_CONFIG.openingTicks; tick += 1) {
    result = tickGlider(state, airborne, { x: 0, y: 1 });
    state = result.state;
    assert.equal(result.type, "opening");
    assert.equal(result.velocity.y, 0);
  }
  result = tickGlider(state, airborne);
  assert.equal(result.type, "opened");
  assert.equal(result.state.state, GLIDER_STATES.GLIDING);
});

test("a second jump cancels opening and a third closes flight", () => {
  let state = handleJump(createPlayerGliderState(), airborne).state;
  state = handleJump(state, airborne).state;
  assert.equal(state.state, GLIDER_STATES.IDLE);
  state = handleJump(createPlayerGliderState(), airborne).state;
  for (let i = 0; i < GLIDER_CONFIG.openingTicks; i += 1) state = tickGlider(state, airborne).state;
  assert.equal(state.state, GLIDER_STATES.GLIDING);
  state = handleJump(state, airborne).state;
  assert.equal(state.state, GLIDER_STATES.IDLE);
});

test("gliding always moves forward and loses height", () => {
  let state = handleJump(createPlayerGliderState(), airborne).state;
  for (let i = 0; i < GLIDER_CONFIG.openingTicks; i += 1) state = tickGlider(state, airborne).state;
  const neutral = tickGlider(state, airborne, { x: 0, y: 0 });
  const forward = tickGlider(state, airborne, { x: 0, y: 1 });
  const backward = tickGlider(state, airborne, { x: 0, y: -1 });
  assert.deepEqual(forward.velocity, neutral.velocity);
  assert.deepEqual(backward.velocity, neutral.velocity);
  assert.equal(neutral.velocity.y, -GLIDER_CONFIG.descentSpeed);
  assert.ok(neutral.velocity.z > 0);
});

test("left and right steer in opposite directions", () => {
  let state = handleJump(createPlayerGliderState(), airborne).state;
  for (let i = 0; i < GLIDER_CONFIG.openingTicks; i += 1) state = tickGlider(state, airborne).state;
  const left = tickGlider(state, airborne, { x: 1, y: 0 });
  const right = tickGlider(state, airborne, { x: -1, y: 0 });
  assert.ok(left.state.heading.x > 0);
  assert.ok(right.state.heading.x < 0);
  assert.ok(runtime.tickGlider(state, airborne, { x: 1, y: 0 }).state.heading.x > 0);
  assert.ok(runtime.tickGlider(state, airborne, { x: -1, y: 0 }).state.heading.x < 0);
  assert.equal(left.velocity.y, right.velocity.y);
  assert.ok(Math.abs(Math.hypot(left.state.heading.x, left.state.heading.z) - 1) < 1e-12);
});

test("camera turns flight gradually without altering sink, on both implementations", () => {
  for (const implementation of [{ createPlayerGliderState, handleJump, tickGlider }, runtime]) {
    let state = implementation.handleJump(implementation.createPlayerGliderState(), airborne).state;
    for (let i = 0; i < GLIDER_CONFIG.openingTicks; i++) state = implementation.tickGlider(state, airborne).state;
    const cameraRight = { ...airborne, viewDirection: { x: 1, y: 0.9, z: 0 } };
    const result = implementation.tickGlider(state, cameraRight, { x: 0, y: 0 });
    assert.ok(result.state.heading.x > 0);
    assert.ok(result.state.heading.x <= Math.sin(GLIDER_CONFIG.cameraTurnRate) + 1e-12);
    assert.equal(result.velocity.y, -GLIDER_CONFIG.descentSpeed);
    const manual = implementation.tickGlider(state, cameraRight, { x: -1, y: 0 });
    assert.ok(manual.state.heading.x < 0);
    const vertical = implementation.tickGlider(state, { ...airborne, viewDirection: { x: 0, y: 1, z: 0 } });
    assert.deepEqual(vertical.state.heading, state.heading);
  }
});

test("airborne checks prevent activation and end an active flight", () => {
  const grounded = { ...airborne, isOnGround: true };
  const ignored = handleJump(createPlayerGliderState(), grounded);
  assert.equal(ignored.type, "ignored");
  let state = handleJump(createPlayerGliderState(), airborne).state;
  const ended = tickGlider(state, { ...airborne, selectedGlider: false });
  assert.equal(ended.type, "ended");
  assert.equal(ended.state.state, GLIDER_STATES.IDLE);
});
