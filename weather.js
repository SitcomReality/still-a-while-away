import * as CONST from './constants.js';

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
    if (this.fog > 0.01) {
      this.renderFog(ctx, w, h);
    }
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
  
  renderFog(ctx, w, h) {
    // The main depth-based fog is handled per-object in renderer.js
    // This method renders a global screen-space haze to unify the atmosphere
    if (this.fog <= 0.01) return;

    const fogAlpha = Math.min(0.8, this.fog * 0.5);
    const grad = ctx.createLinearGradient(0, h * 0.2, 0, h);
    grad.addColorStop(0, 'rgba(148, 163, 184, 0)');
    grad.addColorStop(0.5, `rgba(148, 163, 184, ${fogAlpha * 0.5})`);
    grad.addColorStop(1, `rgba(148, 163, 184, ${fogAlpha})`);
    
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Subtle drifting fog patches for texture
    if (this.fog > 0.4) {
      ctx.save();
      const time = Date.now() * 0.001;
      for (let i = 0; i < 3; i++) {
        const x = ((time * 30 + i * w * 0.4) % (w + 400)) - 200;
        const y = h * 0.6 + Math.sin(time * 0.5 + i) * 50;
        const size = 300 + Math.sin(time * 0.2 + i) * 100;
        const radial = ctx.createRadialGradient(x, y, 0, x, y, size);
        radial.addColorStop(0, `rgba(148, 163, 184, ${this.fog * 0.2})`);
        radial.addColorStop(1, 'rgba(148, 163, 184, 0)');
        ctx.fillStyle = radial;
        ctx.fillRect(x - size, y - size, size * 2, size * 2);
      }
      ctx.restore();
    }
  }

  getFogAlpha(distance) {
    if (this.fog <= 0.01) return 0;
    // range is ~800m when intensity is 0.5. 
    // Higher intensity pulls the fog wall closer.
    const fogWall = CONST.FOG_MAX_DISTANCE * (1.0 - (this.fog - 0.5));
    const alpha = Math.min(1, distance / Math.max(1, fogWall));
    // Use an exponential-ish ramp for more natural depth feel
    return 1 - Math.pow(1 - alpha, 2);
  }
}