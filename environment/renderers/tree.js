export function renderTree(ctx, x, y, scale, tree, lighting) {
  const height = tree.height * scale;
  const width = tree.width * scale;
  
  if (height < 2) return;
  
  // Cylindrical trunk with shading
  const trunkWidth = width * 0.3;
  const trunkHeight = height * 0.4;
  const trunkSegments = 12;
  
  for (let i = 0; i < trunkSegments; i++) {
    const angle = (i / trunkSegments) * Math.PI;
    const nextAngle = ((i + 1) / trunkSegments) * Math.PI;
    
    const x1 = x + Math.cos(angle) * trunkWidth / 2;
    const x2 = x + Math.cos(nextAngle) * trunkWidth / 2;
    
    const brightness = lighting ? lighting.getCylinderShading(angle + Math.PI) : 0.6;
    const r = 42, g = 34, b = 24;
    const shadedColor = `rgb(${r * brightness}, ${g * brightness}, ${b * brightness})`;
    
    ctx.fillStyle = shadedColor;
    ctx.fillRect(Math.min(x1, x2), y - trunkHeight, Math.abs(x2 - x1) + 1, trunkHeight);
  }
  
  // Cylindrical foliage with shading
  const foliageRadius = width * 0.5;
  const foliageHeight = height * 0.6;
  const foliageCenterY = y - height * 0.7;
  const foliageSegments = 20;
  
  // Parse base color
  const baseColor = tree.color;
  const r = parseInt(baseColor.substring(1, 3), 16);
  const g = parseInt(baseColor.substring(3, 5), 16);
  const b = parseInt(baseColor.substring(5, 7), 16);
  
  for (let i = 0; i < foliageSegments; i++) {
    const angle = (i / foliageSegments) * Math.PI;
    const nextAngle = ((i + 1) / foliageSegments) * Math.PI;
    
    const x1 = x + Math.cos(angle) * foliageRadius;
    const x2 = x + Math.cos(nextAngle) * foliageRadius;
    
    const brightness = lighting ? lighting.getCylinderShading(angle + Math.PI) : 0.6;
    const shadedColor = `rgb(${r * brightness}, ${g * brightness}, ${b * brightness})`;
    
    ctx.fillStyle = shadedColor;
    ctx.fillRect(
      Math.min(x1, x2),
      foliageCenterY - foliageHeight / 2,
      Math.abs(x2 - x1) + 1,
      foliageHeight
    );
  }
  
  // Top hemisphere cap
  if (lighting) {
    const capBrightness = lighting.getCylinderShading(0);
    const capColor = `rgb(${r * capBrightness}, ${g * capBrightness}, ${b * capBrightness})`;
    ctx.fillStyle = capColor;
    ctx.beginPath();
    ctx.ellipse(x, foliageCenterY - foliageHeight / 2, foliageRadius, foliageRadius * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}