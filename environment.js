import { noise } from './utils.js';
import * as CONST from './constants.js';

export class EnvironmentSystem {
  constructor(road) {
    this.road = road;
    this.features = [];
    this.nextFeatureDistance = 0;
  }
  
  update(dt, biome) {
    const viewDistance = CONST.ENV_VIEW_DISTANCE;
    
    // Spawn features ahead
    while (this.nextFeatureDistance < this.road.distance + viewDistance) {
      this.spawnFeature(this.nextFeatureDistance, biome);
      this.nextFeatureDistance += this.getSpacing(biome);
    }
    
    // Remove features behind us
    this.features = this.features.filter(f => 
      f.distance > this.road.distance + CONST.ENV_REMOVAL_THRESHOLD
    );
  }
  
  getSpacing(biome) {
    const base = biome.type === 'city' ? 20 : 30;
    return base + Math.random() * 20;
  }
  
  spawnFeature(distance, biome) {
    const types = this.getFeatureTypes(biome);
    const type = types[Math.floor(Math.random() * types.length)];
    
    const props = this.getFeatureProps(type, biome);
    // Calculate a safe offset to prevent road clipping. 
    // Road half-width is 1.1. We add a buffer based on typical object widths.
    let baseOffset = 1.3;
    if (type === 'building') baseOffset = 1.8;
    if (type === 'tree') baseOffset = 1.4;

    const feature = {
      distance,
      type,
      side: Math.random() > 0.5 ? 'left' : 'right',
      offset: baseOffset + Math.random() * 1.0,
      ...props
    };
    
    this.features.push(feature);
  }
  
  getFeatureTypes(biome) {
    if (biome.type === 'city') {
      return ['lightpole', 'lightpole', 'building', 'tree'];
    } else if (biome.type === 'rural') {
      return ['tree', 'tree', 'tree', 'bush'];
    } else {
      return ['tree', 'tree', 'bush'];
    }
  }
  
  getFeatureProps(type, biome) {
    if (type === 'tree') {
      return {
        height: 15 + Math.random() * 25,
        width: 8 + Math.random() * 8,
        color: biome.type === 'rural' ? '#1a3a1a' : '#2a4a2a',
        swayPhase: Math.random() * Math.PI * 2
      };
    } else if (type === 'lightpole') {
      return {
        height: 25,
        hasLight: true,
        lightColor: '#fff8e1'
      };
    } else if (type === 'building') {
      return {
        height: 30 + Math.random() * 40,
        width: 20 + Math.random() * 30,
        depth: 30 + Math.random() * 40,
        windows: Math.floor(Math.random() * 8) + 2,
        color: '#1a1a2a'
      };
    } else if (type === 'fence') {
      return {
        height: 5,
        segments: 5
      };
    } else if (type === 'bush') {
      return {
        height: 5 + Math.random() * 5,
        width: 8 + Math.random() * 8,
        color: '#1a2a1a'
      };
    }
    return {};
  }
  
  render(ctx, w, h) {
    // Render from back to front
    const sorted = [...this.features].sort((a, b) => b.distance - a.distance);
    
    sorted.forEach(f => {
      const relDist = f.distance - this.road.distance;
      if (relDist < 1 || relDist > CONST.ENV_VIEW_DISTANCE) return; // Clip range
      
      const pos = this.road.getRoadPosAt(relDist, w, h);
      
      const sideMultiplier = f.side === 'left' ? -1 : 1;
      const x = pos.x + (w * f.offset * sideMultiplier * pos.scale);
      
      const y = pos.y;
      const scale = pos.scale;
      
      if (scale <= 0) return;

      const renderScale = scale * CONST.ENV_GLOBAL_SCALE;

      // Render based on type
      if (f.type === 'building') {
        this.renderBuilding(ctx, w, h, f, this.road);
      } else if (f.type === 'tree') {
        this.renderTree(ctx, x, y, renderScale, f);
      } else if (f.type === 'lightpole') {
        this.renderLightpole(ctx, x, y, renderScale, f);
      } else if (f.type === 'fence') {
        this.renderFence(ctx, x, y, renderScale, f);
      } else if (f.type === 'bush') {
        this.renderBush(ctx, x, y, renderScale, f);
      }
    });
  }
  
  renderTree(ctx, x, y, scale, tree) {
    const height = tree.height * scale;
    const width = tree.width * scale;
    
    if (height < 2) return;
    
    // Solid trunk
    ctx.fillStyle = '#2a2218';
    ctx.fillRect(x - width * 0.15, y - height * 0.4, width * 0.3, height * 0.4);
    
    // Opaque, solid color foliage
    ctx.fillStyle = tree.color;
    ctx.beginPath();
    ctx.ellipse(x, y - height * 0.7, width * 0.5, height * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  
  renderLightpole(ctx, x, y, scale, pole) {
    const height = pole.height * scale;
    const width = Math.max(3, 1.5 * scale); // Scaled width
    
    if (height < 3) return;
    
    // Solid color pole
    ctx.fillStyle = '#3a3a3a';
    ctx.fillRect(x - width/2, y - height, width, height);
    
    // Light fixture
    ctx.fillStyle = '#5a5a5a';
    const fixW = width * 3;
    const fixH = width * 1.5;
    ctx.fillRect(x - fixW/2, y - height, fixW, fixH);
    
    if (pole.hasLight) {
      // Multiple glow layers
      const glowSizes = [80, 50, 25];
      const alphas = ['40', '50', '80'];
      
      glowSizes.forEach((size, i) => {
        const glowSize = size * scale;
        const gradient = ctx.createRadialGradient(x, y - height + 2, 0, x, y - height + 2, glowSize);
        gradient.addColorStop(0, pole.lightColor + alphas[i]);
        gradient.addColorStop(0.5, pole.lightColor + '20');
        gradient.addColorStop(1, pole.lightColor + '00');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(x - glowSize, y - height + 2 - glowSize, glowSize * 2, glowSize * 2);
      });
      
      // Bright core
      ctx.fillStyle = pole.lightColor;
      ctx.globalAlpha = 0.95;
      ctx.beginPath();
      ctx.arc(x, y - height + 2, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }
  
  renderBuilding(ctx, w, h, f, road) {
    const relDist = f.distance - road.distance;
    const depth = f.depth || 30;
    
    // Calculate Near and Far Z-depths relative to camera
    const zNear = relDist - depth / 2;
    const zFar = relDist + depth / 2;
    
    if (zFar < 1) return;
    
    // Clamp zNear to camera plane to simulate passing the building
    const effZNear = Math.max(1, zNear); 
    const posNear = road.getRoadPosAt(effZNear, w, h);
    const posFar = road.getRoadPosAt(zFar, w, h);
    
    if (posNear.scale <= 0 || posFar.scale <= 0) return;
    
    // Lateral offset
    const sideSign = f.side === 'left' ? -1 : 1;
    const xOffsetNear = w * f.offset * sideSign * posNear.scale;
    const xOffsetFar = w * f.offset * sideSign * posFar.scale;
    
    const cxNear = posNear.x + xOffsetNear;
    const cxFar = posFar.x + xOffsetFar;
    
    // Dimensions
    const wNear = f.width * CONST.ENV_GLOBAL_SCALE * posNear.scale;
    const wFar = f.width * CONST.ENV_GLOBAL_SCALE * posFar.scale;
    const hNear = f.height * CONST.ENV_GLOBAL_SCALE * posNear.scale;
    const hFar = f.height * CONST.ENV_GLOBAL_SCALE * posFar.scale;
    
    const yNear = posNear.y;
    const yFar = posFar.y;
    
    // Front Face (Near) Coords
    const fl = cxNear - wNear / 2;
    const fr = cxNear + wNear / 2;
    const ft = yNear - hNear;
    
    // Back Face (Far) Coords
    const bl = cxFar - wFar / 2;
    const br = cxFar + wFar / 2;
    const bt = yFar - hFar;
    
    // Draw Side Wall
    // Left building: Right Side Visible (NearRight -> FarRight)
    // Right building: Left Side Visible (NearLeft -> FarLeft)
    
    ctx.fillStyle = this.adjustBrightness(f.color, -20);
    ctx.beginPath();
    
    let sideQuad = [];
    
    if (f.side === 'left') {
      sideQuad = [
        {x: fr, y: yNear}, {x: br, y: yFar},
        {x: br, y: bt},    {x: fr, y: ft}
      ];
    } else {
      sideQuad = [
        {x: fl, y: yNear}, {x: bl, y: yFar},
        {x: bl, y: bt},    {x: fl, y: ft}
      ];
    }
    
    ctx.moveTo(sideQuad[0].x, sideQuad[0].y);
    for (let i = 1; i < 4; i++) ctx.lineTo(sideQuad[i].x, sideQuad[i].y);
    ctx.fill();
    
    // Windows on Side Wall
    this.renderWindowGrid(ctx, sideQuad, 5, 4);

    // Draw Front Face (if visible)
    if (zNear > 0.5) {
      ctx.fillStyle = f.color;
      ctx.fillRect(fl, ft, wNear, hNear);
      
      // Simple Front Windows
      ctx.fillStyle = '#ffeb3b';
      const winW = wNear * 0.2;
      const winH = winW;
      const gap = wNear * 0.1;
      
      for(let r=0; r<5; r++) {
        for(let c=0; c<3; c++) {
           if (Math.random() > 0.4) {
             ctx.globalAlpha = 0.5 + Math.random() * 0.5;
             ctx.fillRect(
               fl + gap + c * (winW + gap),
               ft + gap + r * (winH + gap * 1.5),
               winW, winH
             );
           }
        }
      }
      ctx.globalAlpha = 1;
    }
  }

  adjustBrightness(hex, amount) {
    const num = parseInt(hex.replace('#',''), 16);
    let r = (num >> 16) + amount;
    let b = ((num >> 8) & 0x00FF) + amount;
    let g = (num & 0x0000FF) + amount;
    
    r = Math.max(0, Math.min(255, r));
    g = Math.max(0, Math.min(255, g));
    b = Math.max(0, Math.min(255, b));
    
    return `#${(g | (b << 8) | (r << 16)).toString(16).padStart(6, '0')}`;
  }
  
  renderWindowGrid(ctx, quad, rows, cols) {
    ctx.fillStyle = '#d4c455';
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (Math.random() > 0.6) continue;
        
        const uMin = (c + 0.25) / cols;
        const uMax = (c + 0.75) / cols;
        const vMin = (r + 0.2) / rows;
        const vMax = (r + 0.7) / rows;
        
        const p1 = this.bilinearMap(quad, uMin, vMin);
        const p2 = this.bilinearMap(quad, uMax, vMin);
        const p3 = this.bilinearMap(quad, uMax, vMax);
        const p4 = this.bilinearMap(quad, uMin, vMax);
        
        ctx.globalAlpha = 0.4 + Math.random() * 0.4;
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.lineTo(p3.x, p3.y);
        ctx.lineTo(p4.x, p4.y);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }
  
  bilinearMap(q, u, v) {
    // q: [BN, BF, TF, TN]
    // Top Edge (v=0): TN(3) -> TF(2)
    // Bottom Edge (v=1): BN(0) -> BF(1)
    
    const tx = q[3].x + (q[2].x - q[3].x) * u;
    const ty = q[3].y + (q[2].y - q[3].y) * u;
    
    const bx = q[0].x + (q[1].x - q[0].x) * u;
    const by = q[0].y + (q[1].y - q[0].y) * u;
    
    return {
      x: tx + (bx - tx) * v,
      y: ty + (by - ty) * v
    };
  }
  
  renderFence(ctx, x, y, scale, fence) {
    // Fences removed from gameplay
  }
  
  renderBush(ctx, x, y, scale, bush) {
    const height = bush.height * scale;
    const width = bush.width * scale;
    
    if (height < 2) return;
    
    ctx.fillStyle = bush.color;
    ctx.globalAlpha = 0.7;
    ctx.fillRect(x - width/2, y - height, width, height);
    ctx.globalAlpha = 1;
  }
}