import * as CONST from '../constants.js';

export function spawnVehicle(biome) {
  const weights = [
    { type: 'sedan', weight: 40 },
    { type: 'suv', weight: 25 },
    { type: 'sports', weight: 15 },
    { type: 'truck', weight: 10 },
    { type: 'bus', weight: 10 }
  ];
  
  const totalWeight = weights.reduce((sum, w) => sum + w.weight, 0);
  let random = Math.random() * totalWeight;
  let selected = weights[0];
  for (const w of weights) {
    if (random < w.weight) {
      selected = w;
      break;
    }
    random -= w.weight;
  }

  const type = selected.type;
  
  // Base dimensions in meters (total height)
  let width = 2.0;
  let height = 1.1;
  let depth = 4.5;

  if (type === 'sedan') {
    width = 2.1; height = 1.0; depth = 4.6;
  } else if (type === 'suv') {
    width = 2.2; height = 1.3; depth = 5.0;
  } else if (type === 'sports') {
    width = 2.2; height = 0.85; depth = 4.5;
  } else if (type === 'truck') {
    width = 2.5; height = 2.6; depth = 10.0;
  } else if (type === 'bus') {
    width = 2.8; height = 3.0; depth = 15.0;
  }

  return {
    distance: CONST.TRAFFIC_RENDER_LIMIT - 10,
    speed: 20 + Math.random() * 20,
    type,
    lane: Math.random() > 0.3 ? 'right' : 'left',
    color: getRandomColor(),
    headlightColor: Math.random() > 0.7 ? '#a8d8ff' : '#fff8e1',
    headlightIntensity: 0.8 + Math.random() * 0.4,
    width,
    height,
    depth
  };
}

function getRandomColor() {
  const colors = [
    '#1a1a1a', '#2a2a2a', '#3a3a3a', // Greys
    '#0a1a2f', '#102a43',           // Dark Blues
    '#4a0505', '#631717',           // Dark Reds
    '#0b240b', '#1b301b',           // Greens
    '#5a5a5a', '#7a7a7a',           // Silvers/Lighter grey
    '#2f3542', '#3e4444'            // Slates
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}