export const THERMAL_CONFIG = Object.freeze({
  innerRadius: 1.5,
  outerRadius: 2.5,
  fullHeight: 5,
  maxHeight: 8,
  scanIntervalTicks: 3,
  maxHorizontalOffset: 2,
  maxDepthBlocks: 8,
});

const LAVA_IDS = new Set(["minecraft:lava", "minecraft:flowing_lava"]);

function blockTypeId(block) {
  try {
    return block?.typeId;
  } catch {
    return undefined;
  }
}

function isAirBlock(block) {
  try {
    return typeof block?.typeId === "string" && block.isAir === true;
  } catch {
    return false;
  }
}

export function isActiveHeatSource(block) {
  const typeId = blockTypeId(block);
  if (typeId === "minecraft:fire" || LAVA_IDS.has(typeId)) return true;
  if (typeId !== "minecraft:campfire") return false;
  try {
    return block.permutation.getState("extinguished") === false;
  } catch {
    return false;
  }
}

function fade(value, full, limit) {
  if (value <= full) return 1;
  if (value >= limit) return 0;
  return (limit - value) / (limit - full);
}

export function updraftStrength(playerLocation, sourceLocation, config = THERMAL_CONFIG) {
  const distance = Math.hypot(playerLocation.x - sourceLocation.x - 0.5, playerLocation.z - sourceLocation.z - 0.5);
  const height = playerLocation.y - sourceLocation.y - 1;
  if (!Number.isFinite(distance) || !Number.isFinite(height) || height < 0) return 0;
  return fade(distance, config.innerRadius, config.outerRadius) * fade(height, config.fullHeight, config.maxHeight);
}

function safeBlock(dimension, location) {
  try {
    const range = dimension.heightRange;
    if (range && (location.y < range.min || location.y >= range.max)) return undefined;
    return dimension.getBlock(location);
  } catch {
    return undefined;
  }
}

function exposedSource(dimension, playerLocation, source) {
  if (!source || updraftStrength(playerLocation, source) <= 0) return false;
  if (!isActiveHeatSource(safeBlock(dimension, source))) return false;
  const top = Math.floor(playerLocation.y);
  for (let y = source.y + 1; y < top; y++) {
    if (!isAirBlock(safeBlock(dimension, { x: source.x, y, z: source.z }))) return false;
  }
  return true;
}

export function sampleFireUpdraft({ dimension, playerLocation, currentTick, cache, active }) {
  if (!active) return { strength: 0, cache: undefined };
  const head = safeBlock(dimension, {
    x: Math.floor(playerLocation.x), y: Math.floor(playerLocation.y) + 2, z: Math.floor(playerLocation.z),
  });
  if (!isAirBlock(head)) return { strength: 0, cache: undefined };

  if (cache?.dimensionId === dimension.id && currentTick < cache.nextScanTick) {
    const source = exposedSource(dimension, playerLocation, cache.source) ? cache.source : undefined;
    return {
      strength: source ? updraftStrength(playerLocation, source) : 0,
      cache: { ...cache, source },
    };
  }

  let strength = 0;
  let source;
  const baseX = Math.floor(playerLocation.x);
  const baseZ = Math.floor(playerLocation.z);
  const startY = Math.floor(playerLocation.y) - 1;
  for (let dx = -THERMAL_CONFIG.maxHorizontalOffset; dx <= THERMAL_CONFIG.maxHorizontalOffset; dx++) {
    for (let dz = -THERMAL_CONFIG.maxHorizontalOffset; dz <= THERMAL_CONFIG.maxHorizontalOffset; dz++) {
      const x = baseX + dx;
      const z = baseZ + dz;
      if (Math.hypot(playerLocation.x - x - 0.5, playerLocation.z - z - 0.5) >= THERMAL_CONFIG.outerRadius) continue;
      for (let depth = 0; depth < THERMAL_CONFIG.maxDepthBlocks; depth++) {
        const y = startY - depth;
        const block = safeBlock(dimension, { x, y, z });
        if (!block) break;
        if (isActiveHeatSource(block)) {
          const candidate = { x, y, z };
          const currentStrength = updraftStrength(playerLocation, candidate);
          if (currentStrength > strength) { strength = currentStrength; source = candidate; }
          break;
        }
        if (!isAirBlock(block)) break;
      }
    }
  }
  return { strength, cache: { dimensionId: dimension.id, source, nextScanTick: currentTick + THERMAL_CONFIG.scanIntervalTicks } };
}
