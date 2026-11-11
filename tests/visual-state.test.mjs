import test from "node:test";
import assert from "node:assert/strict";
import { hideFoldedItem } from "../behavior_packs/windglider_bp/scripts/visual-state.js";

test("the visual cooldown hides only during flight and is cleared afterward", () => {
  const calls = [];
  const player = { startItemCooldown: (...args) => calls.push(args) };
  assert.equal(hideFoldedItem(player, true), true);
  assert.equal(hideFoldedItem(player, true), true);
  assert.equal(hideFoldedItem(player, false), true);
  assert.deepEqual(calls, [
    ["windglider_visual", 4],
    ["windglider_visual", 4],
    ["windglider_visual", 0],
  ]);
});

test("unsupported cooldown visuals do not interrupt flight", () => {
  assert.equal(hideFoldedItem({ startItemCooldown: () => { throw new Error("unsupported"); } }, true), false);
});
