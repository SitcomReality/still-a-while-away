export class WeatherSystem {
  constructor() {
    this.type = 'clear';
    this.intensity = 0;
    this.targetIntensity = 0;
    this.particles = [];
  }
  
  update(dt, biome) {
    // Set weather based on biome
    if (this.type !== biome.weather) {
      this.transitionTo(biome.weather);
    }
    
    // Smooth transition
    this.intensity += (this.targetIntensity - this.intensity) * dt * 2;
    
    // Update particles
    if (this.type === 'rain') {
      this.updateRain(dt);
    } else if (this.type === 'fog') {
      this.updateFog(dt);
    }
  }
  
  transitionTo(weather) {
    this.type = weather;
    this.targetIntensity = weather === 'clear' ? 0 : 1;
  }
  
  updateRain(dt) {
    const targetCount = Math.floor(this.intensity * 150);
    
    // Add particles
    while (this.particles.length < targetCount) {
      this.particles.push({
        x: Math.random(),
        y: Math.random(),
        speed: 0.6 + Math.random() * 0.4,
        length: 10 + Math.random() * 10
      });
    }
    
    // Remove excess particles
    while (this.particles.length > targetCount) {
      this.particles.pop();
    }
    
    // Update positions
    this.particles.forEach(p => {
      p.y += p.speed * dt;
      if (p.y > 1) {
        p.y = 0;
        p.x = Math.random();
      }
    });
  }
  
  updateFog(dt) {
    // Fog doesn't need particle updates
  }
  
  render(ctx, w, h) {
    if (this.intensity < 0.01) return;
    
    if (this.type === 'rain') {
      this.renderRain(ctx, w, h);
    } else if (this.type === 'fog') {
      this.renderFog(ctx, w, h);
    }
  }
  
  renderRain(ctx, w, h) {
    ctx.strokeStyle = '#8899aa';
    ctx.globalAlpha = 0.4 * this.intensity;
    ctx.lineWidth = 1;
    
    this.particles.forEach(p => {
      const x = p.x * w;
      const y = p.y * h;
      
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - 3, y + p.length);
      ctx.stroke();
    });
    
    ctx.globalAlpha = 1;
    
    // Splashes on road (bottom half)
    if (Math.random() < 0.3 * this.intensity) {
      const sx = Math.random() * w;
      const sy = h * 0.6 + Math.random() * h * 0.4;
      
      ctx.fillStyle = '#aabbcc';
      ctx.globalAlpha = 0.5;
      ctx.fillRect(sx, sy, 2, 2);
      ctx.globalAlpha = 1;
    }
  }
  
  renderFog(ctx, w, h) {
    const gradient = ctx.createLinearGradient(0, h * 0.4, 0, h);
    gradient.addColorStop(0, 'rgba(200, 200, 210, 0)');
    gradient.addColorStop(1, `rgba(200, 200, 210, ${0.4 * this.intensity})`);
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);
  }
}