export const ACTIVATION_GAP_TICKS = 8;

// A ground jump arms a short second-press window. A fall without a jump can open directly.
export function decideOpeningPress({ currentTick, previousPressTick, canStart, isFalling = false, reopenReady = false }) {
  if (!canStart) return { allow: false, nextPressTick: currentTick };
  if (reopenReady || (previousPressTick === undefined && isFalling)) {
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
