import { noise } from '../utils.js';

/**
 * Determines biome type at any distance using deterministic noise
 * This allows us to "see" what biomes are coming far in advance
 */
export class BiomePreview {
  constructor(biomeManager) {
    this.biomeManager = biomeManager;
    this.seed = Math.random() * 10000;
  }
  
  getBiomeAt(distance) {
    // Use noise to deterministically determine biome type at any distance
    const val = noise(distance * 0.001 + this.seed);
    
    // Map noise to biome types
    // -1 to 0.2: rural
    // 0.2 to 1: city
    const type = val > 0.2 ? 'city' : 'rural';
    
    return { type };
  }
  
  // Get biome regions in a distance range
  getRegions(startDist, endDist, segmentSize = 100) {
    const regions = [];
    let currentBiome = this.getBiomeAt(startDist);
    let regionStart = startDist;
    
    for (let d = startDist; d < endDist; d += segmentSize) {
      const biome = this.getBiomeAt(d);
      
      if (biome.type !== currentBiome.type) {
        // Biome changed, close current region
        regions.push({
          start: regionStart,
          end: d,
          type: currentBiome.type
        });
        
        regionStart = d;
        currentBiome = biome;
      }
    }
    
    // Add final region
    regions.push({
      start: regionStart,
      end: endDist,
      type: currentBiome.type
    });
    
    return regions;
  }
}