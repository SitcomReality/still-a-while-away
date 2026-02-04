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

// Clamp value
export function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}