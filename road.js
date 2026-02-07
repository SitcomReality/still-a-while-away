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
   * Projects a world distance into screen coordinates.
   * @param {number} distance - Distance from camera in meters.
   * @param {number} screenW - Canvas width.
   * @param {number} screenH - Canvas height.
   * @param {number} [curveRefDistance] - Optional anchor distance to use for curvature calculation (prevents rigid objects from shearing).
   */
  getRoadPosAt(distance, screenW, screenH, curveRefDistance = distance) {
    const horizon = this.getHorizon(screenH);
    
    // Perspective-correct projection: y is proportional to 1/z
    const progress = CONST.PERSPECTIVE_K / (distance + CONST.PERSPECTIVE_K);
    const y = horizon + (screenH - horizon) * progress;
    
    // VANISHING POINT AND BOTTOM ANCHOR (Camera offset)
    const straightX = screenW * 0.5 + (screenW * 0.48) * progress;
    let centerX = straightX;
    
    // Use the reference distance to determine the "world" curvature this object is following.
    // This is vital for rigid objects spanning multiple distances (like buildings).
    const refProgress = CONST.PERSPECTIVE_K / (curveRefDistance + CONST.PERSPECTIVE_K);

    // HORIZONTAL CURVATURE
    if (refProgress < 0.5) {
      // The fade factor determines how much the curve 'unfolds' as it approaches the straight foreground.
      // For rigidity, we use the specific point's progress for fading, but the reference's target curve.
      const curveFade = Math.pow(1 - (progress / 0.5), 1.5);
      const currentCurve = this.getCurveAt(0);
      const targetCurve = this.getCurveAt(curveRefDistance);
      
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
    const dashLength = CONST.MARKING_DASH_LENGTH;
    
    this.markings.forEach(m => {
      // Allow rendering slightly behind camera to ensure smooth exit
      if (m.distance > CONST.MARKING_RENDER_LIMIT || m.distance < -dashLength) return;

      const posNear = this.getRoadPosAt(m.distance, w, h);
      const posFar = this.getRoadPosAt(m.distance + dashLength, w, h);
      
      if (posNear.scale <= 0 || posFar.scale <= 0) return;
      
      const wNear = Math.max(0.5, CONST.MARKING_WIDTH_SCALE * posNear.scale);
      const wFar = Math.max(0.5, CONST.MARKING_WIDTH_SCALE * posFar.scale);
      
      const laneOffsetNear = (m.offset || 0) * (w * roadWidth * posNear.scale);
      const laneOffsetFar = (m.offset || 0) * (w * roadWidth * posFar.scale);

      const x1 = posNear.x + laneOffsetNear - wNear / 2;
      const x2 = posNear.x + laneOffsetNear + wNear / 2;
      const x3 = posFar.x + laneOffsetFar + wFar / 2;
      const x4 = posFar.x + laneOffsetFar - wFar / 2;

      // Glow first
      const glowW = 1.5;
      ctx.fillStyle = '#fffacd';
      ctx.globalAlpha = 0.25 * Math.min(1, posNear.scale);
      ctx.beginPath();
      ctx.moveTo(x1 - glowW, posNear.y);
      ctx.lineTo(x2 + glowW, posNear.y);
      ctx.lineTo(x3 + glowW, posFar.y);
      ctx.lineTo(x4 - glowW, posFar.y);
      ctx.fill();

      // Dash Core
      ctx.fillStyle = '#f5f5dc';
      ctx.globalAlpha = 0.8 * Math.min(1, posNear.scale + 0.3);
      ctx.beginPath();
      ctx.moveTo(x1, posNear.y);
      ctx.lineTo(x2, posNear.y);
      ctx.lineTo(x3, posFar.y);
      ctx.lineTo(x4, posFar.y);
      ctx.fill();
    });
    
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