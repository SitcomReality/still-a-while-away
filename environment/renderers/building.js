import * as CONST from '../../constants.js';
import { adjustBrightness, bilinearMap } from './utils.js';

export function renderBuilding(ctx, w, h, f, road) {
  const relDist = f.distance - road.distance;
  const depth = f.depth || 30;
  
  const zNear = relDist - depth / 2;
  const zFar = relDist + depth / 2;
  
  if (zFar < 1) return;
  
  const effZNear = Math.max(1, zNear); 
  const posNear = road.getRoadPosAt(effZNear, w, h);
  const posFar = road.getRoadPosAt(zFar, w, h);
  
  if (posNear.scale <= 0 || posFar.scale <= 0) return;
  
  const sideSign = f.side === 'left' ? -1 : 1;
  const xOffsetNear = w * f.offset * sideSign * posNear.scale;
  const xOffsetFar = w * f.offset * sideSign * posFar.scale;
  
  const cxNear = posNear.x + xOffsetNear;
  const cxFar = posFar.x + xOffsetFar;
  
  const wNear = f.width * CONST.ENV_GLOBAL_SCALE * posNear.scale;
  const wFar = f.width * CONST.ENV_GLOBAL_SCALE * posFar.scale;
  const hNear = f.height * CONST.ENV_GLOBAL_SCALE * posNear.scale;
  const hFar = f.height * CONST.ENV_GLOBAL_SCALE * posFar.scale;
  
  const yNear = posNear.y;
  const yFar = posFar.y;
  
  const fl = cxNear - wNear / 2;
  const fr = cxNear + wNear / 2;
  const ft = yNear - hNear;
  
  const bl = cxFar - wFar / 2;
  const br = cxFar + wFar / 2;
  const bt = yFar - hFar;
  
  ctx.fillStyle = adjustBrightness(f.color, -20);
  ctx.beginPath();
  
  let sideQuad = [];
  if (f.side === 'left') {
    sideQuad = [{x: fr, y: yNear}, {x: br, y: yFar}, {x: br, y: bt}, {x: fr, y: ft}];
  } else {
    sideQuad = [{x: fl, y: yNear}, {x: bl, y: yFar}, {x: bl, y: bt}, {x: fl, y: ft}];
  }
  
  ctx.moveTo(sideQuad[0].x, sideQuad[0].y);
  for (let i = 1; i < 4; i++) ctx.lineTo(sideQuad[i].x, sideQuad[i].y);
  ctx.fill();
  
  renderWindowGrid(ctx, sideQuad, f.windowRows || 5, f.windowCols || 4, f.windowPattern);

  if (zNear > 0.5) {
    ctx.fillStyle = f.color;
    ctx.fillRect(fl, ft, wNear, hNear);
    
    // Front Windows - Render using relative offsets to stay within building bounds
    const fRows = f.windowRows;
    const fCols = f.frontCols;
    const fPattern = f.frontPattern;

    ctx.fillStyle = '#ffeb3b';
    for (let r = 0; r < fRows; r++) {
      for (let c = 0; c < fCols; c++) {
        const val = fPattern[c + r * fCols];
        if (val > 0.4) {
          const u = (c + 0.25) / fCols;
          const v = (r + 0.2) / fRows;
          const uw = 0.5 / fCols;
          const vh = 0.5 / fRows;
          
          ctx.globalAlpha = 0.4 + (val - 0.4) * 0.8;
          ctx.fillRect(
            fl + u * wNear,
            ft + v * hNear,
            uw * wNear,
            vh * hNear
          );
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