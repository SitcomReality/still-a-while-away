import * as CONST from '../constants.js';
import * as Factory from './factory.js';
import { renderTree } from './renderers/tree.js';
import { renderLightpole } from './renderers/lightpole.js';
import { renderBuilding } from './renderers/building.js';
import { renderBush } from './renderers/bush.js';

export class EnvironmentSystem {
  constructor(road) {
    this.road = road;
    this.features = [];
    this.nextFeatureDistance = 0;
  }
  
  update(dt, biome) {
    const viewDistance = CONST.ENV_VIEW_DISTANCE;
    
    while (this.nextFeatureDistance < this.road.distance + viewDistance) {
      // Regular streetlights
      if (Factory.shouldSpawnStreetlight(this.nextFeatureDistance, biome)) {
        const side = Math.floor(this.nextFeatureDistance / biome.streetlightSpacing) % 2 === 0 ? 'left' : 'right';
        this.features.push({
          distance: this.nextFeatureDistance,
          type: 'lightpole',
          side,
          offset: 4.5, // 4.5m from center (just off the 8m wide road)
          height: 8,
          hasLight: true,
          lightColor: '#fff8e1'
        });
      }
      
      // Regular features
      this.features.push(Factory.spawnFeature(this.nextFeatureDistance, biome));
      this.nextFeatureDistance += Factory.getSpacing(biome);
    }
    
    this.features = this.features.filter(f => 
      f.distance > this.road.distance + CONST.ENV_REMOVAL_THRESHOLD
    );
  }
  
  renderFeature(ctx, f, w, h) {
    const relDist = f.distance - this.road.distance;
    
    // Apply fade-in scaling for objects at the far distance limit
    const fadeFactor = Math.min(1, Math.max(0, (CONST.ENV_VIEW_DISTANCE - relDist) / CONST.FADE_IN_DISTANCE));

    if (f.type.startsWith('building_') || f.buildingType) {
      renderBuilding(ctx, w, h, f, this.road, fadeFactor);
    } else {
      const sideMultiplier = f.side === 'left' ? -1 : 1;
      const lateral = f.offset * sideMultiplier;
      const pos = this.road.projectPoint(lateral, 0, relDist, w, h);
      if (pos.scale <= 0) return;

      const renderScale = pos.scale * CONST.ENV_GLOBAL_SCALE * fadeFactor;

      if (f.type === 'tree') {
        renderTree(ctx, pos.x, pos.y, renderScale, f);
      } else if (f.type === 'lightpole') {
        renderLightpole(ctx, pos.x, pos.y, renderScale, f);
      } else if (f.type === 'bush') {
        renderBush(ctx, pos.x, pos.y, renderScale, f);
      }
    }
  }

}