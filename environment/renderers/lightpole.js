import { renderGlow } from './utils.js';
import { lerpColor } from '../../utils.js';

export function renderLightpole(ctx, x, y, scale, pole, exitFade = 1.0, fog = null, fogFactor = 0) {
  const height = pole.height * scale;
  const width = 0.25 * scale; // Tighter, slimmer pole (25cm diameter)
  
  if (height < 2) return;
  
  const poleColor = fog ? lerpColor('#222222', fog.color, fogFactor) : '#222222';
  const lightColor = pole.lightColor;

  // Main vertical pole
  ctx.fillStyle = poleColor;
  ctx.fillRect(x - width / 2, y - height, width, height);
  
  // Horizontal arm fixture
  const armLen = 2.0 * scale; // 2 meter reach
  const dir = pole.side === 'left' ? 1 : -1;
  const armHeight = width * 0.7;
  ctx.fillRect(x - width / 2, y - height, armLen * dir, armHeight);
  
  if (pole.hasLight && exitFade > 0) {
    const lightX = x + (armLen * dir) - (width * 0.5 * dir);
    const lightY = y - height + (armHeight / 2);
    
    // Attenuate glow by fog factor to prevent luminance accumulation in the distance
    const glowIntensity = 0.5 * exitFade * Math.max(0, 1 - fogFactor * 1.1);
    
    // Ambient glow modulated by exitFade and fog attenuation
    if (glowIntensity > 0.01) {
      renderGlow(ctx, lightX, lightY, lightColor, 7 * scale, glowIntensity);
    }
    
    // Small fixture housing
    ctx.fillStyle = poleColor;
    ctx.fillRect(lightX - (width * dir), lightY - width, width * 2 * dir, width * 0.5);

    // Bright core light source modulated by exitFade and fog
    ctx.fillStyle = lerpColor(lightColor, fog.color, fogFactor);
    ctx.globalAlpha = 0.9 * exitFade;
    ctx.beginPath();
    ctx.arc(lightX, lightY, width * 1.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}