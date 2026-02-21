export class SkyRenderer {
  render(ctx, w, h, biome, time, horizonY) {
    const { clouds } = biome.weather;

    // Sky Gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, horizonY);
    
    let colors = biome.skyColors || ['#000', '#111', '#222'];
    
    // Desaturate and darken sky based on cloud coverage
    if (clouds > 0.1) {
      colors = colors.map(c => {
        // Simple hex-based darkening/desaturation for the "spectrum"
        const r = parseInt(c.substring(1, 3), 16);
        const g = parseInt(c.substring(3, 5), 16);
        const b = parseInt(c.substring(5, 7), 16);
        const gray = (r + g + b) / 3;
        const nr = Math.round(r + (gray - r) * clouds) * (1 - clouds * 0.5);
        const ng = Math.round(g + (gray - g) * clouds) * (1 - clouds * 0.5);
        const nb = Math.round(b + (gray - b) * clouds) * (1 - clouds * 0.5);
        return `#${Math.floor(nr).toString(16).padStart(2, '0')}${Math.floor(ng).toString(16).padStart(2, '0')}${Math.floor(nb).toString(16).padStart(2, '0')}`;
      });
    }

    colors.forEach((color, i) => {
      gradient.addColorStop(i / (colors.length - 1), color);
    });
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, horizonY);

    // Fog overlay at horizon
    const fogIntensity = biome.weather.fog;
    if (fogIntensity > 0.05) {
      const fogAlpha = Math.min(1, fogIntensity * 2); // 0.5 becomes 1.0 (opaque)
      const fogGrad = ctx.createLinearGradient(0, horizonY - 100, 0, horizonY);
      fogGrad.addColorStop(0, 'rgba(148, 163, 184, 0)');
      fogGrad.addColorStop(1, `rgba(148, 163, 184, ${fogAlpha})`);
      ctx.fillStyle = fogGrad;
      ctx.fillRect(0, horizonY - 100, w, 100);
    }
    
    // Stars
    if (biome.stars > 0.01) {
      this.renderStars(ctx, w, horizonY, biome.stars, time);
    }
  }

  renderStars(ctx, w, horizonY, starIntensity, time) {
    ctx.save();
    // Clip to sky area to guarantee no stars below horizon
    ctx.beginPath();
    ctx.rect(0, 0, w, horizonY);
    ctx.clip();

    ctx.fillStyle = '#ffffff';
    const starSeed = 42; 
    for (let i = 0; i < 150; i++) {
      const x = (Math.sin(i * 12.9898 + starSeed) * 43758.5453) % 1;
      const y = (Math.sin(i * 78.233 + starSeed) * 43758.5453) % 1;
      const twinkle = (Math.sin(time * 1.5 + i) * 0.5 + 0.5);
      ctx.globalAlpha = starIntensity * twinkle * 0.8;
      const size = (i % 5 === 0) ? 2 : 1;
      ctx.fillRect(Math.abs(x) * w, Math.abs(y) * horizonY, size, size);
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }
}