import test from "node:test";
import assert from "node:assert/strict";
import { updateGlidingPose } from "../behavior_packs/windglider_bp/scripts/player-pose.js";

test("pose is refreshed during flight and not played while inactive", () => {
  const calls = [];
  const player = { playAnimation: (...args) => calls.push(args) };
  const record = {};
  for (let tick = 0; tick < 9; tick++) updateGlidingPose(player, record, true);
  assert.equal(calls.length, 3);
  assert.ok(calls.every(([name]) => name === "animation.wind_glider.player_glide"));
  updateGlidingPose(player, record, false);
  assert.equal(record.glidingPoseTicks, 0);
  assert.equal(calls.length, 3);
});
