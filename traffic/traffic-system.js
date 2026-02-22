import * as CONST from '../constants.js';
import { spawnVehicle } from './vehicle-factory.js';
import { renderVehicle } from './vehicle-renderer.js';

export class TrafficSystem {
  constructor(road) {
    this.road = road;
    this.vehicles = [];
    this.spawnTimer = 0;
    this.spawnInterval = 3;
  }
  
  update(dt, biome) {
    const { trafficDensity } = biome;
    this.spawnTimer += dt;
    
    if (this.spawnTimer >= this.spawnInterval / trafficDensity) {
      this.vehicles.push(spawnVehicle(biome));
      this.spawnTimer = 0;
      this.spawnInterval = 2 + Math.random() * 4;
    }
    
    for (let i = this.vehicles.length - 1; i >= 0; i--) {
      const v = this.vehicles[i];
      const { lane, speed } = v;
      
      const relSpeed = lane === 'right' ? (this.road.speed + speed) : (this.road.speed - speed);
      v.distance -= relSpeed * dt;
      
      if (v.distance < CONST.TRAFFIC_REMOVAL_THRESHOLD || v.distance > CONST.TRAFFIC_RENDER_LIMIT) {
        this.vehicles.splice(i, 1);
      }
    }
  }

  renderVehicle(ctx, v, w, h, fog) {
    renderVehicle(ctx, v, w, h, this.road, fog);
  }
}