import * as THREE from 'three';

// Shared, cached materials keep draw-state changes low and let the day/night
// cycle animate every window and lamp at once.
const cache = new Map<string, THREE.MeshStandardMaterial>();

export function mat(color: string, opts: { rough?: number; emissive?: string; ei?: number; metal?: number } = {}) {
  const key = `${color}|${opts.rough ?? 0.75}|${opts.emissive ?? ''}|${opts.ei ?? 0}|${opts.metal ?? 0}`;
  let m = cache.get(key);
  if (!m) {
    m = new THREE.MeshStandardMaterial({
      color, roughness: opts.rough ?? 0.75, metalness: opts.metal ?? 0,
      emissive: opts.emissive ? new THREE.Color(opts.emissive) : new THREE.Color('#000'), emissiveIntensity: opts.ei ?? 0,
    });
    cache.set(key, m);
  }
  return m;
}

/** Windows glow warmly at night (intensity animated by <Lighting/>). */
export const windowMat = new THREE.MeshStandardMaterial({ color: '#bfe3ff', roughness: 0.25, emissive: new THREE.Color('#ffcf7a'), emissiveIntensity: 0 });
export const lampGlowMat = new THREE.MeshStandardMaterial({ color: '#fff3c4', roughness: 0.3, emissive: new THREE.Color('#ffd27a'), emissiveIntensity: 0.2 });
export const daemonGlowMat = new THREE.MeshStandardMaterial({ color: '#c9b6ff', roughness: 0.35, emissive: new THREE.Color('#9f7bff'), emissiveIntensity: 0.6 });

export const PASTEL = {
  grass: '#bfe6a0', grassDark: '#a6d68a', soil: '#c9976b', soilDark: '#a87a55', road: '#f6e7cf', curb: '#fff7ea',
  plaza: '#fbe3d0', wood: '#c98b55', woodDark: '#9b6a42', rope: '#e8cf9c', pink: '#ffb3c7', lilac: '#cdb8ff',
  mint: '#b5ead7', sky: '#a9d8ff', cream: '#fff6e8', gold: '#ffd166', coral: '#ff8f7a', blue: '#8ec5ff', cardboard: '#d8a86a',
};
