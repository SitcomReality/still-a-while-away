import * as CONST from '../../constants.js';
import { adjustBrightness, bilinearMap, drawQuad } from './utils.js';

export function renderBuilding(ctx, w, h, f, road, fadeScale = 1.0) {
  const relDist = f.distance - road.distance;
  const depth = f.depth || 30;
  const zNear = relDist - depth / 2;
  const zFar = relDist + depth / 2;
  if (zFar < 1) return;

  const effZNear = Math.max(1, zNear);
  
  // Use center distance as curve reference for entire building
  const curveRef = relDist;
  
  // World-space positions
  const sideSign = f.side === 'left' ? -1 : 1;
  const lateral = f.offset * sideSign;
  const bWidth = f.width * fadeScale;
  const bHeight = f.height * fadeScale;
  
  // Project 8 corners using consistent curve reference
  const nbl = road.projectPoint(lateral - bWidth/2, 0, effZNear, w, h, curveRef);
  const nbr = road.projectPoint(lateral + bWidth/2, 0, effZNear, w, h, curveRef);
  const ntl = road.projectPoint(lateral - bWidth/2, bHeight, effZNear, w, h, curveRef);
  const ntr = road.projectPoint(lateral + bWidth/2, bHeight, effZNear, w, h, curveRef);
  
  const fbl = road.projectPoint(lateral - bWidth/2, 0, zFar, w, h, curveRef);
  const fbr = road.projectPoint(lateral + bWidth/2, 0, zFar, w, h, curveRef);
  const ftl = road.projectPoint(lateral - bWidth/2, bHeight, zFar, w, h, curveRef);
  const ftr = road.projectPoint(lateral + bWidth/2, bHeight, zFar, w, h, curveRef);
  
  if (nbl.scale <= 0) return;

  // Render back face
  ctx.fillStyle = adjustBrightness(f.color, -40);
  drawQuad(ctx, [fbl, fbr, ftr, ftl]);
  
  // Render side faces
  ctx.fillStyle = adjustBrightness(f.color, -20);
  const leftQuad = [nbl, fbl, ftl, ntl];
  const rightQuad = [nbr, fbr, ftr, ntr];
  
  if (sideSign < 0) {
    // Left side visible
    drawQuad(ctx, leftQuad);
    renderWindowGrid(ctx, leftQuad, f.windowRows || 5, f.windowCols || 4, f.windowPattern);
  } else {
    // Right side visible
    drawQuad(ctx, rightQuad);
    renderWindowGrid(ctx, rightQuad, f.windowRows || 5, f.windowCols || 4, f.windowPattern);
  }
  
  // Render top if visible
  if (ntl.y < ftl.y) {
    ctx.fillStyle = adjustBrightness(f.color, 10);
    drawQuad(ctx, [ntl, ntr, ftr, ftl]);
  }
  
  // Render front face
  if (zNear > 0.5) {
    const frontQuad = [nbl, nbr, ntr, ntl];
    ctx.fillStyle = f.color;
    drawQuad(ctx, frontQuad);
    
    const { windowRows: fRows, frontCols: fCols, frontPattern: fPattern } = f;
    ctx.fillStyle = '#ffeb3b';
    for (let r = 0; r < fRows; r++) {
      for (let c = 0; c < fCols; c++) {
        const val = fPattern[c + r * fCols];
        if (val > 0.4) {
          const p1 = bilinearMap(frontQuad, (c + 0.25) / fCols, (r + 0.2) / fRows);
          const p2 = bilinearMap(frontQuad, (c + 0.75) / fCols, (r + 0.2) / fRows);
          const p3 = bilinearMap(frontQuad, (c + 0.75) / fCols, (r + 0.7) / fRows);
          const p4 = bilinearMap(frontQuad, (c + 0.25) / fCols, (r + 0.7) / fRows);
          
          ctx.globalAlpha = 0.4 + (val - 0.4) * 0.8;
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.lineTo(p3.x, p3.y);
          ctx.lineTo(p4.x, p4.y);
          ctx.fill();
        }
      }
    }
    ctx.globalAlpha = 1;
  }
}


function renderWindowGrid(ctx, quad, rows, cols, pattern = null) {
  ctx.fillStyle = '#ffeb3b';
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const idx = c + r * cols;
      const randVal = pattern ? pattern[idx] : 0;
      if (randVal < 0.4) continue;
      
      const uMin = (c + 0.25) / cols;
      const uMax = (c + 0.75) / cols;
      const vMin = (r + 0.2) / rows;
      const vMax = (r + 0.7) / rows;
      
      const p1 = bilinearMap(quad, uMin, vMin);
      const p2 = bilinearMap(quad, uMax, vMin);
      const p3 = bilinearMap(quad, uMax, vMax);
      const p4 = bilinearMap(quad, uMin, vMax);
      
      ctx.globalAlpha = 0.4 + (randVal - 0.4) * 0.8;
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.lineTo(p3.x, p3.y);
      ctx.lineTo(p4.x, p4.y);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}