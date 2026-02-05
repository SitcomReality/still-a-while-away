import { noise } from './utils.js';
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
    const types = ['sedan', 'suv', 'truck', 'sports'];
    const type = types[Math.floor(Math.random() * types.length)];
    
    const vehicle = {
      distance: 250 + Math.random() * 150,
      speed: 20 + Math.random() * 20,
      type,
      // Oncoming traffic in right lane, occasional traffic in our lane
      lane: Math.random() > 0.3 ? 'right' : 'left',
      color: this.getRandomColor(),
      headlightColor: Math.random() > 0.7 ? '#a8d8ff' : '#fff8e1',
      headlightIntensity: 0.8 + Math.random() * 0.4,
      height: type === 'truck' ? 1.2 : type === 'sports' ? 0.8 : 1.0,
      depth: type === 'truck' ? 8 : 4.5
    };
    
    this.vehicles.push(vehicle);
  }
  
  getRandomColor() {
    const colors = ['#1a1a1a', '#2a2a2a', '#3a3a3a', '#4a4a4a'];
    return colors[Math.floor(Math.random() * colors.length)];
  }
  
  getProjectedPoint(dist, offset, height, w, h) {
    const pos = this.road.getRoadPosAt(dist, w, h);
    const x = pos.x + (offset * w * pos.scale);
    const y = pos.y - (height * CONST.TRAFFIC_SIZE_SCALE * 0.7 * pos.scale);
    return { x, y, scale: pos.scale };
  }

  renderVehicle(ctx, v, w, h) {
    if (v.distance < 250) {
      this.renderVehicle3D(ctx, w, h, v);
    } else {
      this.renderVehicleLOD(ctx, w, h, v);
    }
  }

  renderVehicleLOD(ctx, w, h, v) {
    const pos = this.road.getRoadPosAt(v.distance, w, h);
    if (pos.scale <= 0) return;
    
    const size = CONST.TRAFFIC_SIZE_SCALE * pos.scale;
    const width = size * 1.4;
    const height = size * 0.7 * v.height;
    const currentRoadWidth = w * this.road.roadWidth * pos.scale;
    const laneOffset = v.lane === 'right' ? (currentRoadWidth * 0.25) : (-currentRoadWidth * 0.25);
    const baseCenterX = pos.x + laneOffset;
    
    const futureCurve = this.road.getCurveAt(v.distance + 20);
    const currentCurve = this.road.getCurveAt(v.distance);
    const curveDelta = futureCurve - currentCurve;
    
    const shrink = Math.max(0.3, 1 - Math.abs(curveDelta) * 4.0);
    const frontOffset = curveDelta * w * 0.25 * pos.scale;
    const frontCenterX = baseCenterX + frontOffset;
    const frontWidth = width * shrink;
    
    const q = [
      { x: baseCenterX - width / 2, y: pos.y, scale: pos.scale },
      { x: baseCenterX + width / 2, y: pos.y, scale: pos.scale },
      { x: frontCenterX + frontWidth / 2, y: pos.y - height, scale: pos.scale },
      { x: frontCenterX - frontWidth / 2, y: pos.y - height, scale: pos.scale }
    ];

    const dimFactor = Math.abs(curveDelta) > 0.05 ? 0.3 : 1.0;
    this.renderVehicleSilhouette(ctx, q, v);
    this.renderLights(ctx, q, v, dimFactor);
  }

  renderVehicle3D(ctx, w, h, v) {
    const zNear = Math.max(0.1, v.distance);
    const zFar = v.distance + v.depth;
    
    const roadW = this.road.roadWidth;
    const laneOffset = v.lane === 'right' ? roadW * 0.25 : -roadW * 0.25;
    const carWidth = 0.5; 

    const lOff = laneOffset - carWidth/2;
    const rOff = laneOffset + carWidth/2;

    const nbl = this.getProjectedPoint(zNear, lOff, 0, w, h);
    const nbr = this.getProjectedPoint(zNear, rOff, 0, w, h);
    const ntl = this.getProjectedPoint(zNear, lOff, v.height, w, h);
    const ntr = this.getProjectedPoint(zNear, rOff, v.height, w, h);
    
    const fbl = this.getProjectedPoint(zFar, lOff, 0, w, h);
    const fbr = this.getProjectedPoint(zFar, rOff, 0, w, h);
    const ftl = this.getProjectedPoint(zFar, lOff, v.height, w, h);
    const ftr = this.getProjectedPoint(zFar, rOff, v.height, w, h);

    const nearQuad = [nbl, nbr, ntr, ntl];
    
    // Draw Surfaces
    ctx.fillStyle = adjustBrightness(v.color, -40);
    drawQuad(ctx, [fbl, fbr, ftr, ftl]); // Far

    ctx.fillStyle = adjustBrightness(v.color, -20);
    if (nbl.x > fbl.x) drawQuad(ctx, [nbl, fbl, ftl, ntl]); // Left
    if (nbr.x < fbr.x) drawQuad(ctx, [nbr, fbr, ftr, ntr]); // Right

    if (ntl.y > ftl.y) {
      ctx.fillStyle = adjustBrightness(v.color, 10);
      drawQuad(ctx, [ntl, ntr, ftr, ftl]); // Top
    }

    this.renderVehicleSilhouette(ctx, nearQuad, v);

    const futureCurve = this.road.getCurveAt(v.distance + 20);
    const currentCurve = this.road.getCurveAt(v.distance);
    const dimFactor = Math.abs(futureCurve - currentCurve) > 0.05 ? 0.3 : 1.0;
    this.renderLights(ctx, nearQuad, v, dimFactor);
  }

  renderLights(ctx, quad, vehicle, dimFactor) {
    const { lane, headlightColor, headlightIntensity } = vehicle;
    const isSameDirection = lane === 'left';
    const lightColor = isSameDirection ? '#ff0000' : headlightColor;
    const brightness = headlightIntensity * dimFactor * (isSameDirection ? 0.6 : 1.0);
    const scale = quad[0].scale;

    const lightL = bilinearMap(quad, 0.2, 0.75);
    const lightR = bilinearMap(quad, 0.8, 0.75);
    
    if (!isSameDirection) {
      const glowSize = 1000 * scale * brightness;
      renderGlow(ctx, lightL.x, lightL.y, lightColor, glowSize, 0.4 * brightness);
      renderGlow(ctx, lightR.x, lightR.y, lightColor, glowSize, 0.4 * brightness);
    } else {
      const glowSize = 100 * scale * brightness;
      ctx.globalAlpha = 0.3 * brightness;
      ctx.fillStyle = lightColor;
      ctx.beginPath(); ctx.arc(lightL.x, lightL.y, glowSize, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(lightR.x, lightR.y, glowSize, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    }
    
    const coreSize = Math.max(2, (isSameDirection ? 6 : 8) * scale);
    ctx.fillStyle = lightColor;
    ctx.globalAlpha = brightness * 0.95;
    ctx.beginPath(); ctx.arc(lightL.x, lightL.y, coreSize/2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(lightR.x, lightR.y, coreSize/2, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
  }
  
  renderVehicleSilhouette(ctx, quad, vehicle) {
    const scale = quad[0].scale;
    const size = CONST.TRAFFIC_SIZE_SCALE * scale;
    if (size < 4) return;
    
    const width = Math.abs(quad[1].x - quad[0].x);
    const centerX = (quad[0].x + quad[1].x) / 2;
    
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(centerX - width/2, quad[0].y - 2, width, 4);

    ctx.fillStyle = vehicle.color;
    drawQuad(ctx, quad);
    
    ctx.fillStyle = '#0a0a0f';
    drawQuad(ctx, [
      bilinearMap(quad, 0.1, 0.5),
      bilinearMap(quad, 0.9, 0.5),
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