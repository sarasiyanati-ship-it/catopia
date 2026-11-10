import { Stars } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import { useStore } from '../simulation/store';
import { lampGlowMat, windowMat } from './materials';

// Key-framed sky: [hour, sky colour, sun colour, sun intensity, ambient]
const KEYS: [number, string, string, number, number][] = [
  [0, '#1e2250', '#6f7cff', 0.25, 0.35],
  [5, '#2f2d5e', '#8a86ff', 0.25, 0.38],
  [6.3, '#ffb9a6', '#ffb37a', 1.1, 0.55],
  [8, '#bfe6ff', '#fff1d6', 2.2, 0.75],
  [13, '#a9dcff', '#fffaf0', 2.6, 0.8],
  [17, '#ffd9b0', '#ffd6a0', 2.1, 0.7],
  [19, '#ff9fb4', '#ff9a8a', 1.3, 0.6],
  [20.5, '#6d5c9c', '#9b8cff', 0.5, 0.45],
  [22, '#252a5c', '#6f7cff', 0.25, 0.36],
  [24, '#1e2250', '#6f7cff', 0.25, 0.35],
];

const cA = new THREE.Color(), cB = new THREE.Color();
function sample(h: number) {
  let i = 0;
  while (i < KEYS.length - 2 && KEYS[i + 1][0] <= h) i++;
  const [h0, s0, u0, i0, a0] = KEYS[i];
  const [h1, s1, u1, i1, a1] = KEYS[i + 1];
  const t = (h - h0) / (h1 - h0);
  const sky = cA.set(s0).lerp(cB.set(s1), t).clone();
  const sun = cA.set(u0).lerp(cB.set(u1), t).clone();
  return { sky, sun, intensity: i0 + (i1 - i0) * t, ambient: a0 + (a1 - a0) * t };
}

export function nightFactor(h: number) {
  if (h >= 20 || h < 5) return 1;
  if (h >= 18.5) return (h - 18.5) / 1.5;
  if (h < 6.5) return 1 - (h - 5) / 1.5;
  return 0;
}

export function Lighting() {
  const sun = useRef<THREE.DirectionalLight>(null);
  const hemi = useRef<THREE.HemisphereLight>(null);
  const amb = useRef<THREE.AmbientLight>(null);
  const stars = useRef<THREE.Group>(null);
  const { scene } = useThree();

  useFrame(() => {
    const sim = useStore.getState().sim;
    const h = sim.hour;
    const s = sample(h);
    const rain = sim.weather === 'rainy' ? 0.65 : sim.weather === 'cloudy' ? 0.88 : 1;
    const grey = new THREE.Color('#9aa3b8');
    const sky = s.sky.clone().lerp(grey, 1 - rain);
    if (!(scene.background instanceof THREE.Color)) scene.background = new THREE.Color();
    (scene.background as THREE.Color).copy(sky);
    if (scene.fog) (scene.fog as THREE.Fog).color.copy(sky);
    // Sun arcs from east (morning) to west (evening); at night the "moon" takes over.
    const day = h >= 6 && h <= 20;
    const t = day ? (h - 6) / 14 : ((h + 24 - 20) % 24) / 10;
    const ang = Math.PI * t;
    if (sun.current) {
      sun.current.position.set(Math.cos(ang) * 30 + 6, Math.sin(ang) * 26 + 8, 18);
      sun.current.color.copy(s.sun);
      sun.current.intensity = s.intensity * rain;
    }
    if (hemi.current) {
      hemi.current.intensity = s.ambient * 1.1;
      hemi.current.color.copy(sky).lerp(new THREE.Color('#ffffff'), 0.5);
    }
    if (amb.current) amb.current.intensity = s.ambient * 0.55;
    const n = nightFactor(h);
    windowMat.emissiveIntensity = n * 1.3;
    lampGlowMat.emissiveIntensity = 0.2 + n * 2.2;
    if (stars.current) stars.current.visible = n > 0.3 && sim.weather !== 'rainy';
  });

  return (
    <>
      <fog attach="fog" args={['#bfe6ff', 70, 150]} />
      <hemisphereLight ref={hemi} args={['#ffffff', '#b6d99a', 0.8]} />
      <ambientLight ref={amb} intensity={0.4} />
      <directionalLight
        ref={sun}
        castShadow
        position={[20, 30, 18]}
        intensity={2.2}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-30}
        shadow-camera-right={30}
        shadow-camera-top={30}
        shadow-camera-bottom={-30}
        shadow-camera-near={1}
        shadow-camera-far={120}
        shadow-bias={-0.0006}
        shadow-normalBias={0.04}
      />
      <group ref={stars}>
        <Stars radius={90} depth={30} count={1800} factor={3} saturation={0.4} fade speed={0.6} />
      </group>
    </>
  );
}
