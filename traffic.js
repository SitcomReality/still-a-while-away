import { noise } from './utils.js';
import * as CONST from './constants.js';
import { adjustBrightness, bilinearMap } from './environment/renderers/utils.js';

export class TrafficSystem {
  constructor(road) {
    this.road = road;
    this.vehicles = [];
    this.spawnTimer = 0;
    this.spawnInterval = 3;
  }
  
  update(dt, biome) {
    this.spawnTimer += dt;
    
    // Spawn new vehicles based on biome traffic density
    if (this.spawnTimer >= this.spawnInterval / biome.trafficDensity) {
      this.spawnVehicle(biome);
      this.spawnTimer = 0;
      this.spawnInterval = 2 + Math.random() * 4;
    }
    
    // Update existing vehicles
    for (let i = this.vehicles.length - 1; i >= 0; i--) {
      const v = this.vehicles[i];
      // Oncoming traffic (right lane) moves towards us.
      // Same-direction traffic (left lane) moves relative to our speed.
      const relSpeed = v.lane === 'right' ? (this.road.speed + v.speed) : (this.road.speed - v.speed);
      v.distance -= relSpeed * dt;
      
      // Remove vehicles that passed us or got too far ahead
      if (v.distance < CONST.TRAFFIC_REMOVAL_THRESHOLD || v.distance > CONST.TRAFFIC_RENDER_LIMIT) {
        this.vehicles.splice(i, 1);
      }
    }
  }
  
  spawnVehicle(biome) {
    const types = ['sedan', 'suv', 'truck', 'sports'];
    const type = types[Math.floor(Math.random() * types.length)];
    
    const vehicle = {
      distance: 250 + Math.random() * 150,
      speed: 20 + Math.random() * 20,
      type,
      // Oncoming traffic in right lane, occasional traffic in our lane
      lane: Math.random() > 0.3 ? 'right' : 'left',
      color: this.getRandomColor(),
      headlightColor: Math.random() > 0.7 ? '#a8d8ff' : '#fff8e1',
      headlightIntensity: 0.8 + Math.random() * 0.4,
      height: type === 'truck' ? 1.2 : type === 'sports' ? 0.8 : 1.0,
      depth: type === 'truck' ? 8 : 4.5
    };
    
    this.vehicles.push(vehicle);
  }
  
  getRandomColor() {
    const colors = ['#1a1a1a', '#2a2a2a', '#3a3a3a', '#4a4a4a'];
    return colors[Math.floor(Math.random() * colors.length)];
  }
  
  getProjectedPoint(dist, offset, height, w, h) {
    const pos = this.road.getRoadPosAt(dist, w, h);
    const x = pos.x + (offset * w * pos.scale);
    const y = pos.y - (height * CONST.TRAFFIC_SIZE_SCALE * 0.7 * pos.scale);
    return { x, y, scale: pos.scale };
  }

  drawQuad(ctx, points) {
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < 4; i++) ctx.lineTo(points[i].x, points[i].y);
    ctx.closePath();
    ctx.fill();
  }

  render(ctx, w, h) {
    const sorted = [...this.vehicles].sort((a, b) => b.distance - a.distance);
    
    sorted.forEach(v => {
      if (v.distance < 250) {
        this.renderVehicle3D(ctx, w, h, v);
      } else {
        const pos = this.road.getRoadPosAt(v.distance, w, h);
        if (pos.scale <= 0) return;
        
        const size = CONST.TRAFFIC_SIZE_SCALE * pos.scale;
        const width = size * 1.4;
        const height = size * 0.7 * v.height;
        const currentRoadWidth = w * this.road.roadWidth * pos.scale;
        const laneOffset = v.lane === 'right' ? (currentRoadWidth * 0.25) : (-currentRoadWidth * 0.25);
        const x = pos.x + laneOffset;
        
        const q = [
          { x: x - width/2, y: pos.y, scale: pos.scale },
          { x: x + width/2, y: pos.y, scale: pos.scale },
          { x: x + width/2, y: pos.y - height, scale: pos.scale },
          { x: x - width/2, y: pos.y - height, scale: pos.scale }
        ];

        const futureCurve = this.road.getCurveAt(v.distance + 20);
        const currentCurve = this.road.getCurveAt(v.distance);
        const dimFactor = Math.abs(futureCurve - currentCurve) > 0.05 ? 0.3 : 1.0;
        
        this.renderVehicleSilhouette(ctx, q, v);
        this.renderLights(ctx, q, v, dimFactor);
      }
    });
  }

  renderVehicle3D(ctx, w, h, v) {
    const zNear = Math.max(0.1, v.distance);
    const zFar = v.distance + v.depth;
    
    const roadW = this.road.roadWidth;
    const laneOffset = v.lane === 'right' ? roadW * 0.25 : -roadW * 0.25;
    const carWidth = 0.5; 

    const lOff = laneOffset - carWidth/2;
    const rOff = laneOffset + carWidth/2;

    const nbl = this.getProjectedPoint(zNear, lOff, 0, w, h);
    const nbr = this.getProjectedPoint(zNear, rOff, 0, w, h);
    const ntl = this.getProjectedPoint(zNear, lOff, v.height, w, h);
    const ntr = this.getProjectedPoint(zNear, rOff, v.height, w, h);
    
    const fbl = this.getProjectedPoint(zFar, lOff, 0, w, h);
    const fbr = this.getProjectedPoint(zFar, rOff, 0, w, h);
    const ftl = this.getProjectedPoint(zFar, lOff, v.height, w, h);
    const ftr = this.getProjectedPoint(zFar, rOff, v.height, w, h);

    const nearQuad = [nbl, nbr, ntr, ntl];
    const farQuad = [fbl, fbr, ftr, ftl];

    // Far Face
    ctx.fillStyle = adjustBrightness(v.color, -40);
    this.drawQuad(ctx, farQuad);

    // Side Surfaces
    ctx.fillStyle = adjustBrightness(v.color, -20);
    if (nbl.x > fbl.x) this.drawQuad(ctx, [nbl, fbl, ftl, ntl]);
    if (nbr.x < fbr.x) this.drawQuad(ctx, [nbr, fbr, ftr, ntr]);

    // Top Surface
    if (ntl.y > ftl.y) {
      ctx.fillStyle = adjustBrightness(v.color, 10);
      this.drawQuad(ctx, [ntl, ntr, ftr, ftl]);
    }

    // Near Face
    this.renderVehicleSilhouette(ctx, nearQuad, v);

    const futureCurve = this.road.getCurveAt(v.distance + 20);
    const currentCurve = this.road.getCurveAt(v.distance);
    const dimFactor = Math.abs(futureCurve - currentCurve) > 0.05 ? 0.3 : 1.0;
    this.renderLights(ctx, nearQuad, v, dimFactor);
  }

  renderLights(ctx, quad, vehicle, dimFactor) {
    const isSameDirection = vehicle.lane === 'left';
    const lightColor = isSameDirection ? '#ff0000' : vehicle.headlightColor;
    const brightness = vehicle.headlightIntensity * dimFactor * (isSameDirection ? 0.6 : 1.0);
    const scale = quad[0].scale;

    // Use bilinear mapping to position lights on the face
    const lightL = bilinearMap(quad, 0.2, 0.75);
    const lightR = bilinearMap(quad, 0.8, 0.75);
    
    // Only massive bloom for oncoming headlights
    if (!isSameDirection) {
      const glowSizes = [1200, 800, 400];
      const alphas = [0.15, 0.3, 0.6];
      [lightL, lightR].forEach(pt => {
        for (let i = 0; i < glowSizes.length; i++) {
          const glowSize = glowSizes[i] * scale * brightness;
          const gradient = ctx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, glowSize);
          const baseAlpha = Math.floor(alphas[i] * brightness * 255).toString(16).padStart(2, '0');
          gradient.addColorStop(0, lightColor + baseAlpha);
          gradient.addColorStop(0.4, lightColor + Math.floor(alphas[i] * brightness * 100).toString(16).padStart(2, '0'));
          gradient.addColorStop(1, lightColor + '00');
          ctx.fillStyle = gradient;
          ctx.fillRect(pt.x - glowSize, pt.y - glowSize, glowSize * 2, glowSize * 2);
        }
      });
    } else {
      // Small glow for taillights
      const glowSize = 100 * scale * brightness;
      ctx.fillStyle = lightColor;
      ctx.globalAlpha = 0.3 * brightness;
      ctx.beginPath(); ctx.arc(lightL.x, lightL.y, glowSize, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(lightR.x, lightR.y, glowSize, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    }
    
    const coreSize = Math.max(2, (isSameDirection ? 6 : 8) * scale);
    ctx.fillStyle = lightColor;
    ctx.globalAlpha = brightness * 0.95;
    ctx.beginPath(); ctx.arc(lightL.x, lightL.y, coreSize/2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(lightR.x, lightR.y, coreSize/2, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
  }
  
  renderVehicleSilhouette(ctx, quad, vehicle) {
    const scale = quad[0].scale;
    const size = CONST.TRAFFIC_SIZE_SCALE * scale;
    if (size < 4) return;
    
    const width = Math.abs(quad[1].x - quad[0].x);
    const centerX = (quad[0].x + quad[1].x) / 2;
    
    // Shadow under car
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(centerX - width/2, quad[0].y - 2, width, 4);

    // Car body (Perspective-correct near face)
    ctx.fillStyle = vehicle.color;
    this.drawQuad(ctx, quad);
    
    // Windshield / Windows - Mapped within the quad face
    ctx.fillStyle = '#0a0a0f';
    const windQuad = [
      bilinearMap(quad, 0.1, 0.5),
      bilinearMap(quad, 0.9, 0.5),
      bilinearMap(quad, 0.9, 0.1),
      bilinearMap(quad, 0.1, 0.1)
    ];
    this.drawQuad(ctx, windQuad);
    
    // Subtle highlight on roof edge
    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = 0.1;
    const highQuad = [
      bilinearMap(quad, 0, 0.1),
      bilinearMap(quad, 1, 0.1),
      bilinearMap(quad, 1, 0),
      bilinearMap(quad, 0, 0)
    ];
    this.drawQuad(ctx, highQuad);
    
    ctx.globalAlpha = 1;
  }
}