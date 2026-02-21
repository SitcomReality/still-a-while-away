import { CanvasManager } from './renderer/canvas-manager.js';
import { SkyRenderer } from './renderer/sky-renderer.js';
import { HillRenderer } from './renderer/hill-renderer.js';
import { UIRenderer } from './renderer/ui-renderer.js';
import * as CONST from './constants.js';

export class Renderer {
  constructor() {
    this.canvasManager = new CanvasManager();
    this.skyRenderer = new SkyRenderer();
    this.hillRenderer = new HillRenderer();
    this.uiRenderer = new UIRenderer();
  }

  render(state) {
    const w = this.canvasManager.width;
    const h = this.canvasManager.height;
    const ctxs = this.canvasManager.contexts;
    
    // Calculate global horizon Y for this frame
    const horizonY = state.road.getHorizon(h);
    
    // Calculate fog state
    const fog = {
      color: state.biome.fogColor,
      intensity: state.weather.fog
    };

    // 1. Sky layer & Hills
    this.skyRenderer.render(ctxs.sky, w, h, state.biome, state.time, horizonY, fog);
    this.hillRenderer.render(ctxs.sky, w, h, horizonY, state.road.heading, state.biome, fog);
    
    // Ground Plane (Behind everything)
    ctxs.sky.fillStyle = state.biome.groundColor;
    ctxs.sky.fillRect(0, horizonY, w, h - horizonY);
    
    // 2. Road layer
    ctxs.road.clearRect(0, 0, w, h);
    state.road.render(ctxs.road, w, h, fog);

    // 3. Depth-sorted world objects (Environment + Traffic)
    ctxs.env.clearRect(0, 0, w, h);
    ctxs.traffic.clearRect(0, 0, w, h);
    
    const renderables = [];
    
    // Gather features
    state.environment.features.forEach(f => {
      const relDist = f.distance - state.road.distance;
      if (relDist > 0 && relDist < CONST.ENV_VIEW_DISTANCE) {
        renderables.push({
          z: relDist + (f.depth ? f.depth / 2 : 0),
          type: 'env',
          data: f
        });
      }
    });
    
    // Gather vehicles
    state.traffic.vehicles.forEach(v => {
      if (v.distance > 0 && v.distance < CONST.TRAFFIC_RENDER_LIMIT) {
        renderables.push({
          z: v.distance + (v.depth || 0),
          type: 'traffic',
          data: v
        });
      }
    });
    
    // Painter's algorithm
    renderables.sort((a, b) => b.z - a.z);
    
    renderables.forEach(item => {
      if (item.type === 'env') {
        state.environment.renderFeature(ctxs.traffic, item.data, w, h, fog);
      } else {
        state.traffic.renderVehicle(ctxs.traffic, item.data, w, h, fog);
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

    if (state.debug) {
      this.renderDebugVisuals(ctxs.ui, w, h, state);
    }
  }

  renderDebugVisuals(ctx, w, h, state) {
    const horizonY = state.road.getHorizon(h);
    const markers = [
      { y: horizonY, label: 'Horizon' },
      { y: state.road.getRoadPosAt(500, w, h).y, label: 'Draw Distance (500m)' },
      { y: state.road.getRoadPosAt(350, w, h).y, label: 'Marking Limit (350m)' },
      { y: state.road.getRoadPosAt(8, w, h).y, label: 'Curve Start (8m)' }
    ];

    // Group markers by Y position to prevent overlap
    const grouped = new Map();
    markers.forEach(m => {
      const roundedY = Math.round(m.y);
      if (!grouped.has(roundedY)) grouped.set(roundedY, []);
      grouped.get(roundedY).push(m.label);
    });

    ctx.font = '10px "Space Mono"';
    ctx.textAlign = 'right';
    
    grouped.forEach((labels, y) => {
      // Line
      ctx.strokeStyle = '#0f0';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();

      // Label
      ctx.fillStyle = '#0f0';
      ctx.fillText(labels.join(', '), w - 10, y - 4);
    });
  }
}