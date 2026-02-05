import { renderGlow } from './utils.js';

export function renderLightpole(ctx, x, y, scale, pole) {
  const height = pole.height * scale;
  const width = Math.max(3, 1.5 * scale);
  
  if (height < 3) return;
  
  // Solid color pole
  ctx.fillStyle = '#3a3a3a';
  ctx.fillRect(x - width/2, y - height, width, height);
  
  // Light fixture
  ctx.fillStyle = '#5a5a5a';
  const fixW = width * 3;
  const fixH = width * 1.5;
  ctx.fillRect(x - fixW/2, y - height, fixW, fixH);
  
  if (pole.hasLight) {
    const lightY = y - height + 2;
    const glowSize = 40 * scale;

    ctx.save();
    // Clip the light glow so it doesn't bleed below the pole's ground-level contact point (y)
    ctx.beginPath();
    ctx.rect(x - glowSize, lightY - glowSize, glowSize * 2, y - (lightY - glowSize));
    ctx.clip();

    renderGlow(ctx, x, lightY, pole.lightColor, glowSize, 0.6);
    
    // Bright core
    ctx.fillStyle = pole.lightColor;
    ctx.globalAlpha = 0.95;
    ctx.beginPath();
    ctx.arc(x, lightY, Math.max(1, 3 * scale), 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.restore();
  }
}