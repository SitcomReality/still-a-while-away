import { noise } from './utils.js';
import * as CONST from './constants.js';

export class RoadSystem {
  constructor() {
    this.heading = 0; // Cumulative direction (radians)
    this.slope = 0;
    this.distance = 0;
    this.speed = CONST.ROAD_SPEED;
    
    this.roadWidth = CONST.ROAD_WIDTH;
    this.markings = [];
    
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
    const { speed } = this;
    this.distance += speed * dt;
    
    // Persistent heading and slope based on absolute distance.
    // This ensures the compass and horizon are always synced with the noise field.
    this.heading = this.getCurveAt(0) * CONST.HEADING_SENSITIVITY;
    this.slope = this.getSlopeAt(0);

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

  /**
   * Calculates the visual world-space heading of the road at a given distance,
   * accounting for the "straightening" effect applied to the perspective.
   */
  getVisualHeadingAt(distance) {
    const progress = CONST.PERSPECTIVE_K / (distance + CONST.PERSPECTIVE_K);
    const currentHeading = this.getCurveAt(0) * CONST.HEADING_SENSITIVITY;
    
    // In the "straightened" zone (close to camera), the road is visually aligned with the car.
    if (progress >= 0.5) {
      return currentHeading;
    }
    
    // In the "curved" zone, we blend from the car's heading to the world heading
    // using the same fade logic as the positional rendering.
    const worldHeadingAtDist = this.getCurveAt(distance) * CONST.HEADING_SENSITIVITY;
    const curveFade = Math.pow(1 - (progress / 0.5), 1.5);
    
    return currentHeading + (worldHeadingAtDist - currentHeading) * curveFade;
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
    const { roadWidth } = this;
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
  }
  
  renderMarkings(ctx, w, h) {
    const { roadWidth } = this;
    this.markings.forEach(m => {
      const pos = this.getRoadPosAt(m.distance, w, h);
      
      if (pos.scale <= 0 || m.distance > CONST.MARKING_RENDER_LIMIT) return;
      
      const baseWidth = w * roadWidth;
      const currentWidth = baseWidth * pos.scale;
      const laneOffset = (m.offset || 0) * currentWidth;
      
      const delta = 1.0; 
      const posNext = this.getRoadPosAt(m.distance + delta, w, h);
      
      const dx = posNext.x - pos.x;
      const dy = posNext.y - pos.y;
      const angle = Math.atan2(dy, dx);
      
      const lineWidth = Math.max(1, CONST.MARKING_WIDTH_SCALE * pos.scale);
      const segmentLength = CONST.MARKING_LENGTH_SCALE * pos.scale;
      
      // Use setTransform to avoid save/restore stack overhead for high-frequency calls
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      ctx.setTransform(cos, sin, -sin, cos, pos.x + laneOffset, pos.y);
      
      // Marking with slight glow
      ctx.fillStyle = '#f5f5dc';
      ctx.globalAlpha = 0.8 * Math.min(1, pos.scale + 0.3);
      ctx.fillRect(0, -lineWidth / 2, segmentLength, lineWidth);
      
      // Subtle glow
      ctx.fillStyle = '#fffacd';
      ctx.globalAlpha = 0.25 * Math.min(1, pos.scale);
      ctx.fillRect(0, -lineWidth / 2 - 1, segmentLength, lineWidth + 2);
    });
    // Reset transform to identity
    ctx.setTransform(1, 0, 0, 1, 0, 0);
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