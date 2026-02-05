import { lerp, lerpColor } from './utils.js';

export class BiomeManager {
  constructor() {
    // Time is 0.0 to 1.0 (Midnight to Midnight)
    this.timeValue = 0.8; // Start at evening
    this.timeScale = 0.005; // Progression speed
    
    this.locations = ['city', 'rural'];
    this.currentLocation = 'city';
    this.nextLocationChange = 60 + Math.random() * 60;

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
    
    // Update location
    this.nextLocationChange -= dt;
    if (this.nextLocationChange <= 0) {
      this.currentLocation = this.locations[Math.floor(Math.random() * this.locations.length)];
      this.nextLocationChange = 60 + Math.random() * 60;
    }

    // Refresh state
    this.current = this.getInterpolatedState();
  }

  getInterpolatedState() {
    const { s1, s2, t } = this._findTimeStates();
    const skyColors = s1.colors.map((c, i) => 
      lerpColor(c, s2.colors[i] || s2.colors[s2.colors.length - 1], t)
    );
    
    return {
      type: this.currentLocation,
      timeValue: this.timeValue,
      name: t < 0.5 ? s1.name : s2.name,
      skyColors,
      groundColor: lerpColor(s1.ground, s2.ground, t),
      ambient: lerp(s1.ambient, s2.ambient, t),
      stars: lerp(s1.stars, s2.stars, t),
      weather: 'clear',
      trafficDensity: this.currentLocation === 'city' ? 1.5 : 0.4,
      hasStreetlights: this.currentLocation === 'city' || s1.name === 'night' || s2.name === 'night',
      description: `${this.currentLocation} at ${s1.name}`
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