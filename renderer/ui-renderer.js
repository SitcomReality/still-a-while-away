import * as CONST from '../constants.js';

export class UIRenderer {
  renderCompass(ctx, w, h, heading) {
    const cw = CONST.COMPASS_WIDTH;
    const ch = CONST.COMPASS_HEIGHT;
    const x = (w - cw) / 2;
    const y = h - ch - 40;

    // Background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(x, y, cw, ch);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.strokeRect(x, y, cw, ch);

    // Directions
    const directions = [
      { name: 'N',  angle: 0 },
      { name: 'NE', angle: Math.PI * 0.25 },
      { name: 'E',  angle: Math.PI * 0.5 },
      { name: 'SE', angle: Math.PI * 0.75 },
      { name: 'S',  angle: Math.PI },
      { name: 'SW', angle: Math.PI * 1.25 },
      { name: 'W',  angle: Math.PI * 1.5 },
      { name: 'NW', angle: Math.PI * 1.75 }
    ];

    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, cw, ch);
    ctx.clip();

    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.font = '12px "Space Mono"';

    directions.forEach(d => {
      let diff = d.angle - heading;
      // Normalize to -PI to PI
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;

      const screenX = x + cw / 2 + diff * (cw / (Math.PI / 2));
      
      if (screenX > x - 20 && screenX < x + cw + 20) {
        ctx.globalAlpha = Math.max(0, 1 - Math.abs(diff) * 1.5);
        ctx.fillText(d.name, screenX, y + 25);
        
        // Ticks
        ctx.fillRect(screenX - 1, y, 2, 5);
        ctx.fillRect(screenX - 1, y + ch - 5, 2, 5);
      }
    });

    // Center indicator
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#ff3333';
    ctx.fillRect(x + cw / 2 - 1, y, 2, ch);

    ctx.restore();
  }
}