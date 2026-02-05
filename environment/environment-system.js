import * as CONST from '../constants.js';
import * as Factory from './factory.js';
import { renderTree } from './renderers/tree.js';
import { renderLightpole } from './renderers/lightpole.js';
import { renderBuilding } from './renderers/building.js';
import { renderBush } from './renderers/bush.js';

import { BiomePreview } from '../biomes.js';

export class EnvironmentSystem {
  constructor(road) {
    this.road = road;
    this.features = [];
    this.nextFeatureDistance = 0;
    this.biomePreview = new BiomePreview();
  }
  
  update(dt, biome, biomeManager) {
    const viewDistance = CONST.ENV_VIEW_DISTANCE;
    
    // Update biome preview
    this.biomePreview.update(this.road.distance, biomeManager);
    
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

    // LoD scaling: objects grow from tiny to full size
    let lodScale = 1.0;
    if (relDist > CONST.LOD_START_DISTANCE) {
      const lodProgress = (relDist - CONST.LOD_START_DISTANCE) / 100;
      lodScale = Math.max(CONST.LOD_MIN_SCALE, 1.0 - lodProgress);
    }

    const sideMultiplier = f.side === 'left' ? -1 : 1;
    const x = pos.x + (w * f.offset * sideMultiplier * pos.scale);
    const y = pos.y;
    const scale = pos.scale * lodScale;
    const renderScale = scale * CONST.ENV_GLOBAL_SCALE;

    // Horizon occlusion check: use the actual visual horizon of the road
    const horizonY = this.road.getHorizon(h);
    const objectTop = y - (f.height || 15) * renderScale;

    // If the top of the object is below the horizon, it's completely hidden
    if (objectTop > horizonY) return;

    // If the base of the object is above the horizon line (smaller Y), 
    // it's behind a hill and needs clipping.
    const needsClip = y < horizonY;
    if (needsClip) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, w, horizonY);
      ctx.clip();
    }

    switch (f.type) {
      case 'building':
        renderBuilding(ctx, w, h, f, this.road, renderScale);
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

    if (needsClip) {
      ctx.restore();
    }
  }

  renderDistantBiomes(ctx, w, h) {
    const zones = this.biomePreview.getZonesInRange(
      this.road.distance + CONST.LOD_START_DISTANCE,
      this.road.distance + 1000
    );

    zones.forEach(zone => {
      const relDist = zone.distance - this.road.distance;
      const pos = this.road.getRoadPosAt(relDist, w, h);
      if (pos.scale <= 0) return;

      const horizonY = this.road.getHorizon(h);

      // LoD scale for distant zones
      const lodProgress = (relDist - CONST.LOD_START_DISTANCE) / 200;
      const lodScale = Math.max(0.02, 1.0 - lodProgress);

      ctx.globalAlpha = Math.min(0.6, lodScale * 2);

      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, w, horizonY);
      ctx.clip();

      if (zone.type === 'city') {
        // Distant city skyline
        const buildingCount = 5 + Math.floor(Math.random() * 5);
        for (let i = 0; i < buildingCount; i++) {
          const xOffset = (i - buildingCount / 2) * 40 * pos.scale;
          const height = (20 + Math.random() * 40) * pos.scale * lodScale;
          const width = (10 + Math.random() * 15) * pos.scale * lodScale;

          const x = pos.x + xOffset;
          const y = pos.y;

          ctx.fillStyle = '#0a0a1a';
          ctx.fillRect(x - width / 2, y - height, width, height);
        }
      } else {
        // Distant forest
        const treeCount = 8 + Math.floor(Math.random() * 8);
        for (let i = 0; i < treeCount; i++) {
          const xOffset = (i - treeCount / 2) * 25 * pos.scale;
          const height = (10 + Math.random() * 20) * pos.scale * lodScale;
          const width = height * 0.6;

          const x = pos.x + xOffset;
          const y = pos.y;

          ctx.fillStyle = '#0a1a0a';
          ctx.fillRect(x - width / 2, y - height, width, height);
        }
      }

      ctx.restore();
      ctx.globalAlpha = 1;
    });
  }

  // Obsolete - functionality moved to Renderer unified depth sort
  render(ctx, w, h) {}
}