import { noise } from '../utils.js';

export class HillRenderer {
  constructor() {
    this.hillParams = {
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
    ctx.fillStyle = biome.groundColor;
    ctx.beginPath();
    ctx.moveTo(0, h);

    const fovScale = 0.8; 
    const baseH = this.hillParams.baseHeight;
    const seed = this.hillParams.seed;

    for (let x = 0; x <= w; x += 5) {
      const worldPos = heading + (x / w) * fovScale;
      let totalH = 0;
      this.hillParams.octaves.forEach(oct => {
        totalH += (noise(worldPos * oct.f + seed) * 0.5 + 0.5) * baseH * oct.a;
      });

      const mountainEffect = Math.pow(Math.max(0, noise(worldPos * 0.15 + seed * 2)), 3) * baseH * 2;
      ctx.lineTo(x, horizonY - (totalH + mountainEffect));
    }

    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#000000';
    ctx.globalAlpha = 0.4;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
}