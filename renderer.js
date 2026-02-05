import * as CONST from './constants.js';
import { noise } from './utils.js';

export class Renderer {
  constructor() {
    // Generate unique hill characteristics for this session
    this.hillParams = {
      baseHeight: 40 + Math.random() * 80,
      seed: Math.random() * 1000,
      octaves: [
        { f: 0.3 + Math.random() * 0.7, a: 0.6 + Math.random() * 0.4 }, // Large hills
        { f: 1.5 + Math.random() * 2.5, a: 0.2 + Math.random() * 0.3 }, // Lumpy features
        { f: 6.0 + Math.random() * 10.0, a: 0.05 + Math.random() * 0.1 }, // Bumpy terrain
        { f: 25.0 + Math.random() * 35.0, a: 0.02 + Math.random() * 0.03 } // Fine noise
      ]
    };

    this.skyCanvas = document.getElementById('sky-layer');
    this.envCanvas = document.getElementById('environment-layer');
    this.roadCanvas = document.getElementById('road-layer');
    this.shadowCanvas = document.getElementById('shadow-layer');
    this.trafficCanvas = document.getElementById('traffic-layer');
    this.weatherCanvas = document.getElementById('weather-layer');
    this.windshieldCanvas = document.getElementById('windshield-layer');
    this.uiCanvas = document.getElementById('ui-layer');
    
    this.skyCtx = this.skyCanvas.getContext('2d', { alpha: false });
    this.envCtx = this.envCanvas.getContext('2d', { alpha: true });
    this.roadCtx = this.roadCanvas.getContext('2d', { alpha: true });
    this.shadowCtx = this.shadowCanvas.getContext('2d', { alpha: true });
    this.trafficCtx = this.trafficCanvas.getContext('2d', { alpha: true });
    this.weatherCtx = this.weatherCanvas.getContext('2d', { alpha: true });
    this.windshieldCtx = this.windshieldCanvas.getContext('2d', { alpha: true });
    this.uiCtx = this.uiCanvas.getContext('2d', { alpha: true });
    
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }
  
  resize() {
    const canvases = [
      this.skyCanvas, this.envCanvas, this.roadCanvas, this.shadowCanvas,
      this.trafficCanvas, this.weatherCanvas, this.windshieldCanvas, this.uiCanvas
    ];
    
    canvases.forEach(canvas => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
    });
  }
  
  renderSky(ctx, w, h, biome, time, horizonY, heading) {
    // Sky Gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, horizonY);
    
    const colors = biome.skyColors || ['#000', '#111', '#222'];
    colors.forEach((color, i) => {
      gradient.addColorStop(i / (colors.length - 1), color);
    });
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, horizonY);
    
    // Stars (draw before ground/hills so they never appear in front of horizon)
    if (biome.stars > 0.01) {
      ctx.save();
      // Clip to sky area to guarantee no stars below horizon
      ctx.beginPath();
      ctx.rect(0, 0, w, horizonY);
      ctx.clip();

      ctx.fillStyle = '#ffffff';
      const starSeed = 42; 
      for (let i = 0; i < 150; i++) {
        const x = (Math.sin(i * 12.9898 + starSeed) * 43758.5453) % 1;
        const y = (Math.sin(i * 78.233 + starSeed) * 43758.5453) % 1;
        const twinkle = (Math.sin(time * 1.5 + i) * 0.5 + 0.5);
        ctx.globalAlpha = biome.stars * twinkle * 0.8;
        const size = (i % 5 === 0) ? 2 : 1;
        // Use horizonY to map star vertical position, but clip enforces safety
        ctx.fillRect(Math.abs(x) * w, Math.abs(y) * horizonY, size, size);
      }
      ctx.globalAlpha = 1;
      ctx.restore();
    }

    // Draw Hills
    this.renderHills(ctx, w, h, horizonY, heading, biome);

    // Ground Plane (Behind everything)
    ctx.fillStyle = biome.groundColor;
    ctx.fillRect(0, horizonY, w, h - horizonY);
  }

  renderHills(ctx, w, h, horizonY, heading, biome) {
    ctx.fillStyle = biome.groundColor;
    ctx.beginPath();
    ctx.moveTo(0, h);

    const fovScale = 0.8; // How much of the 360 view we see
    const baseH = this.hillParams.baseHeight;
    const seed = this.hillParams.seed;

    for (let x = 0; x <= w; x += 5) {
      // Map screen X and heading to a world-space angle/position
      // We want heading to scroll the landscape
      const worldPos = heading + (x / w) * fovScale;

      let totalH = 0;
      this.hillParams.octaves.forEach(oct => {
        // Use the persistent noise function for smoothness and determinism
        totalH += (noise(worldPos * oct.f + seed) * 0.5 + 0.5) * baseH * oct.a;
      });

      // Add occasional "abrupt" mountain-like spikes using absolute value or powers
      const mountainEffect = Math.pow(Math.max(0, noise(worldPos * 0.15 + seed * 2)), 3) * baseH * 2;
      
      ctx.lineTo(x, horizonY - (totalH + mountainEffect));
    }

    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fill();

    // Subtle hill outline with slight variation
    ctx.strokeStyle = '#000000';
    ctx.globalAlpha = 0.4;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  renderCompass(ctx, w, h, heading) {
    const cw = CONST.COMPASS_WIDTH;
    const ch = CONST.COMPASS_HEIGHT;
    const x = (w - cw) / 2;
    const y = h - ch - 40;

    // Background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(x, y, cw, ch);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.strokeRect(x, y, cw, ch);

    // Directions
    const directions = [
      { name: 'N',  angle: 0 },
      { name: 'NE', angle: Math.PI * 0.25 },
      { name: 'E',  angle: Math.PI * 0.5 },
      { name: 'SE', angle: Math.PI * 0.75 },
      { name: 'S',  angle: Math.PI },
      { name: 'SW', angle: Math.PI * 1.25 },
      { name: 'W',  angle: Math.PI * 1.5 },
      { name: 'NW', angle: Math.PI * 1.75 }
    ];

    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, cw, ch);
    ctx.clip();

    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.font = '12px "Space Mono"';

    directions.forEach(d => {
      // Wrap heading to 0 - 2PI
      let diff = d.angle - heading;
      // Normalize to -PI to PI
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;

      const screenX = x + cw / 2 + diff * (cw / (Math.PI / 2));
      
      if (screenX > x - 20 && screenX < x + cw + 20) {
        ctx.globalAlpha = Math.max(0, 1 - Math.abs(diff) * 1.5);
        ctx.fillText(d.name, screenX, y + 25);
        
        // Ticks
        ctx.fillRect(screenX - 1, y, 2, 5);
        ctx.fillRect(screenX - 1, y + ch - 5, 2, 5);
      }
    });

    // Center indicator
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#ff3333';
    ctx.fillRect(x + cw / 2 - 1, y, 2, ch);

    ctx.restore();
  }

  getLightDirection(biome, heading) {
    const time = biome.timeValue;
    
    // Night: fixed moonlight from northwest
    if (biome.name === 'night') {
      return {
        azimuth: Math.PI * 1.25, // NW
        elevation: Math.PI * 0.3,
        isNight: true
      };
    }
    
    // Day: sun moves from East to West
    // At sunrise (0.2): azimuth = π/2 (East)
    // At noon (0.5): azimuth = π (South), high elevation
    // At sunset (0.8): azimuth = 3π/2 (West)
    
    let sunAzimuth;
    let sunElevation;
    
    if (time < 0.2) {
      // Before sunrise
      sunAzimuth = Math.PI / 2;
      sunElevation = -Math.PI * 0.1;
    } else if (time < 0.5) {
      // Morning to noon
      const t = (time - 0.2) / 0.3;
      sunAzimuth = Math.PI / 2 + t * Math.PI / 2;
      sunElevation = t * Math.PI / 2;
    } else if (time < 0.8) {
      // Afternoon to sunset
      const t = (time - 0.5) / 0.3;
      sunAzimuth = Math.PI + t * Math.PI / 2;
      sunElevation = (1 - t) * Math.PI / 2;
    } else {
      // After sunset
      sunAzimuth = 3 * Math.PI / 2;
      sunElevation = -Math.PI * 0.1;
    }
    
    return {
      azimuth: sunAzimuth,
      elevation: sunElevation,
      isNight: false
    };
  }

  render(state) {
    const w = this.skyCanvas.width;
    const h = this.skyCanvas.height;
    
    // Calculate global horizon Y for this frame
    const horizonY = state.road.getHorizon(h);
    
    // Calculate light direction for this frame
    const lightDir = this.getLightDirection(state.biome, state.road.heading);
    
    // Sky layer - pass horizon
    this.renderSky(this.skyCtx, w, h, state.biome, state.time, horizonY, state.road.heading);
    
    // Road layer
    this.roadCtx.clearRect(0, 0, w, h);
    state.road.render(this.roadCtx, w, h);

    // Shadow layer
    this.shadowCtx.clearRect(0, 0, w, h);
    if (!lightDir.isNight) {
      this.renderShadows(this.shadowCtx, w, h, state, lightDir, horizonY);
    }

    // Mid-ground objects (Environment + Traffic)
    // We use trafficCtx (the topmost world layer) for combined rendering
    this.envCtx.clearRect(0, 0, w, h);
    this.trafficCtx.clearRect(0, 0, w, h);
    
    const renderables = [];
    
    // Gather and tag features
    state.environment.features.forEach(f => {
      const relDist = f.distance - state.road.distance;
      if (relDist > 0 && relDist < 500) {
        renderables.push({
          z: relDist + (f.depth ? f.depth / 2 : 0),
          type: 'env',
          data: f
        });
      }
    });
    
    // Gather and tag vehicles
    state.traffic.vehicles.forEach(v => {
      if (v.distance > 0 && v.distance < 500) {
        renderables.push({
          z: v.distance + (v.depth || 0),
          type: 'traffic',
          data: v
        });
      }
    });
    
    // Painter's algorithm: sort furthest to nearest
    renderables.sort((a, b) => b.z - a.z);
    
    // Calculate which objects are in shadow
    const shadowMap = new Set();
    if (!lightDir.isNight) {
      for (let i = 0; i < renderables.length; i++) {
        for (let j = i + 1; j < renderables.length; j++) {
          if (this.isInShadow(renderables[i], renderables[j], state.road, w, h, lightDir)) {
            shadowMap.add(renderables[j]);
          }
        }
      }
    }
    
    // Render sorted list
    renderables.forEach(item => {
      const inShadow = shadowMap.has(item);
      if (item.type === 'env') {
        state.environment.renderFeature(this.trafficCtx, item.data, w, h, lightDir, inShadow);
      } else {
        state.traffic.renderVehicle(this.trafficCtx, item.data, w, h, lightDir, inShadow);
      }
    });
    
    // Weather layer
    this.weatherCtx.clearRect(0, 0, w, h);
    state.weather.render(this.weatherCtx, w, h);
    
    // Windshield layer
    this.windshieldCtx.clearRect(0, 0, w, h);
    state.windshield.render(this.windshieldCtx, w, h);

    // UI Layer
    this.uiCtx.clearRect(0, 0, w, h);
    this.renderCompass(this.uiCtx, w, h, state.road.heading);
  }

  renderShadows(ctx, w, h, state, lightDir, horizonY) {
    const allObjects = [];
    
    // Gather environment features
    state.environment.features.forEach(f => {
      const relDist = f.distance - state.road.distance;
      if (relDist > 0 && relDist < 500) {
        allObjects.push({ type: 'env', data: f, z: relDist });
      }
    });
    
    // Gather vehicles
    state.traffic.vehicles.forEach(v => {
      if (v.distance > 0 && v.distance < 500) {
        allObjects.push({ type: 'traffic', data: v, z: v.distance });
      }
    });
    
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    
    allObjects.forEach(obj => {
      if (obj.type === 'env') {
        this.renderEnvShadow(ctx, w, h, obj.data, state.road, lightDir, horizonY);
      } else {
        this.renderVehicleShadow(ctx, w, h, obj.data, state.road, lightDir, horizonY);
      }
    });
  }

  renderEnvShadow(ctx, w, h, f, road, lightDir, horizonY) {
    const relDist = f.distance - road.distance;
    const pos = road.getRoadPosAt(relDist, w, h);
    if (pos.scale <= 0 || pos.y < horizonY) return;

    const sideMultiplier = f.side === 'left' ? -1 : 1;
    const x = pos.x + (w * f.offset * sideMultiplier * pos.scale);
    const y = pos.y;
    
    let objWidth, objHeight;
    
    if (f.type === 'tree') {
      objWidth = f.width * CONST.ENV_GLOBAL_SCALE * pos.scale;
      objHeight = f.height * CONST.ENV_GLOBAL_SCALE * pos.scale;
    } else if (f.type === 'bush') {
      objWidth = f.width * CONST.ENV_GLOBAL_SCALE * pos.scale;
      objHeight = f.height * CONST.ENV_GLOBAL_SCALE * pos.scale;
    } else if (f.type === 'lightpole') {
      objWidth = 3 * pos.scale;
      objHeight = f.height * CONST.ENV_GLOBAL_SCALE * pos.scale;
    } else if (f.type === 'building') {
      objWidth = f.width * CONST.ENV_GLOBAL_SCALE * pos.scale;
      objHeight = f.height * CONST.ENV_GLOBAL_SCALE * pos.scale;
    } else {
      return;
    }
    
    // Calculate shadow projection
    const shadowAngle = lightDir.azimuth - road.heading;
    const shadowLength = objHeight / Math.tan(lightDir.elevation);
    
    const dx = Math.cos(shadowAngle) * shadowLength * pos.scale;
    const dy = Math.sin(shadowAngle) * shadowLength * pos.scale * 0.3; // Perspective squash
    
    ctx.save();
    ctx.globalAlpha = 0.3;
    ctx.fillRect(x + dx - objWidth/2, y + dy, objWidth, 6 * pos.scale);
    ctx.restore();
  }

  renderVehicleShadow(ctx, w, h, v, road, lightDir, horizonY) {
    const pos = road.getRoadPosAt(v.distance, w, h);
    if (pos.scale <= 0 || pos.y < horizonY) return;
    
    const currentRoadWidth = w * road.roadWidth * pos.scale;
    const laneOffset = v.lane === 'right' ? (currentRoadWidth * 0.25) : (-currentRoadWidth * 0.25);
    const x = pos.x + laneOffset;
    const y = pos.y;
    
    const size = CONST.TRAFFIC_SIZE_SCALE * pos.scale;
    const carWidth = size * 1.4;
    const carHeight = size * 0.7 * v.height;
    
    const shadowAngle = lightDir.azimuth - road.heading;
    const shadowLength = carHeight / Math.tan(lightDir.elevation);
    
    const dx = Math.cos(shadowAngle) * shadowLength * pos.scale;
    const dy = Math.sin(shadowAngle) * shadowLength * pos.scale * 0.3;
    
    ctx.save();
    ctx.globalAlpha = 0.3;
    ctx.fillRect(x + dx - carWidth/2, y + dy, carWidth, 4 * pos.scale);
    ctx.restore();
  }

  isInShadow(caster, receiver, road, w, h, lightDir) {
    // Simple check: if receiver is behind caster and in shadow path
    if (receiver.z <= caster.z) return false;
    
    const casterPos = road.getRoadPosAt(caster.z, w, h);
    const receiverPos = road.getRoadPosAt(receiver.z, w, h);
    
    // Very approximate shadow test
    const shadowAngle = lightDir.azimuth - road.heading;
    const dx = Math.cos(shadowAngle);
    
    // Check if receiver is roughly in shadow direction from caster
    const casterX = this.getObjectX(caster, road, w, h);
    const receiverX = this.getObjectX(receiver, road, w, h);
    
    const diff = receiverX - casterX;
    const expectedDiff = dx * (receiver.z - caster.z) * 0.1;
    
    return Math.abs(diff - expectedDiff) < 100;
  }

  getObjectX(obj, road, w, h) {
    const pos = road.getRoadPosAt(obj.z, w, h);
    if (obj.type === 'env') {
      const sideMultiplier = obj.data.side === 'left' ? -1 : 1;
      return pos.x + (w * obj.data.offset * sideMultiplier * pos.scale);
    } else {
      const currentRoadWidth = w * road.roadWidth * pos.scale;
      const laneOffset = obj.data.lane === 'right' ? (currentRoadWidth * 0.25) : (-currentRoadWidth * 0.25);
      return pos.x + laneOffset;
    }
  }
}