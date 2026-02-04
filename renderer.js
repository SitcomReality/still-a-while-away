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
  
  render(state) {
    const w = this.skyCanvas.width;
    const h = this.skyCanvas.height;
    
    // Sky layer
    this.renderSky(this.skyCtx, w, h, state.biome, state.time);
    
    // Environment layer
    this.envCtx.clearRect(0, 0, w, h);
    state.environment.render(this.envCtx, w, h);
    
    // Road layer
    this.roadCtx.clearRect(0, 0, w, h);
    state.road.render(this.roadCtx, w, h);
    
    // Traffic layer (with additive blending for headlights)
    this.trafficCtx.clearRect(0, 0, w, h);
    state.traffic.render(this.trafficCtx, w, h);
    
    // Weather layer
    this.weatherCtx.clearRect(0, 0, w, h);
    state.weather.render(this.weatherCtx, w, h);
    
    // Windshield layer
    this.windshieldCtx.clearRect(0, 0, w, h);
    state.windshield.render(this.windshieldCtx, w, h);
  }
  
  renderSky(ctx, w, h, biome, time) {
    // Calculate horizon based on road state (passed in loop via state or we can access it if we had it)
    // Since we don't have direct access to road state here easily without changing signature,
    // we'll rely on the fact that the sky covers the whole background.
    // However, to draw the ground, we need the horizon line.
    // Let's assume a default horizon for the background gradient, 
    // but we really should draw the ground plane.
    // We'll update the render() method to pass the horizon.
  }

  render(state) {
    const w = this.skyCanvas.width;
    const h = this.skyCanvas.height;
    
    // Calculate global horizon Y for this frame
    const horizonY = state.road.getHorizon(h);
    
    // Sky layer - pass horizon
    this.renderSky(this.skyCtx, w, h, state.biome, state.time, horizonY);
    
    // Environment layer
    this.envCtx.clearRect(0, 0, w, h);
    state.environment.render(this.envCtx, w, h);
    
    // Road layer
    this.roadCtx.clearRect(0, 0, w, h);
    state.road.render(this.roadCtx, w, h);
    
    // Traffic layer (with additive blending for headlights)
    this.trafficCtx.clearRect(0, 0, w, h);
    state.traffic.render(this.trafficCtx, w, h);
    
    // Weather layer
    this.weatherCtx.clearRect(0, 0, w, h);
    state.weather.render(this.weatherCtx, w, h);
    
    // Windshield layer
    this.windshieldCtx.clearRect(0, 0, w, h);
    state.windshield.render(this.windshieldCtx, w, h);
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
}