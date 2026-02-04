import { noise } from './utils.js';

export class EnvironmentSystem {
  constructor(road) {
    this.road = road;
    this.features = [];
    this.nextFeatureDistance = 0;
  }
  
  update(dt, biome) {
    const viewDistance = 300;
    
    // Spawn features ahead
    while (this.nextFeatureDistance < this.road.distance + viewDistance) {
      this.spawnFeature(this.nextFeatureDistance, biome);
      this.nextFeatureDistance += this.getSpacing(biome);
    }
    
    // Remove features behind us
    this.features = this.features.filter(f => 
      f.distance > this.road.distance - 20
    );
  }
  
  getSpacing(biome) {
    const base = biome.type === 'city' ? 20 : 30;
    return base + Math.random() * 20;
  }
  
  spawnFeature(distance, biome) {
    const types = this.getFeatureTypes(biome);
    const type = types[Math.floor(Math.random() * types.length)];
    
    const feature = {
      distance,
      type,
      side: Math.random() > 0.5 ? 'left' : 'right',
      // Much larger offset to clear the wider road (road half-width is ~1.25)
      offset: 1.4 + Math.random() * 0.6,
      ...this.getFeatureProps(type, biome)
    };
    
    this.features.push(feature);
  }
  
  getFeatureTypes(biome) {
    if (biome.type === 'city') {
      return ['lightpole', 'lightpole', 'building', 'tree'];
    } else if (biome.type === 'rural') {
      return ['tree', 'tree', 'tree', 'fence'];
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
      if (relDist < 1 || relDist > 300) return; // Clip range
      
      const pos = this.road.getRoadPosAt(relDist, w, h);
      
      const sideMultiplier = f.side === 'left' ? -1 : 1;
      // Adjust X based on offset from road center
      // Offset needs to scale with perspective to stay attached to road
      const x = pos.x + (w * f.offset * sideMultiplier * pos.scale); 
      // Note: f.offset is ~0.35-0.5. multiplied by w and scale.
      
      const y = pos.y;
      const scale = pos.scale;
      
      if (scale <= 0) return;

      // Apply global scale factor for environment details (10x size)
      const renderScale = scale * 10;

      // Render based on type
      if (f.type === 'tree') {
        this.renderTree(ctx, x, y, renderScale, f);
      } else if (f.type === 'lightpole') {
        this.renderLightpole(ctx, x, y, renderScale, f);
      } else if (f.type === 'building') {
        this.renderBuilding(ctx, x, y, renderScale, f);
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
    
    // Trunk with gradient
    const trunkGradient = ctx.createLinearGradient(x - width * 0.15, 0, x + width * 0.15, 0);
    trunkGradient.addColorStop(0, '#1a1510');
    trunkGradient.addColorStop(0.5, '#2a2218');
    trunkGradient.addColorStop(1, '#1a1510');
    ctx.fillStyle = trunkGradient;
    ctx.fillRect(x - width * 0.15, y, width * 0.3, height * 0.4);
    
    // Foliage layers
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = tree.color;
    ctx.beginPath();
    ctx.ellipse(x, y - height * 0.3, width * 0.5, height * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Darker layer for depth
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = '#0a1a0a';
    ctx.beginPath();
    ctx.ellipse(x - width * 0.2, y - height * 0.35, width * 0.3, height * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.globalAlpha = 1;
  }
  
  renderLightpole(ctx, x, y, scale, pole) {
    const height = pole.height * scale;
    const width = Math.max(3, 1.5 * scale); // Scaled width
    
    if (height < 3) return;
    
    // Pole with gradient
    const poleGradient = ctx.createLinearGradient(x - width/2, 0, x + width/2, 0);
    poleGradient.addColorStop(0, '#2a2a2a');
    poleGradient.addColorStop(0.5, '#4a4a4a');
    poleGradient.addColorStop(1, '#2a2a2a');
    ctx.fillStyle = poleGradient;
    ctx.fillRect(x - width/2, y, width, height);
    
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
  
  renderBuilding(ctx, x, y, scale, building) {
    const height = building.height * scale;
    const width = building.width * scale;
    
    if (height < 5) return;
    
    // Building silhouette
    ctx.fillStyle = building.color;
    ctx.fillRect(x - width/2, y - height, width, height);
    
    // Windows
    ctx.fillStyle = '#ffeb3b';
    const windowSize = Math.max(1, 3 * scale);
    const spacing = Math.max(4, 8 * scale);
    
    for (let i = 0; i < building.windows; i++) {
      const wx = x - width/2 + (i % 3) * spacing + spacing;
      const wy = y - height + Math.floor(i / 3) * spacing * 1.5 + spacing;
      
      if (Math.random() > 0.3) { // Not all windows lit
        ctx.globalAlpha = 0.6 + Math.random() * 0.4;
        ctx.fillRect(wx, wy, windowSize, windowSize);
      }
    }
    
    ctx.globalAlpha = 1;
  }
  
  renderFence(ctx, x, y, scale, fence) {
    const height = fence.height * scale;
    const width = Math.max(1, 0.3 * scale);
    if (height < 2) return;
    
    ctx.fillStyle = '#3a3a3a';
    for (let i = 0; i < fence.segments; i++) {
      ctx.fillRect(x + i * 5 * scale, y, width, height);
    }
  }
  
  renderBush(ctx, x, y, scale, bush) {
    const height = bush.height * scale;
    const width = bush.width * scale;
    
    if (height < 2) return;
    
    ctx.fillStyle = bush.color;
    ctx.globalAlpha = 0.7;
    ctx.fillRect(x - width/2, y, width, height);
    ctx.globalAlpha = 1;
  }
}