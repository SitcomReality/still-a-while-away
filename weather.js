export class WeatherSystem {
  constructor() {
    this.rain = 0;
    this.fog = 0;
    this.clouds = 0;
    this.particles = [];
    this.fogParticles = []; // For "spectrum" variation
  }
  
  update(dt, biome) {
    const { weather } = biome;
    
    // Direct sync with biome smoothed weather
    this.rain = weather.rain;
    this.fog = weather.fog;
    this.clouds = weather.clouds;
    
    // Update particles
    if (this.rain > 0.05) {
      this.updateRain(dt);
    }
    
    if (this.fog > 0.05) {
      this.updateFog(dt);
    }
  }
  
  transitionTo(weather) {
    this.type = weather;
    this.targetIntensity = weather === 'clear' ? 0 : 1;
  }
  
  updateRain(dt) {
    const targetCount = Math.floor(this.rain * 200);
    
    // Add particles
    while (this.particles.length < targetCount) {
      this.particles.push({
        x: Math.random(),
        y: Math.random(),
        speed: 0.8 + Math.random() * 0.5,
        length: 15 + Math.random() * 15
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
    // Note: Fog is now rendered as part of other systems via color shifting.
    // This layer is primarily for precipitation FX.
    if (this.rain > 0.01) {
      this.renderRain(ctx, w, h);
    }
  }
  
  renderRain(ctx, w, h) {
    ctx.strokeStyle = '#8899aa';
    ctx.globalAlpha = 0.5 * this.rain;
    ctx.lineWidth = 1;
    
    this.particles.forEach(p => {
      const x = p.x * w;
      const y = p.y * h;
      
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - 4, y + p.length);
      ctx.stroke();
    });
    
    ctx.globalAlpha = 1;
    
    // Splashes on road (bottom half)
    if (Math.random() < 0.5 * this.rain) {
      const sx = Math.random() * w;
      const sy = h * 0.65 + Math.random() * h * 0.35;
      
      ctx.fillStyle = '#aabbcc';
      ctx.globalAlpha = 0.4;
      ctx.fillRect(sx, sy, 3, 2);
      ctx.globalAlpha = 1;
    }
  }
  

}