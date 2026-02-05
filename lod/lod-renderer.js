import * as CONST from '../constants.js';

/**
 * Renders simplified LoD representations of distant biomes
 */
export class LoDRenderer {
  constructor(road, biomePreview) {
    this.road = road;
    this.biomePreview = biomePreview;
  }
  
  render(ctx, w, h) {
    const currentDist = this.road.distance;
    
    // Render distant biome previews from 500m to 1500m
    const regions = this.biomePreview.getRegions(
      currentDist + 500,
      currentDist + 1500,
      50
    );
    
    regions.forEach(region => {
      this.renderRegion(ctx, w, h, region);
    });
  }
  
  renderRegion(ctx, w, h, region) {
    const currentDist = this.road.distance;
    const relStart = region.start - currentDist;
    const relEnd = region.end - currentDist;
    
    // Get positions for region boundaries
    const startPos = this.road.getRoadPosAt(relStart, w, h);
    const endPos = this.road.getRoadPosAt(relEnd, w, h);
    
    if (startPos.scale <= 0 || endPos.scale <= 0) return;
    
    // Fade out LoD as we get closer (fade completely by 500m)
    const fadeStart = 500;
    const fadeEnd = 800;
    const closestDist = relStart;
    
    let alpha = 1;
    if (closestDist < fadeEnd) {
      alpha = Math.max(0, (closestDist - fadeStart) / (fadeEnd - fadeStart));
    }
    
    if (alpha <= 0) return;
    
    ctx.globalAlpha = alpha * 0.4;
    
    if (region.type === 'city') {
      this.renderCityLoD(ctx, w, h, startPos, endPos, region);
    } else if (region.type === 'rural') {
      this.renderForestLoD(ctx, w, h, startPos, endPos, region);
    }
    
    ctx.globalAlpha = 1;
  }
  
  renderCityLoD(ctx, w, h, startPos, endPos, region) {
    // City: vertical rectangles representing buildings
    const buildingCount = Math.floor((region.end - region.start) / 40);
    
    for (let i = 0; i < buildingCount; i++) {
      const progress = i / buildingCount;
      const dist = region.start + progress * (region.end - region.start);
      const relDist = dist - this.road.distance;
      const pos = this.road.getRoadPosAt(relDist, w, h);
      
      if (pos.scale <= 0) continue;
      
      const side = (i % 2 === 0) ? 1 : -1;
      const offset = (1.2 + Math.sin(i) * 0.3) * side;
      const x = pos.x + offset * w * pos.scale;
      
      const height = (20 + Math.sin(i * 3.7) * 15) * pos.scale;
      const width = 3 * pos.scale;
      
      ctx.fillStyle = '#1a1a2a';
      ctx.fillRect(x - width/2, pos.y - height, width, height);
      
      // Tiny window hints
      if (height > 2) {
        ctx.fillStyle = '#ffeb3b';
        ctx.globalAlpha *= 0.5;
        ctx.fillRect(x - width/4, pos.y - height * 0.7, width/2, 1);
        ctx.fillRect(x - width/4, pos.y - height * 0.4, width/2, 1);
      }
    }
  }
  
  renderForestLoD(ctx, w, h, startPos, endPos, region) {
    // Forest: small dots/triangles representing trees
    const treeCount = Math.floor((region.end - region.start) / 15);
    
    for (let i = 0; i < treeCount; i++) {
      const progress = i / treeCount;
      const dist = region.start + progress * (region.end - region.start);
      const relDist = dist - this.road.distance;
      const pos = this.road.getRoadPosAt(relDist, w, h);
      
      if (pos.scale <= 0) continue;
      
      const side = (i % 2 === 0) ? 1 : -1;
      const offset = (1.3 + Math.sin(i * 2.1) * 0.4) * side;
      const x = pos.x + offset * w * pos.scale;
      
      const size = (8 + Math.sin(i * 5.3) * 4) * pos.scale;
      
      ctx.fillStyle = '#1a3a1a';
      // Simple triangle
      ctx.beginPath();
      ctx.moveTo(x, pos.y - size);
      ctx.lineTo(x - size/2, pos.y);
      ctx.lineTo(x + size/2, pos.y);
      ctx.closePath();
      ctx.fill();
    }
  }
}