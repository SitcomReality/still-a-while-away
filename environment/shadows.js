import * as CONST from '../constants.js';

export class ShadowSystem {
  constructor() {
    // Sun configuration
    this.SUN_ELEVATION_MIN = 0;      // Horizon at sunrise/sunset
    this.SUN_ELEVATION_MAX = Math.PI / 3;  // ~60° at noon
    this.SHADOW_LENGTH_MAX = 5;      // Max shadow length multiplier
    this.SHADOW_LENGTH_MIN = 0.3;    // Min shadow length (noon)
  }

  getSunPosition(timeValue) {
    // timeValue: 0 = midnight, 0.25 = sunrise, 0.5 = noon, 0.75 = sunset
    
    // Only compute shadows during day (0.2 to 0.8)
    if (timeValue < 0.2 || timeValue > 0.8) {
      return null; // Night - no shadows
    }

    // Map time to sun azimuth (horizontal angle)
    // 0.25 (6am) = East (π/2), 0.5 (noon) = South (0), 0.75 (6pm) = West (-π/2)
    const dayProgress = (timeValue - 0.25) / 0.5; // 0 to 1 across the day
    const sunAzimuth = Math.PI / 2 - dayProgress * Math.PI; // π/2 → -π/2
    
    // Map time to sun elevation (vertical angle)
    // Peaks at noon (0.5)
    const noonDist = Math.abs(timeValue - 0.5) / 0.25; // 0 at noon, 1 at sunrise/sunset
    const sunElevation = this.SUN_ELEVATION_MAX * (1 - noonDist);
    
    // Shadow length inversely proportional to sun elevation
    const shadowLength = this.SHADOW_LENGTH_MIN + 
      (this.SHADOW_LENGTH_MAX - this.SHADOW_LENGTH_MIN) * noonDist;

    return {
      azimuth: sunAzimuth,      // Horizontal angle (world space)
      elevation: sunElevation,  // Vertical angle
      shadowLength: shadowLength
    };
  }

  // Convert world-space sun direction to screen-space shadow offset
  getShadowVector(sunPos, heading, objectDistance, screenScale) {
    if (!sunPos) return null;

    // Sun azimuth is in world space, heading is current road direction
    // Effective shadow angle on screen = sun azimuth - heading
    const screenAzimuth = sunPos.azimuth - heading;

    // Shadow direction (opposite of sun)
    const shadowAngle = screenAzimuth + Math.PI;

    // Base shadow offset (in world units)
    const baseShadowDist = sunPos.shadowLength;

    // Project to screen considering perspective
    // Shadows further away should be shorter on screen
    const perspectiveFactor = screenScale;

    return {
      dx: Math.cos(shadowAngle) * baseShadowDist * perspectiveFactor,
      dy: Math.sin(shadowAngle) * baseShadowDist * perspectiveFactor * 0.5, // 0.5 for foreshortening
      length: baseShadowDist,
      angle: shadowAngle
    };
  }
}

export class Shadow {
  static createBoxShadow(shadowSystem, object, sunPos, heading, roadPos, scale) {
    const shadowVec = shadowSystem.getShadowVector(
      sunPos, 
      heading, 
      object.distance, 
      scale
    );
    
    if (!shadowVec) return null;

    // Object's base rectangle in screen space
    const baseX = roadPos.x;
    const baseY = roadPos.y;
    
    // Use global scale to match renderer sizing
    // Note: building renderer uses f.width * CONST.ENV_GLOBAL_SCALE * posNear.scale
    const pixelWidth = object.width * CONST.ENV_GLOBAL_SCALE * scale;
    const pixelDepth = (object.depth || 10) * CONST.ENV_GLOBAL_SCALE * scale;
    
    // For environment objects offset from center:
    // The renderer calculates X based on offset. We need to account for that.
    // The passed 'roadPos' is central. 
    // BUT the calling code in renderer.js will likely pass the calculated screen X/Y.
    // Let's assume roadPos.x is the OBJECT's center x on screen.
    
    const w = 1000; // Arbitrary reference for shadowVec scaling if needed, but vector is already scaled
    // The shadow vector dx/dy are multipliers. We need to apply them to a base unit.
    // The shadowVec from system uses `baseShadowDist * perspectiveFactor`.
    // We need to scale this by a world unit size to get pixels.
    const shadowLen = 500 * shadowVec.length * scale; // 500 is an arbitrary world unit to pixel factor

    const vecX = Math.cos(shadowVec.angle) * shadowLen;
    const vecY = Math.sin(shadowVec.angle) * shadowLen * 0.5;

    // Shadow quad vertices
    const vertices = [
      // Front-left
      { x: baseX - pixelWidth/2, y: baseY },
      // Front-right
      { x: baseX + pixelWidth/2, y: baseY },
      // Back-right
      { x: baseX + pixelWidth/2 + vecX, y: baseY - pixelDepth/2 + vecY },
      // Back-left
      { x: baseX - pixelWidth/2 + vecX, y: baseY - pixelDepth/2 + vecY }
    ];

    return {
      vertices: vertices,
      alpha: this.getShadowAlpha(sunPos),
      distance: object.distance
    };
  }

  static createCylinderShadow(shadowSystem, object, sunPos, heading, roadPos, scale) {
    const shadowVec = shadowSystem.getShadowVector(
      sunPos, 
      heading, 
      object.distance, 
      scale
    );
    
    if (!shadowVec) return null;

    const baseX = roadPos.x;
    const baseY = roadPos.y;
    const radius = (object.width || 1) * CONST.ENV_GLOBAL_SCALE * scale * 0.5;

    // Scale shadow vector to pixels
    const shadowLen = 500 * shadowVec.length * scale;
    const vecX = Math.cos(shadowVec.angle) * shadowLen;
    const vecY = Math.sin(shadowVec.angle) * shadowLen * 0.5;

    // Rectangle aligned with shadow direction
    const perpAngle = shadowVec.angle + Math.PI / 2;
    const dx = Math.cos(perpAngle) * radius;
    const dy = Math.sin(perpAngle) * radius * 0.5; // Foreshortening

    const vertices = [
      { x: baseX - dx, y: baseY - dy },
      { x: baseX + dx, y: baseY + dy },
      { x: baseX + dx + vecX, y: baseY + dy + vecY },
      { x: baseX - dx + vecX, y: baseY - dy + vecY }
    ];

    return {
      vertices: vertices,
      alpha: this.getShadowAlpha(sunPos),
      distance: object.distance
    };
  }

  static getShadowAlpha(sunPos) {
    if (!sunPos) return 0;
    // Shadows darker when sun is higher (shorter shadows), lighter when long
    const baseAlpha = 0.35;
    const elevationFactor = Math.sin(sunPos.elevation);
    return baseAlpha * (0.5 + 0.5 * elevationFactor);
  }

  static render(ctx, shadow) {
    ctx.fillStyle = `rgba(0, 0, 0, ${shadow.alpha})`;
    ctx.beginPath();
    ctx.moveTo(shadow.vertices[0].x, shadow.vertices[0].y);
    for (let i = 1; i < shadow.vertices.length; i++) {
      ctx.lineTo(shadow.vertices[i].x, shadow.vertices[i].y);
    }
    ctx.closePath();
    ctx.fill();
  }
}