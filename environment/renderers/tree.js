export function renderTree(ctx, x, y, scale, tree, lightDir, inShadow) {
  const height = tree.height * scale;
  const width = tree.width * scale;
  
  if (height < 2) return;
  
  // Darken if in shadow
  const shadowFactor = inShadow ? 0.6 : 1.0;
  
  // Cylindrical trunk with shading
  const trunkWidth = width * 0.3;
  const trunkHeight = height * 0.4;
  
  const trunkGradient = ctx.createLinearGradient(x - trunkWidth/2, y, x + trunkWidth/2, y);
  if (lightDir && !lightDir.isNight) {
    const lightAngle = lightDir.azimuth;
    const leftBrightness = Math.max(0.3, Math.cos(lightAngle) * 0.5 + 0.5) * shadowFactor;
    const rightBrightness = Math.max(0.3, Math.cos(lightAngle + Math.PI) * 0.5 + 0.5) * shadowFactor;
    
    trunkGradient.addColorStop(0, `rgba(42, 34, 24, ${leftBrightness})`);
    trunkGradient.addColorStop(0.5, `rgba(42, 34, 24, ${Math.max(leftBrightness, rightBrightness)})`);
    trunkGradient.addColorStop(1, `rgba(42, 34, 24, ${rightBrightness})`);
  } else {
    trunkGradient.addColorStop(0, 'rgba(42, 34, 24, 0.5)');
    trunkGradient.addColorStop(0.5, 'rgba(42, 34, 24, 0.7)');
    trunkGradient.addColorStop(1, 'rgba(42, 34, 24, 0.5)');
  }
  
  ctx.fillStyle = trunkGradient;
  ctx.fillRect(x - trunkWidth/2, y - trunkHeight, trunkWidth, trunkHeight);
  
  // Cylindrical foliage with shading
  const foliageWidth = width * 0.5;
  const foliageHeight = height * 0.6;
  const foliageCenterY = y - height * 0.7;
  
  const foliageGradient = ctx.createLinearGradient(x - foliageWidth, foliageCenterY, x + foliageWidth, foliageCenterY);
  
  if (lightDir && !lightDir.isNight) {
    const lightAngle = lightDir.azimuth;
    const leftBrightness = Math.max(0.4, Math.cos(lightAngle) * 0.5 + 0.5) * shadowFactor;
    const rightBrightness = Math.max(0.4, Math.cos(lightAngle + Math.PI) * 0.5 + 0.5) * shadowFactor;
    
    // Parse tree color and apply brightness
    const baseColor = tree.color;
    const r = parseInt(baseColor.substring(1, 3), 16);
    const g = parseInt(baseColor.substring(3, 5), 16);
    const b = parseInt(baseColor.substring(5, 7), 16);
    
    foliageGradient.addColorStop(0, `rgb(${r * leftBrightness}, ${g * leftBrightness}, ${b * leftBrightness})`);
    foliageGradient.addColorStop(0.5, `rgb(${r * Math.max(leftBrightness, rightBrightness)}, ${g * Math.max(leftBrightness, rightBrightness)}, ${b * Math.max(leftBrightness, rightBrightness)})`);
    foliageGradient.addColorStop(1, `rgb(${r * rightBrightness}, ${g * rightBrightness}, ${b * rightBrightness})`);
  } else {
    foliageGradient.addColorStop(0, tree.color);
    foliageGradient.addColorStop(0.5, tree.color);
    foliageGradient.addColorStop(1, tree.color);
  }
  
  ctx.fillStyle = foliageGradient;
  ctx.beginPath();
  ctx.ellipse(x, foliageCenterY, foliageWidth, foliageHeight, 0, 0, Math.PI * 2);
  ctx.fill();
}