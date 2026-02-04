export class BiomeManager {
  constructor() {
    this.biomes = {
      city_night: {
        type: 'city',
        timeOfDay: 'night',
        weather: 'clear',
        trafficDensity: 1.5,
        hasStreetlights: true,
        description: 'City at night'
      },
      city_rain: {
        type: 'city',
        timeOfDay: 'night',
        weather: 'rain',
        trafficDensity: 0.8,
        hasStreetlights: true,
        description: 'Rainy city night'
      },
      rural_day: {
        type: 'rural',
        timeOfDay: 'day',
        weather: 'clear',
        trafficDensity: 0.3,
        hasStreetlights: false,
        description: 'Rural day'
      },
      rural_night: {
        type: 'rural',
        timeOfDay: 'night',
        weather: 'clear',
        trafficDensity: 0.2,
        hasStreetlights: false,
        description: 'Rural night'
      },
      sunset: {
        type: 'rural',
        timeOfDay: 'sunset',
        weather: 'clear',
        trafficDensity: 0.5,
        hasStreetlights: false,
        description: 'Sunset drive'
      },
      foggy: {
        type: 'rural',
        timeOfDay: 'day',
        weather: 'fog',
        trafficDensity: 0.4,
        hasStreetlights: false,
        description: 'Foggy afternoon'
      }
    };
    
    this.current = this.biomes.city_night;
    this.transitionProgress = 0;
    this.nextTransition = 30 + Math.random() * 30;
  }
  
  update(dt, time) {
    this.nextTransition -= dt;
    
    if (this.nextTransition <= 0) {
      this.transitionTo(this.getRandomBiome());
      this.nextTransition = 40 + Math.random() * 40;
    }
  }
  
  transitionTo(biome) {
    this.current = biome;
    console.log(`Transitioning to: ${biome.description}`);
  }
  
  getRandomBiome() {
    const keys = Object.keys(this.biomes);
    const key = keys[Math.floor(Math.random() * keys.length)];
    return this.biomes[key];
  }
}