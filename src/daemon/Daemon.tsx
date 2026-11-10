import { Sparkles } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Bubble } from '../characters/Bubble';
import { useStore } from '../simulation/store';
import { daemonGlowMat, lampGlowMat, mat, PASTEL } from '../world/materials';

/**
 * THE DAEMON — a floating cat spirit, tiny urban god and whimsical architect.
 * Body: a glowing lavender cat head with a little city skyline as its crown.
 * A golden drafting compass and pencil orbit around it like planets.
 */
export function Daemon() {
  const root = useRef<THREE.Group>(null);
  const bodyG = useRef<THREE.Group>(null);
  const eyeL = useRef<THREE.Group>(null), eyeR = useRef<THREE.Group>(null);
  const pupils = useRef<THREE.Group[]>([]);
  const halo = useRef<THREE.Group>(null);
  const tools = useRef<THREE.Group>(null);
  const tail = useRef<THREE.Group>(null);
  const beam = useRef<THREE.Mesh>(null);
  const light = useRef<THREE.PointLight>(null);
  const mouth = useRef<THREE.Mesh>(null);
  const sparkles = useRef<THREE.Group>(null);
  const ring = useRef<THREE.Mesh>(null);
  const select = useStore((s) => s.select);
  const beamMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#e9dcff', transparent: true, opacity: 0.35, depthWrite: false }), []);
  const glow = useMemo(() => new THREE.MeshBasicMaterial({ color: '#cdb8ff', transparent: true, opacity: 0.18, depthWrite: false }), []);
  const smooth = useRef(new THREE.Vector3(0, 3, 0));

  useFrame(({ clock }, dt) => {
    const sim = useStore.getState().sim;
    const d = sim.daemon;
    const t = clock.elapsedTime;
    const g = root.current;
    if (!g) return;
    const asleep = !d.awake;
    smooth.current.lerp(new THREE.Vector3(d.pos.x, d.pos.y, d.pos.z), Math.min(1, dt * 3));
    const bob = asleep ? Math.sin(t * 1.2) * 0.05 : Math.sin(t * 1.6) * 0.25;
    g.position.set(smooth.current.x, smooth.current.y + bob, smooth.current.z);
    // face the camera-ish / direction of travel
    const toT = new THREE.Vector3(d.target.x - d.pos.x, 0, d.target.z - d.pos.z);
    const wantYaw = toT.lengthSq() > 0.5 ? Math.atan2(toT.x, toT.z) : Math.PI / 4 + Math.sin(t * 0.3) * 0.4;
    g.rotation.y += (wantYaw - g.rotation.y) * 0.05;
    if (bodyG.current) {
      const breathe = asleep ? 1 + Math.sin(t * 1.5) * 0.04 : 1 + Math.sin(t * 3) * 0.02;
      const delighted = d.mood === 'delighted' ? 1 + Math.abs(Math.sin(t * 8)) * 0.06 : 1;
      bodyG.current.scale.set(breathe * delighted, (asleep ? 0.88 : 1) * breathe, breathe * delighted);
      bodyG.current.rotation.z = asleep ? 0.35 : Math.sin(t * 0.9) * 0.06;
    }
    // eyes: closed when asleep, ^^ when delighted, looking around when thinking
    const blink = (t % 5) < 0.14 ? 0.1 : 1;
    const open = asleep ? 0.08 : d.mood === 'delighted' ? 0.35 : blink;
    eyeL.current?.scale.set(1, open, 1);
    eyeR.current?.scale.set(1, open, 1);
    const look = d.mood === 'thinking' ? Math.sin(t * 2) * 0.05 : d.mood === 'casting' ? 0 : Math.sin(t * 0.7) * 0.025;
    pupils.current.forEach((p) => { if (p) { p.position.x = look; p.position.y = d.mood === 'thinking' ? 0.04 : d.mood === 'casting' ? -0.05 : 0; } });
    if (mouth.current) mouth.current.scale.set(1, d.mood === 'delighted' || d.mood === 'casting' ? 1.6 : asleep ? 0.4 : 1, 1);
    if (halo.current) { halo.current.rotation.y += dt * (asleep ? 0.1 : 0.6); halo.current.visible = true; }
    if (tools.current) { tools.current.rotation.y -= dt * (d.mood === 'casting' ? 4 : asleep ? 0.05 : 0.8); tools.current.visible = !asleep; }
    if (tail.current) tail.current.children.forEach((s, i) => {
      const k = i / 8;
      s.position.set(Math.sin(t * 2 - i * 0.5) * 0.4 * k, -0.4 - k * 1.3, -0.5 - Math.sin(k * 2.5) * 0.6);
    });
    const casting = d.mood === 'casting';
    if (beam.current) {
      beam.current.visible = casting;
      const h = Math.max(0.5, g.position.y - (d.target.y - 3.2));
      beam.current.scale.set(1 + Math.sin(t * 20) * 0.1, h, 1 + Math.sin(t * 20) * 0.1);
      beam.current.position.y = -h / 2;
    }
    beamMat.opacity = 0.3 + Math.sin(t * 15) * 0.1;
    daemonGlowMat.emissiveIntensity = asleep ? 0.15 : casting ? 1.6 : 0.45 + Math.sin(t * 2) * 0.1 + d.energy / 250;
    if (light.current) light.current.intensity = asleep ? 3 : casting ? 40 : 14;
    if (sparkles.current) sparkles.current.visible = !asleep;
    const sel = useStore.getState().selected;
    if (ring.current) ring.current.visible = sel?.kind === 'daemon';
  });

  const ear = (s: number) => (
    <group position={[s * 0.62, 0.78, 0]} rotation={[0, 0, -s * 0.35]}>
      <mesh castShadow material={daemonGlowMat}><coneGeometry args={[0.32, 0.7, 4]} /></mesh>
      <mesh position={[0, -0.05, 0.12]} scale={[0.6, 0.7, 0.4]} material={mat('#ffc4e6', { emissive: '#ff9ed2', ei: 0.4 })}><coneGeometry args={[0.3, 0.6, 4]} /></mesh>
    </group>
  );

  return (
    <group ref={root} onClick={(e) => { e.stopPropagation(); select({ kind: 'daemon' }); }}>
      <pointLight ref={light} color="#c9a8ff" intensity={14} distance={14} decay={1.6} />
      <mesh ref={ring} rotation={[Math.PI / 2, 0, 0]} material={mat('#ffd166', { emissive: '#ffd166', ei: 1 })} visible={false}>
        <torusGeometry args={[1.6, 0.04, 6, 40]} />
      </mesh>
      <group ref={bodyG}>
        {/* aura */}
        <mesh material={glow}><sphereGeometry args={[1.45, 24, 18]} /></mesh>
        {/* head-body */}
        <mesh castShadow material={daemonGlowMat} scale={[1.08, 0.95, 1]}><sphereGeometry args={[0.95, 32, 24]} /></mesh>
        {ear(-1)}{ear(1)}
        {/* cheeks */}
        {[-0.5, 0.5].map((x) => <mesh key={x} position={[x, -0.2, 0.76]} scale={[1, 0.7, 0.4]} material={mat('#ffb3d9', { emissive: '#ff8fc8', ei: 0.3 })}><sphereGeometry args={[0.16, 12, 10]} /></mesh>)}
        {/* giant expressive eyes */}
        {[-1, 1].map((s) => (
          <group key={s} ref={s < 0 ? eyeL : eyeR} position={[s * 0.33, 0.12, 0.78]}>
            <mesh scale={[1, 1.2, 0.5]} material={mat('#ffffff', { emissive: '#ffffff', ei: 0.2 })}><sphereGeometry args={[0.24, 18, 14]} /></mesh>
            <group ref={(o) => { if (o) pupils.current[s < 0 ? 0 : 1] = o; }}>
              <mesh position={[0, 0, 0.1]} scale={[1, 1.2, 0.5]} material={mat('#2b1f4f', { rough: 0.2 })}><sphereGeometry args={[0.16, 16, 12]} /></mesh>
              <mesh position={[0.05, 0.07, 0.19]} material={mat('#ffffff', { emissive: '#ffffff', ei: 1 })}><sphereGeometry args={[0.045, 8, 8]} /></mesh>
              <mesh position={[-0.04, -0.06, 0.18]} material={mat('#ffffff', { emissive: '#ffffff', ei: 1 })}><sphereGeometry args={[0.02, 6, 6]} /></mesh>
            </group>
          </group>
        ))}
        <mesh position={[0, -0.12, 0.92]} material={mat('#ff9ec7')}><sphereGeometry args={[0.06, 10, 8]} /></mesh>
        <mesh ref={mouth} position={[0, -0.27, 0.88]} scale={[1, 1, 0.5]} material={mat('#6b2f6b')}><sphereGeometry args={[0.07, 12, 10]} /></mesh>
        {/* whisker-rays */}
        {[-1, 1].map((s) => [0, 1, 2].map((j) => (
          <mesh key={`${s}${j}`} position={[s * 0.85, -0.12 - j * 0.09, 0.55]} rotation={[0, s * 0.4, s * (0.15 - j * 0.15)]} material={lampGlowMat}><boxGeometry args={[0.55, 0.02, 0.02]} /></mesh>
        )))}
        {/* crown: a tiny city skyline */}
        <group position={[0, 0.9, -0.05]}>
          {[[-0.32, 0.25, '#ffd6e0'], [-0.12, 0.42, '#c9e4ff'], [0.08, 0.32, '#fff1bf'], [0.27, 0.22, '#d8f3c4']].map(([x, h, col], i) => (
            <group key={i} position={[x as number, (h as number) / 2, 0]}>
              <mesh castShadow material={mat(col as string, { emissive: col as string, ei: 0.25 })}><boxGeometry args={[0.16, h as number, 0.16]} /></mesh>
              <mesh position={[0, (h as number) / 2 + 0.06, 0]} material={mat('#a98bf0')}><coneGeometry args={[0.12, 0.12, 4]} /></mesh>
            </group>
          ))}
        </group>
        {/* tail of light */}
        <group ref={tail}>
          {Array.from({ length: 9 }).map((_, i) => <mesh key={i} material={daemonGlowMat}><sphereGeometry args={[0.16 - i * 0.013, 10, 8]} /></mesh>)}
        </group>
      </group>
      {/* orbiting halo of mini-blocks */}
      <group ref={halo}>
        {Array.from({ length: 10 }).map((_, i) => {
          const a = (i / 10) * Math.PI * 2;
          return (
            <mesh key={i} position={[Math.cos(a) * 1.75, Math.sin(a * 2) * 0.12, Math.sin(a) * 1.75]} rotation={[a, a, 0]} material={mat(['#ffd166', '#8ec5ff', '#ff8fab', '#b5ead7'][i % 4], { emissive: '#ffffff', ei: 0.15 })}>
              {i % 3 === 0 ? <coneGeometry args={[0.09, 0.18, 4]} /> : i % 3 === 1 ? <boxGeometry args={[0.13, 0.13, 0.13]} /> : <sphereGeometry args={[0.08, 8, 6]} />}
            </mesh>
          );
        })}
      </group>
      {/* the architect's tools: compass + pencil */}
      <group ref={tools}>
        <group position={[2.2, 0.3, 0]} rotation={[0, 0, 0.3]}>
          <mesh position={[-0.12, 0, 0]} rotation={[0, 0, 0.25]} material={mat(PASTEL.gold, { metal: 0.7, rough: 0.25 })}><cylinderGeometry args={[0.025, 0.01, 0.7, 6]} /></mesh>
          <mesh position={[0.12, 0, 0]} rotation={[0, 0, -0.25]} material={mat(PASTEL.gold, { metal: 0.7, rough: 0.25 })}><cylinderGeometry args={[0.025, 0.01, 0.7, 6]} /></mesh>
          <mesh position={[0, 0.36, 0]} material={mat(PASTEL.gold, { metal: 0.7, rough: 0.25 })}><sphereGeometry args={[0.05, 8, 8]} /></mesh>
        </group>
        <group position={[-2.1, -0.1, 0.4]} rotation={[0.4, 0, -0.8]}>
          <mesh material={mat('#ffd166')}><cylinderGeometry args={[0.05, 0.05, 0.7, 6]} /></mesh>
          <mesh position={[0, -0.42, 0]} material={mat('#f6d2b8')}><coneGeometry args={[0.05, 0.15, 6]} /></mesh>
          <mesh position={[0, 0.38, 0]} material={mat('#ff8fab')}><cylinderGeometry args={[0.05, 0.05, 0.08, 6]} /></mesh>
        </group>
      </group>
      {/* magic beam while transforming architecture */}
      <mesh ref={beam} material={beamMat} visible={false}>
        <cylinderGeometry args={[0.25, 1.4, 1, 20, 1, true]} />
      </mesh>
      <group ref={sparkles}>
        <Sparkles count={40} scale={4} size={4} speed={0.5} color="#f3e8ff" />
      </group>
      <Bubble y={2.1} get={() => {
        const d = useStore.getState().sim.daemon;
        if (!d.awake) return d.mood === 'dormant' ? '💤' : '😴';
        if (d.mood === 'thinking') return '🤔';
        if (d.mood === 'flying') return '✨';
        if (d.mood === 'casting') return '✨';
        if (d.mood === 'delighted') return '😻';
        if (d.energy < 20) return '🥱';
        return '';
      }} />
    </group>
  );
}

/** The shrine where offerings are placed and the daemon rests. */
export function Shrine() {
  const flame = useRef<THREE.Group>(null);
  const pile = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    flame.current?.children.forEach((f, i) => { f.scale.y = 1 + Math.sin(t * 9 + i) * 0.2; });
    if (pile.current) {
      const n = Math.min(8, useStore.getState().sim.daemon.memory.offerings.filter((o) => o.day === useStore.getState().sim.day).length);
      pile.current.children.forEach((c, i) => { c.visible = i < n; });
    }
  });
  const stone = mat('#fff3e6');
  const roof = mat('#a98bf0');
  return (
    <group>
      <mesh position={[0, 0.15, 0]} castShadow receiveShadow material={stone}><cylinderGeometry args={[2.3, 2.5, 0.3, 32]} /></mesh>
      <mesh position={[0, 0.42, 0]} castShadow receiveShadow material={mat('#ffe3ef')}><cylinderGeometry args={[1.7, 1.9, 0.25, 32]} /></mesh>
      {/* four pillars + cat-ear pagoda roof (low, so the daemon sleeps visibly on top) */}
      {[0, 1, 2, 3].map((i) => {
        const a = Math.PI / 4 + (i * Math.PI) / 2;
        return <mesh key={i} position={[Math.cos(a) * 1.35, 1.05, Math.sin(a) * 1.35]} castShadow material={mat('#ff8fab')}><cylinderGeometry args={[0.1, 0.12, 1.1, 10]} /></mesh>;
      })}
      <mesh position={[0, 1.72, 0]} castShadow material={roof}><cylinderGeometry args={[0.6, 2.0, 0.42, 4, 1, false, Math.PI / 4]} /></mesh>
      {[-1, 1].map((s) => <mesh key={s} position={[s * 0.75, 2.15, 0]} rotation={[0, 0, -s * 0.3]} castShadow material={roof}><coneGeometry args={[0.28, 0.6, 4]} /></mesh>)}
      <mesh position={[0, 1.98, 0]} material={mat('#cdb8ff')}><cylinderGeometry args={[0.75, 0.75, 0.12, 24]} /></mesh>
      {/* cushion bed for the sleeping daemon */}
      <mesh position={[0, 2.08, 0]} scale={[1, 0.3, 1]} material={mat('#ffd1e3', { rough: 1 })}><sphereGeometry args={[0.7, 18, 12]} /></mesh>
      {/* candles */}
      <group ref={flame}>
        {[0, 1, 2, 3].map((i) => {
          const a = (i * Math.PI) / 2;
          return (
            <group key={i} position={[Math.cos(a) * 2.05, 0.3, Math.sin(a) * 2.05]}>
              <mesh position={[0, 0.15, 0]} material={mat('#fffaf0')}><cylinderGeometry args={[0.07, 0.07, 0.3, 8]} /></mesh>
              <mesh position={[0, 0.36, 0]} material={lampGlowMat}><sphereGeometry args={[0.06, 8, 6]} /></mesh>
            </group>
          );
        })}
      </group>
      {/* the shrine food bowl */}
      <group position={[1.2, 0.3, 2.2]}>
        <mesh material={mat('#8ec5ff')}><cylinderGeometry args={[0.28, 0.2, 0.14, 16]} /></mesh>
        <mesh position={[0, 0.07, 0]} material={mat('#c98b55')}><sphereGeometry args={[0.17, 10, 8]} /></mesh>
      </group>
      {/* offering pile — grows through the day */}
      <group ref={pile} position={[0, 0.58, 0]}>
        {Array.from({ length: 8 }).map((_, i) => {
          const a = (i / 8) * Math.PI * 2;
          return <mesh key={i} position={[Math.cos(a) * 0.95, 0.12, Math.sin(a) * 0.95]} rotation={[0, a, 0]} castShadow material={mat(['#ff8fab', '#ffd166', '#8ec5ff', '#b5ead7'][i % 4])}><boxGeometry args={[0.28, 0.24, 0.28]} /></mesh>;
        })}
      </group>
    </group>
  );
}
