export function getSpacing(biome) {
  const base = biome.type === 'city' ? 20 : 30;
  return base + Math.random() * 20;
}

export function getFeatureTypes(biome) {
  if (biome.type === 'city') {
    return ['lightpole', 'lightpole', 'building', 'tree'];
  } else if (biome.type === 'rural') {
    return ['tree', 'tree', 'tree', 'bush'];
  } else {
    return ['tree', 'tree', 'bush'];
  }
}

export function getFeatureProps(type, biome) {
  if (type === 'tree') {
    return {
      height: 15 + Math.random() * 25,
      width: 8 + Math.random() * 8,
      color: biome.type === 'rural' ? '#1a3a1a' : '#2a4a2a',
      swayPhase: Math.random() * Math.PI * 2
    };
  } else if (type === 'lightpole') {
    return {
      height: 25,
      hasLight: true,
      lightColor: '#fff8e1'
    };
  } else if (type === 'building') {
    // Increased pattern size to handle larger/longer buildings
    const patternRows = 12;
    const patternCols = 15;
    const pattern = new Array(patternRows * patternCols);
    for (let i = 0; i < pattern.length; i++) {
      pattern[i] = Math.random();
    }
    return {
      height: 35 + Math.random() * 50,
      width: 25 + Math.random() * 35,
      depth: 30 + Math.random() * 60,
      color: '#1a1a2a',
      windowPattern: pattern,
      patternRows,
      patternCols
    };
  } else if (type === 'bush') {
    return {
      height: 5 + Math.random() * 5,
      width: 8 + Math.random() * 8,
      color: '#1a2a1a'
    };
  }
  return {};
}

export function spawnFeature(distance, biome) {
  const types = getFeatureTypes(biome);
  const type = types[Math.floor(Math.random() * types.length)];
  const props = getFeatureProps(type, biome);

  let baseOffset = 1.3;
  if (type === 'building') baseOffset = 1.8;
  if (type === 'tree') baseOffset = 1.4;

  return {
    distance,
    type,
    side: Math.random() > 0.5 ? 'left' : 'right',
    offset: baseOffset + Math.random() * 1.0,
    ...props
  };
}