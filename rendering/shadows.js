import * as CONST from '../constants.js';

export function getObjectX(obj, road, w, h) {
  const pos = road.getRoadPosAt(obj.z, w, h);
  if (obj.type === 'env') {
    const sideMultiplier = obj.data.side === 'left' ? -1 : 1;
    return pos.x + (w * obj.data.offset * sideMultiplier * pos.scale);
  } else {
    const currentRoadWidth = w * road.roadWidth * pos.scale;
    const laneOffset = obj.data.lane === 'right' ? (currentRoadWidth * 0.25) : (-currentRoadWidth * 0.25);
    return pos.x + laneOffset;
  }
}

export function isInShadow(caster, receiver, road, w, h, lightDir) {
  if (receiver.z <= caster.z) return false;
  
  const shadowAngle = lightDir.azimuth - road.heading;
  const dx = Math.cos(shadowAngle);
  
  const casterX = getObjectX(caster, road, w, h);
  const receiverX = getObjectX(receiver, road, w, h);
  
  const diff = receiverX - casterX;
  const expectedDiff = dx * (receiver.z - caster.z) * 0.1;
  
  return Math.abs(diff - expectedDiff) < 100;
}

export function renderShadows(ctx, w, h, state, lightDir, horizonY) {
  const allObjects = [];
  
  state.environment.features.forEach(f => {
    const relDist = f.distance - state.road.distance;
    if (relDist > 0 && relDist < 500) {
      allObjects.push({ type: 'env', data: f, z: relDist });
    }
  });
  
  state.traffic.vehicles.forEach(v => {
    if (v.distance > 0 && v.distance < 500) {
      allObjects.push({ type: 'traffic', data: v, z: v.distance });
    }
  });
  
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  
  allObjects.forEach(obj => {
    if (obj.type === 'env') {
      renderEnvShadow(ctx, w, h, obj.data, state.road, lightDir, horizonY);
    } else {
      renderVehicleShadow(ctx, w, h, obj.data, state.road, lightDir, horizonY);
    }
  });
}

function renderEnvShadow(ctx, w, h, f, road, lightDir, horizonY) {
  const relDist = f.distance - road.distance;
  const pos = road.getRoadPosAt(relDist, w, h);
  if (pos.scale <= 0 || pos.y < horizonY) return;

  const sideMultiplier = f.side === 'left' ? -1 : 1;
  const x = pos.x + (w * f.offset * sideMultiplier * pos.scale);
  const y = pos.y;
  
  let objWidth, objHeight;
  if (f.type === 'tree' || f.type === 'bush') {
    objWidth = f.width * CONST.ENV_GLOBAL_SCALE * pos.scale;
    objHeight = f.height * CONST.ENV_GLOBAL_SCALE * pos.scale;
  } else if (f.type === 'lightpole') {
    objWidth = 3 * pos.scale;
    objHeight = f.height * CONST.ENV_GLOBAL_SCALE * pos.scale;
  } else if (f.type === 'building') {
    objWidth = f.width * CONST.ENV_GLOBAL_SCALE * pos.scale;
    objHeight = f.height * CONST.ENV_GLOBAL_SCALE * pos.scale;
  } else return;
  
  const shadowAngle = lightDir.azimuth - road.heading;
  const shadowLength = objHeight / Math.tan(lightDir.elevation);
  const dx = Math.cos(shadowAngle) * shadowLength * pos.scale;
  const dy = Math.sin(shadowAngle) * shadowLength * pos.scale * 0.3;
  
  ctx.save();
  ctx.globalAlpha = 0.3;
  ctx.fillRect(x + dx - objWidth/2, y + dy, objWidth, 6 * pos.scale);
  ctx.restore();
}

function renderVehicleShadow(ctx, w, h, v, road, lightDir, horizonY) {
  const pos = road.getRoadPosAt(v.distance, w, h);
  if (pos.scale <= 0 || pos.y < horizonY) return;
  
  const currentRoadWidth = w * road.roadWidth * pos.scale;
  const laneOffset = v.lane === 'right' ? (currentRoadWidth * 0.25) : (-currentRoadWidth * 0.25);
  const x = pos.x + laneOffset;
  const y = pos.y;
  
  const size = CONST.TRAFFIC_SIZE_SCALE * pos.scale;
  const carWidth = size * 1.4;
  const carHeight = size * 0.7 * v.height;
  
  const shadowAngle = lightDir.azimuth - road.heading;
  const shadowLength = carHeight / Math.tan(lightDir.elevation);
  const dx = Math.cos(shadowAngle) * shadowLength * pos.scale;
  const dy = Math.sin(shadowAngle) * shadowLength * pos.scale * 0.3;
  
  ctx.save();
  ctx.globalAlpha = 0.3;
  ctx.fillRect(x + dx - carWidth/2, y + dy, carWidth, 4 * pos.scale);
  ctx.restore();
}