import { lerpColor } from '../../utils.js';

export function renderTree(ctx, x, y, scale, tree, fog = null, fogFactor = 0) {
  const height = tree.height * scale;
  const width = tree.width * scale;
  
  if (height < 2) return;
  
  // Solid trunk
  ctx.fillStyle = fog ? lerpColor('#2a2218', fog.color, fogFactor) : '#2a2218';
  ctx.fillRect(x - width * 0.15, y - height * 0.4, width * 0.3, height * 0.4);
  
  // Opaque, solid color foliage
  ctx.fillStyle = fog ? lerpColor(tree.color, fog.color, fogFactor) : tree.color;
  ctx.beginPath();
  ctx.ellipse(x, y - height * 0.7, width * 0.5, height * 0.6, 0, 0, Math.PI * 2);
  ctx.fill();
}