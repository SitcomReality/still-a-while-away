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
  
  render(ctx, w, h) {
    const horizon = h * (0.45 + this.slope * 0.1);
    const roadY = horizon;
    
    // Draw road surface
    ctx.fillStyle = '#2a2a2a';
    
    // Perspective trapezoid
    const topWidth = w * 0.15;
    const bottomWidth = w * this.roadWidth;
    const roadHeight = h - roadY;
    
    ctx.beginPath();
    ctx.moveTo(w/2 - topWidth/2 + this.curve * w * 0.5, roadY);
    ctx.lineTo(w/2 + topWidth/2 + this.curve * w * 0.5, roadY);
    ctx.lineTo(w/2 + bottomWidth/2, h);
    ctx.lineTo(w/2 - bottomWidth/2, h);
    ctx.closePath();
    ctx.fill();
    
    // Draw road markings
    this.renderMarkings(ctx, w, h, roadY, topWidth, bottomWidth);
    
    // Road texture/cracks (subtle)
    this.renderTexture(ctx, w, h, roadY);
  }
  
  renderMarkings(ctx, w, h, roadY, topWidth, bottomWidth) {
    ctx.strokeStyle = '#ffeb3b';
    ctx.fillStyle = '#ffeb3b';
    
    this.markings.forEach(m => {
      const progress = Math.max(0, m.distance / 100);
      if (progress <= 0 || progress > 1) return;
      
      const y = roadY + (h - roadY) * (1 - progress);
      const roadW = topWidth + (bottomWidth - topWidth) * (1 - progress);
      const lineWidth = Math.max(1, 3 * (1 - progress));
      const segmentLength = 20 * (1 - progress);
      
      // Center dashed line
      const curvature = this.getCurveAt(m.distance);
      const x = w/2 + curvature * w * 0.3 * (1 - progress);
      
      ctx.globalAlpha = 0.8 * (1 - progress * 0.5);
      ctx.fillRect(x - lineWidth/2, y, lineWidth, segmentLength);
      ctx.globalAlpha = 1;
    });
  }
  
  renderTexture(ctx, w, h, roadY) {
    // Subtle noise/cracks
    ctx.globalAlpha = 0.1;
    ctx.fillStyle = '#000';
    
    for (let i = 0; i < 30; i++) {
      const seed = (this.distance * 0.1 + i) % 100;
      const x = (noise(seed * 0.1) * 0.5 + 0.5) * w;
      const y = roadY + (noise(seed * 0.15 + 50) * 0.5 + 0.5) * (h - roadY);
      const size = noise(seed * 0.2 + 100) * 3 + 1;
      
      ctx.fillRect(x, y, size, 1);
    }
    
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
  
  getRoadPosAt(distance, screenW, screenH) {
    const curve = this.getCurveAt(distance);
    const slope = this.getSlopeAt(distance);
    const horizon = screenH * (0.45 + slope * 0.1);
    
    return {
      horizon,
      centerX: screenW/2 + curve * screenW * 0.3,
      curve,
      slope
    };
  }
}