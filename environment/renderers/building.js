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
  
  // Calculate window counts based on actual dimensions
  const winRows = 6;
  const winColsSide = Math.max(2, Math.floor(f.depth / 8));
  const winColsFront = Math.max(2, Math.floor(f.width / 10));

  renderWindowGrid(ctx, sideQuad, winRows, winColsSide, f.windowPattern, f.patternCols || 15);

  if (zNear > 0.5) {
    ctx.fillStyle = f.color;
    ctx.fillRect(fl, ft, wNear, hNear);
    
    // Front Windows - Scaled to building dimensions to prevent overflow
    const winW = wNear * 0.15;
    const winH = hNear * 0.1;
    const gapX = (wNear - (winColsFront * winW)) / (winColsFront + 1);
    const gapY = (hNear - (winRows * winH)) / (winRows + 1);

    for(let r=0; r < winRows; r++) {
      for(let c=0; c < winColsFront; c++) {
         // Use the shared pattern for consistency
         const patternIdx = (c % (f.patternCols || 15)) + (r * (f.patternCols || 15));
         const randVal = f.windowPattern ? f.windowPattern[patternIdx] : Math.random();
         
         if (randVal > 0.5) {
           ctx.fillStyle = '#ffeb3b';
           ctx.globalAlpha = 0.4 + (randVal - 0.5) * 1.2;
           ctx.fillRect(
             fl + gapX + c * (winW + gapX),
             ft + gapY + r * (winH + gapY),
             winW, winH
           );
         }
      }
    }
    ctx.globalAlpha = 1;
  }
}

function renderWindowGrid(ctx, quad, rows, cols, pattern = null, patternMaxCols = 15) {
  ctx.fillStyle = '#d4c455';
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const patternIdx = (c % patternMaxCols) + (r * patternMaxCols);
      const randVal = pattern ? pattern[patternIdx] : 0;
      if (randVal < 0.6) continue;
      
      const uMin = (c + 0.2) / cols;
      const uMax = (c + 0.8) / cols;
      const vMin = (r + 0.2) / rows;
      const vMax = (r + 0.8) / rows;
      
      const p1 = bilinearMap(quad, uMin, vMin);
      const p2 = bilinearMap(quad, uMax, vMin);
      const p3 = bilinearMap(quad, uMax, vMax);
      const p4 = bilinearMap(quad, uMin, vMax);
      
      ctx.globalAlpha = 0.4 + (randVal - 0.6) * 1.0;
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