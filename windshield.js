export class WindshieldFX {
  constructor(weather) {
    this.weather = weather;
    this.drops = {
      main: [],
      left: [],
      right: []
    };
    this.condensation = 0;
  }
  
  update(dt) {
    // Add raindrops based on weather spectrum
    if (this.weather.rain > 0.05) {
      this.addRaindrops(dt);
    }
    
    // Update existing drops
    Object.keys(this.drops).forEach(section => {
      this.drops[section] = this.drops[section].filter(drop => {
        drop.progress += dt * drop.speed;
        return drop.progress < 1;
      });
    });
    
    // Update condensation based on both rain and fog
    const targetCondensation = Math.max(this.weather.rain * 0.3, this.weather.fog * 0.1);
    this.condensation += (targetCondensation - this.condensation) * dt * 0.5;
  }
  
  addRaindrops(dt) {
    const spawnRate = this.weather.rain * 15;
    
    if (Math.random() < spawnRate * dt) {
      // Main windshield
      this.drops.main.push({
        x: Math.random(),
        y: Math.random() * 0.3,
        progress: 0,
        speed: 0.3 + Math.random() * 0.3,
        length: 0.05 + Math.random() * 0.1
      });
    }
    
    // Side windows (different direction)
    if (Math.random() < spawnRate * dt * 0.5) {
      const side = Math.random() > 0.5 ? 'left' : 'right';
      this.drops[side].push({
        x: Math.random() * 0.3,
        y: Math.random(),
        progress: 0,
        speed: 0.4 + Math.random() * 0.3,
        length: 0.03 + Math.random() * 0.06,
        angle: Math.PI / 6 // Diagonal
      });
    }
  }
  
  render(ctx, w, h) {
    // Render condensation
    if (this.condensation > 0.01) {
      ctx.fillStyle = `rgba(180, 180, 190, ${this.condensation * 0.15})`;
      
      // Perlin-like noise pattern
      for (let i = 0; i < 100; i++) {
        const x = (Math.sin(i * 12.9898) * 43758.5453) % 1;
        const y = (Math.sin(i * 78.233) * 43758.5453) % 1;
        ctx.globalAlpha = this.condensation * 0.1;
        ctx.fillRect(Math.abs(x) * w, Math.abs(y) * h * 0.7, 3, 3);
      }
      ctx.globalAlpha = 1;
    }
    
    // Render raindrops
    ctx.strokeStyle = 'rgba(150, 170, 190, 0.6)';
    ctx.lineWidth = 2;
    
    // Main windshield drops (vertical) - reversed streak direction
    this.drops.main.forEach(drop => {
      const x = drop.x * w;
      const startY = drop.y * h;
      // Move opposite direction: streak upward from spawn point
      const endY = startY - drop.progress * h * 0.7;
      
      ctx.globalAlpha = 0.6 * (1 - drop.progress);
      ctx.beginPath();
      ctx.moveTo(x, startY);
      ctx.lineTo(x, endY);
      ctx.stroke();
    });
    
    // Left window drops (diagonal) - reversed direction
    this.drops.left.forEach(drop => {
      const startX = drop.x * w * 0.2;
      const startY = drop.y * h;
      // Previously moved down-right; now move up-left
      const endX = startX - drop.progress * w * 0.15;
      const endY = startY - drop.progress * h * 0.3;
      
      ctx.globalAlpha = 0.5 * (1 - drop.progress);
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();
    });
    
    // Right window drops (diagonal, opposite direction) - reversed direction
    this.drops.right.forEach(drop => {
      const startX = w - drop.x * w * 0.2;
      const startY = drop.y * h;
      // Previously moved down-left; now move up-right
      const endX = startX + drop.progress * w * 0.15;
      const endY = startY - drop.progress * h * 0.3;
      
      ctx.globalAlpha = 0.5 * (1 - drop.progress);
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();
    });
    
    ctx.globalAlpha = 1;
  }
}