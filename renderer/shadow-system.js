import * as CONST from '../constants.js';

const SHADOW_RULES = {
  tree: { widthScale: 1.0, heightScale: 1.0, orientation: 0 },
  building: { widthScale: 1.0, heightScale: 0.5, orientation: Math.PI/2 },
  lightpole: { widthScale: 0.4, heightScale: 0.1, orientation: 0 },
  bush: { widthScale: 1.2, heightScale: 0.6, orientation: 0 },
  vehicle: { widthScale: 0.9, heightScale: 0.4, orientation: 0 }
};

export class ShadowSystem {
  constructor(road) {
    this.road = road;
  }

  getSunAngle(timeValue) {
    // 0.25 = sunrise, 0.75 = sunset
    // Map to -PI/2 (sunrise) to PI/2 (sunset)
    if (timeValue < 0.25 || timeValue > 0.75) {
      // Night - fixed moonlight angle
      return Math.PI * 0.3; 
    } else {
      const normalized = (timeValue - 0.25) * 2; // 0 to 1 during day
      return -Math.PI/2 + normalized * Math.PI; 
    }
  }

  getShadowVector(sunAngle, roadHeading, objectOrientation = 0) {
    const sunDirX = Math.cos(sunAngle);
    const sunDirY = Math.sin(sunAngle);
    
    // Rotate by road heading so shadows rotate with the world
    const cosH = Math.cos(roadHeading);
    const sinH = Math.sin(roadHeading);
    
    let shadowDirX = sunDirX * cosH - sunDirY * sinH;
    let shadowDirY = sunDirX * sinH + sunDirY * cosH;
    
    // Adjust for object orientation
    const cosO = Math.cos(objectOrientation);
    const sinO = Math.sin(objectOrientation);
    
    const finalDx = shadowDirX * cosO - shadowDirY * sinO;
    const finalDy = shadowDirX * sinO + shadowDirY * cosO;
    
    // Invert to get shadow direction (away from sun)
    return {
      dx: -finalDx,
      dy: -finalDy
    };
  }

  render(ctx, renderables, timeValue, roadHeading, w, h) {
    // Calculate global shadow properties
    const sunAngle = this.getSunAngle(timeValue);
    
    // Shadow intensity based on time
    const isNight = timeValue < 0.25 || timeValue > 0.75;
    let globalAlpha;
    let blur;

    if (isNight) {
      globalAlpha = 0.2; // Weak moonlight shadows
      blur = 4;
    } else {
      // Shadows are strongest around noon (0.5), weaker at horizon
      const distFromNoon = Math.abs(timeValue - 0.5) * 2;
      globalAlpha = 0.5 * (1 - distFromNoon * 0.3);
      blur = 2 + distFromNoon * 4; // Sharper at noon
    }
    
    if (globalAlpha < 0.05) return;

    ctx.save();
    
    // Iterate all objects to draw shadows
    for (const item of renderables) {
      // Skip distant shadows for performance
      if (item.z > 300) continue;

      const type = item.type === 'traffic' ? 'vehicle' : item.data.type;
      const rules = SHADOW_RULES[type] || SHADOW_RULES.tree;
      
      const vec = this.getShadowVector(sunAngle, roadHeading, rules.orientation);
      
      if (item.type === 'env') {
        this.renderEnvShadow(ctx, item.data, w, h, vec, timeValue, globalAlpha, rules);
      } else {
        this.renderTrafficShadow(ctx, item.data, w, h, vec, timeValue, globalAlpha, rules);
      }
    }
    
    ctx.restore();
  }

  renderEnvShadow(ctx, feature, w, h, vec, timeValue, alpha, rules) {
    const relDist = feature.distance - this.road.distance;
    const pos = this.road.getRoadPosAt(relDist, w, h);
    
    if (pos.scale <= 0) return;

    const sideMultiplier = feature.side === 'left' ? -1 : 1;
    const x = pos.x + (w * feature.offset * sideMultiplier * pos.scale);
    const y = pos.y;
    
    const objWidth = (feature.width || 5) * CONST.ENV_GLOBAL_SCALE * pos.scale;
    const objHeight = (feature.height || 20) * CONST.ENV_GLOBAL_SCALE * pos.scale;
    
    this.drawShadowRect(ctx, x, y, objWidth, objHeight, vec, timeValue, alpha, rules);
  }

  renderTrafficShadow(ctx, vehicle, w, h, vec, timeValue, alpha, rules) {
    const pos = this.road.getRoadPosAt(vehicle.distance, w, h);
    if (pos.scale <= 0) return;

    const size = CONST.TRAFFIC_SIZE_SCALE * pos.scale;
    const roadWidth = w * this.road.roadWidth * pos.scale;
    const laneOffset = vehicle.lane === 'right' ? (roadWidth * 0.25) : (-roadWidth * 0.25);
    const x = pos.x + laneOffset;
    const y = pos.y;
    
    const objWidth = size * 1.4; // Match traffic width logic
    const objHeight = size * 0.7 * vehicle.height;
    
    this.drawShadowRect(ctx, x, y, objWidth, objHeight, vec, timeValue, alpha, rules);
  }

  drawShadowRect(ctx, x, y, w, h, vec, timeValue, alpha, rules) {
    const timeFromNoon = Math.abs(timeValue - 0.5) * 2;
    // Shadows elongate at sunrise/sunset
    const lengthFactor = 0.5 + timeFromNoon * 3.0;
    
    const shadowWidth = w * rules.widthScale;
    const shadowLen = h * lengthFactor;
    
    // Project shadow vector to screen space
    const dx = vec.dx * shadowLen;
    const dy = vec.dy * shadowLen * 0.3; // Flatten vertical component for perspective
    
    const angle = Math.atan2(dy, dx);
    const len = Math.sqrt(dx*dx + dy*dy);
    
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    
    // Draw shadow gradient
    const gradient = ctx.createLinearGradient(0, 0, len, 0);
    gradient.addColorStop(0, `rgba(0,0,0,${alpha})`);
    gradient.addColorStop(0.4, `rgba(0,0,0,${alpha * 0.8})`);
    gradient.addColorStop(1, `rgba(0,0,0,0)`);
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    // Draw from center base
    ctx.fillRect(0, -shadowWidth/2, len, shadowWidth);
    
    ctx.restore();
  }
}