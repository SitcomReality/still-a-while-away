import { noise } from './utils.js';
import * as CONST from './constants.js';

export class RoadSystem {
  constructor() {
    this.curve = 0;
    this.targetCurve = 0;
    this.slope = 0;
    this.targetSlope = 0;
    this.distance = 0;
    this.speed = CONST.ROAD_SPEED;
    
    this.roadWidth = CONST.ROAD_WIDTH;
    this.markings = [];
    this.cracks = [];
    
    this.curveNoiseOffset = Math.random() * 1000;
    this.slopeNoiseOffset = Math.random() * 1000;
    
    this.initMarkings();
  }
  
  initMarkings() {
    // Pre-generate road markings
    for (let i = 0; i < CONST.MARKING_BATCH_SIZE; i++) {
      // Center markings (the lane divider)
      this.markings.push({
        distance: i * CONST.MARKING_SPACING,
        type: 'dash',
        lane: 'center',
        offset: 0
      });
    }
  }
  
  update(dt, biome) {
    this.distance += this.speed * dt;
    
    // Update curve using noise
    const curveNoise = noise(this.distance * CONST.CURVE_NOISE_FREQ + this.curveNoiseOffset);
    this.targetCurve = curveNoise * CONST.CURVE_NOISE_AMP;
    this.curve += (this.targetCurve - this.curve) * dt * 2;
    
    // Update slope using noise
    const slopeNoise = noise(this.distance * CONST.SLOPE_NOISE_FREQ + this.slopeNoiseOffset);
    this.targetSlope = slopeNoise * CONST.SLOPE_NOISE_AMP;
    this.slope += (this.targetSlope - this.slope) * dt * 1.5;
    
    // Update markings
    this.markings.forEach(m => {
      m.distance -= this.speed * dt;
      if (m.distance < -10) {
        m.distance += CONST.MARKING_BATCH_SIZE * CONST.MARKING_SPACING;
      }
    });
  }
  
  getHorizon(h) {
    return h * (CONST.HORIZON_BASE_Y + this.slope * CONST.HORIZON_SLOPE_FACTOR);
  }

  getRoadPosAt(distance, screenW, screenH) {
    const horizon = this.getHorizon(screenH);
    
    // Perspective-correct projection: y is proportional to 1/z
    const progress = CONST.PERSPECTIVE_K / (distance + CONST.PERSPECTIVE_K);
    
    // Y Position mapped to the 3/4 landscape height
    const y = horizon + (screenH - horizon) * progress;
    
    // VANISHING POINT AND BOTTOM ANCHOR
    const straightX = screenW * 0.5 + (screenW * 0.48) * progress;
    
    let centerX = straightX;
    
    // HORIZONTAL CURVATURE
    if (progress < 0.5) {
      const curveFade = Math.pow(1 - (progress / 0.5), 1.5);
      const currentCurve = this.getCurveAt(0);
      const targetCurve = this.getCurveAt(distance);
      
      const curveOffset = (targetCurve - currentCurve) * screenW * 2.5;
      centerX += curveOffset * curveFade;
    }
    
    return {
      x: centerX,
      y: y,
      scale: progress,
      horizon
    };
  }

  render(ctx, w, h) {
    const segments = CONST.ROAD_SEGMENTS;
    const viewDistance = CONST.VIEW_DISTANCE;
    
    const horizon = this.getHorizon(h);
    
    const points = [];
    
    for (let i = 0; i <= segments; i++) {
        const progress = i / segments;
        const dist = progress * viewDistance;
        const pos = this.getRoadPosAt(dist, w, h);
        
        // Road width tapers into distance
        const baseWidth = w * this.roadWidth;
        const currentWidth = baseWidth * pos.scale + (w * CONST.ROAD_TOP_WIDTH) * (1 - pos.scale);
        
        points.push({
            x: pos.x,
            y: pos.y,
            w: currentWidth
        });
    }

    // Draw Road Surface
    const roadGradient = ctx.createLinearGradient(0, horizon, 0, h);
    roadGradient.addColorStop(0, '#1a1a1a');
    roadGradient.addColorStop(0.5, '#242424');
    roadGradient.addColorStop(1, '#2a2a2a');
    
    ctx.fillStyle = roadGradient;
    ctx.beginPath();
    
    // Right Edge (Near to Far)
    ctx.moveTo(points[0].x + points[0].w/2, points[0].y);
    for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x + points[i].w/2, points[i].y);
    }
    
    // Left Edge (Far to Near)
    for (let i = points.length - 1; i >= 0; i--) {
        ctx.lineTo(points[i].x - points[i].w/2, points[i].y);
    }
    
    ctx.closePath();
    ctx.fill();

    this.renderMarkings(ctx, w, h);
    this.renderTexture(ctx, w, h, horizon);
  }
  
  renderMarkings(ctx, w, h) {
    this.markings.forEach(m => {
      const pos = this.getRoadPosAt(m.distance, w, h);
      
      if (pos.scale <= 0 || m.distance > CONST.MARKING_RENDER_LIMIT) return;
      
      const baseWidth = w * this.roadWidth;
      const currentWidth = baseWidth * pos.scale;
      const laneOffset = (m.offset || 0) * currentWidth;
      
      const delta = 1.0; 
      const posNext = this.getRoadPosAt(m.distance + delta, w, h);
      
      const dx = posNext.x - pos.x;
      const dy = posNext.y - pos.y;
      const angle = Math.atan2(dy, dx);
      
      const lineWidth = Math.max(1, CONST.MARKING_WIDTH_SCALE * pos.scale);
      const segmentLength = CONST.MARKING_LENGTH_SCALE * pos.scale;
      
      ctx.save();
      ctx.translate(pos.x + laneOffset, pos.y);
      ctx.rotate(angle);
      
      // Marking with slight glow
      // We draw from 0 (current pos) along the tangent towards the horizon
      ctx.fillStyle = '#f5f5dc';
      ctx.globalAlpha = 0.8 * Math.min(1, pos.scale + 0.3);
      ctx.fillRect(0, -lineWidth / 2, segmentLength, lineWidth);
      
      // Subtle glow
      ctx.fillStyle = '#fffacd';
      ctx.globalAlpha = 0.25 * Math.min(1, pos.scale);
      ctx.fillRect(0, -lineWidth / 2 - 1, segmentLength, lineWidth + 2);
      
      ctx.restore();
      ctx.globalAlpha = 1;
    });
  }
  
  renderTexture(ctx, w, h, horizon) {
    // Subtle noise/cracks
    ctx.globalAlpha = 0.1;
    ctx.fillStyle = '#000';
    
    // We can't easily project random noise dots without storing them as objects.
    // Instead, let's just draw some static noise on the lower screen masked by the road?
    // Or just skip for now to keep it clean, as the road surface gradient is nice enough.
    // Let's bring back a simple noise pass that just draws on the road rect area roughly.
    // Actually, skipping for performance and cleanliness is better than floating dots.
    
    ctx.globalAlpha = 1;
  }
  
  getCurveAt(distance) {
    const d = this.distance + distance;
    return noise(d * CONST.CURVE_NOISE_FREQ + this.curveNoiseOffset) * CONST.CURVE_NOISE_AMP;
  }
  
  getSlopeAt(distance) {
    const d = this.distance + distance;
    return noise(d * CONST.SLOPE_NOISE_FREQ + this.slopeNoiseOffset) * CONST.SLOPE_NOISE_AMP;
  }
}