export class DevMenu {
  constructor(game) {
    this.game = game;
    this.isVisible = false;
    this.fps = 0;
    this.frameTimes = [];
    
    this.elements = {
      toggle: document.getElementById('dev-toggle'),
      panel: document.getElementById('dev-panel'),
      time: document.getElementById('dev-time'),
      speed: document.getElementById('dev-speed'),
      weather: document.getElementById('dev-weather'),
      location: document.getElementById('dev-location'),
      traffic: document.getElementById('dev-traffic'),
      debugView: document.getElementById('dev-debug-view'),
      stats: document.getElementById('dev-stats')
    };

    this.showDebugLines = false;
    this.init();
  }

  init() {
    this.elements.toggle.addEventListener('click', () => {
      this.isVisible = !this.isVisible;
      this.elements.panel.classList.toggle('active', this.isVisible);
    });

    // Update game from inputs
    this.elements.time.addEventListener('input', (e) => {
      this.game.biomes.timeValue = parseFloat(e.target.value);
    });

    this.elements.speed.addEventListener('input', (e) => {
      this.game.road.speed = parseFloat(e.target.value);
    });

    this.elements.weather.addEventListener('change', (e) => {
      this.game.weather.transitionTo(e.target.value);
    });

    this.elements.location.addEventListener('change', (e) => {
      const idx = this.game.biomes.biomeTypes.findIndex(b => b.id === e.target.value);
      if (idx >= 0) this.game.biomes.currentBiomeIndex = idx;
    });

    this.elements.traffic.addEventListener('input', (e) => {
      // Direct override for density
      this.game.biomes.current.trafficDensity = parseFloat(e.target.value);
    });

    this.elements.debugView.addEventListener('change', (e) => {
      this.showDebugLines = e.target.checked;
    });

    // Sync initial state
    this.elements.time.value = this.game.biomes.timeValue;
    this.elements.speed.value = this.game.road.speed;
    this.elements.weather.value = this.game.weather.type;
    this.elements.location.value = this.game.biomes.biomeTypes[this.game.biomes.currentBiomeIndex].id;
  }

  update(dt) {
    if (!this.isVisible) return;

    // Calc FPS
    this.frameTimes.push(performance.now());
    if (this.frameTimes.length > 60) this.frameTimes.shift();
    const duration = this.frameTimes[this.frameTimes.length - 1] - this.frameTimes[0];
    this.fps = Math.round((this.frameTimes.length / duration) * 1000);

    // Update stats text
    this.elements.stats.textContent = `FPS: ${this.fps} | Dist: ${Math.floor(this.game.road.distance)}`;
    
    // Periodically sync UI inputs with simulation (if simulation changes them)
    if (Math.random() < 0.05) {
      this.elements.time.value = this.game.biomes.timeValue;
    }
  }
}