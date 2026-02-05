export function renderSky(ctx, w, h, biome, time, horizonY, hillRenderer, heading) {
  // Sky Gradient
  const gradient = ctx.createLinearGradient(0, 0, 0, horizonY);
  const colors = biome.skyColors || ['#000', '#111', '#222'];
  colors.forEach((color, i) => {
    gradient.addColorStop(i / (colors.length - 1), color);
  });
  
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, horizonY);
  
  // Stars
  if (biome.stars > 0.01) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, w, horizonY);
    ctx.clip();

    ctx.fillStyle = '#ffffff';
    const starSeed = 42; 
    for (let i = 0; i < 150; i++) {
      const x = (Math.sin(i * 12.9898 + starSeed) * 43758.5453) % 1;
      const y = (Math.sin(i * 78.233 + starSeed) * 43758.5453) % 1;
      const twinkle = (Math.sin(time * 1.5 + i) * 0.5 + 0.5);
      ctx.globalAlpha = biome.stars * twinkle * 0.8;
      const size = (i % 5 === 0) ? 2 : 1;
      ctx.fillRect(Math.abs(x) * w, Math.abs(y) * horizonY, size, size);
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  // Draw Hills
  hillRenderer.render(ctx, w, h, horizonY, heading, biome);

  // Ground Plane
  ctx.fillStyle = biome.groundColor;
  ctx.fillRect(0, horizonY, w, h - horizonY);
}