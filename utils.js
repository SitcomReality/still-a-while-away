// Simple 1D noise function (deterministic pseudo-random)
export function noise(x) {
  const X = Math.floor(x);
  const t = x - X;
  
  const a = hash(X);
  const b = hash(X + 1);
  
  // Smooth interpolation
  const fade = t * t * (3 - 2 * t);
  return a + fade * (b - a);
}

function hash(x) {
  x = ((x >> 16) ^ x) * 0x45d9f3b;
  x = ((x >> 16) ^ x) * 0x45d9f3b;
  x = (x >> 16) ^ x;
  return (x / 0x7fffffff) * 2 - 1;
}

// Linear interpolation
export function lerp(a, b, t) {
  return a + (b - a) * t;
}

// Color interpolation for hex strings
export function lerpColor(c1, c2, t) {
  const r1 = parseInt(c1.substring(1, 3), 16);
  const g1 = parseInt(c1.substring(3, 5), 16);
  const b1 = parseInt(c1.substring(5, 7), 16);
  const r2 = parseInt(c2.substring(1, 3), 16);
  const g2 = parseInt(c2.substring(3, 5), 16);
  const b2 = parseInt(c2.substring(5, 7), 16);
  const r = Math.round(lerp(r1, r2, t)).toString(16).padStart(2, '0');
  const g = Math.round(lerp(g1, g2, t)).toString(16).padStart(2, '0');
  const b = Math.round(lerp(b1, b2, t)).toString(16).padStart(2, '0');
  return `#${r}${g}${b}`;
}

// Clamp value
export function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}