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
    this.nextStreetlightDistance = 0;
  }
  
  update(dt, biome) {
    const viewDistance = CONST.ENV_VIEW_DISTANCE;

    // Handle Streetlights on a fixed grid
    if (biome.streetlightSpacing > 0) {
      const spacing = biome.streetlightSpacing;
      // If we've just entered a streetlight zone or fallen behind, catch up to current road distance
      if (this.nextStreetlightDistance < this.road.distance) {
        this.nextStreetlightDistance = Math.ceil(this.road.distance / spacing) * spacing;
      }
      
      while (this.nextStreetlightDistance < this.road.distance + viewDistance) {
        const side = (Math.round(this.nextStreetlightDistance / spacing) % 2 === 0) ? 'left' : 'right';
        this.features.push({
          distance: this.nextStreetlightDistance,
          type: 'lightpole',
          side,
          offset: 8.0, // 8m from center (road edge is 6m)
          height: 9,
          hasLight: true,
          lightColor: '#fff8e1'
        });
        this.nextStreetlightDistance += spacing;
      }
    } else {
      // Keep pointer at edge of visibility so we don't spawn retroactively when moving into a city
      this.nextStreetlightDistance = this.road.distance + viewDistance;
    }
    
    while (this.nextFeatureDistance < this.road.distance + viewDistance) {
      // Regular features
      const feat = Factory.spawnFeature(this.nextFeatureDistance, biome);

      // Prevent large buildings from spawning so close that they intrude onto the road.
      // Ensure offset is at least half the road width + half the building width + small margin.
      if ((feat.type && feat.type.startsWith && feat.type.startsWith('building_')) || feat.buildingType) {
        const halfRoad = CONST.ROAD_WIDTH / 2;
        const bHalfWidth = (feat.width || 0) / 2;
        // Base safety margin to keep building edges off the road
        let minOffset = halfRoad + bHalfWidth + 8.0; // 8m safety margin from road edge

        // Extra buffer for skyscrapers and very wide buildings
        const isSkyscraper = feat.buildingType === 'skyscraper' || (feat.type && feat.type.includes('skyscraper'));
        if (isSkyscraper) {
          minOffset += 20.0; // push skyscrapers significantly farther away
        } else if ((feat.width || 0) > 30) {
          minOffset += 12.0; // extra padding for very wide structures
        }

        if (feat.offset === undefined || feat.offset < minOffset) {
          feat.offset = minOffset;
        }
      }

      this.features.push(feat);
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
        // Calculate exit fade for lights as they pass the camera
        // Start fading at 8m, fully out by -5m (to avoid perspective singularity at -8m)
        const exitFade = Math.max(0, Math.min(1, (relDist - (-5)) / (8 - (-5))));
        renderLightpole(ctx, pos.x, pos.y, renderScale, f, exitFade);
      } else if (f.type === 'bush') {
        renderBush(ctx, pos.x, pos.y, renderScale, f);
      }
    }
  }

}