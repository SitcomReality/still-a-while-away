import { renderGlow } from './utils.js';

export function renderLightpole(ctx, x, y, scale, pole, exitFade = 1.0) {
  const height = pole.height * scale;
  const width = 0.25 * scale; // Tighter, slimmer pole (25cm diameter)
  
  if (height < 2) return;
  
  // Main vertical pole
  ctx.fillStyle = '#222222';
  ctx.fillRect(x - width / 2, y - height, width, height);
  
  // Horizontal arm fixture
  const armLen = 2.0 * scale; // 2 meter reach
  const dir = pole.side === 'left' ? 1 : -1;
  const armHeight = width * 0.7;
  ctx.fillRect(x - width / 2, y - height, armLen * dir, armHeight);
  
  if (pole.hasLight && exitFade > 0) {
    const lightX = x + (armLen * dir) - (width * 0.5 * dir);
    const lightY = y - height + (armHeight / 2);
    
    // Ambient glow modulated by exitFade
    renderGlow(ctx, lightX, lightY, pole.lightColor, 7 * scale, 0.5 * exitFade);
    
    // Small fixture housing
    ctx.fillStyle = '#333';
    ctx.fillRect(lightX - (width * dir), lightY - width, width * 2 * dir, width * 0.5);

    // Bright core light source modulated by exitFade
    ctx.fillStyle = pole.lightColor;
    ctx.globalAlpha = 0.9 * exitFade;
    ctx.beginPath();
    ctx.arc(lightX, lightY, width * 1.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}