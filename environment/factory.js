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
    const height = 30 + Math.random() * 40;
    const depth = 15 + Math.random() * 20;
    const width = 20 + Math.random() * 30;
    
    // Scale window grid by building dimensions to maintain a consistent density
    const rows = Math.max(3, Math.floor(height / 8));
    const sideCols = Math.max(2, Math.floor(depth / 5));
    const frontCols = Math.max(2, Math.floor(width / 6));
    
    const sidePattern = new Array(rows * sideCols);
    for (let i = 0; i < sidePattern.length; i++) sidePattern[i] = Math.random();
    
    const frontPattern = new Array(rows * frontCols);
    for (let i = 0; i < frontPattern.length; i++) frontPattern[i] = Math.random();

    return {
      height: height,
      width: width,
      depth: depth,
      color: '#1a1a2a',
      windowRows: rows,
      windowCols: sideCols,
      windowPattern: sidePattern,
      frontCols: frontCols,
      frontPattern: frontPattern
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