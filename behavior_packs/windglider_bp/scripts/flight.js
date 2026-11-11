export const GLIDER_STATES = Object.freeze({
  IDLE: "idle",
  OPENING: "opening",
  GLIDING: "gliding",
});

export const GLIDER_CONFIG = Object.freeze({
  ticksPerSecond: 20,
  openingTicks: 10,
  forwardSpeed: 6 / 20,
  descentSpeed: 1.7 / 20,
  maxTurnRate: (45 * Math.PI) / 180 / 20,
  inputDeadzone: 0.2,
});

const EPSILON = 1e-8;

function normalizeHorizontal(vector) {
  const length = Math.hypot(vector.x, vector.z);
  if (length < EPSILON) return { x: 0, z: 1 };
  return { x: vector.x / length, z: vector.z / length };
}

function rotateHeading(heading, radians) {
  const cosine = Math.cos(radians);
  const sine = Math.sin(radians);
  return normalizeHorizontal({
    x: heading.x * cosine - heading.z * sine,
    z: heading.x * sine + heading.z * cosine,
  });
}

export function horizontalLookDirection(viewDirection, fallbackYawDegrees = 0) {
  const length = Math.hypot(viewDirection?.x ?? 0, viewDirection?.z ?? 0);
  if (length >= EPSILON) return normalizeHorizontal(viewDirection);
  const radians = (fallbackYawDegrees * Math.PI) / 180;
  return normalizeHorizontal({ x: -Math.sin(radians), z: Math.cos(radians) });
}

export function createPlayerGliderState() {
  return {
    state: GLIDER_STATES.IDLE,
    openingTicks: 0,
    heading: { x: 0, z: 1 },
    savedPermissions: undefined,
    hadSlowFalling: false,
    slowFallingAmplifier: 0,
    slowFallingDuration: 0,
    hintShown: false,
  };
}

function canStart(snapshot) {
  return Boolean(
    snapshot?.selectedGlider &&
      !snapshot.isOnGround &&
      Number(snapshot.airborneTicks) > 0 &&
      !snapshot.justLeftGround &&
      !snapshot.isInWater &&
      !snapshot.isFlying &&
      !snapshot.isSpectator &&
      !snapshot.isSwimming &&
      !snapshot.isRiding &&
      !snapshot.isElytraGliding,
  );
}

export function handleJump(state, snapshot) {
  if (state.state === GLIDER_STATES.IDLE) {
    if (!canStart(snapshot)) return { type: "ignored", state };
    return {
      type: "opening-started",
      state: {
        ...state,
        state: GLIDER_STATES.OPENING,
        openingTicks: 0,
        heading: horizontalLookDirection(snapshot.viewDirection, snapshot.yawDegrees),
      },
    };
  }
  if (state.state === GLIDER_STATES.OPENING) {
    return { type: "opening-cancelled", state: { ...state, state: GLIDER_STATES.IDLE, openingTicks: 0 } };
  }
  return { type: "glider-closed", state: { ...state, state: GLIDER_STATES.IDLE, openingTicks: 0 } };
}

export function tickGlider(state, snapshot, input = { x: 0, y: 0 }) {
  if (state.state === GLIDER_STATES.IDLE) return { type: "idle", state };
  if (!snapshot?.selectedGlider || snapshot.isOnGround || snapshot.isInWater || snapshot.isFlying || snapshot.isSpectator || snapshot.isSwimming || snapshot.isRiding || snapshot.isElytraGliding) {
    return { type: "ended", state: { ...state, state: GLIDER_STATES.IDLE, openingTicks: 0 } };
  }
  if (state.state === GLIDER_STATES.OPENING) {
    const openingTicks = state.openingTicks + 1;
    if (openingTicks < GLIDER_CONFIG.openingTicks) return { type: "opening", state: { ...state, openingTicks }, velocity: { x: 0, y: 0, z: 0 } };
    return { type: "opened", state: { ...state, state: GLIDER_STATES.GLIDING, openingTicks: GLIDER_CONFIG.openingTicks }, velocity: { x: 0, y: 0, z: 0 } };
  }
  const rawTurn = Number.isFinite(input?.x) ? input.x : 0;
  const turnInput = Math.abs(rawTurn) < GLIDER_CONFIG.inputDeadzone ? 0 : Math.max(-1, Math.min(1, rawTurn));
  const heading = turnInput === 0 ? state.heading : rotateHeading(state.heading, turnInput * GLIDER_CONFIG.maxTurnRate);
  return {
    type: "gliding",
    state: { ...state, heading },
    velocity: { x: heading.x * GLIDER_CONFIG.forwardSpeed, y: -GLIDER_CONFIG.descentSpeed, z: heading.z * GLIDER_CONFIG.forwardSpeed },
  };
}
