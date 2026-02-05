import * as CONST from '../constants.js';
import * as Factory from './factory.js';
import { renderTree } from './renderers/tree.js';
import { renderLightpole } from './renderers/lightpole.js';
import { renderBuilding } from './renderers/building.js';
import { renderBush } from './renderers/bush.js';

export class EnvironmentSystem {
  constructor(road, lodSystem = null) {
    this.road = road;
    this.lodSystem = lodSystem;
    this.features = [];
    this.nextFeatureDistance = 0;
  }
  
  update(dt, biome) {
    const viewDistance = CONST.ENV_VIEW_DISTANCE;
    
    while (this.nextFeatureDistance < this.road.distance + viewDistance) {
      // Use LoD system to determine biome at this distance if available
      const spawnBiome = this.lodSystem 
        ? this.lodSystem.getBiomeAt(this.nextFeatureDistance)
        : biome;
      
      const feature = Factory.spawnFeature(this.nextFeatureDistance, spawnBiome);
      
      // Track spawn distance for scaling
      feature.spawnDistance = this.nextFeatureDistance;
      
      this.features.push(feature);
      this.nextFeatureDistance += Factory.getSpacing(spawnBiome);
    }
    
    this.features = this.features.filter(f => 
      f.distance > this.road.distance + CONST.ENV_REMOVAL_THRESHOLD
    );
  }
  
  renderFeature(ctx, f, w, h) {
    const relDist = f.distance - this.road.distance;
    const pos = this.road.getRoadPosAt(relDist, w, h);
    if (pos.scale <= 0) return;

    const sideMultiplier = f.side === 'left' ? -1 : 1;
    const x = pos.x + (w * f.offset * sideMultiplier * pos.scale);
    const y = pos.y;
    const scale = pos.scale;
    
    // Calculate growth scale based on how far the object has traveled since spawn
    const traveledDistance = this.road.distance - (f.spawnDistance - relDist);
    const growthDistance = 100; // Distance over which to grow from tiny to full size
    const growthScale = Math.min(1, Math.max(0.1, traveledDistance / growthDistance));
    
    const renderScale = scale * CONST.ENV_GLOBAL_SCALE * growthScale;

    switch (f.type) {
      case 'building':
        renderBuilding(ctx, w, h, f, this.road);
        break;
      case 'tree':
        renderTree(ctx, x, y, renderScale, f);
        break;
      case 'lightpole':
        renderLightpole(ctx, x, y, renderScale, f);
        break;
      case 'bush':
        renderBush(ctx, x, y, renderScale, f);
        break;
    }
  }

  // Obsolete - functionality moved to Renderer unified depth sort
  render(ctx, w, h) {}
}