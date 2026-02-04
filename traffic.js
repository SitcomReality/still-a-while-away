import { noise } from './utils.js';
import * as CONST from './constants.js';
import { adjustBrightness, bilinearMap } from './environment/renderers/utils.js';

export class TrafficSystem {
  constructor(road) {
    this.road = road;
    this.vehicles = [];
    this.spawnTimer = 0;
    this.spawnInterval = 3;
  }
  
  update(dt, biome) {
    this.spawnTimer += dt;
    
    // Spawn new vehicles based on biome traffic density
    if (this.spawnTimer >= this.spawnInterval / biome.trafficDensity) {
      this.spawnVehicle(biome);
      this.spawnTimer = 0;
      this.spawnInterval = 2 + Math.random() * 4;
    }
    
    // Update existing vehicles
    for (let i = this.vehicles.length - 1; i >= 0; i--) {
      const v = this.vehicles[i];
      // Oncoming traffic (right lane) moves towards us.
      // Same-direction traffic (left lane) moves relative to our speed.
      const relSpeed = v.lane === 'right' ? (this.road.speed + v.speed) : (this.road.speed - v.speed);
      v.distance -= relSpeed * dt;
      
      // Remove vehicles that passed us or got too far ahead
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
  
  render(ctx, w, h) {
    // Render from back to front
    const sorted = [...this.vehicles].sort((a, b) => b.distance - a.distance);
    
    sorted.forEach(v => {
      if (v.distance < 250) {
        this.renderVehicle3D(ctx, w, h, v);
      } else {
        const pos = this.road.getRoadPosAt(v.distance, w, h);
        if (pos.scale <= 0) return;
        
        const currentRoadWidth = w * this.road.roadWidth * pos.scale;
        const laneOffset = v.lane === 'right' ? (currentRoadWidth * 0.25) : (-currentRoadWidth * 0.25);
        const x = pos.x + laneOffset;
        const size = CONST.TRAFFIC_SIZE_SCALE * pos.scale;
        
        const futureCurve = this.road.getCurveAt(v.distance + 20);
        const currentCurve = this.road.getCurveAt(v.distance);
        const isTurningAway = Math.abs(futureCurve - currentCurve) > 0.05;
        const dimFactor = isTurningAway ? 0.3 : 1.0;
        
        this.renderVehicleSilhouette(ctx, x, pos.y, size, v);
        this.renderLights(ctx, x, pos.y, pos.scale, v, dimFactor);
      }
    });
  }

  renderVehicle3D(ctx, w, h, v) {
    const zNear = Math.max(0.1, v.distance);
    const zFar = v.distance + v.depth;
    
    const posN = this.road.getRoadPosAt(zNear, w, h);
    const posF = this.road.getRoadPosAt(zFar, w, h);
    
    if (posN.scale <= 0) return;

    const rwN = w * this.road.roadWidth * posN.scale;
    const rwF = w * this.road.roadWidth * posF.scale;
    const loN = v.lane === 'right' ? (rwN * 0.25) : (-rwN * 0.25);
    const loF = v.lane === 'right' ? (rwF * 0.25) : (-rwF * 0.25);
    
    const xN = posN.x + loN;
    const xF = posF.x + loF;
    const yN = posN.y;
    const yF = posF.y;

    const sizeN = CONST.TRAFFIC_SIZE_SCALE * posN.scale;
    const sizeF = CONST.TRAFFIC_SIZE_SCALE * posF.scale;
    const wN = sizeN * 1.4;
    const hN = sizeN * 0.7 * v.height;
    const wF = sizeF * 1.4;
    const hF = sizeF * 0.7 * v.height;

    // Quads for the sides and roof
    const nl = xN - wN/2, nr = xN + wN/2, nt = yN - hN, nb = yN;
    const fl = xF - wF/2, fr = xF + wF/2, ft = yF - hF, fb = yF;

    // Far Face (Darkened)
    ctx.fillStyle = adjustBrightness(v.color, -40);
    ctx.fillRect(fl, ft, wF, hF);

    // Side Surfaces - Only draw if they are facing the camera perspective
    const sideColor = adjustBrightness(v.color, -20);
    ctx.fillStyle = sideColor;
    
    // Left side visibility: when the near-left edge is to the right of the far-left edge
    if (nl > fl) {
      ctx.beginPath();
      ctx.moveTo(nl, nt); ctx.lineTo(fl, ft); ctx.lineTo(fl, fb); ctx.lineTo(nl, nb);
      ctx.fill();
    }
    
    // Right side visibility: when the near-right edge is to the left of the far-right edge
    if (nr < fr) {
      ctx.beginPath();
      ctx.moveTo(nr, nt); ctx.lineTo(fr, ft); ctx.lineTo(fr, fb); ctx.lineTo(nr, nb);
      ctx.fill();
    }

    // Top Surface (Roof) - visible if the car's near-top is below its far-top (camera looking down)
    if (nt > ft) {
      ctx.fillStyle = adjustBrightness(v.color, 10);
      ctx.beginPath();
      ctx.moveTo(nl, nt); ctx.lineTo(nr, nt); ctx.lineTo(fr, ft); ctx.lineTo(fl, ft);
      ctx.fill();
    }

    // Near Face (The "billboard" that obscures the rest)
    this.renderVehicleSilhouette(ctx, xN, yN, sizeN, v);

    // Lights on the relevant face (Near face for oncoming/same-way)
    const futureCurve = this.road.getCurveAt(v.distance + 20);
    const currentCurve = this.road.getCurveAt(v.distance);
    const dimFactor = Math.abs(futureCurve - currentCurve) > 0.05 ? 0.3 : 1.0;
    this.renderLights(ctx, xN, yN, posN.scale, v, dimFactor);
  }

  renderLights(ctx, x, y, scale, vehicle, dimFactor) {
    const isSameDirection = vehicle.lane === 'left';
    const lightColor = isSameDirection ? '#ff0000' : vehicle.headlightColor;
    const brightness = vehicle.headlightIntensity * dimFactor * (isSameDirection ? 0.6 : 1.0);
    const lightSpacing = 100 * scale;
    const height = CONST.TRAFFIC_SIZE_SCALE * 0.7 * vehicle.height * scale;
    const lightY = y - height * 0.3; // Lights at 30% vehicle height
    
    // Only massive bloom for oncoming headlights
    if (!isSameDirection) {
      const glowSizes = [1200, 800, 400];
      const alphas = [0.15, 0.3, 0.6];
      for (let i = 0; i < glowSizes.length; i++) {
        const glowSize = glowSizes[i] * scale * brightness;
        const gradient = ctx.createRadialGradient(x, lightY, 0, x, lightY, glowSize);
        const baseAlpha = Math.floor(alphas[i] * brightness * 255).toString(16).padStart(2, '0');
        gradient.addColorStop(0, lightColor + baseAlpha);
        gradient.addColorStop(0.4, lightColor + Math.floor(alphas[i] * brightness * 100).toString(16).padStart(2, '0'));
        gradient.addColorStop(1, lightColor + '00');
        ctx.fillStyle = gradient;
        ctx.fillRect(x - glowSize, lightY - glowSize, glowSize * 2, glowSize * 2);
      }
    } else {
      // Small glow for taillights
      const glowSize = 100 * scale * brightness;
      ctx.fillStyle = lightColor;
      ctx.globalAlpha = 0.3 * brightness;
      ctx.beginPath(); ctx.arc(x - lightSpacing, lightY, glowSize, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(x + lightSpacing, lightY, glowSize, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    }
    
    const coreSize = Math.max(2, (isSameDirection ? 6 : 8) * scale);
    ctx.fillStyle = lightColor;
    ctx.globalAlpha = brightness * 0.95;
    ctx.beginPath(); ctx.arc(x - lightSpacing, lightY, coreSize/2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + lightSpacing, lightY, coreSize/2, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
  }
  
  renderVehicleSilhouette(ctx, x, y, size, vehicle) {
    if (size < 4) return;
    
    const width = size * 1.4;
    const height = size * 0.7 * vehicle.height;
    
    // Shadow under car
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(x - width/2, y - 2, width, 4);

    // Car body (Opaque to prevent seeing back face through it)
    ctx.fillStyle = vehicle.color;
    ctx.fillRect(x - width/2, y - height, width, height);
    
    // Windshield / Windows
    ctx.fillStyle = '#0a0a0f';
    const windW = width * 0.8;
    const windH = height * 0.4;
    ctx.fillRect(x - windW/2, y - height * 0.8, windW, windH);
    
    // Subtle highlight on roof edge
    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = 0.1;
    ctx.fillRect(x - width/2, y - height, width, height * 0.1);
    
    ctx.globalAlpha = 1;
  }
}