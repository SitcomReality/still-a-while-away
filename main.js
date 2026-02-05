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
    // Set initial biome
    this.biomes.transitionTo(this.biomes.getRandomBiome());
    
    // Start game loop
    requestAnimationFrame((t) => this.loop(t));
  }
  
  loop(currentTime) {
    const dt = Math.min((currentTime - this.lastTime) / 1000, 0.1);
    this.lastTime = currentTime;
    this.time += dt;
    
    // Update systems
    this.biomes.update(dt, this.time);
    this.road.update(dt, this.biomes.current);
    this.traffic.update(dt, this.biomes.current);
    this.environment.update(dt, this.biomes.current);
    this.weather.update(dt, this.biomes.current);
    this.windshield.update(dt);
    this.devMenu.update(dt);
    
    // Render layers
    this.renderer.render({
      road: this.road,
      traffic: this.traffic,
      environment: this.environment,
      weather: this.weather,
      windshield: this.windshield,
      biome: this.biomes.current,
      time: this.time
    });
    
    requestAnimationFrame((t) => this.loop(t));
  }
}

// Start game
new Game();