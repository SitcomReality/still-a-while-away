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
    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    
    if (biome.timeOfDay === 'day') {
      gradient.addColorStop(0, '#6ba3d4');
      gradient.addColorStop(0.5, '#a8c8e1');
      gradient.addColorStop(1, '#d4e5f0');
    } else if (biome.timeOfDay === 'sunset') {
      gradient.addColorStop(0, '#0f1419');
      gradient.addColorStop(0.3, '#3d2742');
      gradient.addColorStop(0.5, '#8b4367');
      gradient.addColorStop(0.7, '#d87855');
      gradient.addColorStop(1, '#ffa563');
    } else {
      gradient.addColorStop(0, '#050510');
      gradient.addColorStop(0.5, '#0a0a1f');
      gradient.addColorStop(1, '#141428');
    }
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);
    
    if (biome.timeOfDay === 'night') {
      ctx.fillStyle = '#ffffff';
      const starSeed = Math.floor(time / 10);
      for (let i = 0; i < 120; i++) {
        const x = (Math.sin(i * 12.9898 + starSeed) * 43758.5453) % 1;
        const y = (Math.sin(i * 78.233 + starSeed) * 43758.5453) % 1;
        const brightness = (Math.sin(time * 2 + i) * 0.5 + 0.5) * 0.4 + 0.3;
        const size = Math.random() > 0.9 ? 2 : 1;
        ctx.globalAlpha = brightness;
        ctx.fillRect(Math.abs(x) * w, Math.abs(y) * h * 0.45, size, size);
      }
      ctx.globalAlpha = 1;
    }
  }
}