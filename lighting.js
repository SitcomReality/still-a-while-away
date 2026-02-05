export class LightingSystem {
  constructor() {
    this.sunAngle = 0;
    this.sunAltitude = 0;
    this.lightDirection = { x: 0, y: -1, z: 0 };
    this.isNightTime = false;
  }

  update(biome) {
    const time = biome.timeValue;
    this.isNightTime = biome.name === 'night';

    if (this.isNightTime) {
      // Fixed moonlight from northwest, 45° altitude
      this.sunAngle = Math.PI * 1.25; // NW
      this.sunAltitude = Math.PI / 4;
      this.lightDirection = {
        x: Math.cos(this.sunAngle) * Math.cos(this.sunAltitude),
        y: -Math.sin(this.sunAltitude),
        z: Math.sin(this.sunAngle) * Math.cos(this.sunAltitude)
      };
    } else {
      // Sun path: rises East (0.2), noon South (0.5), sets West (0.8)
      const dayProgress = (time - 0.2) / 0.6; // 0 at sunrise, 1 at sunset
      
      // Sun moves from East (π/2) through South (π) to West (3π/2)
      this.sunAngle = Math.PI / 2 + dayProgress * Math.PI;
      
      // Sun altitude: low at sunrise/sunset, high at noon
      this.sunAltitude = Math.sin(dayProgress * Math.PI) * Math.PI / 3;
      
      this.lightDirection = {
        x: Math.cos(this.sunAngle) * Math.cos(this.sunAltitude),
        y: -Math.sin(this.sunAltitude),
        z: Math.sin(this.sunAngle) * Math.cos(this.sunAltitude)
      };
    }
  }

  getShadowVector(objectHeading) {
    // Project light onto ground plane, adjusted for object's local orientation
    const globalAngle = this.sunAngle;
    const localAngle = globalAngle - objectHeading;
    
    const shadowLength = 1 / Math.max(0.1, Math.tan(this.sunAltitude));
    
    return {
      dx: Math.cos(localAngle) * shadowLength,
      dz: Math.sin(localAngle) * shadowLength
    };
  }

  getCylinderShading(normalAngle) {
    // normalAngle is the angle around the cylinder
    // Light comes from lightDirection
    const lightAngle = Math.atan2(this.lightDirection.z, this.lightDirection.x);
    const diff = normalAngle - lightAngle;
    
    // Cosine shading: bright when facing light, dark when away
    const brightness = Math.cos(diff) * 0.5 + 0.5;
    return Math.max(0.2, brightness);
  }

  getBoxFaceShading(faceNormal) {
    // faceNormal: {x, y, z} unit vector
    const dot = faceNormal.x * this.lightDirection.x + 
                faceNormal.y * this.lightDirection.y + 
                faceNormal.z * this.lightDirection.z;
    return Math.max(0.2, -dot * 0.8 + 0.5);
  }
}