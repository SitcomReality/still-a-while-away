export function renderTree(ctx, x, y, scale, tree, sunPos, heading) {
  const height = tree.height * scale;
  const width = tree.width * scale;
  
  if (height < 2) return;
  
  // Trunk
  ctx.fillStyle = '#2a2218';
  ctx.fillRect(x - width * 0.15, y - height * 0.4, width * 0.3, height * 0.4);
  
  // Foliage
  if (sunPos) {
    // Calculate light direction relative to viewer
    const lightAngle = sunPos.azimuth - heading;
    
    // Create gradient to simulate cylinder shading
    const gradient = ctx.createLinearGradient(
      x - width * 0.5, y - height * 0.7,
      x + width * 0.5, y - height * 0.7
    );
    
    // Lit side vs shadow side
    // If sun is to the right (positive cos), right side is lit
    const cosAngle = Math.cos(lightAngle);
    const litSide = cosAngle > 0 ? 1 : 0;
    
    // Simple shading logic
    const baseColor = tree.color;
    
    // We can't easily lighten/darken hex here without util, but we can use alpha overlays
    // or just assume baseColor is mid-tone.
    // Let's use simple overlay approach for shading
    ctx.fillStyle = baseColor;
  } else {
    ctx.fillStyle = tree.color;
  }

  // Draw base foliage
  ctx.beginPath();
  ctx.ellipse(x, y - height * 0.7, width * 0.5, height * 0.6, 0, 0, Math.PI * 2);
  ctx.fill();

  // Apply shading overlay if sun exists
  if (sunPos) {
    const lightAngle = sunPos.azimuth - heading;
    const cosAngle = Math.cos(lightAngle); // -1 (left) to 1 (right)

    ctx.save();
    ctx.clip(); // Clip to the ellipse we just drew
    
    // Shadow side
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    const shadowOffset = -cosAngle * width * 0.3; 
    ctx.beginPath();
    ctx.rect(x + shadowOffset, y - height * 1.5, width * (cosAngle > 0 ? -1 : 1), height * 2);
    ctx.fill();
    
    // Highlight side
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    const highlightOffset = -cosAngle * width * 0.3;
    ctx.beginPath();
    ctx.rect(x + highlightOffset, y - height * 1.5, width * (cosAngle > 0 ? 1 : -1), height * 2);
    ctx.fill();
    
    ctx.restore();
  }
}