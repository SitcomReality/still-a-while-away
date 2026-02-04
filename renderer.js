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
    // Create gradient based on time of day
    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    
    if (biome.timeOfDay === 'day') {
      gradient.addColorStop(0, '#87CEEB');
      gradient.addColorStop(1, '#E0F6FF');
    } else if (biome.timeOfDay === 'sunset') {
      gradient.addColorStop(0, '#1a1a2e');
      gradient.addColorStop(0.3, '#d4648d');
      gradient.addColorStop(0.6, '#f4a261');
      gradient.addColorStop(1, '#e76f51');
    } else {
      gradient.addColorStop(0, '#0a0a1a');
      gradient.addColorStop(1, '#1a1a2e');
    }
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);
    
    // Stars at night
    if (biome.timeOfDay === 'night') {
      ctx.fillStyle = '#fff';
      const starSeed = Math.floor(time / 10);
      for (let i = 0; i < 80; i++) {
        const x = (Math.sin(i * 12.9898 + starSeed) * 43758.5453) % 1;
        const y = (Math.sin(i * 78.233 + starSeed) * 43758.5453) % 1;
        const brightness = (Math.sin(time * 2 + i) * 0.5 + 0.5) * 0.6 + 0.4;
        ctx.globalAlpha = brightness;
        ctx.fillRect(Math.abs(x) * w, Math.abs(y) * h * 0.4, 1, 1);
      }
      ctx.globalAlpha = 1;
    }
  }
}