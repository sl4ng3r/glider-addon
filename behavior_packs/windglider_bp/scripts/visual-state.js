const VISUAL_COOLDOWN_CATEGORY = "windglider_visual";

export function hideFoldedItem(player, hidden) {
  try {
    player.startItemCooldown(VISUAL_COOLDOWN_CATEGORY, hidden ? 4 : 0);
    return true;
  } catch {
    // The flight still works if cooldown visuals are unsupported by a client.
    return false;
  }
}
