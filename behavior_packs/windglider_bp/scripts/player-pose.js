// A short one-shot pose expires on its own after flight or a disconnect.
export function updateGlidingPose(player, record, gliding) {
  if (!gliding) {
    record.glidingPoseTicks = 0;
    return;
  }
  const tick = record.glidingPoseTicks ?? 0;
  record.glidingPoseTicks = tick + 1;
  if (tick % 4 !== 0) return;
  try {
    player.playAnimation("animation.wind_glider.player_glide", { blendOutTime: 0 });
  } catch {
    // A visual failure must not affect flight or other players.
  }
}
