import { lerpColor } from '../../utils.js';

export function renderBush(ctx, x, y, scale, bush, fog = null, fogFactor = 0) {
  const height = bush.height * scale;
  const width = bush.width * scale;
  
  // Small shrubs only
  if (height < 1.5 || width < 1.5) return;
  
  // Solid, opaque elliptical shrub (no transparency)
  ctx.fillStyle = fog ? lerpColor(bush.color, fog.color, fogFactor) : bush.color;
  ctx.beginPath();
  // Draw a rounded/elliptical shape sitting on the ground
  ctx.ellipse(x, y - height * 0.45, width * 0.5, height * 0.55, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // Subtle darker base shadow for depth
  ctx.fillStyle = 'rgba(0,0,0,0.12)';
  ctx.beginPath();
  ctx.ellipse(x, y - height * 0.1, width * 0.45, height * 0.12, 0, 0, Math.PI * 2);
  ctx.fill();
}