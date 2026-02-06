import { lerp, lerpColor } from './utils.js';

export class BiomeManager {
  constructor() {
    // Time is 0.0 to 1.0 (Midnight to Midnight)
    this.timeValue = 0.8; // Start at evening
    this.timeScale = 0.005; // Progression speed
    
    this.biomeTypes = [
      { id: 'city', treeDensity: 0.1, buildingDensity: 0.8, streetlightSpacing: 25, farmChance: 0 },
      { id: 'suburbs', treeDensity: 0.3, buildingDensity: 0.4, streetlightSpacing: 40, farmChance: 0.1 },
      { id: 'plains', treeDensity: 0.2, buildingDensity: 0.05, streetlightSpacing: 0, farmChance: 0.3 },
      { id: 'forest', treeDensity: 0.9, buildingDensity: 0, streetlightSpacing: 0, farmChance: 0 }
    ];
    this.currentBiomeIndex = 0;
    this.nextBiomeChange = 60 + Math.random() * 60;

    // Define sky/lighting states for time of day
    this.timeStates = [
      { time: 0.0,  name: 'night',   colors: ['#020205', '#050512', '#0a0a1a'], ground: '#020402', ambient: 0.1, stars: 1.0 },
      { time: 0.2,  name: 'sunrise', colors: ['#1a2a44', '#ff9e6d', '#ffdb99'], ground: '#1a150a', ambient: 0.5, stars: 0.2 },
      { time: 0.3,  name: 'day',     colors: ['#4a90e2', '#87ceeb', '#b0e2ff'], ground: '#1a2a1a', ambient: 1.0, stars: 0.0 },
      { time: 0.7,  name: 'day',     colors: ['#4a90e2', '#87ceeb', '#b0e2ff'], ground: '#1a2a1a', ambient: 1.0, stars: 0.0 },
      { time: 0.8,  name: 'sunset',  colors: ['#0f1419', '#d87855', '#ffa563'], ground: '#1a1005', ambient: 0.6, stars: 0.1 },
      { time: 0.9,  name: 'night',   colors: ['#020205', '#050512', '#0a0a1a'], ground: '#020402', ambient: 0.1, stars: 0.8 },
      { time: 1.0,  name: 'night',   colors: ['#020205', '#050512', '#0a0a1a'], ground: '#020402', ambient: 0.1, stars: 1.0 }
    ];

    this.current = this.getInterpolatedState();
  }
  
  update(dt) {
    // Update time
    this.timeValue = (this.timeValue + this.timeScale * dt) % 1.0;
    
    // Biome transitions (can move forward or backward along spectrum)
    this.nextBiomeChange -= dt;
    if (this.nextBiomeChange <= 0) {
      const change = Math.random() > 0.5 ? 1 : -1;
      this.currentBiomeIndex = Math.max(0, Math.min(this.biomeTypes.length - 1, this.currentBiomeIndex + change));
      this.nextBiomeChange = 60 + Math.random() * 60;
    }

    // Refresh state
    this.current = this.getInterpolatedState();
  }

  getInterpolatedState() {
    const { s1, s2, t } = this._findTimeStates();
    return this._buildBiomeState(s1, s2, t);
  }

  _buildBiomeState(s1, s2, t) {
    const skyColors = s1.colors.map((c, i) => 
      lerpColor(c, s2.colors[i] || s2.colors[s2.colors.length - 1], t)
    );
    
    const biome = this.biomeTypes[this.currentBiomeIndex];
    const trafficByType = { city: 1.5, suburbs: 0.8, plains: 0.3, forest: 0.2 };
    
    return {
      type: biome.id,
      timeValue: this.timeValue,
      name: t < 0.5 ? s1.name : s2.name,
      skyColors,
      groundColor: lerpColor(s1.ground, s2.ground, t),
      ambient: lerp(s1.ambient, s2.ambient, t),
      stars: lerp(s1.stars, s2.stars, t),
      weather: 'clear',
      trafficDensity: trafficByType[biome.id] || 0.5,
      treeDensity: biome.treeDensity,
      buildingDensity: biome.buildingDensity,
      streetlightSpacing: biome.streetlightSpacing,
      farmChance: biome.farmChance,
      hasStreetlights: biome.streetlightSpacing > 0,
      description: `${biome.id} at ${s1.name}`
    };
  }

  _findTimeStates() {
    let s1 = this.timeStates[0];
    let s2 = this.timeStates[this.timeStates.length - 1];

    for (let i = 0; i < this.timeStates.length - 1; i++) {
      if (this.timeValue >= this.timeStates[i].time && this.timeValue <= this.timeStates[i+1].time) {
        s1 = this.timeStates[i];
        s2 = this.timeStates[i+1];
        break;
      }
    }
    const t = (this.timeValue - s1.time) / (s2.time - s1.time || 1);
    return { s1, s2, t };
  }
}