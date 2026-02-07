export function getSpacing(biome) {
  // Tighter spacing in denser areas
  const baseDensity = biome.treeDensity + biome.buildingDensity;
  const base = 15 + (1 - baseDensity) * 30;
  return base + Math.random() * 10;
}

export function getFeatureTypes(biome) {
  const types = [];
  
  // Trees based on density
  const treeCount = Math.floor(biome.treeDensity * 10);
  for (let i = 0; i < treeCount; i++) types.push('tree');
  
  // Buildings
  if (biome.buildingDensity > 0.6) {
    types.push('building_skyscraper', 'building_skyscraper', 'building_warehouse');
  } else if (biome.buildingDensity > 0.3) {
    types.push('building_house', 'building_house', 'building_warehouse');
  } else if (biome.buildingDensity > 0) {
    types.push('building_house');
  }
  
  // Farms in plains/suburbs
  if (biome.farmChance > 0.1) {
    types.push('building_farm');
  }
  
  // Bushes in less urban areas
  if (biome.type !== 'city') {
    types.push('bush');
  }
  
  return types.length > 0 ? types : ['tree'];
}

function generateWindowPattern(rows, cols) {
  const pattern = new Array(rows * cols);
  for (let i = 0; i < pattern.length; i++) pattern[i] = Math.random();
  return pattern;
}

export function getFeatureProps(type, biome) {
  if (type === 'tree') {
    return {
      height: 4 + Math.random() * 8,
      width: 3 + Math.random() * 4,
      color: biome.type === 'forest' ? '#0a2a0a' : biome.type === 'plains' ? '#2a4a2a' : '#2a4a2a',
      swayPhase: Math.random() * Math.PI * 2
    };
  } else if (type === 'lightpole') {
    return {
      height: 8,
      hasLight: true,
      lightColor: '#fff8e1'
    };
  } else if (type.startsWith('building_')) {
    const subtype = type.split('_')[1];
    return getBuildingProps(subtype);
  } else if (type === 'bush') {
    return {
      height: 5 + Math.random() * 5,
      width: 8 + Math.random() * 8,
      color: '#1a2a1a'
    };
  }
  return {};
}

function getBuildingProps(subtype) {
  const sidePattern = (r, c) => generateWindowPattern(r, c);
  
  if (subtype === 'skyscraper') {
    const height = 40 + Math.random() * 60; 
    const depth = 20 + Math.random() * 20;
    const width = 20 + Math.random() * 30;
    const rows = Math.max(10, Math.floor(height / 2));
    const sideCols = Math.max(3, Math.floor(depth / 2));
    const frontCols = Math.max(3, Math.floor(width / 2));
    return {
      buildingType: 'skyscraper',
      height, width, depth,
      color: '#1a1a2a',
      windowRows: rows, windowCols: sideCols,
      windowPattern: sidePattern(rows, sideCols),
      frontCols, frontPattern: sidePattern(rows, frontCols)
    };
  } else if (subtype === 'house') {
    const height = 5 + Math.random() * 4;
    const depth = 10 + Math.random() * 5;
    const width = 12 + Math.random() * 5;
    return {
      buildingType: 'house',
      height, width, depth,
      color: '#3a2a2a',
      windowRows: 2,
      windowCols: 2,
      windowPattern: sidePattern(2, 2),
      frontCols: 3,
      frontPattern: sidePattern(2, 3)
    };
  } else if (subtype === 'warehouse') {
    const height = 8 + Math.random() * 6;
    const depth = 15 + Math.random() * 10;
    const width = 15 + Math.random() * 10;
    return {
      buildingType: 'warehouse',
      height, width, depth,
      color: '#2a2a2a',
      windowRows: 3,
      windowCols: 5,
      windowPattern: sidePattern(3, 5),
      frontCols: 4,
      frontPattern: sidePattern(3, 4)
    };
  } else if (subtype === 'farm') {
    const height = 6 + Math.random() * 4;
    const depth = 10 + Math.random() * 5;
    const width = 12 + Math.random() * 6;
    return {
      buildingType: 'farm',
      height, width, depth,
      color: '#4a2a2a',
      windowRows: 1,
      windowCols: 2,
      windowPattern: sidePattern(1, 2),
      frontCols: 2,
      frontPattern: sidePattern(1, 2)
    };
  }
  
  return { height: 30, width: 20, depth: 15, color: '#2a2a2a' };
}

export function spawnFeature(distance, biome) {
  const types = getFeatureTypes(biome);
  const type = types[Math.floor(Math.random() * types.length)];
  const props = getFeatureProps(type, biome);

  // Offset in meters from center
  let baseOffset = 7.0; 
  if (type.startsWith('building_')) {
    const subtype = type.split('_')[1];
    baseOffset = subtype === 'farm' ? 25.0 : subtype === 'skyscraper' ? 18.0 : 12.0;
  }
  if (type === 'tree') baseOffset = 6.0;
  if (type === 'bush') baseOffset = 5.5;

  return {
    distance,
    type,
    side: Math.random() > 0.5 ? 'left' : 'right',
    offset: baseOffset + Math.random() * (type.includes('farm') ? 10.0 : 5.0),
    ...props
  };
}

export function shouldSpawnStreetlight(distance, biome) {
  if (biome.streetlightSpacing <= 0) return false;
  return Math.abs(distance % biome.streetlightSpacing) < 1;
}