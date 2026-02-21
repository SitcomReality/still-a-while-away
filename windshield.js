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
    
    // Update existing streaks (advance progress and drop expired)
    this.streaks = this.streaks.filter(s => {
      s.progress += dt * s.speed;
      return s.progress < 1;
    });
    
    // Update background condensation haze
    const targetCondensation = Math.max(this.weather.rain * 0.3, this.weather.fog * 0.1);
    this.condensation += (targetCondensation - this.condensation) * dt * 0.5;
  }
  
  addStreaks(dt) {
    // Spawn rate scaled by rain intensity (reduced frequency)
    const spawnRate = this.weather.rain * 11; // was *22, now half as frequent
    
    if (Math.random() < spawnRate * dt) {
      const x = Math.random();
      const y = Math.random() * 0.9;

      const originX = 0.5 + (Math.random() - 0.5) * 0.3;
      const originY = 1.0 + (Math.random() - 0.5) * 0.2;

      let dx = x - originX;
      let dy = y - originY;
      
      const angleOffset = (Math.random() - 0.5) * 0.25;
      const cos = Math.cos(angleOffset);
      const sin = Math.sin(angleOffset);
      const rdx = dx * cos - dy * sin;
      const rdy = dx * sin + dy * cos;
      dx = rdx;
      dy = rdy;

      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist > 0.01) {
        // Start with a much shorter base length and a lower max length,
        // so streaks begin short and only grow to a modest size as they age.
        const baseLength = 0.005 + Math.random() * 0.015;   // very short initial length
        const maxLength = baseLength + 0.01 + Math.random() * 0.02; // modest max (shorter overall)
        
        this.streaks.push({
          x, y,
          dirX: dx / dist,
          dirY: dy / dist,
          progress: 0,
          // Reduce minimum speed to 25% of previous min (0.25 * 0.25 = 0.0625).
          // Keep same upper range so some streaks can still be faster.
          speed: 0.0625 + Math.random() * 0.45,
          length: baseLength,    // starting length
          maxLength: maxLength,  // maximum length it will reach as it ages
          // Increase maximum visual size for heads/tails (width) while keeping variability
          width: 1.6 + Math.random() * 1.6, // larger max width than before (was 0.8 + rand*1.0)
          opacity: 0.2 + Math.random() * 0.4,
          seed: Math.random() * 100, // Random seed for jitter path
          jitterScale: 0.004 + Math.random() * 0.012 // slightly lower jitter
        });
      }
    }
  }
  
  render(ctx, w, h) {
    if (this.condensation > 0.01) {
      ctx.fillStyle = `rgba(180, 180, 190, ${this.condensation * 0.15})`;
      for (let i = 0; i < 100; i++) {
        const rx = (Math.sin(i * 12.9898) * 43758.5453) % 1;
        const ry = (Math.sin(i * 78.233) * 43758.5453) % 1;
        ctx.globalAlpha = this.condensation * 0.08;
        ctx.fillRect(Math.abs(rx) * w, Math.abs(ry) * h * 0.7, 2, 2);
      }
      ctx.globalAlpha = 1;
    }
    
    this.streaks.forEach(s => {
      const easedProgress = s.progress * s.progress;
      const travelScale = 0.65;
      const alpha = s.opacity * (1 - s.progress);
      
      // Gradually interpolate length from start to max based on progress (0..1)
      const currentLength = s.length + (s.maxLength - s.length) * s.progress;
      
      // Calculate perpendicular vector for jitter
      const perpX = -s.dirY;
      const perpY = s.dirX;
      
      // Tail position with subtle jitter — tails start very short because easedProgress*travelScale is small early
      const tailJitter = Math.sin(s.progress * 15 + s.seed) * s.jitterScale;
      const tailX = (s.x + s.dirX * easedProgress * travelScale + perpX * tailJitter) * w;
      const tailY = (s.y + s.dirY * easedProgress * travelScale + perpY * tailJitter) * h;
      
      // Head position uses the currentLength so streaks lengthen as they age,
      // but overall lengths are much shorter due to reduced base/max values.
      const headProgress = easedProgress * travelScale + currentLength * (1 + s.progress * 0.5);
      const headJitter = Math.sin((s.progress + 0.1) * 15 + s.seed) * s.jitterScale;
      const headX = (s.x + s.dirX * headProgress + perpX * headJitter) * w;
      const headY = (s.y + s.dirY * headProgress + perpY * headJitter) * h;
      
      ctx.globalAlpha = alpha;
      
      // Streak Line
      ctx.strokeStyle = 'rgba(180, 195, 210, 0.6)';
      ctx.lineWidth = s.width;
      ctx.beginPath();
      ctx.moveTo(tailX, tailY);
      ctx.lineTo(headX, headY);
      ctx.stroke();

      // Leading Droplet Head
      ctx.fillStyle = 'rgba(210, 225, 240, 0.8)';
      ctx.beginPath();
      ctx.arc(headX, headY, s.width * 1.2, 0, Math.PI * 2);
      ctx.fill();
    });
    
    ctx.globalAlpha = 1;
  }
}