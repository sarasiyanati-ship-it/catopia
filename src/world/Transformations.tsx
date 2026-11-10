// ─────────────────────────────────────────────────────────────
// Procedural 3D models for every cat-architecture transformation.
// Each placed transformation pops in with a springy scale animation.
// ─────────────────────────────────────────────────────────────

import { RoundedBox } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef, type ReactNode } from 'react';
import * as THREE from 'three';
import { BUILDING_BY_ID, localToWorld } from '../data/city';
import { useStore } from '../simulation/store';
import type { Placed } from '../simulation/types';
import { gableGeometry } from './Buildings';
import { lampGlowMat, mat, PASTEL, windowMat } from './materials';

const elastic = (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -9 * t) * Math.cos(t * 9));

/** Springy pop-in for freshly built things. */
function PopIn({ placed, children }: { placed: Placed; children: ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  const start = useRef<number | null>(null);
  const fresh = useStore.getState().sim.time - placed.bornAt < 1.5;
  useFrame(({ clock }) => {
    const g = ref.current;
    if (!g) return;
    if (!fresh) { g.scale.setScalar(1); return; }
    if (start.current === null) start.current = clock.elapsedTime;
    const t = Math.min(1, (clock.elapsedTime - start.current) / 1.4);
    g.scale.setScalar(Math.max(0.001, elastic(t)));
  });
  return <group ref={ref} scale={fresh ? 0.001 : 1}>{children}</group>;
}

function Paw({ y = 0.02, s = 1, color = '#ffffff' }: { y?: number; s?: number; color?: string }) {
  return (
    <group position={[0, y, 0]} scale={s}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} material={mat(color)}><circleGeometry args={[0.22, 16]} /></mesh>
      {[-0.22, -0.08, 0.08, 0.22].map((x, i) => (
        <mesh key={i} position={[x, 0, -0.26 - (i === 1 || i === 2 ? 0.06 : 0)]} rotation={[-Math.PI / 2, 0, 0]} material={mat(color)}><circleGeometry args={[0.07, 10]} /></mesh>
      ))}
    </group>
  );
}

// ── individual models ────────────────────────────────────────
function CatBed() {
  return (
    <group>
      <mesh position={[0, 0.25, 0]} castShadow receiveShadow material={mat('#ffb3c7')}><cylinderGeometry args={[1.05, 1.0, 0.3, 28]} /></mesh>
      <mesh position={[0, 0.42, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow material={mat('#ff9ec0')}><torusGeometry args={[0.95, 0.24, 12, 28]} /></mesh>
      <mesh position={[0, 0.42, 0]} receiveShadow material={mat('#fff0f6')}><cylinderGeometry args={[0.8, 0.8, 0.08, 28]} /></mesh>
      <Paw y={0.47} s={1.1} color="#ffc8da" />
    </group>
  );
}

function ScratchPost() {
  const ball = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => { if (ball.current) ball.current.position.x = 0.55 + Math.sin(clock.elapsedTime * 2.2) * 0.12; });
  return (
    <group>
      <mesh position={[0, 0.08, 0]} castShadow material={mat(PASTEL.lilac)}><cylinderGeometry args={[0.6, 0.65, 0.16, 20]} /></mesh>
      <mesh position={[0, 1.2, 0]} castShadow material={mat(PASTEL.rope, { rough: 1 })}><cylinderGeometry args={[0.2, 0.2, 2.2, 14]} /></mesh>
      {[0.4, 0.8, 1.2, 1.6, 2.0].map((y) => <mesh key={y} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]} material={mat('#d9b77a')}><torusGeometry args={[0.205, 0.03, 6, 16]} /></mesh>)}
      <mesh position={[0, 2.38, 0]} castShadow material={mat(PASTEL.pink)}><cylinderGeometry args={[0.55, 0.5, 0.18, 20]} /></mesh>
      <mesh position={[0.55, 2.0, 0]} material={mat('#9b6a42')}><cylinderGeometry args={[0.01, 0.01, 0.6, 4]} /></mesh>
      <mesh ref={ball} position={[0.55, 1.65, 0]} castShadow material={mat('#ef6f8f')}><sphereGeometry args={[0.13, 12, 10]} /></mesh>
      {/* the old lamp lives on, now at cat height */}
      <mesh position={[-0.35, 0.5, 0.25]} material={lampGlowMat}><sphereGeometry args={[0.12, 10, 8]} /></mesh>
    </group>
  );
}

function RooftopPlayground({ p }: { p: Placed }) {
  const b = BUILDING_BY_ID[p.buildingId!];
  const spin = useRef<THREE.Group>(null);
  useFrame((_, dt) => { if (spin.current) spin.current.rotation.y += dt * 0.6; });
  return (
    <group rotation={[0, b.rot, 0]}>
      <RoundedBox args={[b.w + 0.3, 0.22, b.d + 0.3]} radius={0.08} position={[0, 0.1, 0]} castShadow receiveShadow material={mat('#ffe8a3')} />
      {/* railings */}
      {[[0, (b.d + 0.2) / 2, b.w], [0, -(b.d + 0.2) / 2, b.w]].map(([x, z, w], i) => (
        <mesh key={i} position={[x, 0.42, z]} material={mat('#ff8fab')}><boxGeometry args={[w, 0.08, 0.08]} /></mesh>
      ))}
      {/* slide tower */}
      <mesh position={[-0.8, 0.75, -0.6]} castShadow material={mat('#8ec5ff')}><boxGeometry args={[0.7, 1.1, 0.7]} /></mesh>
      <mesh position={[-0.8, 1.45, -0.6]} castShadow material={mat('#ff8f7a')}><coneGeometry args={[0.55, 0.5, 4]} /></mesh>
      <mesh position={[-0.05, 0.6, -0.6]} rotation={[0, 0, -0.6]} castShadow material={mat('#ffd166')}><boxGeometry args={[1.2, 0.08, 0.5]} /></mesh>
      {/* carousel of dangling toys */}
      <group ref={spin} position={[0.7, 0.2, 0.5]}>
        <mesh position={[0, 0.6, 0]} material={mat(PASTEL.wood)}><cylinderGeometry args={[0.05, 0.05, 1.2, 6]} /></mesh>
        <mesh position={[0, 1.2, 0]} castShadow material={mat('#b5ead7')}><coneGeometry args={[0.6, 0.3, 12]} /></mesh>
        {[0, 1, 2, 3].map((i) => (
          <mesh key={i} position={[Math.cos(i * 1.57) * 0.5, 0.75, Math.sin(i * 1.57) * 0.5]} castShadow material={mat(['#ef6f8f', '#ffd166', '#8ec5ff', '#b69cff'][i])}><sphereGeometry args={[0.12, 10, 8]} /></mesh>
        ))}
      </group>
      <mesh position={[-0.1, 0.32, 0.6]} castShadow material={mat('#ef6f8f')}><sphereGeometry args={[0.16, 12, 10]} /></mesh>
    </group>
  );
}

function CushionNest({ p }: { p: Placed }) {
  const b = BUILDING_BY_ID[p.buildingId!];
  const cols = ['#ffd1e3', '#d9c8ff', '#fff2a8', '#c7f0d8', '#ffffff', '#bfe3ff'];
  return (
    <group rotation={[0, b.rot, 0]}>
      <RoundedBox args={[b.w + 0.2, 0.18, b.d + 0.2]} radius={0.08} position={[0, 0.08, 0]} castShadow material={mat('#fff6e8')} />
      {cols.map((c, i) => {
        const a = (i / cols.length) * Math.PI * 2;
        return <mesh key={i} position={[Math.cos(a) * 0.85, 0.35, Math.sin(a) * 0.85]} scale={[1, 0.55, 1]} castShadow material={mat(c, { rough: 1 })}><sphereGeometry args={[0.55, 14, 10]} /></mesh>;
      })}
      <mesh position={[0, 0.55, 0]} scale={[1.2, 0.6, 1.2]} castShadow material={mat('#ffffff', { rough: 1 })}><sphereGeometry args={[0.65, 16, 12]} /></mesh>
    </group>
  );
}

function ClimbingWall({ p }: { p: Placed }) {
  const b = BUILDING_BY_ID[p.buildingId!];
  const steps = Math.max(3, Math.floor(b.h / 0.55));
  const cols = ['#ffd166', '#8ec5ff', '#ff8fab', '#b5ead7'];
  return (
    <group rotation={[0, b.rot, 0]}>
      {Array.from({ length: steps }).map((_, i) => (
        <group key={i} position={[0.3, 0.45 + i * 0.55, (i % 2 ? 0.7 : -0.7) * (b.d / 3.2)]}>
          <RoundedBox args={[0.6, 0.12, 0.9]} radius={0.04} castShadow material={mat(cols[i % cols.length])} />
          <mesh position={[-0.2, -0.18, 0]} material={mat(PASTEL.woodDark)}><boxGeometry args={[0.12, 0.25, 0.12]} /></mesh>
        </group>
      ))}
      {/* top balcony with a cushion */}
      <group position={[0.45, b.h * 0.62, 0.4]}>
        <RoundedBox args={[0.9, 0.12, 1.1]} radius={0.04} castShadow material={mat(PASTEL.wood)} />
        <mesh position={[0, 0.12, 0]} scale={[1, 0.4, 1]} material={mat('#ffd1e3')}><sphereGeometry args={[0.38, 12, 10]} /></mesh>
      </group>
    </group>
  );
}

function Beam({ a, b, y, width, color, posts = true }: { a: THREE.Vector3; b: THREE.Vector3; y: number; width: number; color: string; posts?: boolean }) {
  const mid = a.clone().add(b).multiplyScalar(0.5);
  const len = a.distanceTo(b);
  const ang = Math.atan2(b.x - a.x, b.z - a.z);
  const nPosts = Math.max(2, Math.round(len / 3.2));
  return (
    <group position={[mid.x, y, mid.z]} rotation={[0, ang, 0]}>
      <RoundedBox args={[width, 0.16, len]} radius={0.06} castShadow receiveShadow material={mat(color)} />
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * (width / 2 - 0.04), 0.32, 0]} material={mat('#ffffff')}><boxGeometry args={[0.06, 0.06, len]} /></mesh>
      ))}
      {Array.from({ length: Math.round(len / 0.7) }).map((_, i) => {
        const z = -len / 2 + 0.35 + i * 0.7;
        return [-1, 1].map((s) => <mesh key={`${i}${s}`} position={[s * (width / 2 - 0.04), 0.17, z]} material={mat('#ffffff')}><boxGeometry args={[0.04, 0.3, 0.04]} /></mesh>);
      })}
      {posts && Array.from({ length: nPosts }).map((_, i) => {
        const z = -len / 2 + (len / (nPosts - 1)) * i;
        return <mesh key={i} position={[0, -y / 2, z]} castShadow material={mat('#fff6e8')}><cylinderGeometry args={[0.1, 0.13, y, 8]} /></mesh>;
      })}
      {/* paw prints along the deck */}
      {Array.from({ length: Math.floor(len / 1.4) }).map((_, i) => (
        <group key={`p${i}`} position={[(i % 2 ? 0.12 : -0.12), 0.09, -len / 2 + 0.7 + i * 1.4]} rotation={[0, Math.PI, 0]}>
          <Paw s={0.35} color="#ffffff" />
        </group>
      ))}
    </group>
  );
}

function SkyBridge({ p }: { p: Placed }) {
  const a = new THREE.Vector3(p.a!.x, 0, p.a!.z), b = new THREE.Vector3(p.b!.x, 0, p.b!.z);
  // shrink so it starts at roof edges rather than centres
  const dir = b.clone().sub(a).normalize();
  const a2 = a.clone().add(dir.clone().multiplyScalar(0.6)), b2 = b.clone().sub(dir.clone().multiplyScalar(0.6));
  return (
    <group position={[-p.pos.x, -p.pos.y, -p.pos.z]}>
      <Beam a={a2} b={b2} y={p.pos.y + 0.1} width={0.8} color="#ffd166" posts={false} />
      {/* bunting */}
      {Array.from({ length: 6 }).map((_, i) => {
        const t = (i + 0.5) / 6;
        const q = a2.clone().lerp(b2, t);
        return <mesh key={i} position={[q.x, p.pos.y + 0.75 - Math.sin(t * Math.PI) * 0.2, q.z]} rotation={[Math.PI, Math.atan2(dir.x, dir.z) + Math.PI / 2, 0]} material={mat(['#ff8fab', '#8ec5ff', '#b5ead7'][i % 3])}><coneGeometry args={[0.12, 0.25, 3]} /></mesh>;
      })}
    </group>
  );
}

function Walkway({ p }: { p: Placed }) {
  const a = new THREE.Vector3(p.a!.x, 0, p.a!.z), b = new THREE.Vector3(p.b!.x, 0, p.b!.z);
  return (
    <group position={[-p.pos.x, -p.pos.y, -p.pos.z]}>
      <Beam a={a} b={b} y={p.pos.y} width={1.0} color="#9ad6e8" />
      {/* little round platform at the junction */}
      {[a, b].map((v, i) => Math.abs(v.x) < 8 && Math.abs(v.z) < 8 ? (
        <mesh key={i} position={[v.x, p.pos.y, v.z]} castShadow material={mat('#cdb8ff')}><cylinderGeometry args={[0.85, 0.85, 0.18, 20]} /></mesh>
      ) : null)}
    </group>
  );
}

function CatTunnel({ p }: { p: Placed }) {
  const b = BUILDING_BY_ID[p.buildingId!];
  return (
    <group rotation={[0, b.rot, 0]}>
      <group position={[-0.3, 0.05, 0]} rotation={[0, Math.PI / 2, 0]}>
        <mesh rotation={[0, 0, 0]} castShadow material={mat('#ffb3a7')}><torusGeometry args={[1.0, 0.36, 12, 24, Math.PI]} /></mesh>
        {[0.2, 0.6, 1.0, 1.4, 1.8, 2.2, 2.6].map((a) => (
          <mesh key={a} position={[Math.cos(a) * 1.0, Math.sin(a) * 1.0, 0]} rotation={[0, 0, a]} material={mat('#ffffff')}><torusGeometry args={[0.37, 0.03, 6, 16]} /></mesh>
        ))}
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * 1.0, 0.0, 0]} rotation={[Math.PI / 2, 0, 0]} material={mat('#3b2f4a')}><circleGeometry args={[0.3, 16]} /></mesh>
        ))}
      </group>
    </group>
  );
}

function CatDoor({ p }: { p: Placed }) {
  const b = BUILDING_BY_ID[p.buildingId!];
  const flap = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => { if (flap.current) flap.current.rotation.x = Math.max(0, Math.sin(clock.elapsedTime * 1.3 + p.pos.x)) * 0.5; });
  return (
    <group rotation={[0, b.rot, 0]}>
      <mesh position={[0, 0.3, 0.02]} material={mat('#ffd166')}><boxGeometry args={[0.52, 0.6, 0.05]} /></mesh>
      <mesh position={[0, 0.6, 0.02]} rotation={[Math.PI / 2, 0, 0]} material={mat('#ffd166')}><cylinderGeometry args={[0.26, 0.26, 0.05, 16, 1, false, 0, Math.PI]} /></mesh>
      <mesh ref={flap} position={[0, 0.27, 0.06]} material={mat('#8f6bd9')}><boxGeometry args={[0.38, 0.45, 0.03]} /></mesh>
      {[-0.08, 0.08].map((x) => <mesh key={x} position={[x, 0.9, 0.04]} rotation={[0, 0, x > 0 ? -0.3 : 0.3]} material={mat('#ffd166')}><coneGeometry args={[0.08, 0.16, 3]} /></mesh>)}
    </group>
  );
}

function SleepingGarden() {
  const cols = ['#ffd1e3', '#d9c8ff', '#fff2a8', '#c7f0d8'];
  return (
    <group>
      <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow material={mat('#c7efb0', { rough: 1 })}><ringGeometry args={[3.4, 5.5, 48]} /></mesh>
      {Array.from({ length: 10 }).map((_, i) => {
        const a = (i / 10) * Math.PI * 2 + 0.3;
        const r = 4.4;
        return (
          <group key={i} position={[Math.cos(a) * r, 0.18, Math.sin(a) * r]} rotation={[0, -a, 0]}>
            <mesh scale={[1, 0.38, 0.8]} castShadow material={mat(cols[i % 4], { rough: 1 })}><sphereGeometry args={[0.6, 14, 10]} /></mesh>
          </group>
        );
      })}
      {Array.from({ length: 22 }).map((_, i) => {
        const a = (i / 22) * Math.PI * 2;
        const r = 3.6 + (i % 3) * 0.75;
        return (
          <group key={`f${i}`} position={[Math.cos(a) * r, 0, Math.sin(a) * r]}>
            <mesh position={[0, 0.15, 0]} material={mat('#7cc47e')}><cylinderGeometry args={[0.02, 0.02, 0.3, 4]} /></mesh>
            <mesh position={[0, 0.32, 0]} material={mat(['#ff8fab', '#ffd166', '#ffffff', '#b69cff'][i % 4])}><sphereGeometry args={[0.09, 8, 6]} /></mesh>
          </group>
        );
      })}
    </group>
  );
}

function FishFountain() {
  const drops = useRef<THREE.Group>(null);
  const fish = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (fish.current) fish.current.rotation.y = Math.sin(t * 0.5) * 0.3;
    drops.current?.children.forEach((c, i) => {
      const k = ((t * 0.9 + i / 8) % 1);
      const a = (i / 8) * Math.PI * 2;
      c.position.set(Math.cos(a) * k * 0.9, 1.75 + Math.sin(k * Math.PI) * 0.6 - k * 1.1, Math.sin(a) * k * 0.9);
    });
  });
  return (
    <group>
      <mesh position={[0, 0.25, 0]} castShadow receiveShadow material={mat('#e8f1ff')}><cylinderGeometry args={[1.3, 1.4, 0.5, 28]} /></mesh>
      <mesh position={[0, 0.48, 0]} material={mat('#7fc8f8', { rough: 0.15 })}><cylinderGeometry args={[1.12, 1.12, 0.05, 28]} /></mesh>
      <mesh position={[0, 0.9, 0]} castShadow material={mat('#e8f1ff')}><cylinderGeometry args={[0.18, 0.25, 0.9, 12]} /></mesh>
      <group ref={fish} position={[0, 1.55, 0]} rotation={[0, 0, 0]}>
        <mesh rotation={[0, 0, 0.9]} scale={[0.6, 0.3, 0.22]} castShadow material={mat('#ffb84d', { metal: 0.3, rough: 0.4 })}><sphereGeometry args={[0.7, 16, 12]} /></mesh>
        <mesh position={[-0.28, -0.42, 0]} rotation={[0, 0, 0.9 + Math.PI / 2]} material={mat('#ffb84d', { metal: 0.3, rough: 0.4 })}><coneGeometry args={[0.2, 0.3, 3]} /></mesh>
      </group>
      <group ref={drops}>
        {Array.from({ length: 8 }).map((_, i) => <mesh key={i} material={mat('#bfe3ff', { rough: 0.1 })}><sphereGeometry args={[0.06, 6, 6]} /></mesh>)}
      </group>
      {[0, 1, 2].map((i) => <mesh key={i} position={[Math.cos(i * 2.1) * 0.7, 0.53, Math.sin(i * 2.1) * 0.7]} rotation={[0, i, 0]} scale={[0.25, 0.08, 0.1]} material={mat('#ff9f6b')}><sphereGeometry args={[0.6, 8, 6]} /></mesh>)}
    </group>
  );
}

function FeedingStation() {
  return (
    <group>
      <mesh position={[0, 0.06, 0]} receiveShadow material={mat('#fff6e8')}><cylinderGeometry args={[1.4, 1.4, 0.12, 6]} /></mesh>
      {[0, 1, 2, 3, 4, 5].map((i) => <mesh key={i} position={[Math.cos(i * 1.047) * 1.2, 0.9, Math.sin(i * 1.047) * 1.2]} castShadow material={mat('#ffffff')}><cylinderGeometry args={[0.06, 0.06, 1.7, 6]} /></mesh>)}
      <mesh position={[0, 2.0, 0]} castShadow material={mat('#ff8fab')}><coneGeometry args={[1.7, 0.8, 6]} /></mesh>
      {[0, 1, 2].map((i) => (
        <group key={i} position={[Math.cos(i * 2.09) * 0.6, 0.15, Math.sin(i * 2.09) * 0.6]}>
          <mesh material={mat(['#8ec5ff', '#ffd166', '#b5ead7'][i])}><cylinderGeometry args={[0.25, 0.18, 0.14, 14]} /></mesh>
          <mesh position={[0, 0.07, 0]} material={mat('#c98b55')}><sphereGeometry args={[0.15, 8, 6]} /></mesh>
        </group>
      ))}
    </group>
  );
}

function BoxFort() {
  const boxes: [number, number, number, number][] = [[0, 0.35, 0, 0.7], [0.75, 0.3, 0.1, 0.6], [-0.7, 0.3, -0.1, 0.6], [0.2, 0.95, 0.05, 0.55], [-0.35, 1.0, 0.15, 0.45], [0.1, 1.5, 0, 0.45], [0.35, 0.25, 0.75, 0.5]];
  return (
    <group>
      {boxes.map(([x, y, z, s], i) => (
        <group key={i} position={[x, y, z]} rotation={[0, i * 0.4, 0]}>
          <mesh castShadow receiveShadow material={mat(i % 2 ? '#d8a86a' : '#c99a5e', { rough: 1 })}><boxGeometry args={[s, s, s]} /></mesh>
          <mesh position={[0, 0, s / 2 + 0.005]} material={mat('#3b2f4a')}><circleGeometry args={[s * 0.25, 14]} /></mesh>
          <mesh position={[0, s / 2 + 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]} material={mat('#efe0c0')}><planeGeometry args={[s * 0.15, s]} /></mesh>
        </group>
      ))}
      <mesh position={[0.1, 2.0, 0]} material={mat(PASTEL.woodDark)}><cylinderGeometry args={[0.02, 0.02, 0.7, 4]} /></mesh>
      <mesh position={[0.3, 2.2, 0]} material={mat('#ff8fab')}><boxGeometry args={[0.4, 0.25, 0.02]} /></mesh>
    </group>
  );
}

function CatnipGarden() {
  return (
    <group>
      <RoundedBox args={[2.6, 0.4, 1.8]} radius={0.1} position={[0, 0.2, 0]} castShadow receiveShadow material={mat(PASTEL.wood)} />
      <mesh position={[0, 0.41, 0]} material={mat('#8a6a4a', { rough: 1 })}><boxGeometry args={[2.4, 0.04, 1.6]} /></mesh>
      {Array.from({ length: 12 }).map((_, i) => (
        <mesh key={i} position={[-1 + (i % 4) * 0.66, 0.6, -0.55 + Math.floor(i / 4) * 0.55]} castShadow material={mat(i % 3 ? '#7ccf7a' : '#9be08f', { rough: 1 })}><icosahedronGeometry args={[0.26, 0]} /></mesh>
      ))}
      {Array.from({ length: 6 }).map((_, i) => <mesh key={`f${i}`} position={[-0.9 + i * 0.36, 0.86, (i % 2) * 0.4 - 0.2]} material={mat('#cdb8ff')}><sphereGeometry args={[0.06, 6, 6]} /></mesh>)}
    </group>
  );
}

function SunDeck() {
  return (
    <group>
      <RoundedBox args={[2.8, 0.25, 2.2]} radius={0.08} position={[0, 0.3, 0]} castShadow receiveShadow material={mat('#e3b07a')} />
      {[[-1.2, -0.9], [1.2, -0.9], [-1.2, 0.9], [1.2, 0.9]].map(([x, z], i) => <mesh key={i} position={[x, 0.1, z]} material={mat(PASTEL.woodDark)}><boxGeometry args={[0.15, 0.2, 0.15]} /></mesh>)}
      {[-0.65, 0.65].map((x) => <RoundedBox key={x} args={[1.0, 0.14, 1.6]} radius={0.06} position={[x, 0.5, 0]} material={mat(x < 0 ? '#ffd1e3' : '#fff2a8', { rough: 1 })} />)}
      <mesh position={[0, 1.3, -0.4]} material={mat('#ffffff')}><cylinderGeometry args={[0.04, 0.04, 2, 6]} /></mesh>
      <mesh position={[0, 2.3, -0.4]} castShadow material={mat('#ff8f7a')}><coneGeometry args={[1.3, 0.5, 8, 1, true]} /></mesh>
    </group>
  );
}

function HidingPods() {
  const pods: [number, number, number, string][] = [[0, 0, 1, '#d9c8ff'], [0.95, 0.4, 0.8, '#b5ead7'], [-0.9, 0.35, 0.85, '#ffd1e3']];
  return (
    <group>
      {pods.map(([x, z, s, c], i) => (
        <group key={i} position={[x, 0.55 * s, z]} scale={s}>
          <mesh scale={[0.6, 0.75, 0.6]} castShadow receiveShadow material={mat(c)}><sphereGeometry args={[0.8, 18, 14]} /></mesh>
          <mesh position={[0, -0.05, 0.47]} scale={[1, 1.2, 1]} material={mat('#2b2140')}><circleGeometry args={[0.2, 16]} /></mesh>
          {[-0.12, 0.12].map((ex) => <mesh key={ex} position={[ex, 0.62, 0]} rotation={[0, 0, ex > 0 ? -0.3 : 0.3]} material={mat(c)}><coneGeometry args={[0.1, 0.22, 4]} /></mesh>)}
        </group>
      ))}
    </group>
  );
}

function Monument() {
  const gold = mat('#ffcf5a', { metal: 0.6, rough: 0.3 });
  return (
    <group>
      <RoundedBox args={[1.6, 0.8, 1.6]} radius={0.08} position={[0, 0.4, 0]} castShadow material={mat('#f3ecff')} />
      <group position={[0, 0.8, 0]}>
        <mesh position={[0, 0.8, 0]} scale={[0.75, 1, 0.65]} castShadow material={gold}><sphereGeometry args={[0.8, 18, 14]} /></mesh>
        <mesh position={[0, 1.95, 0.05]} castShadow material={gold}><sphereGeometry args={[0.52, 18, 14]} /></mesh>
        {[-0.28, 0.28].map((x) => <mesh key={x} position={[x, 2.45, 0.05]} castShadow material={gold}><coneGeometry args={[0.16, 0.36, 4]} /></mesh>)}
        <mesh position={[0, 2.55, 0.05]} material={mat('#ff6b8a', { metal: 0.4 })}><torusGeometry args={[0.22, 0.05, 6, 12]} /></mesh>
        <mesh position={[0.55, 0.6, -0.4]} rotation={[0.4, 0, -0.6]} castShadow material={gold}><capsuleGeometry args={[0.1, 0.9, 4, 8]} /></mesh>
      </group>
    </group>
  );
}

// ── house conversions ────────────────────────────────────────
function CatCastle({ p }: { p: Placed }) {
  const b = BUILDING_BY_ID[p.buildingId!];
  const flag = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => { if (flag.current) flag.current.rotation.y = Math.sin(clock.elapsedTime * 3) * 0.35; });
  const wall = mat('#f6e3ff');
  const roof = mat('#a98bf0');
  return (
    <group rotation={[0, b.rot, 0]}>
      <mesh position={[0, 0.06, 0]} receiveShadow material={mat(PASTEL.curb)}><boxGeometry args={[b.w + 1, 0.12, b.d + 1]} /></mesh>
      <RoundedBox args={[b.w, 2.6, b.d]} radius={0.12} position={[0, 1.3, 0]} castShadow receiveShadow material={wall} />
      {/* crenellations */}
      {Array.from({ length: 5 }).map((_, i) => [-1, 1].map((s) => (
        <mesh key={`${i}${s}`} position={[-b.w / 2 + 0.3 + i * ((b.w - 0.6) / 4), 2.75, s * (b.d / 2 - 0.15)]} castShadow material={wall}><boxGeometry args={[0.3, 0.3, 0.3]} /></mesh>
      )))}
      {/* towers with cat-ear roofs */}
      {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz], i) => (
        <group key={i} position={[sx * b.w / 2, 0, sz * b.d / 2]}>
          <mesh position={[0, 1.8, 0]} castShadow material={wall}><cylinderGeometry args={[0.5, 0.55, 3.6, 16]} /></mesh>
          <mesh position={[0, 4.05, 0]} castShadow material={roof}><coneGeometry args={[0.65, 0.9, 16]} /></mesh>
          {[-0.25, 0.25].map((x) => <mesh key={x} position={[x, 4.55, 0]} rotation={[0, 0, x > 0 ? -0.25 : 0.25]} castShadow material={roof}><coneGeometry args={[0.16, 0.4, 4]} /></mesh>)}
          <mesh position={[0, 2.6, 0.5]} material={windowMat}><circleGeometry args={[0.16, 12]} /></mesh>
        </group>
      ))}
      {/* central keep */}
      <mesh position={[0.4, 3.4, -0.3]} castShadow material={wall}><cylinderGeometry args={[0.7, 0.75, 1.8, 18]} /></mesh>
      <mesh position={[0.4, 4.7, -0.3]} castShadow material={mat('#ff8fab')}><coneGeometry args={[0.95, 1.0, 18]} /></mesh>
      <mesh position={[0.4, 5.4, -0.3]} material={mat('#ffffff')}><cylinderGeometry args={[0.03, 0.03, 0.8, 4]} /></mesh>
      <mesh ref={flag} position={[0.65, 5.6, -0.3]} material={mat('#ffd166')}><boxGeometry args={[0.5, 0.3, 0.02]} /></mesh>
      {/* cat-face gate */}
      <group position={[0, 0, b.d / 2 + 0.02]}>
        <mesh position={[0, 0.7, 0]} material={mat('#5b3f8f')}><circleGeometry args={[0.6, 24]} /></mesh>
        {[-0.38, 0.38].map((x) => <mesh key={x} position={[x, 1.25, 0]} rotation={[0, 0, x > 0 ? -0.35 : 0.35]} material={mat('#5b3f8f')}><coneGeometry args={[0.22, 0.4, 3]} /></mesh>)}
        {[-0.2, 0.2].map((x) => <mesh key={x} position={[x, 0.85, 0.02]} material={mat('#ffd166', { emissive: '#ffd166', ei: 0.5 })}><circleGeometry args={[0.09, 12]} /></mesh>)}
        <mesh position={[0, 0.0, 0.25]} rotation={[-Math.PI / 2, 0, 0]} material={mat('#ff6b8a')}><planeGeometry args={[0.9, 1.0]} /></mesh>
      </group>
    </group>
  );
}

function CatHotel({ p }: { p: Placed }) {
  const b = BUILDING_BY_ID[p.buildingId!];
  const gable = useMemo(() => gableGeometry(b.w + 0.3, b.d + 0.3, 1.0), [b]);
  const body = mat('#ffd6e8');
  return (
    <group rotation={[0, b.rot, 0]}>
      <mesh position={[0, 0.06, 0]} receiveShadow material={mat(PASTEL.curb)}><boxGeometry args={[b.w + 1, 0.12, b.d + 1]} /></mesh>
      <RoundedBox args={[b.w, 3.6, b.d]} radius={0.14} position={[0, 1.8, 0]} castShadow receiveShadow material={body} />
      <mesh geometry={gable} position={[0, 3.6, 0]} castShadow material={mat('#ffcf5a', { metal: 0.35, rough: 0.4 })} />
      {/* gold trim */}
      {[1.2, 2.4].map((y) => <mesh key={y} position={[0, y, 0]} material={mat('#ffcf5a', { metal: 0.5, rough: 0.35 })}><boxGeometry args={[b.w + 0.06, 0.08, b.d + 0.06]} /></mesh>)}
      {/* balconies with cushions */}
      {[0.6, 1.8, 3.0].map((y, fl) => [-0.75, 0.75].map((x) => (
        <group key={`${fl}${x}`} position={[x, y, b.d / 2 + 0.25]}>
          <mesh material={mat('#ffffff')}><boxGeometry args={[0.85, 0.08, 0.5]} /></mesh>
          <mesh position={[0, 0.22, 0.22]} material={mat('#ffcf5a', { metal: 0.4 })}><boxGeometry args={[0.85, 0.04, 0.04]} /></mesh>
          <mesh position={[0, 0.12, 0]} scale={[1, 0.4, 0.7]} material={mat(['#cdb8ff', '#b5ead7', '#fff2a8'][fl], { rough: 1 })}><sphereGeometry args={[0.32, 12, 8]} /></mesh>
          <mesh position={[0, 0.45, -0.24]} material={windowMat}><boxGeometry args={[0.45, 0.45, 0.03]} /></mesh>
        </group>
      )))}
      {/* sign with paw & crown */}
      <group position={[0, 4.95, 0]}>
        <mesh material={mat('#ff6b8a')}><cylinderGeometry args={[0.5, 0.5, 0.1, 24]} /></mesh>
        <group position={[0, 0, 0.06]} rotation={[Math.PI / 2, 0, 0]}><Paw s={0.9} color="#ffffff" /></group>
        <mesh position={[0, 0.45, 0]} material={mat('#ffcf5a', { metal: 0.6, rough: 0.3 })}><coneGeometry args={[0.25, 0.3, 5]} /></mesh>
      </group>
      {/* red carpet & awning */}
      <mesh position={[0, 0.13, b.d / 2 + 0.8]} rotation={[-Math.PI / 2, 0, 0]} material={mat('#e5485f')}><planeGeometry args={[0.7, 1.4]} /></mesh>
      <mesh position={[0, 1.1, b.d / 2 + 0.45]} rotation={[0.3, 0, 0]} castShadow material={mat('#e5485f')}><boxGeometry args={[1.0, 0.06, 0.8]} /></mesh>
    </group>
  );
}

// ── dispatcher ───────────────────────────────────────────────
function Model({ p }: { p: Placed }) {
  switch (p.typeId) {
    case 'catBed': return <group rotation={[0, p.rot, 0]}><CatBed /></group>;
    case 'scratchPost': return <ScratchPost />;
    case 'rooftopPlayground': return <RooftopPlayground p={p} />;
    case 'cushionNest': return <CushionNest p={p} />;
    case 'climbingWall': return <ClimbingWall p={p} />;
    case 'skyBridge': return <SkyBridge p={p} />;
    case 'walkway': return <Walkway p={p} />;
    case 'catTunnel': return <CatTunnel p={p} />;
    case 'catDoor': return <CatDoor p={p} />;
    case 'sleepingGarden': return <SleepingGarden />;
    case 'fishFountain': return <FishFountain />;
    case 'feedingStation': return <group rotation={[0, p.rot, 0]}><FeedingStation /></group>;
    case 'boxFort': return <group rotation={[0, p.rot, 0]}><BoxFort /></group>;
    case 'catnipGarden': return <group rotation={[0, p.rot, 0]}><CatnipGarden /></group>;
    case 'sunDeck': return <group rotation={[0, p.rot, 0]}><SunDeck /></group>;
    case 'hidingPods': return <group rotation={[0, p.rot, 0]}><HidingPods /></group>;
    case 'monument': return <group rotation={[0, p.rot + Math.PI, 0]}><Monument /></group>;
    case 'catCastle': return <CatCastle p={p} />;
    case 'catHotel': return <CatHotel p={p} />;
    default: return null;
  }
}

export function Transformations() {
  const sim = useStore((s) => s.sim);
  useStore((s) => s.sim.version);
  const select = useStore((s) => s.select);
  return (
    <group>
      {sim.placed.map((p) => {
        const pos: [number, number, number] = [p.pos.x, p.pos.y, p.pos.z];
        return (
          <group key={p.id} position={pos} onClick={(e) => { e.stopPropagation(); if (p.buildingId) select({ kind: 'building', id: p.buildingId }); }}>
            <PopIn placed={p}><Model p={p} /></PopIn>
          </group>
        );
      })}
    </group>
  );
}

export { localToWorld };
