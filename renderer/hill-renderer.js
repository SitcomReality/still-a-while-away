import { noise } from '../utils.js';

export class HillRenderer {
  constructor() {
    // Generate unique hill characteristics for this session
    this.params = {
      baseHeight: 40 + Math.random() * 80,
      seed: Math.random() * 1000,
      octaves: [
        { f: 0.3 + Math.random() * 0.7, a: 0.6 + Math.random() * 0.4 }, // Large hills
        { f: 1.5 + Math.random() * 2.5, a: 0.2 + Math.random() * 0.3 }, // Lumpy features
        { f: 6.0 + Math.random() * 10.0, a: 0.05 + Math.random() * 0.1 }, // Bumpy terrain
        { f: 25.0 + Math.random() * 35.0, a: 0.02 + Math.random() * 0.03 } // Fine noise
      ]
    };
  }

  render(ctx, w, h, horizonY, heading, biome) {
    // Hills are effectively at infinite distance, so they take full horizon fog
    const fogMix = Math.min(1, biome.weather.fog / 0.5);
    ctx.fillStyle = lerpColor(biome.groundColor, biome.weather.fogColor, fogMix);
    ctx.beginPath();
    ctx.moveTo(0, h);

    const fovScale = 0.8; // How much of the 360 view we see
    const baseH = this.params.baseHeight;
    const seed = this.params.seed;

    for (let x = 0; x <= w; x += 5) {
      // Map screen X and heading to a world-space angle/position
      const worldPos = heading + (x / w) * fovScale;

      let totalH = 0;
      this.params.octaves.forEach(oct => {
        totalH += (noise(worldPos * oct.f + seed) * 0.5 + 0.5) * baseH * oct.a;
      });

      // Add occasional "abrupt" mountain-like spikes
      const mountainEffect = Math.pow(Math.max(0, noise(worldPos * 0.15 + seed * 2)), 3) * baseH * 2;
      
      ctx.lineTo(x, horizonY - (totalH + mountainEffect));
    }

    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fill();

    // Subtle hill outline
    ctx.strokeStyle = '#000000';
    ctx.globalAlpha = 0.4;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
}