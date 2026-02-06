import { Renderer } from './renderer.js';
import { RoadSystem } from './road.js';
import { TrafficSystem } from './traffic.js';
import { EnvironmentSystem } from './environment.js';
import { WeatherSystem } from './weather.js';
import { WindshieldFX } from './windshield.js';
import { BiomeManager } from './biomes.js';
import { DevMenu } from './dev-menu.js';

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
    this.lastTime = performance.now();
    
    this.init();
  }
  
  init() {
    // Set initial location randomly
    this.biomes.currentLocation = this.biomes.locations[Math.floor(Math.random() * this.biomes.locations.length)];
    
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