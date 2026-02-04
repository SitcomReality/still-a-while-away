import { noise } from './utils.js';

export class RoadSystem {
  constructor() {
    this.curve = 0;
    this.targetCurve = 0;
    this.slope = 0;
    this.targetSlope = 0;
    this.distance = 0;
    this.speed = 30; // meters per second
    
    this.roadWidth = 3.2; // as fraction of screen width
    this.markings = [];
    this.cracks = [];
    
    this.curveNoiseOffset = Math.random() * 1000;
    this.slopeNoiseOffset = Math.random() * 1000;
    
    this.initMarkings();
  }
  
  initMarkings() {
    // Pre-generate road markings
    for (let i = 0; i < 50; i++) {
      // Center markings
      this.markings.push({
        distance: i * 8,
        type: 'dash',
        lane: 'center',
        offset: 0
      });
      // Right lane edge markings (further right)
      this.markings.push({
        distance: i * 8,
        type: 'dash',
        lane: 'right',
        offset: 0.5
      });
    }
  }
  
  update(dt, biome) {
    this.distance += this.speed * dt;
    
    // Update curve using noise
    const curveNoise = noise(this.distance * 0.01 + this.curveNoiseOffset);
    this.targetCurve = curveNoise * 0.3;
    this.curve += (this.targetCurve - this.curve) * dt * 2;
    
    // Update slope using noise
    const slopeNoise = noise(this.distance * 0.008 + this.slopeNoiseOffset);
    this.targetSlope = slopeNoise * 0.15;
    this.slope += (this.targetSlope - this.slope) * dt * 1.5;
    
    // Update markings
    this.markings.forEach(m => {
      m.distance -= this.speed * dt;
      if (m.distance < -10) {
        m.distance += 50 * 8;
      }
    });
  }
  
  getHorizon(h) {
    // Horizon is based on the car's current pitch (slope at distance 0)
    // plus a base level. Move the base horizon up so the sky occupies
    // the top 1/4 of the screen and the landscape/road fills the lower 3/4.
    // Keep a small slope influence so subtle pitch still adjusts horizon.
    return h * (0.25 + this.slope * 0.05);
  }

  getRoadPosAt(distance, screenW, screenH) {
    const horizon = this.getHorizon(screenH);
    
    // Perspective-correct projection: y is proportional to 1/z
    // We want distance 0 to be at the bottom of the screen (progress 1)
    // and infinite distance to be at the horizon (progress 0)
    const k = 20; // Perspective depth constant
    const progress = k / (distance + k);
    
    // Y Position
    const y = horizon + (screenH - horizon) * progress;
    
    // X Position (Curve)
    // Only apply curves/slopes to the upper half (progress <= 0.5)
    // Bottom half stays straight, converging to screen center
    let centerX;
    
    if (progress > 0.5) {
      // Bottom half: straight convergence to screen center
      centerX = screenW / 2;
    } else {
      // Upper half: apply curves
      const currentCurve = this.getCurveAt(0);
      const targetCurve = this.getCurveAt(distance);
      const curveOffset = (targetCurve - currentCurve) * screenW * 1.5;
      
      // Fade curve in as we transition from straight to curved
      const curveFade = 1 - (progress / 0.5); // 0 at progress=0.5, 1 at progress=0
      centerX = screenW / 2 + (curveOffset * curveFade);
    }
    
    // Scale factor for objects (objects get smaller as they move towards horizon)
    const scale = progress;

    return {
      x: centerX,
      y: y,
      scale: scale,
      horizon
    };
  }

  render(ctx, w, h) {
    const segments = 60;
    const viewDistance = 250;
    
    const horizon = this.getHorizon(h);
    
    // Build road geometry strips
    // We calculate the left and right edge points for each segment
    const points = [];
    
    for (let i = 0; i <= segments; i++) {
        const progress = i / segments;
        const dist = progress * viewDistance;
        const pos = this.getRoadPosAt(dist, w, h);
        
        // Road width tapers into distance
        const baseWidth = w * this.roadWidth; // Width at bottom
        const topWidth = w * 0.02; // Width at horizon (very narrow)
        const currentWidth = baseWidth * pos.scale + topWidth * (1 - pos.scale);
        
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
      
      // We only render if it's in front of us and within a reasonable distance
      if (pos.scale <= 0 || m.distance > 250) return;
      
      // Calculate lane offset
      const baseWidth = w * this.roadWidth;
      const currentWidth = baseWidth * pos.scale;
      const laneOffset = (m.offset || 0) * currentWidth;
      
      // To get the tangent, we look slightly further ahead on the road
      const delta = 1.0; 
      const posNext = this.getRoadPosAt(m.distance + delta, w, h);
      
      const dx = posNext.x - pos.x;
      const dy = posNext.y - pos.y;
      const angle = Math.atan2(dy, dx);
      
      const lineWidth = Math.max(1, 4 * pos.scale);
      const segmentLength = 30 * pos.scale;
      
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
    return noise(d * 0.01 + this.curveNoiseOffset) * 0.3;
  }
  
  getSlopeAt(distance) {
    const d = this.distance + distance;
    return noise(d * 0.008 + this.slopeNoiseOffset) * 0.15;
  }
}