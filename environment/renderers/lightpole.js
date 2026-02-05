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
    const glowSizes = [40, 25, 12.5];
    const alphas = ['40', '50', '80'];
    
    glowSizes.forEach((size, i) => {
      const glowSize = size * scale;
      const gradient = ctx.createRadialGradient(x, y - height + 2, 0, x, y - height + 2, glowSize);
      gradient.addColorStop(0, pole.lightColor + alphas[i]);
      gradient.addColorStop(0.5, pole.lightColor + '20');
      gradient.addColorStop(1, pole.lightColor + '00');
      
      ctx.fillStyle = gradient;
      ctx.fillRect(x - glowSize, y - height + 2 - glowSize, glowSize * 2, glowSize * 2);
    });
    
    // Bright core
    ctx.fillStyle = pole.lightColor;
    ctx.globalAlpha = 0.95;
    ctx.beginPath();
    ctx.arc(x, y - height + 2, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}