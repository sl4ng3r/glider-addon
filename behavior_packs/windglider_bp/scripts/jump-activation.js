export const ACTIVATION_GAP_TICKS = 8;
export const LONG_FALL_TICKS = 16;

export function updateWallLockout({ wallLocked = false, hitWall = false, isOnGround = false }) {
  if (hitWall) return true;
  return isOnGround ? false : wallLocked;
}

export function advanceAirborneHistory(history, isOnGround) {
  if (isOnGround) return { airborneTicks: 0, wasOnGround: true, justLeftGround: false };
  return {
    airborneTicks: Math.min((history.airborneTicks ?? 0) + 1, LONG_FALL_TICKS),
    wasOnGround: false,
    justLeftGround: history.wasOnGround,
  };
}

// A short hop needs two presses; after a longer fall, one press is enough.
export function decideOpeningPress({ currentTick, previousPressTick, canStart, airborneTicks = 0, reopenReady = false, wallLocked = false }) {
  if (wallLocked) return { allow: false, nextPressTick: undefined };
  if (!canStart) return { allow: false, nextPressTick: currentTick };
  if (reopenReady || airborneTicks >= LONG_FALL_TICKS) {
    return { allow: true, nextPressTick: previousPressTick };
  }

  const gap = currentTick - previousPressTick;
  if (Number.isInteger(gap) && gap >= 1 && gap <= ACTIVATION_GAP_TICKS) {
    return { allow: true, nextPressTick: previousPressTick };
  }
  return {
    allow: false,
    nextPressTick: gap === 0 ? previousPressTick : currentTick,
  };
}
