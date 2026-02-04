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
      const progress = Math.max(0, Math.min(1, v.distance / 150));
      if (progress <= 0) return;
      
      const roadPos = this.road.getRoadPosAt(v.distance, w, h);
      const y = roadPos.horizon + (h - roadPos.horizon) * (1 - progress);
      
      // Lane offset (oncoming traffic is in right lane from our perspective)
      const laneOffset = w * 0.15;
      const x = roadPos.centerX + laneOffset;
      
      const scale = (1 - progress);
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
    const headlightSpacing = 15 * scale;
    const glowSize = 80 * scale * brightness;
    
    // Glow effect
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, glowSize);
    gradient.addColorStop(0, vehicle.headlightColor + Math.floor(brightness * 128).toString(16).padStart(2, '0'));
    gradient.addColorStop(0.5, vehicle.headlightColor + '20');
    gradient.addColorStop(1, vehicle.headlightColor + '00');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(x - glowSize, y - glowSize, glowSize * 2, glowSize * 2);
    
    // Bright cores
    ctx.fillStyle = vehicle.headlightColor;
    ctx.globalAlpha = brightness;
    const coreSize = Math.max(2, 6 * scale);
    ctx.fillRect(x - headlightSpacing - coreSize/2, y - coreSize/2, coreSize, coreSize);
    ctx.fillRect(x + headlightSpacing - coreSize/2, y - coreSize/2, coreSize, coreSize);
    ctx.globalAlpha = 1;
  }
  
  renderVehicleSilhouette(ctx, x, y, size, vehicle) {
    if (size < 3) return; // Too small to render detail
    
    ctx.fillStyle = vehicle.color;
    ctx.globalAlpha = 0.9;
    
    // Simple rectangular silhouette
    const width = size * 1.2;
    const height = size * 0.6 * vehicle.height;
    
    ctx.fillRect(x - width/2, y - height/2, width, height);
    
    // Windshield highlight
    ctx.fillStyle = '#4a4a4a';
    ctx.globalAlpha = 0.3;
    ctx.fillRect(x - width/3, y - height/3, width * 0.6, height * 0.4);
    
    ctx.globalAlpha = 1;
  }
}