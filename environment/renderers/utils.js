export function adjustBrightness(hex, amount) {
  const num = parseInt(hex.replace('#',''), 16);
  let r = (num >> 16) + amount;
  let b = ((num >> 8) & 0x00FF) + amount;
  let g = (num & 0x0000FF) + amount;
  
  r = Math.max(0, Math.min(255, r));
  g = Math.max(0, Math.min(255, g));
  b = Math.max(0, Math.min(255, b));
  
  return `#${(g | (b << 8) | (r << 16)).toString(16).padStart(6, '0')}`;
}

export function bilinearMap(q, u, v) {
  // q: [BN, BF, TF, TN]
  const tx = q[3].x + (q[2].x - q[3].x) * u;
  const ty = q[3].y + (q[2].y - q[3].y) * u;
  
  const bx = q[0].x + (q[1].x - q[0].x) * u;
  const by = q[0].y + (q[1].y - q[0].y) * u;
  
  return {
    x: tx + (bx - tx) * v,
    y: ty + (by - ty) * v
  };
}

/**
 * Draw a 4-point quad (array of {x,y}) with current fillStyle.
 */
export function drawQuad(ctx, pts) {
  if (!pts || pts.length < 4) return;
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  ctx.lineTo(pts[1].x, pts[1].y);
  ctx.lineTo(pts[2].x, pts[2].y);
  ctx.lineTo(pts[3].x, pts[3].y);
  ctx.closePath();
  ctx.fill();
}

/**
 * Simple gradient cache to avoid creating objects every frame.
 */
const gradientCache = new Map();

/**
 * Render a soft radial glow centered at (x,y).
 * strength: multiplier for alpha
 * size: radius in pixels
 */
export function renderGlow(ctx, x, y, color, size, strength = 0.5) {
  if (size < 1 || strength <= 0.005) return;
  
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = Math.min(1, strength);
  
  const g = ctx.createRadialGradient(x, y, 0, x, y, size);
  g.addColorStop(0, color);
  g.addColorStop(0.3, color + 'aa');
  g.addColorStop(1, color + '00');

  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, size, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}