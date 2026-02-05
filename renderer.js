import { CanvasManager } from './renderer/canvas-manager.js';
import { SkyRenderer } from './renderer/sky-renderer.js';
import { HillRenderer } from './renderer/hill-renderer.js';
import { UIRenderer } from './renderer/ui-renderer.js';
import { ShadowSystem } from './renderer/shadow-system.js';

export class Renderer {
  constructor() {
    this.canvasManager = new CanvasManager();
    this.skyRenderer = new SkyRenderer();
    this.hillRenderer = new HillRenderer();
    this.uiRenderer = new UIRenderer();
    this.shadowSystem = null; // Initialized in render if needed or lazy loaded
  }

  render(state) {
    if (!this.shadowSystem) this.shadowSystem = new ShadowSystem(state.road);

    const w = this.canvasManager.width;
    const h = this.canvasManager.height;
    const ctxs = this.canvasManager.contexts;
    
    // Calculate global horizon Y for this frame
    const horizonY = state.road.getHorizon(h);
    
    // 1. Sky layer & Hills
    this.skyRenderer.render(ctxs.sky, w, h, state.biome, state.time, horizonY);
    this.hillRenderer.render(ctxs.sky, w, h, horizonY, state.road.heading, state.biome);
    
    // Ground Plane (Behind everything)
    ctxs.sky.fillStyle = state.biome.groundColor;
    ctxs.sky.fillRect(0, horizonY, w, h - horizonY);
    
    // 2. Road layer
    ctxs.road.clearRect(0, 0, w, h);
    state.road.render(ctxs.road, w, h);

    // Prepare Renderables (Used for both Shadows and Objects)
    const renderables = [];
    
    // Gather features
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
    
    // Gather vehicles
    state.traffic.vehicles.forEach(v => {
      if (v.distance > 0 && v.distance < 500) {
        renderables.push({
          z: v.distance + (v.depth || 0),
          type: 'traffic',
          data: v
        });
      }
    });

    // Sort for painter's algorithm
    renderables.sort((a, b) => b.z - a.z);

    // 2b. Shadows (Drawn onto road layer, behind objects)
    this.shadowSystem.render(ctxs.road, renderables, state.time, state.road.heading, w, h);

    // 3. Depth-sorted world objects (Environment + Traffic)
    ctxs.env.clearRect(0, 0, w, h);
    ctxs.traffic.clearRect(0, 0, w, h);
    
    renderables.forEach(item => {
      if (item.type === 'env') {
        state.environment.renderFeature(ctxs.traffic, item.data, w, h);
      } else {
        state.traffic.renderVehicle(ctxs.traffic, item.data, w, h);
      }
    });
    
    // 4. Weather layer
    ctxs.weather.clearRect(0, 0, w, h);
    state.weather.render(ctxs.weather, w, h);
    
    // 5. Windshield layer
    ctxs.windshield.clearRect(0, 0, w, h);
    state.windshield.render(ctxs.windshield, w, h);

    // 6. UI Layer
    ctxs.ui.clearRect(0, 0, w, h);
    this.uiRenderer.renderCompass(ctxs.ui, w, h, state.road.heading);
  }
}