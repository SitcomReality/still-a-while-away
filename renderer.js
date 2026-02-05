import { CanvasManager } from './renderer/canvas-manager.js';
import { SkyRenderer } from './renderer/sky-renderer.js';
import { HillRenderer } from './renderer/hill-renderer.js';
import { UIRenderer } from './renderer/ui-renderer.js';
import { ShadowSystem, Shadow } from './environment/shadows.js';
import * as CONST from './constants.js';

export class Renderer {
  constructor() {
    this.canvasManager = new CanvasManager();
    this.skyRenderer = new SkyRenderer();
    this.hillRenderer = new HillRenderer();
    this.uiRenderer = new UIRenderer();
    this.shadowSystem = new ShadowSystem();
  }

  render(state) {
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

    // 3. Shadows & Objects
    ctxs.shadow.clearRect(0, 0, w, h);
    ctxs.env.clearRect(0, 0, w, h);
    ctxs.traffic.clearRect(0, 0, w, h); // Note: Current logic renders everything to this layer or env layer
    
    const sunPos = this.shadowSystem.getSunPosition(state.biome.timeValue);
    const renderables = [];
    const shadows = [];

    // Gather features and generate shadows
    state.environment.features.forEach(f => {
      const relDist = f.distance - state.road.distance;
      if (relDist > 0 && relDist < 500) {
        renderables.push({
          z: relDist + (f.depth ? f.depth / 2 : 0),
          type: 'env',
          data: f
        });

        if (sunPos) {
           const pos = state.road.getRoadPosAt(relDist, w, h);
           if (pos.scale > 0) {
             const sideMultiplier = f.side === 'left' ? -1 : 1;
             const x = pos.x + (w * f.offset * sideMultiplier * pos.scale);
             const shadowPos = { x, y: pos.y };
             const visualHeading = state.road.getVisualHeadingAt(relDist);
             
             const shadow = (f.type === 'building' || f.type === 'lightpole')
               ? Shadow.createBoxShadow(this.shadowSystem, f, sunPos, visualHeading, shadowPos, pos.scale)
               : Shadow.createCylinderShadow(this.shadowSystem, f, sunPos, visualHeading, shadowPos, pos.scale);
             
             if (shadow) shadows.push(shadow);
           }
        }
      }
    });
    
    // Gather vehicles and generate shadows
    state.traffic.vehicles.forEach(v => {
      if (v.distance > 0 && v.distance < 500) {
        renderables.push({
          z: v.distance + (v.depth || 0),
          type: 'traffic',
          data: v
        });
        
        if (sunPos) {
           const pos = state.road.getRoadPosAt(v.distance, w, h);
           if (pos.scale > 0) {
             // Calculate vehicle screen X center (simplified)
             const currentRoadWidth = w * state.road.roadWidth * pos.scale;
             const laneOffset = v.lane === 'right' ? (currentRoadWidth * 0.25) : (-currentRoadWidth * 0.25);
             const x = pos.x + laneOffset;
             const shadowPos = { x, y: pos.y };
             const visualHeading = state.road.getVisualHeadingAt(v.distance);

             // Use box shadow for cars
             const shadow = Shadow.createBoxShadow(this.shadowSystem, 
               { ...v, width: CONST.TRAFFIC_SIZE_SCALE/CONST.ENV_GLOBAL_SCALE, depth: v.depth }, 
               sunPos, visualHeading, shadowPos, pos.scale);
             
             if (shadow) shadows.push(shadow);
           }
        }
      }
    });

    // Render Shadows (Batch)
    shadows.sort((a, b) => b.distance - a.distance);
    shadows.forEach(s => Shadow.render(ctxs.shadow, s));
    
    // Render Objects (Painter's algorithm)
    renderables.sort((a, b) => b.z - a.z);
    
    renderables.forEach(item => {
      // We use traffic context for all dynamic objects to ensure proper layering if needed, 
      // or split them. The original code reused ctxs.traffic for environment too. 
      // We will continue using ctxs.traffic for unified depth sorting.
      if (item.type === 'env') {
        state.environment.renderFeature(ctxs.traffic, item.data, w, h, sunPos, state.road.heading);
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