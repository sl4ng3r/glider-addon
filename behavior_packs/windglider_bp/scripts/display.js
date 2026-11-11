const RETRY_TICKS = 20;
export const DISPLAY_Y_OFFSET = 1.6;
export const DISPLAY_LEAD_DISTANCE = 0.3;

export function ensureDisplay(player, record, { entityId, animationId, onError = () => {} }) {
  if (record.displayEntity?.isValid) return true;
  if (record.displayRetryTicks > 0) {
    record.displayRetryTicks--;
    return false;
  }

  let entity;
  try {
    const location = player.location;
    entity = player.dimension.spawnEntity(entityId, {
      x: location.x,
      y: location.y + DISPLAY_Y_OFFSET,
      z: location.z,
    });
  } catch (error) {
    record.displayRetryTicks = RETRY_TICKS;
    if (!record.displayErrorLogged) onError(error);
    record.displayErrorLogged = true;
    return false;
  }

  record.displayEntity = entity;
  record.displayRetryTicks = 0;
  record.displayErrorLogged = false;
  if (animationId) {
    try {
      entity.playAnimation(animationId);
    } catch (error) {
      // The geometry remains useful even when a one-off animation is rejected.
      onError(error);
    }
  }
  return true;
}

export function positionDisplay(player, record, yaw, heading = { x: 0, z: 0 }, onError = () => {}) {
  const entity = record.displayEntity;
  if (!entity?.isValid) {
    record.displayEntity = undefined;
    return false;
  }
  try {
    const location = player.location;
    entity.teleport(
      {
        x: location.x + heading.x * DISPLAY_LEAD_DISTANCE,
        y: location.y + DISPLAY_Y_OFFSET,
        z: location.z + heading.z * DISPLAY_LEAD_DISTANCE,
      },
      { rotation: { x: 0, y: yaw } },
    );
    return true;
  } catch (error) {
    onError(error);
    if (!entity.isValid) record.displayEntity = undefined;
    return false;
  }
}
