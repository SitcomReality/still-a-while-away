export class WindshieldFX {
  constructor(weather) {
    this.weather = weather;
    this.streaks = [];
    this.condensation = 0;
  }
  
  update(dt) {
    if (this.weather.rain > 0.05) {
      this.addStreaks(dt);
    }
    
    // Update existing streaks
    this.streaks = this.streaks.filter(s => {
      s.progress += dt * s.speed;
      return s.progress < 1;
    });
    
    // Update background condensation haze
    const targetCondensation = Math.max(this.weather.rain * 0.3, this.weather.fog * 0.1);
    this.condensation += (targetCondensation - this.condensation) * dt * 0.5;
  }
  
  addStreaks(dt) {
    // Increased spawn rate for a more immersive feel
    const spawnRate = this.weather.rain * 25;
    
    if (Math.random() < spawnRate * dt) {
      // Spawn point anywhere on the windshield surface
      const x = Math.random();
      const y = Math.random() * 0.9; // Bias away from the very top edge where cabin overlay starts

      // Origin for the "halo" effect is bottom-center
      const originX = 0.5;
      const originY = 1.0;

      // Calculate direction vector from origin to spawn point
      const dx = x - originX;
      const dy = y - originY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      // Guard against spawning exactly at the origin
      if (dist > 0.01) {
        this.streaks.push({
          x, y,
          dirX: dx / dist,
          dirY: dy / dist,
          progress: 0,
          speed: 0.4 + Math.random() * 0.6,
          length: 0.05 + Math.random() * 0.1,
          opacity: 0.4 + Math.random() * 0.4
        });
      }
    }
  }
  
  render(ctx, w, h) {
    // 1. Background haze
    if (this.condensation > 0.01) {
      ctx.fillStyle = `rgba(180, 180, 190, ${this.condensation * 0.15})`;
      for (let i = 0; i < 100; i++) {
        const rx = (Math.sin(i * 12.9898) * 43758.5453) % 1;
        const ry = (Math.sin(i * 78.233) * 43758.5453) % 1;
        ctx.globalAlpha = this.condensation * 0.1;
        ctx.fillRect(Math.abs(rx) * w, Math.abs(ry) * h * 0.7, 3, 3);
      }
      ctx.globalAlpha = 1;
    }
    
    // 2. Halo-style streaks
    ctx.strokeStyle = 'rgba(150, 170, 190, 0.6)';
    ctx.lineWidth = 1.5;
    
    this.streaks.forEach(s => {
      // Current tail of the streak
      const tailX = (s.x + s.dirX * s.progress * 0.5) * w;
      const tailY = (s.y + s.dirY * s.progress * 0.5) * h;
      
      // Current head of the streak
      const headX = (s.x + s.dirX * (s.progress * 0.5 + s.length)) * w;
      const headY = (s.y + s.dirY * (s.progress * 0.5 + s.length)) * h;
      
      ctx.globalAlpha = s.opacity * (1 - s.progress);
      ctx.beginPath();
      ctx.moveTo(tailX, tailY);
      ctx.lineTo(headX, headY);
      ctx.stroke();
    });
    
    ctx.globalAlpha = 1;
  }
}