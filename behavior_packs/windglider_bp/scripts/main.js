import {
  ButtonState,
  InputButton,
  InputPermissionCategory,
  system,
  world,
} from "@minecraft/server";
import {
  GLIDER_CONFIG,
  GLIDER_STATES,
  createPlayerGliderState,
  handleJump,
  horizontalLookDirection,
  tickGlider,
} from "./flight.js";
import { updateGlidingPose } from "./player-pose.js";

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
      airborneTicks: 0,
      wasOnGround: true,
      justLeftGround: false,
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
  if (!currentSnapshot.selectedGlider || currentSnapshot.isOnGround) {
    record.airborneTicks = 0;
    record.wasOnGround = currentSnapshot.isOnGround;
    record.justLeftGround = false;
    return;
  }

  record.justLeftGround = record.wasOnGround;
  record.wasOnGround = false;
  record.airborneTicks = Math.min(record.airborneTicks + 1, 2);
}

function headingYaw(heading) {
  return (Math.atan2(-heading.x, heading.z) * 180) / Math.PI;
}

function showActionBar(player, message) {
  try {
    player.onScreenDisplay.setActionBar(message);
  } catch {
    // The player may have left between the tick and the display update.
  }
}

function showTranslation(player, key, trailingText = "") {
  showActionBar(player, {
    rawtext: [
      { translate: key },
      ...(trailingText ? [{ text: trailingText }] : []),
    ],
  });
}

function playSound(player, soundId, volume = 0.7) {
  try {
    player.playSound(soundId, { volume, pitch: 1 });
  } catch {
    // Optional sound assets must never break flight logic.
  }
}

function spawnDisplay(player, record) {
  if (record.displayEntity?.isValid) return;
  try {
    const location = player.location;
    const entity = player.dimension.spawnEntity(DISPLAY_ENTITY_ID, {
      x: location.x,
      y: location.y + 1.8,
      z: location.z,
    });
    record.displayEntity = entity;
    entity.playAnimation("animation.wind_glider.open");
    playSound(player, "windglider.open");
  } catch {
    record.displayEntity = undefined;
  }
}

function updateDisplay(player, record) {
  const entity = record.displayEntity;
  if (!entity?.isValid) return;
  try {
    const location = player.location;
    entity.teleport(
      {
        x: location.x,
        y: location.y + 1.8,
        z: location.z,
      },
      { rotation: { x: 0, y: headingYaw(record.state.heading) } },
    );
  } catch {
    record.displayEntity = undefined;
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
  saveAndLockMovement(player, record.state);
  startSlowFalling(player, record.state);
  try {
    player.addTag(ACTIVE_TAG);
  } catch {
    // Visual hiding is optional and must not affect movement.
  }
  playSound(player, "windglider.open", 0.45);
}

function closeDisplay(record) {
  const entity = record.displayEntity;
  record.displayEntity = undefined;
  if (!entity?.isValid) return;
  try {
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

function endFlight(player, record) {
  updateGlidingPose(player, record, false);
  restoreMovement(player, record.state);
  stopSlowFalling(player, record.state);
  try {
    player.removeTag(ACTIVE_TAG);
  } catch {
    // The player can be invalid during disconnect.
  }
  closeDisplay(record);
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
  const result = handleJump(record.state, snapshot(player, record));
  if (result.type === "ignored") return;
  record.state = result.state;
  if (result.type === "opening-started") {
    spawnDisplay(player, record);
    showTranslation(player, "windglider.opening", " …");
  } else if (result.type === "opening-cancelled" || result.type === "glider-closed") {
    endFlight(player, record);
  }
}

function tickPlayer(player) {
  const record = getRecord(player);
  const currentSnapshot = snapshot(player);
  updateAirborneHistory(record, currentSnapshot);
  if (currentSnapshot.selectedGlider && !record.state.hintShown) {
    showTranslation(player, "windglider.hint");
    record.state.hintShown = true;
  }

  if (record.state.state === GLIDER_STATES.IDLE) return;
  const movement = player.inputInfo.getMovementVector();
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
    updateGlidingPose(player, record, true);
    applyVelocity(player, result.velocity ?? { x: 0, y: 0, z: 0 });
    startSlowFalling(player, record.state);
    if (record.state.openingTicks % 30 === 0) playSound(player, "windglider.wind", 0.12);
  } else if (record.state.state === GLIDER_STATES.OPENING) {
    const progress = Math.min(9, Math.floor((record.state.openingTicks / GLIDER_CONFIG.openingTicks) * 10));
    showTranslation(player, "windglider.opening", ` ${"▰".repeat(progress)}${"▱".repeat(10 - progress)}`);
  }
  updateDisplay(player, record);
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
