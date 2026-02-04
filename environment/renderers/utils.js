export function adjustBrightness(hex, amount) {
  const num = parseInt(hex.replace('#',''), 16);
  let r = (num >> 16) + amount;
  let b = ((num >> 8) & 0x00FF) + amount;
  let g = (num & 0x0000FF) + amount;
  
  r = Math.max(0, Math.min(255, r));
  g = Math.max(0, Math.min(255, g));
  b = Math.max(0, Math.min(255, b));
  
  return `#${(g | (b << 8) | (r << 16)).toString(16).padStart(6, '0')}`;
}

export function bilinearMap(q, u, v) {
  // q: [BN, BF, TF, TN]
  const tx = q[3].x + (q[2].x - q[3].x) * u;
  const ty = q[3].y + (q[2].y - q[3].y) * u;
  
  const bx = q[0].x + (q[1].x - q[0].x) * u;
  const by = q[0].y + (q[1].y - q[0].y) * u;
  
  return {
    x: tx + (bx - tx) * v,
    y: ty + (by - ty) * v
  };
}