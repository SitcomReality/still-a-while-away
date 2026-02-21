import { noise, lerpColor } from './utils.js';
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
   */
  getRoadPosAt(distance, screenW, screenH) {
    const horizon = this.getHorizon(screenH);
    const progress = CONST.PERSPECTIVE_K / (distance + CONST.PERSPECTIVE_K);
    const y = horizon + (screenH - horizon) * progress;
    
    // Consistent center projection with camera offset
    const straightX = screenW * 0.5 - (CONST.CAMERA_X_OFFSET * CONST.ENV_GLOBAL_SCALE * progress);
    let centerX = straightX;
    
    // Apply curve offset
    if (progress < 0.5) {
      const curveFade = Math.pow(1 - (progress / 0.5), 1.5);
      const currentCurve = this.getCurveAt(0);
      const targetCurve = this.getCurveAt(distance);
      const curveOffset = (targetCurve - currentCurve) * screenW * 2.5;
      centerX += curveOffset * curveFade;
    }
    
    return { x: centerX, y, scale: progress, horizon };
  }

  /**
   * Projects a 3D world point (lateral, height, distance) to screen coordinates.
   * Uses a reference distance for curve to maintain object rigidity.
   */
  projectPoint(lateral, height, distance, screenW, screenH, curveRef = distance) {
    const horizon = this.getHorizon(screenH);
    const progress = CONST.PERSPECTIVE_K / (distance + CONST.PERSPECTIVE_K);
    const y = horizon + (screenH - horizon) * progress;
    
    // Base position on straightened road
    const straightX = screenW * 0.5;
    
    // Apply curve offset based on reference distance
    let curveOffset = 0;
    if (progress < 0.5) {
      const curveFade = Math.pow(1 - (progress / 0.5), 1.5);
      const currentCurve = this.getCurveAt(0);
      const targetCurve = this.getCurveAt(curveRef);
      curveOffset = (targetCurve - currentCurve) * screenW * 2.5 * curveFade;
    }
    
    // Add lateral offset in meters (relative to camera), scaled by perspective
    const lateralX = (lateral - CONST.CAMERA_X_OFFSET) * CONST.ENV_GLOBAL_SCALE * progress;
    
    // Subtract height in meters, scaled by perspective
    const heightY = height * CONST.ENV_GLOBAL_SCALE * progress;
    
    return {
      x: straightX + curveOffset + lateralX,
      y: y - heightY,
      scale: progress
    };
  }

  render(ctx, w, h, fog) {
    const { roadWidth } = this;
    const segments = CONST.ROAD_SEGMENTS;
    const viewDistance = CONST.VIEW_DISTANCE;
    
    const horizon = this.getHorizon(h);
    
    const points = [];
    
    for (let i = 0; i <= segments; i++) {
        const progress = i / segments;
        const dist = progress * viewDistance;
        const fogFactor = Math.min(1, (dist / viewDistance) / (1.1 - fog.intensity));
        const pos = this.getRoadPosAt(dist, w, h);
        
        // Use projectPoint to find road edges for consistency with environment
        const leftEdge = this.projectPoint(-CONST.ROAD_WIDTH / 2, 0, dist, w, h);
        const rightEdge = this.projectPoint(CONST.ROAD_WIDTH / 2, 0, dist, w, h);
        
        // At horizon, enforce the minimum ROAD_TOP_WIDTH
        const horizonWidth = w * CONST.ROAD_TOP_WIDTH;
        const calculatedWidth = rightEdge.x - leftEdge.x;
        const finalWidth = Math.max(calculatedWidth, horizonWidth * (1 - pos.scale));
        
        points.push({
            x: pos.x,
            y: pos.y,
            w: finalWidth
        });
    }

    // Draw Road Surface with distance-based fog
    const roadGradient = ctx.createLinearGradient(0, horizon, 0, h);
    
    // Match scenery fog logic by mapping world distance to gradient stops.
    const fogAtDist = (d) => Math.min(1, Math.max(0, ((d / viewDistance) * 1.25) / (1.05 - fog.intensity)));

    // Horizon is pure fog
    roadGradient.addColorStop(0, fog.color);
    
    // 150m stop (Vertical stop ~0.05)
    roadGradient.addColorStop(0.05, lerpColor('#1a1a1a', fog.color, fogAtDist(150)));
    
    // 40m stop (Vertical stop ~0.17)
    roadGradient.addColorStop(0.17, lerpColor('#242424', fog.color, fogAtDist(40)));
    
    // Near part (screen bottom)
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

    this.renderMarkings(ctx, w, h, fog);
  }
  
  renderMarkings(ctx, w, h, fog) {
    const dashLength = CONST.MARKING_DASH_LENGTH;
    const markingWidth = 0.15; // 15cm wide lines
    
    this.markings.forEach(m => {
      // Allow rendering slightly behind camera to ensure smooth exit
      if (m.distance > CONST.MARKING_RENDER_LIMIT || m.distance < -dashLength) return;

      const fogFactor = Math.min(1, (m.distance / CONST.VIEW_DISTANCE) / (1.1 - fog.intensity));
      const dashColor = lerpColor('#f5f5dc', fog.color, fogFactor);
      const glowColor = lerpColor('#fffacd', fog.color, fogFactor);

      const lateralOffset = m.offset || 0;
      
      // Use projectPoint for all 4 corners of the dash
      const p1 = this.projectPoint(lateralOffset - markingWidth/2, 0, m.distance, w, h);
      const p2 = this.projectPoint(lateralOffset + markingWidth/2, 0, m.distance, w, h);
      const p3 = this.projectPoint(lateralOffset + markingWidth/2, 0, m.distance + dashLength, w, h);
      const p4 = this.projectPoint(lateralOffset - markingWidth/2, 0, m.distance + dashLength, w, h);
      
      if (p1.scale <= 0 || p3.scale <= 0) return;

      const x1 = p1.x;
      const x2 = p2.x;
      const x3 = p3.x;
      const x4 = p4.x;

      // Glow first
      const glowW = 1.5;
      ctx.fillStyle = glowColor;
      ctx.globalAlpha = 0.25 * Math.min(1, p1.scale);
      ctx.beginPath();
      ctx.moveTo(x1 - glowW, p1.y);
      ctx.lineTo(x2 + glowW, p2.y);
      ctx.lineTo(x3 + glowW, p3.y);
      ctx.lineTo(x4 - glowW, p4.y);
      ctx.fill();

      // Dash Core
      ctx.fillStyle = dashColor;
      ctx.globalAlpha = 0.8 * Math.min(1, p1.scale + 0.3);
      ctx.beginPath();
      ctx.moveTo(x1, p1.y);
      ctx.lineTo(x2, p2.y);
      ctx.lineTo(x3, p3.y);
      ctx.lineTo(x4, p4.y);
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