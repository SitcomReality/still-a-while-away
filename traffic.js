import { noise, lerpColor } from './utils.js';
import * as CONST from './constants.js';
import { adjustBrightness, bilinearMap, drawQuad, renderGlow } from './environment/renderers/utils.js';

export class TrafficSystem {
  constructor(road) {
    this.road = road;
    this.vehicles = [];
    this.spawnTimer = 0;
    this.spawnInterval = 3;
  }
  
  update(dt, biome) {
    const { trafficDensity } = biome;
    this.spawnTimer += dt;
    
    if (this.spawnTimer >= this.spawnInterval / trafficDensity) {
      this.spawnVehicle(biome);
      this.spawnTimer = 0;
      this.spawnInterval = 2 + Math.random() * 4;
    }
    
    for (let i = this.vehicles.length - 1; i >= 0; i--) {
      const v = this.vehicles[i];
      const { lane, speed, distance } = v;
      
      const relSpeed = lane === 'right' ? (this.road.speed + speed) : (this.road.speed - speed);
      v.distance -= relSpeed * dt;
      
      if (v.distance < CONST.TRAFFIC_REMOVAL_THRESHOLD || v.distance > CONST.TRAFFIC_RENDER_LIMIT) {
        this.vehicles.splice(i, 1);
      }
    }
  }
  
  spawnVehicle(biome) {
    const weights = [
      { type: 'sedan', weight: 40 },
      { type: 'suv', weight: 25 },
      { type: 'sports', weight: 15 },
      { type: 'truck', weight: 10 },
      { type: 'bus', weight: 10 }
    ];
    
    const totalWeight = weights.reduce((sum, w) => sum + w.weight, 0);
    let random = Math.random() * totalWeight;
    let selected = weights[0];
    for (const w of weights) {
      if (random < w.weight) {
        selected = w;
        break;
      }
      random -= w.weight;
    }

    const type = selected.type;
    
    // Base dimensions in meters (total height)
    let width = 2.0;
    let height = 1.1;
    let depth = 4.5;

    if (type === 'sedan') {
      width = 2.1; height = 1.0; depth = 4.6;
    } else if (type === 'suv') {
      width = 2.2; height = 1.3; depth = 5.0;
    } else if (type === 'sports') {
      width = 2.2; height = 0.85; depth = 4.5;
    } else if (type === 'truck') {
      width = 2.5; height = 2.6; depth = 10.0;
    } else if (type === 'bus') {
      width = 2.8; height = 3.0; depth = 15.0;
    }

    const vehicle = {
      distance: CONST.TRAFFIC_RENDER_LIMIT - 10,
      speed: 20 + Math.random() * 20,
      type,
      lane: Math.random() > 0.3 ? 'right' : 'left',
      color: this.getRandomColor(),
      headlightColor: Math.random() > 0.7 ? '#a8d8ff' : '#fff8e1',
      headlightIntensity: 0.8 + Math.random() * 0.4,
      width,
      height,
      depth
    };
    
    this.vehicles.push(vehicle);
  }
  
  getRandomColor() {
    const colors = [
      '#1a1a1a', '#2a2a2a', '#3a3a3a', // Greys
      '#0a1a2f', '#102a43',           // Dark Blues
      '#4a0505', '#631717',           // Dark Reds
      '#0b240b', '#1b301b',           // Greens
      '#5a5a5a', '#7a7a7a',           // Silvers/Lighter grey
      '#2f3542', '#3e4444'            // Slates
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }
  


  renderVehicle(ctx, v, w, h, fog) {
    const visibility = Math.min(1, Math.max(0, (CONST.TRAFFIC_RENDER_LIMIT - v.distance) / CONST.FADE_IN_DISTANCE));
    const scaleFactor = visibility;
    
    ctx.save();
    
    if (visibility < 1.0) {
      const roadW = CONST.ROAD_WIDTH;
      const laneOffset = v.lane === 'right' ? roadW * 0.25 : -roadW * 0.25;
      const pos = this.road.projectPoint(laneOffset, 0, v.distance, w, h);
      
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
      this.renderVehicle3D(ctx, w, h, v, scaleFactor, fog);
    } else {
      this.renderVehicleLOD(ctx, w, h, v, scaleFactor, fog);
    }
    
    ctx.restore();
  }

  renderVehicleLOD(ctx, w, h, v, fadeScale = 1.0, fog) {
    const roadW = CONST.ROAD_WIDTH;
    const laneOffset = v.lane === 'right' ? roadW * 0.25 : -roadW * 0.25;
    
    const baseH = v.height * 0.6 * fadeScale;
    const cabinH = v.height * 0.4 * fadeScale;
    const carWidth = v.width * fadeScale; 
    const cabinWidth = carWidth * 0.8;

    // Base Quad
    const nbl = this.road.projectPoint(laneOffset - carWidth/2, 0, v.distance, w, h);
    const nbr = this.road.projectPoint(laneOffset + carWidth/2, 0, v.distance, w, h);
    const ntl = this.road.projectPoint(laneOffset - carWidth/2, baseH, v.distance, w, h);
    const ntr = this.road.projectPoint(laneOffset + carWidth/2, baseH, v.distance, w, h);
    
    // Cabin Quad
    const cnbl = this.road.projectPoint(laneOffset - cabinWidth/2, baseH, v.distance, w, h);
    const cnbr = this.road.projectPoint(laneOffset + cabinWidth/2, baseH, v.distance, w, h);
    const cntl = this.road.projectPoint(laneOffset - cabinWidth/2, baseH + cabinH, v.distance, w, h);
    const cntr = this.road.projectPoint(laneOffset + cabinWidth/2, baseH + cabinH, v.distance, w, h);

    if (nbl.scale <= 0) return;

    const baseQuad = [nbl, nbr, ntr, ntl];
    const cabinQuad = [cnbl, cnbr, cntr, cntl];
    
    const fogFactor = Math.min(1, Math.max(0, ((v.distance / CONST.TRAFFIC_RENDER_LIMIT) * 1.25) / (1.05 - fog.intensity)));
    
    this.renderVehicleSilhouette(ctx, baseQuad, v, fog, fogFactor, false);
    this.renderVehicleSilhouette(ctx, cabinQuad, v, fog, fogFactor, true, true); // No shadow for cabin
    
    this.renderLights(ctx, baseQuad, v, 1.0, fadeScale, fog, fogFactor);
  }

  renderVehicle3D(ctx, w, h, v, fadeScale = 1.0, fog) {
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
    const nbl = this.road.projectPoint(lOff, 0, zNear, w, h, curveRef);
    const nbr = this.road.projectPoint(rOff, 0, zNear, w, h, curveRef);
    const ntl = this.road.projectPoint(lOff, baseH, zNear, w, h, curveRef);
    const ntr = this.road.projectPoint(rOff, baseH, zNear, w, h, curveRef);
    const fbl = this.road.projectPoint(lOff, 0, zFar, w, h, curveRef);
    const fbr = this.road.projectPoint(rOff, 0, zFar, w, h, curveRef);
    const ftl = this.road.projectPoint(lOff, baseH, zFar, w, h, curveRef);
    const ftr = this.road.projectPoint(rOff, baseH, zFar, w, h, curveRef);

    // Cabin Corners
    const cnbl = this.road.projectPoint(clOff, baseH, cabinZNear, w, h, curveRef);
    const cnbr = this.road.projectPoint(crOff, baseH, cabinZNear, w, h, curveRef);
    const cntl = this.road.projectPoint(clOff, totalH, cabinZNear, w, h, curveRef);
    const cntr = this.road.projectPoint(crOff, totalH, cabinZNear, w, h, curveRef);
    const cfbl = this.road.projectPoint(clOff, baseH, cabinZFar, w, h, curveRef);
    const cfbr = this.road.projectPoint(crOff, baseH, cabinZFar, w, h, curveRef);
    const cftl = this.road.projectPoint(clOff, totalH, cabinZFar, w, h, curveRef);
    const cftr = this.road.projectPoint(crOff, totalH, cabinZFar, w, h, curveRef);

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

    this.renderVehicleSilhouette(ctx, baseNearQuad, v, fog, fogFactor, false);
    this.renderVehicleSilhouette(ctx, cabinNearQuad, v, fog, fogFactor, true, true);

    const futureCurve = this.road.getCurveAt(v.distance + 20);
    const currentCurve = this.road.getCurveAt(v.distance);
    const dimFactor = Math.abs(futureCurve - currentCurve) > 0.05 ? 0.3 : 1.0;
    this.renderLights(ctx, baseNearQuad, v, dimFactor, fadeScale, fog, fogFactor);
  }

  renderLights(ctx, quad, vehicle, dimFactor, fadeScale = 1.0, fog, fogFactor) {
    const { lane, headlightColor, headlightIntensity } = vehicle;
    const isSameDirection = lane === 'left';
    const lightColorRaw = isSameDirection ? '#ff0000' : headlightColor;
    const lightColor = lerpColor(lightColorRaw, fog.color, fogFactor);
    
    // Use a cubic ramp for brightness to make the appearance even more gradual
    const arrivalRamp = Math.pow(fadeScale, 25);
    const brightness = headlightIntensity * dimFactor * (isSameDirection ? 0.6 : 1.0) * arrivalRamp;
    const scale = quad[0].scale;

    const lightL = bilinearMap(quad, 0.2, 0.75);
    const lightR = bilinearMap(quad, 0.8, 0.75);
    
    if (!isSameDirection) {
      // Oncoming traffic: large atmospheric glow
      // Suppress glow footprint and intensity in fog to prevent white-out buildup
      const glowSize = 1200 * scale * arrivalRamp;
      const fogSuppression = Math.max(0, 1 - fogFactor * 1.5);
      const glowStrength = 0.5 * arrivalRamp * fogSuppression;
      
      renderGlow(ctx, lightL.x, lightL.y, lightColor, glowSize, glowStrength);
      renderGlow(ctx, lightR.x, lightR.y, lightColor, glowSize, glowStrength);
    } else {
      // Tail lights
      const fogSuppression = Math.max(0, 1 - fogFactor * 1.2);
      const glowSize = 100 * scale * brightness * fadeScale;
      ctx.globalAlpha = 0.3 * brightness * fogSuppression;
      ctx.fillStyle = lightColor;
      ctx.beginPath(); ctx.arc(lightL.x, lightL.y, glowSize, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(lightR.x, lightR.y, glowSize, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    }
    
    // Draw two concentric core layers so the middle appears brighter and more opaque:
    // - Outer core: softer, slightly transparent
    // - Inner core: smaller radius, stronger alpha to read as a bright center
    const coreBaseSize = Math.max(0.5, (isSameDirection ? 6 : 8) * scale * fadeScale);
    const outerCoreRadius = coreBaseSize * 0.6;
    const innerCoreRadius = coreBaseSize * 0.25;

    ctx.fillStyle = lightColor;
    // Outer core (soft)
    ctx.globalAlpha = Math.min(1, brightness * 0.7);
    ctx.beginPath(); ctx.arc(lightL.x, lightL.y, outerCoreRadius, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(lightR.x, lightR.y, outerCoreRadius, 0, Math.PI * 2); ctx.fill();

    // Inner core (bright center)
    ctx.globalAlpha = Math.min(1, brightness * 1.35);
    ctx.beginPath(); ctx.arc(lightL.x, lightL.y, innerCoreRadius, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(lightR.x, lightR.y, innerCoreRadius, 0, Math.PI * 2); ctx.fill();

    ctx.globalAlpha = 1;
  }
  
  renderVehicleSilhouette(ctx, quad, vehicle, fog, fogFactor, hasWindshield = true, skipShadow = false) {
    const scale = quad[0].scale;
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
}