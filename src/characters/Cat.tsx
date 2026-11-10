import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useStore } from '../simulation/store';
import { mat } from '../world/materials';
import { Bubble } from './Bubble';

/** An adorable procedural cat with expressive poses. */
export function Cat({ id }: { id: number }) {
  const sim = useStore((s) => s.sim);
  const select = useStore((s) => s.select);
  const c = sim.cats[id];
  const root = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const eyes = useRef<THREE.Group>(null);
  const mouth = useRef<THREE.Mesh>(null);
  const legs = useRef<THREE.Group>(null);
  const tail = useRef<THREE.Group>(null);
  const crown = useRef<THREE.Group>(null);
  const ring = useRef<THREE.Mesh>(null);
  const phase = id * 1.7;

  const bodyM = mat(c.colors.body, { rough: 0.9 });
  const accM = mat(c.colors.accent, { rough: 0.9 });
  const patches = useMemo(() => {
    if (c.colors.pattern === 'calico') return [[0.18, 0.42, -0.05, 0.17, '#f08c3a'], [-0.16, 0.38, 0.15, 0.15, '#2f2a3a'], [0.05, 0.5, -0.25, 0.13, '#f08c3a']] as const;
    return [] as const;
  }, [c.colors.pattern]);

  useFrame(({ clock }) => {
    const k = useStore.getState().sim.cats[id];
    const g = root.current, b = body.current, h = head.current;
    if (!g || !b || !h) return;
    const t = clock.elapsedTime + phase;
    g.position.set(k.pos.x, k.pos.y, k.pos.z);
    let dh = k.heading - g.rotation.y;
    while (dh > Math.PI) dh -= Math.PI * 2;
    while (dh < -Math.PI) dh += Math.PI * 2;
    g.rotation.y += dh * 0.2;
    g.scale.setScalar(k.size * 0.85);

    b.position.set(0, 0, 0); b.rotation.set(0, 0, 0); b.scale.set(1, 1, 1);
    h.position.set(0, 0.52, 0.36); h.rotation.set(0, 0, 0);
    let eyeOpen = 1, legSwing = 0, tailSpeed = 2, tailAmp = 0.35, legsVisible = true, mouthOpen = 0;
    const a = k.activity;
    if (k.moving) {
      legSwing = Math.sin(t * 16) * 0.7;
      b.position.y = Math.abs(Math.sin(t * 16)) * 0.04;
      tailSpeed = 6;
    } else if (a === 'sleeping' || a === 'lounging') {
      b.scale.set(1.1, 0.72, 1);
      b.position.y = -0.08;
      h.position.set(0.12, 0.3, 0.32); h.rotation.set(0.3, 0, -0.5);
      eyeOpen = a === 'sleeping' ? 0.12 : 0.5;
      legsVisible = false; tailAmp = 0.1; tailSpeed = 0.8;
      b.scale.y = 0.72 + Math.sin(t * 2) * 0.03; // breathing
    } else if (a === 'playing') {
      b.position.y = Math.abs(Math.sin(t * 7)) * 0.35;
      b.rotation.z = Math.sin(t * 3.5) * 0.3;
      tailSpeed = 9; tailAmp = 0.6;
    } else if (a === 'eating') {
      h.position.set(0, 0.32, 0.44); h.rotation.x = 0.5 + Math.sin(t * 10) * 0.08;
    } else if (a === 'hiding') {
      b.scale.set(1, 0.7, 0.9); b.position.y = -0.06; eyeOpen = 0.7; legsVisible = false; tailAmp = 0.05;
    } else if (a === 'exploring' || a === 'inspecting') {
      h.rotation.z = Math.sin(t * 1.5) * 0.35; h.rotation.y = Math.sin(t * 0.9) * 0.4;
    } else if (a === 'demanding') {
      b.rotation.x = -0.55; b.position.y = 0.1; mouthOpen = 1;
      h.position.set(0, 0.62, 0.22); h.rotation.x = -0.4 + Math.sin(t * 12) * 0.08;
      tailSpeed = 10; tailAmp = 0.5;
    } else if (a === 'carried') {
      b.rotation.x = -0.45; b.position.y = 0.05; h.position.set(0, 0.62, 0.24); h.rotation.x = -0.15;
      eyeOpen = 0.55; tailAmp = 0.2;
    }
    if (legs.current) {
      legs.current.visible = legsVisible;
      legs.current.children.forEach((l, i) => { l.rotation.x = (i % 2 ? 1 : -1) * (i < 2 ? 1 : -1) * legSwing; });
    }
    // blink
    const blink = (t % 4.3) < 0.12 ? 0.1 : 1;
    if (eyes.current) eyes.current.scale.y = Math.min(eyeOpen, blink);
    if (mouth.current) mouth.current.visible = mouthOpen > 0;
    if (tail.current) {
      tail.current.children.forEach((seg, i) => {
        const s = i / 5;
        seg.position.set(Math.sin(t * tailSpeed - i * 0.6) * tailAmp * s, 0.35 + s * 0.4 + (a === 'sleeping' ? -0.3 : 0), -0.4 - s * 0.25);
      });
    }
    if (crown.current) crown.current.visible = a === 'carried' || a === 'demanding';
    const sel = useStore.getState().selected;
    if (ring.current) ring.current.visible = sel?.kind === 'cat' && sel.id === id;
  });

  return (
    <group ref={root} onClick={(e) => { e.stopPropagation(); select({ kind: 'cat', id }); }}>
      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]} material={mat('#ff8fab', { emissive: '#ff8fab', ei: 0.8 })}>
        <ringGeometry args={[0.5, 0.62, 28]} />
      </mesh>
      <group ref={body}>
        {/* torso */}
        <mesh position={[0, 0.3, 0]} scale={[0.75, 0.66, 1.05]} castShadow material={bodyM}><sphereGeometry args={[0.4, 18, 14]} /></mesh>
        {c.colors.pattern === 'tux' && <mesh position={[0, 0.27, 0.28]} scale={[0.6, 0.6, 0.5]} material={accM}><sphereGeometry args={[0.32, 14, 10]} /></mesh>}
        {c.colors.pattern === 'tabby' && [-0.12, 0.02, 0.16].map((z) => <mesh key={z} position={[0, 0.55, z]} rotation={[0, 0, 0]} scale={[1, 0.25, 0.25]} material={mat('#e07f2c')}><sphereGeometry args={[0.2, 10, 6]} /></mesh>)}
        {patches.map(([x, y, z, r, col], i) => <mesh key={i} position={[x, y, z]} scale={[1, 0.6, 1]} material={mat(col)}><sphereGeometry args={[r, 10, 8]} /></mesh>)}
        <group ref={legs}>
          {[[-0.14, 0.2], [0.14, 0.2], [-0.14, -0.22], [0.14, -0.22]].map(([x, z], i) => (
            <group key={i} position={[x, 0.18, z]}>
              <mesh position={[0, -0.09, 0]} material={c.colors.pattern === 'tux' ? accM : bodyM}><capsuleGeometry args={[0.055, 0.12, 4, 8]} /></mesh>
            </group>
          ))}
        </group>
        <group ref={tail}>
          {[0, 1, 2, 3, 4, 5].map((i) => <mesh key={i} castShadow material={i === 5 && c.colors.pattern === 'tux' ? accM : bodyM}><sphereGeometry args={[0.075 - i * 0.005, 8, 8]} /></mesh>)}
        </group>
        <group ref={head}>
          <mesh castShadow material={bodyM}><sphereGeometry args={[0.25, 18, 14]} /></mesh>
          {c.colors.pattern === 'calico' && <mesh position={[0.1, 0.1, 0.05]} scale={[1, 0.8, 1]} material={mat('#f08c3a')}><sphereGeometry args={[0.15, 10, 8]} /></mesh>}
          {/* muzzle */}
          <mesh position={[0, -0.07, 0.19]} scale={[1.2, 0.8, 0.8]} material={c.colors.pattern === 'tux' || c.colors.pattern === 'tabby' ? accM : bodyM}><sphereGeometry args={[0.1, 12, 10]} /></mesh>
          <mesh position={[0, -0.02, 0.26]} material={mat('#ff9eb5')}><sphereGeometry args={[0.028, 8, 6]} /></mesh>
          <mesh ref={mouth} position={[0, -0.11, 0.24]} scale={[1, 0.8, 0.5]} material={mat('#c2405a')}><sphereGeometry args={[0.05, 10, 8]} /></mesh>
          {/* ears */}
          {[-1, 1].map((s) => (
            <group key={s} position={[s * 0.14, 0.19, 0]} rotation={[0, 0, -s * 0.3]}>
              <mesh castShadow material={bodyM}><coneGeometry args={[0.095, 0.2, 4]} /></mesh>
              <mesh position={[0, -0.01, 0.03]} scale={[0.6, 0.7, 0.5]} material={mat('#ffc4d6')}><coneGeometry args={[0.09, 0.18, 4]} /></mesh>
            </group>
          ))}
          {/* big expressive eyes */}
          <group ref={eyes} position={[0, 0.03, 0.2]}>
            {[-1, 1].map((s) => (
              <group key={s} position={[s * 0.095, 0, 0]}>
                <mesh scale={[1, 1.15, 0.6]} material={mat(c.colors.eyes, { rough: 0.3 })}><sphereGeometry args={[0.06, 12, 10]} /></mesh>
                <mesh position={[0, 0, 0.025]} scale={[0.55, 1.05, 0.5]} material={mat('#1b1626', { rough: 0.2 })}><sphereGeometry args={[0.055, 10, 8]} /></mesh>
                <mesh position={[0.02, 0.025, 0.045]} material={mat('#ffffff', { emissive: '#ffffff', ei: 0.4 })}><sphereGeometry args={[0.016, 6, 6]} /></mesh>
              </group>
            ))}
          </group>
          {/* whiskers */}
          {[-1, 1].map((s) => [0, 1].map((j) => (
            <mesh key={`${s}${j}`} position={[s * 0.17, -0.06 - j * 0.035, 0.18]} rotation={[0, 0, s * (0.1 - j * 0.2)]} material={mat('#ffffff')}><boxGeometry args={[0.16, 0.006, 0.006]} /></mesh>
          )))}
          <group ref={crown} position={[0, 0.27, 0]} visible={false}>
            <mesh material={mat('#ffcf5a', { metal: 0.6, rough: 0.3 })}><cylinderGeometry args={[0.11, 0.13, 0.08, 10, 1, true]} /></mesh>
            {[0, 1, 2, 3, 4].map((i) => <mesh key={i} position={[Math.cos(i * 1.256) * 0.11, 0.07, Math.sin(i * 1.256) * 0.11]} material={mat('#ffcf5a', { metal: 0.6, rough: 0.3 })}><coneGeometry args={[0.025, 0.07, 4]} /></mesh>)}
          </group>
        </group>
      </group>
      <Bubble y={1.15} variant="shout" get={() => useStore.getState().sim.cats[id].thought} />
    </group>
  );
}

export function Cats() {
  const sim = useStore((s) => s.sim);
  return <>{sim.cats.map((c) => <Cat key={`${c.id}-${sim.seed}`} id={c.id} />)}</>;
}
