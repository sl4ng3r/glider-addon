const MIN_GLIDING_TICKS = 2;
const BLOCKED_FORWARD_DISTANCE = 0.12;
const WALL_CHECK_DISTANCE = 1;
const WALL_CHECK_HEIGHTS = [0.9, 1.5];
const SHOULDER_OFFSETS = [0, -0.26, 0.26];

// The Script API's velocity can still reflect our last impulse after a collision.
// Compare positions from consecutive ticks and confirm the obstacle with block rays.
export function hasWallContact(player, heading, previousLocation, glidingTicks) {
  if (glidingTicks < MIN_GLIDING_TICKS || !previousLocation) return false;
  try {
    const { x, y, z } = player.location;
    const forwardDistance = (x - previousLocation.x) * heading.x + (z - previousLocation.z) * heading.z;
    if (!Number.isFinite(forwardDistance) || forwardDistance >= BLOCKED_FORWARD_DISTANCE) return false;
    const direction = { x: heading.x, y: 0, z: heading.z };
    const options = {
      maxDistance: WALL_CHECK_DISTANCE,
      includeLiquidBlocks: false,
      includePassableBlocks: false,
    };
    return WALL_CHECK_HEIGHTS.some((height) => SHOULDER_OFFSETS.some((offset) =>
      Boolean(player.dimension.getBlockFromRay(
        { x: x + heading.z * offset, y: y + height, z: z - heading.x * offset },
        direction,
        options,
      ))));
  } catch {
    // Unloaded chunks or invalid player handles should not interrupt flight processing.
    return false;
  }
}
