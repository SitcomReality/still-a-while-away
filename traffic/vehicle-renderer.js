import * as CONST from '../constants.js';
import { lerpColor } from '../utils.js';
import { adjustBrightness, bilinearMap, drawQuad, renderGlow } from '../environment/renderers/utils.js';

export function renderVehicle(ctx, v, w, h, road, fog) {
  const visibility = Math.min(1, Math.max(0, (CONST.TRAFFIC_RENDER_LIMIT - v.distance) / CONST.FADE_IN_DISTANCE));
  const scaleFactor = visibility;
  
  ctx.save();
  
  if (visibility < 1.0) {
    const roadW = CONST.ROAD_WIDTH;
    const laneOffset = v.lane === 'right' ? roadW * 0.25 : -roadW * 0.25;
    const pos = road.projectPoint(laneOffset, 0, v.distance, w, h);
    
    const objHeight = v.height;
    const pixelHeight = objHeight * pos.scale * CONST.ENV_GLOBAL_SCALE * scaleFactor;
    const risingOffset = (1 - visibility) * pixelHeight;

    // Clip before translating so the mask stays fixed relative to the road ground
    ctx.beginPath();
    ctx.rect(0, 0, w, pos.y);
    ctx.clip();

    ctx.translate(0, risingOffset);
  }

  if (v.distance < 250) {
    renderVehicle3D(ctx, w, h, v, road, scaleFactor, fog);
  } else {
    renderVehicleLOD(ctx, w, h, v, road, scaleFactor, fog);
  }
  
  ctx.restore();
}

function renderVehicleLOD(ctx, w, h, v, road, fadeScale = 1.0, fog) {
  const roadW = CONST.ROAD_WIDTH;
  const laneOffset = v.lane === 'right' ? roadW * 0.25 : -roadW * 0.25;
  
  const baseH = v.height * 0.6 * fadeScale;
  const cabinH = v.height * 0.4 * fadeScale;
  const carWidth = v.width * fadeScale; 
  const cabinWidth = carWidth * 0.8;

  // Base Quad
  const nbl = road.projectPoint(laneOffset - carWidth/2, 0, v.distance, w, h);
  const nbr = road.projectPoint(laneOffset + carWidth/2, 0, v.distance, w, h);
  const ntl = road.projectPoint(laneOffset - carWidth/2, baseH, v.distance, w, h);
  const ntr = road.projectPoint(laneOffset + carWidth/2, baseH, v.distance, w, h);
  
  // Cabin Quad
  const cnbl = road.projectPoint(laneOffset - cabinWidth/2, baseH, v.distance, w, h);
  const cnbr = road.projectPoint(laneOffset + cabinWidth/2, baseH, v.distance, w, h);
  const cntl = road.projectPoint(laneOffset - cabinWidth/2, baseH + cabinH, v.distance, w, h);
  const cntr = road.projectPoint(laneOffset + cabinWidth/2, baseH + cabinH, v.distance, w, h);

  if (nbl.scale <= 0) return;

  const baseNearQuad = [nbl, nbr, ntr, ntl];
  const cabinNearQuad = [cnbl, cnbr, cntr, cntl];
  
  const fogFactor = Math.min(1, Math.max(0, ((v.distance / CONST.TRAFFIC_RENDER_LIMIT) * 1.25) / (1.05 - fog.intensity)));
  
  renderVehicleSilhouette(ctx, baseNearQuad, v, fog, fogFactor, false);
  renderVehicleSilhouette(ctx, cabinNearQuad, v, fog, fogFactor, true, true);
  
  renderLights(ctx, baseNearQuad, v, 1.0, fadeScale, fog, fogFactor);
}

function renderVehicle3D(ctx, w, h, v, road, fadeScale = 1.0, fog) {
  const zNear = Math.max(0.1, v.distance);
  const zFar = v.distance + v.depth;
  const curveRef = v.distance;
  
  const roadW = CONST.ROAD_WIDTH;
  const laneOffset = v.lane === 'right' ? roadW * 0.25 : -roadW * 0.25;

  const baseH = v.height * 0.6 * fadeScale;
  const cabinH = v.height * 0.4 * fadeScale;
  const totalH = (v.height) * fadeScale;
  
  const baseW = v.width * fadeScale;
  const cabinW = baseW * 0.8;
  const cabinZNear = zNear + v.depth * 0.2;
  const cabinZFar = zFar - v.depth * 0.2;

  const lOff = laneOffset - baseW/2;
  const rOff = laneOffset + baseW/2;
  const clOff = laneOffset - cabinW/2;
  const crOff = laneOffset + cabinW/2;

  // Base Corners
  const nbl = road.projectPoint(lOff, 0, zNear, w, h, curveRef);
  const nbr = road.projectPoint(rOff, 0, zNear, w, h, curveRef);
  const ntl = road.projectPoint(lOff, baseH, zNear, w, h, curveRef);
  const ntr = road.projectPoint(rOff, baseH, zNear, w, h, curveRef);
  const fbl = road.projectPoint(lOff, 0, zFar, w, h, curveRef);
  const fbr = road.projectPoint(rOff, 0, zFar, w, h, curveRef);
  const ftl = road.projectPoint(lOff, baseH, zFar, w, h, curveRef);
  const ftr = road.projectPoint(rOff, baseH, zFar, w, h, curveRef);

  // Cabin Corners
  const cnbl = road.projectPoint(clOff, baseH, cabinZNear, w, h, curveRef);
  const cnbr = road.projectPoint(crOff, baseH, cabinZNear, w, h, curveRef);
  const cntl = road.projectPoint(clOff, totalH, cabinZNear, w, h, curveRef);
  const cntr = road.projectPoint(crOff, totalH, cabinZNear, w, h, curveRef);
  const cfbl = road.projectPoint(clOff, baseH, cabinZFar, w, h, curveRef);
  const cfbr = road.projectPoint(crOff, baseH, cabinZFar, w, h, curveRef);
  const cftl = road.projectPoint(clOff, totalH, cabinZFar, w, h, curveRef);
  const cftr = road.projectPoint(clOff, totalH, cabinZFar, w, h, curveRef);

  const fogFactor = Math.min(1, Math.max(0, ((v.distance / CONST.TRAFFIC_RENDER_LIMIT) * 1.25) / (1.05 - fog.intensity)));

  // Render Base Box
  ctx.fillStyle = lerpColor(adjustBrightness(v.color, -40), fog.color, fogFactor);
  drawQuad(ctx, [fbl, fbr, ftr, ftl]);
  ctx.fillStyle = lerpColor(adjustBrightness(v.color, -20), fog.color, fogFactor);
  if (nbl.x > fbl.x) drawQuad(ctx, [nbl, fbl, ftl, ntl]);
  if (nbr.x < fbr.x) drawQuad(ctx, [nbr, fbr, ftr, ntr]);
  ctx.fillStyle = lerpColor(adjustBrightness(v.color, 10), fog.color, fogFactor);
  drawQuad(ctx, [ntl, ntr, ftr, ftl]);

  // Render Cabin Box
  ctx.fillStyle = lerpColor(adjustBrightness(v.color, -35), fog.color, fogFactor);
  drawQuad(ctx, [cfbl, cfbr, cftr, cftl]);
  ctx.fillStyle = lerpColor(adjustBrightness(v.color, -15), fog.color, fogFactor);
  if (cnbl.x > cfbl.x) drawQuad(ctx, [cnbl, cfbl, cftl, cntl]);
  if (cnbr.x < cfbr.x) drawQuad(ctx, [cnbr, cfbr, cftr, cntr]);
  ctx.fillStyle = lerpColor(adjustBrightness(v.color, 25), fog.color, fogFactor);
  drawQuad(ctx, [cntl, cntr, cftr, cftl]);

  const baseNearQuad = [nbl, nbr, ntr, ntl];
  const cabinNearQuad = [cnbl, cnbr, cntr, cntl];

  renderVehicleSilhouette(ctx, baseNearQuad, v, fog, fogFactor, false);
  renderVehicleSilhouette(ctx, cabinNearQuad, v, fog, fogFactor, true, true);

  const futureCurve = road.getCurveAt(v.distance + 20);
  const currentCurve = road.getCurveAt(v.distance);
  const dimFactor = Math.abs(futureCurve - currentCurve) > 0.05 ? 0.3 : 1.0;
  renderLights(ctx, baseNearQuad, v, dimFactor, fadeScale, fog, fogFactor);
}

function renderLights(ctx, quad, vehicle, dimFactor, fadeScale = 1.0, fog, fogFactor) {
  const { lane, headlightColor, headlightIntensity } = vehicle;
  const isSameDirection = lane === 'left';
  const lightColorRaw = isSameDirection ? '#ff0000' : headlightColor;
  const lightColor = lerpColor(lightColorRaw, fog.color, fogFactor);
  
  const arrivalRamp = Math.pow(fadeScale, 25);
  const brightness = headlightIntensity * dimFactor * (isSameDirection ? 0.6 : 1.0) * arrivalRamp;
  const scale = quad[0].scale;

  const lightL = bilinearMap(quad, 0.2, 0.75);
  const lightR = bilinearMap(quad, 0.8, 0.75);
  
  if (!isSameDirection) {
    const glowSize = 1200 * scale * arrivalRamp;
    const fogSuppression = Math.max(0, 1 - fogFactor * 1.5);
    const glowStrength = 0.5 * arrivalRamp * fogSuppression;
    
    renderGlow(ctx, lightL.x, lightL.y, lightColor, glowSize, glowStrength);
    renderGlow(ctx, lightR.x, lightR.y, lightColor, glowSize, glowStrength);
  } else {
    const fogSuppression = Math.max(0, 1 - fogFactor * 1.2);
    const glowSize = 100 * scale * brightness * fadeScale;
    ctx.globalAlpha = 0.3 * brightness * fogSuppression;
    ctx.fillStyle = lightColor;
    ctx.beginPath(); ctx.arc(lightL.x, lightL.y, glowSize, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(lightR.x, lightR.y, glowSize, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
  }
  
  const coreBaseSize = Math.max(0.5, (isSameDirection ? 6 : 8) * scale * fadeScale);
  const outerCoreRadius = coreBaseSize * 0.6;
  const innerCoreRadius = coreBaseSize * 0.25;

  ctx.fillStyle = lightColor;
  ctx.globalAlpha = Math.min(1, brightness * 0.7);
  ctx.beginPath(); ctx.arc(lightL.x, lightL.y, outerCoreRadius, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(lightR.x, lightR.y, outerCoreRadius, 0, Math.PI * 2); ctx.fill();

  ctx.globalAlpha = Math.min(1, brightness * 1.35);
  ctx.beginPath(); ctx.arc(lightL.x, lightL.y, innerCoreRadius, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(lightR.x, lightR.y, innerCoreRadius, 0, Math.PI * 2); ctx.fill();

  ctx.globalAlpha = 1;
}

function renderVehicleSilhouette(ctx, quad, vehicle, fog, fogFactor, hasWindshield = true, skipShadow = false) {
  const width = Math.abs(quad[1].x - quad[0].x);
  const centerX = (quad[0].x + quad[1].x) / 2;
  
  if (!skipShadow) {
    ctx.fillStyle = lerpColor('rgba(0,0,0,0.5)', fog.color, fogFactor);
    ctx.fillRect(centerX - width/2, quad[0].y - 2, width, 4);
  }

  ctx.fillStyle = lerpColor(vehicle.color, fog.color, fogFactor);
  drawQuad(ctx, quad);
  
  if (hasWindshield) {
    ctx.fillStyle = lerpColor('#0a0a0f', fog.color, fogFactor);
    drawQuad(ctx, [
      bilinearMap(quad, 0.1, 0.8),
      bilinearMap(quad, 0.9, 0.8),
      bilinearMap(quad, 0.9, 0.1),
      bilinearMap(quad, 0.1, 0.1)
    ]);
    
    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = 0.1;
    drawQuad(ctx, [
      bilinearMap(quad, 0, 0.1),
      bilinearMap(quad, 1, 0.1),
      bilinearMap(quad, 1, 0),
      bilinearMap(quad, 0, 0)
    ]);
    ctx.globalAlpha = 1;
  }
}