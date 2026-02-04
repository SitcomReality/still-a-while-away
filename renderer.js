export class Renderer {
  constructor() {
    this.skyCanvas = document.getElementById('sky-layer');
    this.envCanvas = document.getElementById('environment-layer');
    this.roadCanvas = document.getElementById('road-layer');
    this.trafficCanvas = document.getElementById('traffic-layer');
    this.weatherCanvas = document.getElementById('weather-layer');
    this.windshieldCanvas = document.getElementById('windshield-layer');
    
    this.skyCtx = this.skyCanvas.getContext('2d', { alpha: false });
    this.envCtx = this.envCanvas.getContext('2d', { alpha: true });
    this.roadCtx = this.roadCanvas.getContext('2d', { alpha: true });
    this.trafficCtx = this.trafficCanvas.getContext('2d', { alpha: true });
    this.weatherCtx = this.weatherCanvas.getContext('2d', { alpha: true });
    this.windshieldCtx = this.windshieldCanvas.getContext('2d', { alpha: true });
    
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }
  
  resize() {
    const canvases = [
      this.skyCanvas, this.envCanvas, this.roadCanvas,
      this.trafficCanvas, this.weatherCanvas, this.windshieldCanvas
    ];
    
    canvases.forEach(canvas => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
    });
  }
  
  renderSky(ctx, w, h, biome, time, horizonY) {
    // Sky Gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, horizonY);
    
    const colors = biome.skyColors || ['#000', '#111', '#222'];
    colors.forEach((color, i) => {
      gradient.addColorStop(i / (colors.length - 1), color);
    });
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, horizonY);
    
    // Ground Plane
    ctx.fillStyle = biome.groundColor;
    ctx.fillRect(0, horizonY - 1, w, h - horizonY + 1);

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

  render(state) {
    const w = this.skyCanvas.width;
    const h = this.skyCanvas.height;
    
    // Calculate global horizon Y for this frame
    const horizonY = state.road.getHorizon(h);
    
    // Sky layer - pass horizon
    this.renderSky(this.skyCtx, w, h, state.biome, state.time, horizonY);
    
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
  }
}