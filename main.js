import { Renderer } from './renderer.js';
import { RoadSystem } from './road.js';
import { TrafficSystem } from './traffic.js';
import { EnvironmentSystem } from './environment.js';
import { WeatherSystem } from './weather.js';
import { WindshieldFX } from './windshield.js';
import { BiomeManager } from './biomes.js';
import { DevMenu } from './dev-menu.js';
import { COMMUNITY_DISCORD_URL } from './constants.js';

class Game {
  constructor() {
    this.renderer = new Renderer();
    this.road = new RoadSystem();
    this.traffic = new TrafficSystem(this.road);
    this.environment = new EnvironmentSystem(this.road);
    this.weather = new WeatherSystem();
    this.windshield = new WindshieldFX(this.weather);
    this.biomes = new BiomeManager();
    this.devMenu = new DevMenu(this);
    
    this.time = 0;
    this.sessionTime = 0;
    this.inviteHandled = false;
    this.lastTime = performance.now();
    
    this.init();
  }
  
  init() {
    // Set initial biome randomly
    this.biomes.currentBiomeIndex = Math.floor(Math.random() * this.biomes.biomeTypes.length);

    // Setup Discord Link
    const linkEl = document.getElementById('discord-link');
    if (linkEl) linkEl.href = COMMUNITY_DISCORD_URL;

    // Close Button logic
    const closeBtn = document.getElementById('close-invite');
    if (closeBtn) {
      closeBtn.onclick = () => {
        const panel = document.getElementById('community-invite');
        if (panel) panel.classList.remove('active');
        this.inviteHandled = true; // Prevents it from reappearing
      };
    }
    
    // Start game loop
    requestAnimationFrame((t) => this.loop(t));
  }
  
  loop(currentTime) {
    const dt = Math.min((currentTime - this.lastTime) / 1000, 0.1);
    this.lastTime = currentTime;
    this.time += dt;
    
    const { biomes, road, traffic, environment, weather, windshield, devMenu, renderer } = this;
    
    // Update systems
    biomes.update(dt, this.time);
    road.update(dt, biomes.current);

    this.sessionTime += dt;
    if (this.sessionTime >= 60 && !this.inviteHandled) {
      const panel = document.getElementById('community-invite');
      if (panel) panel.classList.add('active');
      this.inviteHandled = true; // Ensure we only trigger the 'show' logic once
    }
    traffic.update(dt, biomes.current);
    environment.update(dt, biomes.current);
    weather.update(dt, biomes.current);
    windshield.update(dt);
    devMenu.update(dt);
    
    // Render layers
    renderer.render({
      road, traffic, environment, weather, windshield,
      biome: biomes.current,
      time: this.time,
      debug: devMenu.showDebugLines
    });
    
    requestAnimationFrame((t) => this.loop(t));
  }
}

// Start game
new Game();