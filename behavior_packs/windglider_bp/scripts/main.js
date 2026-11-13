import {
  ButtonState,
  InputButton,
  InputPermissionCategory,
  system,
  world,
} from "@minecraft/server";
import {
  GLIDER_STATES,
  createPlayerGliderState,
  handleJump,
  horizontalLookDirection,
  tickGlider,
} from "./flight.js";
import { updateGlidingPose } from "./player-pose.js";
import { ensureDisplay, positionDisplay } from "./display.js";
import { hasWallContact } from "./wall-collision.js";
import { sampleFireUpdraft } from "./fire-updraft.js";
import { ACTIVATION_GAP_TICKS, advanceAirborneHistory, decideOpeningPress, updateWallLockout } from "./jump-activation.js";

const GLIDER_ITEM_ID = "glider:glider";
const DISPLAY_ENTITY_ID = "glider:display";
const ACTIVE_TAG = "windglider_active";
const PERMISSION_CATEGORIES = [
  InputPermissionCategory.MoveForward,
  InputPermissionCategory.MoveBackward,
  InputPermissionCategory.MoveLeft,
  InputPermissionCategory.MoveRight,
];
const players = new Map();

function getRecord(player) {
  let record = players.get(player.id);
  if (!record) {
    record = {
      state: createPlayerGliderState(),
      displayEntity: undefined,
      displayRetryTicks: 0,
      displayErrorLogged: false,
      airborneTicks: 0,
      wasOnGround: true,
      justLeftGround: false,
      glidingTicks: 0,
      previousGlideLocation: undefined,
      previousJumpPressTick: undefined,
      reopenReady: false,
      wallLocked: false,
      thermalCache: undefined,
    };
    players.set(player.id, record);
  }
  return record;
}

function getHeldItem(player) {
  try {
    const inventory = player.getComponent("minecraft:inventory");
    return inventory?.container?.getItem(player.selectedSlotIndex);
  } catch {
    return undefined;
  }
}

function snapshot(player, history = {}) {
  let gameMode = "";
  let isRiding = false;
  try {
    gameMode = String(player.getGameMode() ?? "").toLowerCase();
  } catch {
    gameMode = "";
  }
  try {
    isRiding = Boolean(player.getComponent("minecraft:riding"));
  } catch {
    isRiding = false;
  }
  return {
    selectedGlider: getHeldItem(player)?.typeId === GLIDER_ITEM_ID,
    isOnGround: player.isOnGround,
    isInWater: player.isInWater,
    isFlying: player.isFlying,
    isSpectator: gameMode.includes("spectator"),
    isSwimming: player.isSwimming,
    isRiding,
    isElytraGliding: player.isGliding,
    airborneTicks: history.airborneTicks ?? 0,
    justLeftGround: Boolean(history.justLeftGround),
    viewDirection: player.getViewDirection(),
    yawDegrees: player.getRotation().y,
  };
}

function updateAirborneHistory(record, currentSnapshot) {
  Object.assign(record, advanceAirborneHistory(record, currentSnapshot.isOnGround));
}

function headingYaw(heading) {
  return (Math.atan2(-heading.x, heading.z) * 180) / Math.PI;
}

function playSound(player, soundId, volume = 0.7) {
  try {
    player.playSound(soundId, { volume, pitch: 1 });
  } catch {
    // Optional sound assets must never break flight logic.
  }
}

function saveAndLockMovement(player, state) {
  if (state.savedPermissions) return;
  const savedPermissions = new Map();
  for (const category of PERMISSION_CATEGORIES) {
    try {
      savedPermissions.set(category, player.inputPermissions.isPermissionCategoryEnabled(category));
      player.inputPermissions.setPermissionCategory(category, false);
    } catch {
      savedPermissions.set(category, undefined);
    }
  }
  state.savedPermissions = savedPermissions;
}

function restoreMovement(player, state) {
  if (!state.savedPermissions) return;
  for (const [category, enabled] of state.savedPermissions) {
    if (enabled === undefined) continue;
    try {
      player.inputPermissions.setPermissionCategory(category, enabled);
    } catch {
      // Player can be invalid during disconnect; a new session starts cleanly.
    }
  }
  state.savedPermissions = undefined;
}

function startSlowFalling(player, state) {
  if (!state.hadSlowFalling) {
    try {
      const effect = player.getEffect("slow_falling");
      if (effect) {
        state.hadSlowFalling = true;
        state.slowFallingAmplifier = effect.amplifier;
        state.slowFallingDuration = effect.duration;
      }
    } catch {
      // Effect APIs are best-effort; motion still works without the effect.
    }
  }
  try {
    player.addEffect("slow_falling", 5, {
      amplifier: Math.max(0, state.slowFallingAmplifier),
      showParticles: false,
    });
  } catch {
    // Applying velocity remains the fallback if an older client rejects effects.
  }
}

function stopSlowFalling(player, state) {
  try {
    if (state.hadSlowFalling) {
      player.addEffect("slow_falling", Math.max(1, state.slowFallingDuration), {
        amplifier: state.slowFallingAmplifier,
        showParticles: false,
      });
    } else {
      player.removeEffect("slow_falling");
    }
  } catch {
    // The player may already be gone.
  }
  state.hadSlowFalling = false;
  state.slowFallingDuration = 0;
  state.slowFallingAmplifier = 0;
}

function startGliding(player, record) {
  record.glidingTicks = 0;
  record.previousGlideLocation = undefined;
  saveAndLockMovement(player, record.state);
  startSlowFalling(player, record.state);
  try {
    player.addTag(ACTIVE_TAG);
  } catch {
    // Visual hiding is optional and must not affect movement.
  }
}

function closeDisplay(record, immediate = false) {
  const entity = record.displayEntity;
  record.displayEntity = undefined;
  record.displayRetryTicks = 0;
  record.displayErrorLogged = false;
  if (!entity?.isValid) return;
  try {
    if (immediate) {
      entity.remove();
      return;
    }
    entity.playAnimation("animation.wind_glider.close");
    system.runTimeout(() => {
      try {
        if (entity.isValid) entity.remove();
      } catch {
        // Entity was removed by the world already.
      }
    }, 5);
  } catch {
    try {
      entity.remove();
    } catch {
      // Ignore invalid cleanup handles.
    }
  }
}

function endFlight(player, record, immediateDisplay = false) {
  record.glidingTicks = 0;
  record.thermalCache = undefined;
  record.previousGlideLocation = undefined;
  record.previousJumpPressTick = undefined;
  record.reopenReady = false;
  updateGlidingPose(player, record, false);
  restoreMovement(player, record.state);
  stopSlowFalling(player, record.state);
  try {
    player.removeTag(ACTIVE_TAG);
  } catch {
    // The player can be invalid during disconnect.
  }
  closeDisplay(record, immediateDisplay);
  playSound(player, "windglider.close", 0.55);
  record.state = createPlayerGliderState();
}

function applyVelocity(player, velocity) {
  try {
    const current = player.getVelocity();
    player.applyImpulse({
      x: velocity.x - current.x,
      y: velocity.y - current.y,
      z: velocity.z - current.z,
    });
  } catch {
    // Invalid entities are removed by the next cleanup pass.
  }
}

function handleJumpPressed(player) {
  const record = getRecord(player);
  const currentSnapshot = snapshot(player, record);
  record.wallLocked = updateWallLockout({ wallLocked: record.wallLocked, isOnGround: currentSnapshot.isOnGround });
  if (record.state.state === GLIDER_STATES.IDLE) {
    const decision = decideOpeningPress({
      currentTick: system.currentTick,
      previousPressTick: record.previousJumpPressTick,
      canStart: currentSnapshot.selectedGlider && !currentSnapshot.isOnGround
        && currentSnapshot.airborneTicks > 0 && !currentSnapshot.justLeftGround,
      airborneTicks: currentSnapshot.airborneTicks,
      reopenReady: record.reopenReady,
      wallLocked: record.wallLocked,
    });
    if (!decision.allow) {
      record.previousJumpPressTick = decision.nextPressTick;
      return;
    }
  }
  const result = handleJump(record.state, currentSnapshot);
  if (result.type === "ignored") {
    record.previousJumpPressTick ??= system.currentTick;
    return;
  }
  record.state = result.state;
  if (result.type === "opening-started") {
    record.previousJumpPressTick = undefined;
    record.reopenReady = false;
    playSound(player, "windglider.open");
  } else if (result.type === "opening-cancelled" || result.type === "glider-closed") {
    endFlight(player, record);
    record.reopenReady = true;
  }
}

function tickPlayer(player) {
  const record = getRecord(player);
  const currentSnapshot = snapshot(player);
  updateAirborneHistory(record, currentSnapshot);
  record.wallLocked = updateWallLockout({ wallLocked: record.wallLocked, isOnGround: currentSnapshot.isOnGround });
  if (currentSnapshot.isOnGround || !currentSnapshot.selectedGlider) record.reopenReady = false;
  if (currentSnapshot.isOnGround && Number.isInteger(record.previousJumpPressTick)
      && system.currentTick - record.previousJumpPressTick > ACTIVATION_GAP_TICKS) {
    record.previousJumpPressTick = undefined;
  }
  if (record.state.state === GLIDER_STATES.IDLE) return;
  const movement = player.inputInfo.getMovementVector();
  const thermal = sampleFireUpdraft({
    dimension: player.dimension,
    playerLocation: player.location,
    currentTick: system.currentTick,
    cache: record.thermalCache,
    active: record.state.state === GLIDER_STATES.GLIDING,
  });
  record.thermalCache = thermal.cache;
  currentSnapshot.updraftStrength = thermal.strength;
  const result = tickGlider(record.state, currentSnapshot, movement);
  record.state = result.state;

  if (result.type === "ended") {
    endFlight(player, record);
    return;
  }
  if (result.type === "opened") {
    startGliding(player, record);
  }
  if (record.state.state === GLIDER_STATES.GLIDING) {
    if (hasWallContact(player, record.state.heading, record.previousGlideLocation, record.glidingTicks)) {
      endFlight(player, record, true);
      record.wallLocked = updateWallLockout({ wallLocked: record.wallLocked, hitWall: true });
      return;
    }
    updateGlidingPose(player, record, true, (error) => console.warn(`[windglider] player pose failed: ${error}`));
    applyVelocity(player, result.velocity ?? { x: 0, y: 0, z: 0 });
    record.previousGlideLocation = { ...player.location };
    record.glidingTicks++;
    startSlowFalling(player, record.state);
    if (record.state.openingTicks % 30 === 0) playSound(player, "windglider.wind", 0.12);
  }
  ensureDisplay(player, record, {
    entityId: DISPLAY_ENTITY_ID,
    animationId: record.state.state === GLIDER_STATES.OPENING ? "animation.wind_glider.open" : undefined,
    onError: (error) => console.warn(`[windglider] display creation failed: ${error}`),
  });
  positionDisplay(player, record, headingYaw(record.state.heading), record.state.heading);
}

function cleanupOrphans() {
  for (const dimensionId of ["overworld", "nether", "the_end"]) {
    try {
      const dimension = world.getDimension(dimensionId);
      for (const entity of dimension.getEntities({ type: DISPLAY_ENTITY_ID })) entity.remove();
    } catch {
      // A dimension may not be loaded yet.
    }
  }
}

world.afterEvents.playerButtonInput.subscribe((event) => {
  if (event.button !== InputButton.Jump || event.newButtonState !== ButtonState.Pressed) return;
  handleJumpPressed(event.player);
});

world.afterEvents.playerLeave.subscribe((event) => {
  for (const [playerId, record] of players) {
    if (playerId !== event.playerId) continue;
    closeDisplay(record);
    players.delete(playerId);
  }
});

system.run(() => cleanupOrphans());
system.runInterval(() => {
  const activeIds = new Set();
  for (const player of world.getAllPlayers()) {
    activeIds.add(player.id);
    try {
      tickPlayer(player);
    } catch (error) {
      console.warn(`[windglider] player tick failed: ${error}`);
    }
  }
  for (const [playerId, record] of players) {
    if (!activeIds.has(playerId)) {
      closeDisplay(record);
      players.delete(playerId);
    }
  }
}, 1);
