export function renderBush(ctx, x, y, scale, bush, lightDir, inShadow) {
  const height = bush.height * scale;
  const width = bush.width * scale;
  
  if (height < 2) return;
  
  ctx.fillStyle = bush.color;
  ctx.globalAlpha = inShadow ? 0.5 : 0.7;
  ctx.fillRect(x - width/2, y - height, width, height);
  ctx.globalAlpha = 1;
}