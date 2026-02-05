export class CanvasManager {
  constructor() {
    this.layers = {
      sky: document.getElementById('sky-layer'),
      env: document.getElementById('environment-layer'),
      road: document.getElementById('road-layer'),
      traffic: document.getElementById('traffic-layer'),
      weather: document.getElementById('weather-layer'),
      windshield: document.getElementById('windshield-layer'),
      ui: document.getElementById('ui-layer')
    };
    
    this.contexts = {};
    for (const [key, canvas] of Object.entries(this.layers)) {
      this.contexts[key] = canvas.getContext('2d', { alpha: key !== 'sky' });
    }
    
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }
  
  resize() {
    for (const canvas of Object.values(this.layers)) {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
    }
  }

  get width() { return this.layers.sky.width; }
  get height() { return this.layers.sky.height; }
}