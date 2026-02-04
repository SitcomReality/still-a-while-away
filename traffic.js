import { noise } from './utils.js';

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
      v.distance -= (this.road.speed + v.speed) * dt;
      
      // Remove vehicles that passed us
      if (v.distance < -5) {
        this.vehicles.splice(i, 1);
      }
    }
  }
  
  spawnVehicle(biome) {
    const types = ['sedan', 'suv', 'truck', 'sports'];
    const type = types[Math.floor(Math.random() * types.length)];
    
    const vehicle = {
      distance: 150 + Math.random() * 50,
      speed: 25 + Math.random() * 15,
      type,
      lane: 'right',
      color: this.getRandomColor(),
      headlightColor: Math.random() > 0.7 ? '#a8d8ff' : '#fff8e1',
      headlightIntensity: 0.8 + Math.random() * 0.4,
      height: type === 'truck' ? 1.2 : type === 'sports' ? 0.8 : 1.0
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
      const pos = this.road.getRoadPosAt(v.distance, w, h);
      
      if (pos.scale <= 0) return;
      
      const y = pos.y;
      const scale = pos.scale;
      
      // Lane offset (oncoming traffic is in right lane from our perspective)
      // Scale the offset so it stays in the lane
      const laneOffset = w * 0.15 * scale;
      const x = pos.x + laneOffset;
      
      const size = 40 * scale;
      
      // Check if vehicle is turning away (dimming headlights)
      const futureCurve = this.road.getCurveAt(v.distance + 20);
      const currentCurve = this.road.getCurveAt(v.distance);
      const isTurningAway = Math.abs(futureCurve - currentCurve) > 0.05;
      const dimFactor = isTurningAway ? 0.3 : 1.0;
      
      // Render headlights first (additive)
      this.renderHeadlights(ctx, x, y, scale, v, dimFactor);
      
      // Render vehicle silhouette
      this.renderVehicleSilhouette(ctx, x, y, size, v);
    });
  }
  
  renderHeadlights(ctx, x, y, scale, vehicle, dimFactor) {
    const brightness = vehicle.headlightIntensity * dimFactor;
    const headlightSpacing = 12 * scale;
    
    // Multiple glow layers for depth
    const glowSizes = [120, 80, 40];
    const alphas = [0.15, 0.3, 0.6];
    
    for (let i = 0; i < glowSizes.length; i++) {
      const glowSize = glowSizes[i] * scale * brightness;
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, glowSize);
      
      const baseAlpha = Math.floor(alphas[i] * brightness * 255).toString(16).padStart(2, '0');
      gradient.addColorStop(0, vehicle.headlightColor + baseAlpha);
      gradient.addColorStop(0.4, vehicle.headlightColor + Math.floor(alphas[i] * brightness * 100).toString(16).padStart(2, '0'));
      gradient.addColorStop(1, vehicle.headlightColor + '00');
      
      ctx.fillStyle = gradient;
      ctx.fillRect(x - glowSize, y - glowSize, glowSize * 2, glowSize * 2);
    }
    
    // Bright cores with bloom
    const coreSize = Math.max(3, 8 * scale);
    ctx.fillStyle = vehicle.headlightColor;
    ctx.globalAlpha = brightness * 0.95;
    
    // Left headlight
    ctx.beginPath();
    ctx.arc(x - headlightSpacing, y, coreSize/2, 0, Math.PI * 2);
    ctx.fill();
    
    // Right headlight  
    ctx.beginPath();
    ctx.arc(x + headlightSpacing, y, coreSize/2, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.globalAlpha = 1;
  }
  
  renderVehicleSilhouette(ctx, x, y, size, vehicle) {
    if (size < 4) return;
    
    const width = size * 1.4;
    const height = size * 0.7 * vehicle.height;
    
    // Main body shadow
    ctx.fillStyle = '#000000';
    ctx.globalAlpha = 0.4;
    ctx.fillRect(x - width/2, y - height/2, width, height);
    
    // Car body
    ctx.fillStyle = vehicle.color;
    ctx.globalAlpha = 0.85;
    ctx.fillRect(x - width/2 + 2, y - height/2 + 1, width - 4, height - 2);
    
    // Windshield with slight glow
    ctx.fillStyle = '#1a1a2a';
    ctx.globalAlpha = 0.6;
    const windW = width * 0.5;
    const windH = height * 0.5;
    ctx.fillRect(x - windW/2, y - windH/2, windW, windH);
    
    // Subtle highlight
    ctx.fillStyle = '#444455';
    ctx.globalAlpha = 0.2;
    ctx.fillRect(x - windW/2, y - windH/2, windW, windH * 0.3);
    
    ctx.globalAlpha = 1;
  }
}