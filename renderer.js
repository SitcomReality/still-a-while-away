import * as CONST from './constants.js';

export class Renderer {
  constructor() {
    this.skyCanvas = document.getElementById('sky-layer');
    this.envCanvas = document.getElementById('environment-layer');
    this.roadCanvas = document.getElementById('road-layer');
    this.trafficCanvas = document.getElementById('traffic-layer');
    this.weatherCanvas = document.getElementById('weather-layer');
    this.windshieldCanvas = document.getElementById('windshield-layer');
    this.uiCanvas = document.getElementById('ui-layer');
    
    this.skyCtx = this.skyCanvas.getContext('2d', { alpha: false });
    this.envCtx = this.envCanvas.getContext('2d', { alpha: true });
    this.roadCtx = this.roadCanvas.getContext('2d', { alpha: true });
    this.trafficCtx = this.trafficCanvas.getContext('2d', { alpha: true });
    this.weatherCtx = this.weatherCanvas.getContext('2d', { alpha: true });
    this.windshieldCtx = this.windshieldCanvas.getContext('2d', { alpha: true });
    this.uiCtx = this.uiCanvas.getContext('2d', { alpha: true });
    
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }
  
  resize() {
    const canvases = [
      this.skyCanvas, this.envCanvas, this.roadCanvas,
      this.trafficCanvas, this.weatherCanvas, this.windshieldCanvas, this.uiCanvas
    ];
    
    canvases.forEach(canvas => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
    });
  }
  
  renderSky(ctx, w, h, biome, time, horizonY, heading) {
    // Sky Gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, horizonY);
    
    const colors = biome.skyColors || ['#000', '#111', '#222'];
    colors.forEach((color, i) => {
      gradient.addColorStop(i / (colors.length - 1), color);
    });
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, horizonY);
    
    // Draw Hills
    this.renderHills(ctx, w, h, horizonY, heading, biome);

    // Ground Plane (Behind everything)
    ctx.fillStyle = biome.groundColor;
    ctx.fillRect(0, horizonY, w, h - horizonY);

    // Stars
    if (biome.stars > 0.01) {
      ctx.fillStyle = '#ffffff';
      const starSeed = 42; 
      for (let i = 0; i < 150; i++) {
        const x = (Math.sin(i * 12.9898 + starSeed) * 43758.5453) % 1;
        const y = (Math.sin(i * 78.233 + starSeed) * 43758.5453) % 1;
        const twinkle = (Math.sin(time * 1.5 + i) * 0.5 + 0.5);
        ctx.globalAlpha = biome.stars * twinkle * 0.8;
        const size = (i % 5 === 0) ? 2 : 1;
        ctx.fillRect(Math.abs(x) * w, Math.abs(y) * horizonY, size, size);
      }
      ctx.globalAlpha = 1;
    }
  }

  renderHills(ctx, w, h, horizonY, heading, biome) {
    ctx.fillStyle = biome.groundColor;
    ctx.beginPath();
    ctx.moveTo(0, h);
    
    const hillScale = 0.5;
    const hillHeight = 60;
    
    for (let x = 0; x <= w; x += 5) {
      const angle = heading + (x / w) * hillScale;
      // Multi-layered noise for hills
      const h1 = Math.sin(angle * 2.0) * hillHeight * 0.5;
      const h2 = Math.sin(angle * 5.7) * hillHeight * 0.2;
      const h3 = (Math.sin(angle * 12.0) > 0.9 ? 1 : 0) * hillHeight * 0.1; // Sudden perturbations
      
      const totalH = h1 + h2 + h3;
      ctx.lineTo(x, horizonY - totalH);
    }
    
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fill();
    
    // Subtle hill outline
    ctx.strokeStyle = '#000000';
    ctx.globalAlpha = 0.3;
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  renderCompass(ctx, w, h, heading) {
    const cw = CONST.COMPASS_WIDTH;
    const ch = CONST.COMPASS_HEIGHT;
    const x = (w - cw) / 2;
    const y = h - ch - 40;

    // Background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(x, y, cw, ch);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.strokeRect(x, y, cw, ch);

    // Directions
    const directions = [
      { name: 'N',  angle: 0 },
      { name: 'NE', angle: Math.PI * 0.25 },
      { name: 'E',  angle: Math.PI * 0.5 },
      { name: 'SE', angle: Math.PI * 0.75 },
      { name: 'S',  angle: Math.PI },
      { name: 'SW', angle: Math.PI * 1.25 },
      { name: 'W',  angle: Math.PI * 1.5 },
      { name: 'NW', angle: Math.PI * 1.75 }
    ];

    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, cw, ch);
    ctx.clip();

    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.font = '12px "Space Mono"';

    directions.forEach(d => {
      // Wrap heading to 0 - 2PI
      let diff = d.angle - heading;
      // Normalize to -PI to PI
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;

      const screenX = x + cw / 2 + diff * (cw / (Math.PI / 2));
      
      if (screenX > x - 20 && screenX < x + cw + 20) {
        ctx.globalAlpha = Math.max(0, 1 - Math.abs(diff) * 1.5);
        ctx.fillText(d.name, screenX, y + 25);
        
        // Ticks
        ctx.fillRect(screenX - 1, y, 2, 5);
        ctx.fillRect(screenX - 1, y + ch - 5, 2, 5);
      }
    });

    // Center indicator
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#ff3333';
    ctx.fillRect(x + cw / 2 - 1, y, 2, ch);

    ctx.restore();
  }

  render(state) {
    const w = this.skyCanvas.width;
    const h = this.skyCanvas.height;
    
    // Calculate global horizon Y for this frame
    const horizonY = state.road.getHorizon(h);
    
    // Sky layer - pass horizon
    this.renderSky(this.skyCtx, w, h, state.biome, state.time, horizonY, state.road.heading);
    
    // Road layer
    this.roadCtx.clearRect(0, 0, w, h);
    state.road.render(this.roadCtx, w, h);

    // Mid-ground objects (Environment + Traffic)
    // We use trafficCtx (the topmost world layer) for combined rendering
    this.envCtx.clearRect(0, 0, w, h);
    this.trafficCtx.clearRect(0, 0, w, h);
    
    const renderables = [];
    
    // Gather and tag features
    state.environment.features.forEach(f => {
      const relDist = f.distance - state.road.distance;
      if (relDist > 0 && relDist < 500) {
        renderables.push({
          z: relDist + (f.depth ? f.depth / 2 : 0),
          type: 'env',
          data: f
        });
      }
    });
    
    // Gather and tag vehicles
    state.traffic.vehicles.forEach(v => {
      if (v.distance > 0 && v.distance < 500) {
        renderables.push({
          z: v.distance + (v.depth || 0),
          type: 'traffic',
          data: v
        });
      }
    });
    
    // Painter's algorithm: sort furthest to nearest
    renderables.sort((a, b) => b.z - a.z);
    
    // Render sorted list
    renderables.forEach(item => {
      if (item.type === 'env') {
        state.environment.renderFeature(this.trafficCtx, item.data, w, h);
      } else {
        state.traffic.renderVehicle(this.trafficCtx, item.data, w, h);
      }
    });
    
    // Weather layer
    this.weatherCtx.clearRect(0, 0, w, h);
    state.weather.render(this.weatherCtx, w, h);
    
    // Windshield layer
    this.windshieldCtx.clearRect(0, 0, w, h);
    state.windshield.render(this.windshieldCtx, w, h);

    // UI Layer
    this.uiCtx.clearRect(0, 0, w, h);
    this.renderCompass(this.uiCtx, w, h, state.road.heading);
  }
}