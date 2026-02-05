import { BiomePreview } from './biome-preview.js';
import { LoDRenderer } from './lod-renderer.js';

/**
 * Main LoD System - coordinates preview and rendering
 */
export class LoDSystem {
  constructor(road, biomeManager) {
    this.road = road;
    this.preview = new BiomePreview(biomeManager);
    this.renderer = new LoDRenderer(road, this.preview);
  }
  
  update(dt) {
    // LoD system is mostly passive - it samples biomes on demand
  }
  
  render(ctx, w, h) {
    this.renderer.render(ctx, w, h);
  }
  
  getBiomeAt(distance) {
    return this.preview.getBiomeAt(distance);
  }
}