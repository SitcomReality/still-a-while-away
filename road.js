import { noise } from './utils.js';

export class RoadSystem {
  constructor() {
    this.curve = 0;
    this.targetCurve = 0;
    this.slope = 0;
    this.targetSlope = 0;
    this.distance = 0;
    this.speed = 30; // meters per second
    
    this.roadWidth = 2.0; // Scaled so left lane fills the screen width at bottom
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
    // plus a base level. Move the base horizon up so the sky occupies
    // the top 1/4 of the screen and the landscape/road fills the lower 3/4.
    // Keep a small slope influence so subtle pitch still adjusts horizon.
    return h * (0.25 + this.slope * 0.05);
  }

  getRoadPosAt(distance, screenW, screenH) {
    const horizon = this.getHorizon(screenH);
    
    // Perspective-correct projection
    const k = 20; 
    const progress = k / (distance + k); // 1 at bottom, 0 at horizon
    
    // Scale factor for objects
    const scale = progress;

    // Weight curvature and slope so they only start "halfway up" the visual field
    // Halfway up the landscape (which is 75% of screen) is around progress 0.6-0.7
    const curveWeight = Math.pow(Math.max(0, (0.7 - progress) / 0.7), 2);
    
    const targetCurve = this.getCurveAt(distance);
    const targetSlope = this.getSlopeAt(distance);

    // X Position (Curve)
    // Shift the road center to the right edge (screenW * 0.5) to simulate 
    // driving in the left lane where the center divider is at the right edge of the screen.
    const cameraLaneOffset = screenW * 0.5;
    const curveOffset = targetCurve * screenW * 3.0 * curveWeight;
    const centerX = screenW * 0.5 + cameraLaneOffset + curveOffset;
    
    // Y Position
    // Base perspective Y
    const yBase = horizon + (screenH - horizon) * progress;
    // Add vertical "slope" bending in the distance
    const ySlopeOffset = targetSlope * screenH * 0.4 * curveWeight;
    const y = yBase + ySlopeOffset;

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
    const points = [];
    
    for (let i = 0; i <= segments; i++) {
        const progress = i / segments;
        const dist = progress * viewDistance;
        const pos = this.getRoadPosAt(dist, w, h);
        
        // Road width tapers into distance correctly with scale
        const baseWidth = w * this.roadWidth;
        const currentWidth = baseWidth * pos.scale;
        
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
      
      // To get the tangent, we look slightly further ahead on the road
      const delta = 1.0; 
      const posNext = this.getRoadPosAt(m.distance + delta, w, h);
      
      const dx = posNext.x - pos.x;
      const dy = posNext.y - pos.y;
      const angle = Math.atan2(dy, dx);
      
      const lineWidth = Math.max(1, 4 * pos.scale);
      const segmentLength = 30 * pos.scale;
      
      ctx.save();
      ctx.translate(pos.x, pos.y);
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