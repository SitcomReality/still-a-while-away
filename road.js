import { noise } from './utils.js';

export class RoadSystem {
  constructor() {
    this.curve = 0;
    this.targetCurve = 0;
    this.slope = 0;
    this.targetSlope = 0;
    this.distance = 0;
    this.speed = 30; // meters per second
    
    this.roadWidth = 0.6; // as fraction of screen width
    this.markings = [];
    this.cracks = [];
    
    this.curveNoiseOffset = Math.random() * 1000;
    this.slopeNoiseOffset = Math.random() * 1000;
    
    this.initMarkings();
  }
  
  initMarkings() {
    // Pre-generate road markings
    for (let i = 0; i < 50; i++) {
      this.markings.push({
        distance: i * 8,
        type: 'dash',
        lane: 'center'
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
    // plus a base level.
    return h * (0.45 + this.slope * 0.1);
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
    // We anchor the road center at the bottom of the screen (distance 0)
    // and let the curve develop towards the horizon.
    const currentCurve = this.getCurveAt(0);
    const targetCurve = this.getCurveAt(distance);
    
    // Vanishing point shift based on relative curvature
    const curveOffset = (targetCurve - currentCurve) * screenW * 1.5;
    const centerX = screenW/2 + curveOffset * (1 - progress);
    
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
      // Use standard projection
      const pos = this.getRoadPosAt(m.distance, w, h);
      
      if (pos.scale <= 0) return;
      
      const lineWidth = Math.max(1, 4 * pos.scale);
      const segmentLength = 25 * pos.scale;
      
      // Marking with slight glow
      ctx.fillStyle = '#f5f5dc';
      ctx.globalAlpha = 0.9 * Math.min(1, pos.scale + 0.2);
      ctx.fillRect(pos.x - lineWidth/2, pos.y, lineWidth, segmentLength);
      
      // Subtle glow
      ctx.fillStyle = '#fffacd';
      ctx.globalAlpha = 0.3 * Math.min(1, pos.scale);
      ctx.fillRect(pos.x - lineWidth/2 - 1, pos.y, lineWidth + 2, segmentLength);
      
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