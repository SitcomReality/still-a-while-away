import * as CONST from '../../constants.js';
import { adjustBrightness, bilinearMap, drawQuad } from './utils.js';

export function renderBuilding(ctx, w, h, f, road, fadeScale = 1.0) {
  const relDist = f.distance - road.distance;
  const depth = f.depth || 30;
  const zNear = relDist - depth / 2;
  const zFar = relDist + depth / 2;
  if (zFar < 1) return;

  const effZNear = Math.max(1, zNear);
  // Use effZNear as a curve reference for both points to keep the building rigid
  const posNear = road.getRoadPosAt(effZNear, w, h, effZNear);
  const posFar = road.getRoadPosAt(zFar, w, h, effZNear);
  if (posNear.scale <= 0 || posFar.scale <= 0) return;

  const sideSign = f.side === 'left' ? -1 : 1;
  const xOffsetNear = w * f.offset * sideSign * posNear.scale;
  const xOffsetFar = w * f.offset * sideSign * posFar.scale;
  const cxNear = posNear.x + xOffsetNear;
  const cxFar = posFar.x + xOffsetFar;

  const dims = {
    wNear: f.width * CONST.ENV_GLOBAL_SCALE * posNear.scale * fadeScale,
    wFar: f.width * CONST.ENV_GLOBAL_SCALE * posFar.scale * fadeScale,
    hNear: f.height * CONST.ENV_GLOBAL_SCALE * posNear.scale * fadeScale,
    hFar: f.height * CONST.ENV_GLOBAL_SCALE * posFar.scale * fadeScale,
    yNear: posNear.y,
    yFar: posFar.y,
    cxNear,
    cxFar
  };

  renderBuildingSide(ctx, f, dims);
  if (zNear > 0.5) {
    renderBuildingFront(ctx, f, dims);
  }
}

function renderBuildingSide(ctx, f, d) {
  const { cxNear, wNear, yNear, cxFar, wFar, yFar, hNear, hFar } = d;
  const fl = cxNear - wNear / 2, fr = cxNear + wNear / 2, ft = yNear - hNear;
  const bl = cxFar - wFar / 2, br = cxFar + wFar / 2, bt = yFar - hFar;

  const sideQuad = f.side === 'left' 
    ? [{ x: fr, y: yNear }, { x: br, y: yFar }, { x: br, y: bt }, { x: fr, y: ft }]
    : [{ x: fl, y: yNear }, { x: bl, y: yFar }, { x: bl, y: bt }, { x: fl, y: ft }];

  ctx.fillStyle = adjustBrightness(f.color, -20);
  drawQuad(ctx, sideQuad);
  renderWindowGrid(ctx, sideQuad, f.windowRows || 5, f.windowCols || 4, f.windowPattern);
}

function renderBuildingFront(ctx, f, d) {
  const fl = d.cxNear - d.wNear / 2;
  const ft = d.yNear - d.hNear;
  
  ctx.fillStyle = f.color;
  ctx.fillRect(fl, ft, d.wNear, d.hNear);

  const { windowRows: fRows, frontCols: fCols, frontPattern: fPattern } = f;
  ctx.fillStyle = '#ffeb3b';
  for (let r = 0; r < fRows; r++) {
    for (let c = 0; c < fCols; c++) {
      const val = fPattern[c + r * fCols];
      if (val > 0.4) {
        ctx.globalAlpha = 0.4 + (val - 0.4) * 0.8;
        ctx.fillRect(
          fl + ((c + 0.25) / fCols) * d.wNear,
          ft + ((r + 0.2) / fRows) * d.hNear,
          (0.5 / fCols) * d.wNear,
          (0.5 / fRows) * d.hNear
        );
      }
    }
  }
  ctx.globalAlpha = 1;
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