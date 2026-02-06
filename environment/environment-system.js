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
      this.features.push(Factory.spawnFeature(this.nextFeatureDistance, biome));
      this.nextFeatureDistance += Factory.getSpacing(biome);
    }
    
    this.features = this.features.filter(f => 
      f.distance > this.road.distance + CONST.ENV_REMOVAL_THRESHOLD
    );
  }
  
  renderFeature(ctx, f, w, h) {
    const relDist = f.distance - this.road.distance;
    const pos = this.road.getRoadPosAt(relDist, w, h);
    if (pos.scale <= 0) return;

    // Apply fade-in scaling for objects at the far distance limit
    const fadeFactor = Math.min(1, Math.max(0, (CONST.ENV_VIEW_DISTANCE - relDist) / CONST.FADE_IN_DISTANCE));

    const sideMultiplier = f.side === 'left' ? -1 : 1;
    const x = pos.x + (w * f.offset * sideMultiplier * pos.scale);
    const y = pos.y;
    const scale = pos.scale;
    const renderScale = scale * CONST.ENV_GLOBAL_SCALE * fadeFactor;

    switch (f.type) {
      case 'building':
        renderBuilding(ctx, w, h, f, this.road, fadeFactor);
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

}