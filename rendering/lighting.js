export function getLightDirection(biome, heading) {
  const time = biome.timeValue;
  
  // Night: fixed moonlight from northwest
  if (biome.name === 'night') {
    return {
      azimuth: Math.PI * 1.25, // NW
      elevation: Math.PI * 0.3,
      isNight: true
    };
  }
  
  // Day: sun moves from East to West
  let sunAzimuth;
  let sunElevation;
  
  if (time < 0.2) {
    // Before sunrise
    sunAzimuth = Math.PI / 2;
    sunElevation = -Math.PI * 0.1;
  } else if (time < 0.5) {
    // Morning to noon
    const t = (time - 0.2) / 0.3;
    sunAzimuth = Math.PI / 2 + t * Math.PI / 2;
    sunElevation = t * Math.PI / 2;
  } else if (time < 0.8) {
    // Afternoon to sunset
    const t = (time - 0.5) / 0.3;
    sunAzimuth = Math.PI + t * Math.PI / 2;
    sunElevation = (1 - t) * Math.PI / 2;
  } else {
    // After sunset
    sunAzimuth = 3 * Math.PI / 2;
    sunElevation = -Math.PI * 0.1;
  }
  
  return {
    azimuth: sunAzimuth,
    elevation: sunElevation,
    isNight: false
  };
}