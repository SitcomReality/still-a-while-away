import * as CONST from '../../constants.js';
import { adjustBrightness, bilinearMap, drawQuad } from './utils.js';
import { lerpColor } from '../../utils.js';

export function renderBuilding(ctx, w, h, f, road, fadeScale = 1.0, fog = null, fogFactor = 0) {
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

  // Fog-mixed colors
  const roofColor = lerpColor(adjustBrightness(f.color, 10), fog.color, fogFactor);
  const sideColor = lerpColor(adjustBrightness(f.color, -20), fog.color, fogFactor);
  const frontColor = lerpColor(f.color, fog.color, fogFactor);
  const windowColor = lerpColor('#ffeb3b', fog.color, fogFactor);

  // Render top first so it sits behind walls (roof should be obscured by faces)
  if (ntl.y < ftl.y) {
    ctx.fillStyle = roofColor;
    drawQuad(ctx, [ntl, ntr, ftr, ftl]);
  }

  // Render the side face that is facing the road (the "inner" wall)
  ctx.fillStyle = sideColor;
  if (sideSign < 0) {
    // Building is on the left of the road, so its RIGHT side face is visible to the driver
    const sideQuad = [nbr, fbr, ftr, ntr];
    drawQuad(ctx, sideQuad);
    renderWindowGrid(ctx, sideQuad, f.windowRows || 5, f.windowCols || 4, f.windowPattern, windowColor);
  } else {
    // Building is on the right of the road, so its LEFT side face is visible to the driver
    const sideQuad = [nbl, fbl, ftl, ntl];
    drawQuad(ctx, sideQuad);
    renderWindowGrid(ctx, sideQuad, f.windowRows || 5, f.windowCols || 4, f.windowPattern, windowColor);
  }
  
  // Render front face
  if (zNear > 0.5) {
    const frontQuad = [nbl, nbr, ntr, ntl];
    ctx.fillStyle = frontColor;
    drawQuad(ctx, frontQuad);
    
    const { windowRows: fRows, frontCols: fCols, frontPattern: fPattern } = f;
    ctx.fillStyle = windowColor;
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


function renderWindowGrid(ctx, quad, rows, cols, pattern = null, color = '#ffeb3b') {
  ctx.fillStyle = color;
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