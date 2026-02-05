import { HillRenderer } from './rendering/hills.js';
import { renderSky } from './rendering/sky.js';
import { renderCompass } from './rendering/compass.js';
import { getLightDirection } from './rendering/lighting.js';
import { renderShadows, isInShadow } from './rendering/shadows.js';

export class Renderer {
  constructor() {
    this.hillRenderer = new HillRenderer();

    this.skyCanvas = document.getElementById('sky-layer');
    this.envCanvas = document.getElementById('environment-layer');
    this.roadCanvas = document.getElementById('road-layer');
    this.shadowCanvas = document.getElementById('shadow-layer');
    this.trafficCanvas = document.getElementById('traffic-layer');
    this.weatherCanvas = document.getElementById('weather-layer');
    this.windshieldCanvas = document.getElementById('windshield-layer');
    this.uiCanvas = document.getElementById('ui-layer');
    
    this.skyCtx = this.skyCanvas.getContext('2d', { alpha: false });
    this.envCtx = this.envCanvas.getContext('2d', { alpha: true });
    this.roadCtx = this.roadCanvas.getContext('2d', { alpha: true });
    this.shadowCtx = this.shadowCanvas.getContext('2d', { alpha: true });
    this.trafficCtx = this.trafficCanvas.getContext('2d', { alpha: true });
    this.weatherCtx = this.weatherCanvas.getContext('2d', { alpha: true });
    this.windshieldCtx = this.windshieldCanvas.getContext('2d', { alpha: true });
    this.uiCtx = this.uiCanvas.getContext('2d', { alpha: true });
    
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }
  
  resize() {
    const canvases = [
      this.skyCanvas, this.envCanvas, this.roadCanvas, this.shadowCanvas,
      this.trafficCanvas, this.weatherCanvas, this.windshieldCanvas, this.uiCanvas
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
    
    const horizonY = state.road.getHorizon(h);
    const lightDir = getLightDirection(state.biome, state.road.heading);
    
    // Sky and Hills
    renderSky(this.skyCtx, w, h, state.biome, state.time, horizonY, this.hillRenderer, state.road.heading);
    
    // Road layer
    this.roadCtx.clearRect(0, 0, w, h);
    state.road.render(this.roadCtx, w, h);

    // Shadow layer
    this.shadowCtx.clearRect(0, 0, w, h);
    if (!lightDir.isNight) {
      renderShadows(this.shadowCtx, w, h, state, lightDir, horizonY);
    }

    // World Objects (Environment + Traffic)
    this.envCtx.clearRect(0, 0, w, h);
    this.trafficCtx.clearRect(0, 0, w, h);
    
    const renderables = [];
    state.environment.features.forEach(f => {
      const relDist = f.distance - state.road.distance;
      if (relDist > 0 && relDist < 500) {
        renderables.push({ z: relDist + (f.depth ? f.depth / 2 : 0), type: 'env', data: f });
      }
    });
    state.traffic.vehicles.forEach(v => {
      if (v.distance > 0 && v.distance < 500) {
        renderables.push({ z: v.distance + (v.depth || 0), type: 'traffic', data: v });
      }
    });
    
    renderables.sort((a, b) => b.z - a.z);
    
    const shadowMap = new Set();
    if (!lightDir.isNight) {
      for (let i = 0; i < renderables.length; i++) {
        for (let j = i + 1; j < renderables.length; j++) {
          if (isInShadow(renderables[i], renderables[j], state.road, w, h, lightDir)) {
            shadowMap.add(renderables[j]);
          }
        }
      }
    }
    
    renderables.forEach(item => {
      const inShadow = shadowMap.has(item);
      if (item.type === 'env') {
        state.environment.renderFeature(this.trafficCtx, item.data, w, h, lightDir, inShadow);
      } else {
        state.traffic.renderVehicle(this.trafficCtx, item.data, w, h, lightDir, inShadow);
      }
    });
    
    this.weatherCtx.clearRect(0, 0, w, h);
    state.weather.render(this.weatherCtx, w, h);
    
    this.windshieldCtx.clearRect(0, 0, w, h);
    state.windshield.render(this.windshieldCtx, w, h);

    this.uiCtx.clearRect(0, 0, w, h);
    renderCompass(this.uiCtx, w, h, state.road.heading);
  }
}