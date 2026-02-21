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

      // Origin for the "halo" effect is bottom-center with slight random offset for asymmetry
      const originX = 0.5 + (Math.random() - 0.5) * 0.3;
      const originY = 1.0 + (Math.random() - 0.5) * 0.2;

      // Calculate direction vector from origin to spawn point
      let dx = x - originX;
      let dy = y - originY;
      
      // Add a random angle perturbation to the direction
      const angleOffset = (Math.random() - 0.5) * 0.25;
      const cos = Math.cos(angleOffset);
      const sin = Math.sin(angleOffset);
      const rdx = dx * cos - dy * sin;
      const rdy = dx * sin + dy * cos;
      dx = rdx;
      dy = rdy;

      const dist = Math.sqrt(dx * dx + dy * dy);
      
      // Guard against spawning exactly at the origin
      if (dist > 0.01) {
        this.streaks.push({
          x, y,
          dirX: dx / dist,
          dirY: dy / dist,
          progress: 0,
          speed: 0.3 + Math.random() * 0.5,
          length: 0.04 + Math.random() * 0.08,
          opacity: 0.3 + Math.random() * 0.5
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
      // Use quadratic easing for acceleration: starts slow, ends fast
      const easedProgress = s.progress * s.progress;
      const travelScale = 0.6; // How far they travel total

      // Current tail of the streak
      const tailX = (s.x + s.dirX * easedProgress * travelScale) * w;
      const tailY = (s.y + s.dirY * easedProgress * travelScale) * h;
      
      // Current head of the streak (slightly longer due to acceleration)
      const headX = (s.x + s.dirX * (easedProgress * travelScale + s.length)) * w;
      const headY = (s.y + s.dirY * (easedProgress * travelScale + s.length)) * h;
      
      ctx.globalAlpha = s.opacity * (1 - s.progress); // Fade out linearly over time
      ctx.beginPath();
      ctx.moveTo(tailX, tailY);
      ctx.lineTo(headX, headY);
      ctx.stroke();
    });
    
    ctx.globalAlpha = 1;
  }
}