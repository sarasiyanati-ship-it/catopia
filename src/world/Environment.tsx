import { RoundedBox } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { BENCHES, ISLAND_HALF, LAMPS, ROAD_EXTENT, ROAD_LINES, ROAD_WIDTH, TREES } from '../data/city';
import { useStore } from '../simulation/store';
import { lampGlowMat, mat, PASTEL } from './materials';

/** The floating diorama island. */
export function Island() {
  const S = ISLAND_HALF * 2;
  return (
    <group>
      <RoundedBox args={[S, 1.2, S]} radius={0.6} smoothness={4} position={[0, -0.6, 0]} receiveShadow material={mat(PASTEL.grass, { rough: 0.95 })} />
      <RoundedBox args={[S - 0.6, 3.2, S - 0.6]} radius={0.9} smoothness={4} position={[0, -2.6, 0]} material={mat(PASTEL.soil, { rough: 1 })} />
      <RoundedBox args={[S - 4, 3, S - 4]} radius={1.2} smoothness={3} position={[0, -5, 0]} material={mat(PASTEL.soilDark, { rough: 1 })} />
      {/* little hanging rocks */}
      {[[-12, -7.2, 8, 3], [9, -7.5, -10, 2.4], [2, -8, 3, 3.6], [-6, -7, -13, 2]].map(([x, y, z, r], i) => (
        <mesh key={i} position={[x, y, z]} material={mat(PASTEL.soilDark, { rough: 1 })}>
          <dodecahedronGeometry args={[r, 0]} />
        </mesh>
      ))}
      {/* grass tufts / flower dots */}
      <Flowers />
    </group>
  );
}

function Flowers() {
  const ref = useRef<THREE.InstancedMesh>(null);
  const data = useMemo(() => {
    const out: { x: number; z: number; c: string }[] = [];
    const cols = ['#ffffff', '#ffd1e3', '#fff2a8', '#d9c8ff'];
    let seed = 7;
    const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 260; i++) {
      const x = (r() - 0.5) * 40, z = (r() - 0.5) * 40;
      const nearRoad = ROAD_LINES.some((l) => Math.abs((l.axis === 'x' ? x : z) - l.v) < 2.2);
      if (nearRoad || (Math.abs(x) < 6 && Math.abs(z) < 6)) continue;
      out.push({ x, z, c: cols[i % cols.length] });
    }
    return out;
  }, []);
  useLayoutEffect(() => {
    {
      const m = ref.current;
      if (!m) return;
      const o = new THREE.Object3D();
      data.forEach((d, i) => {
        o.position.set(d.x, 0.05, d.z);
        o.scale.setScalar(0.09 + (i % 3) * 0.02);
        o.updateMatrix();
        m.setMatrixAt(i, o.matrix);
        m.setColorAt(i, new THREE.Color(d.c));
      });
      m.instanceMatrix.needsUpdate = true;
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
    }
  }, [data]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, data.length]}>
      <icosahedronGeometry args={[1, 0]} />
      <meshStandardMaterial roughness={0.8} />
    </instancedMesh>
  );
}

export function Roads() {
  return (
    <group>
      {ROAD_LINES.map((l, i) => (
        <group key={i}>
          <mesh position={[l.axis === 'x' ? l.v : 0, 0.02, l.axis === 'z' ? l.v : 0]} receiveShadow material={mat(PASTEL.road, { rough: 0.9 })}>
            <boxGeometry args={l.axis === 'x' ? [ROAD_WIDTH, 0.06, ROAD_EXTENT * 2] : [ROAD_EXTENT * 2, 0.06, ROAD_WIDTH]} />
          </mesh>
          {/* dashed centre line */}
          {Array.from({ length: 13 }).map((_, j) => {
            const t = -18 + j * 3;
            if (Math.abs(t - 7) < 1.6 || Math.abs(t + 7) < 1.6) return null;
            return (
              <mesh key={j} position={[l.axis === 'x' ? l.v : t, 0.06, l.axis === 'z' ? l.v : t]} material={mat('#ffffff', { rough: 0.8 })}>
                <boxGeometry args={l.axis === 'x' ? [0.12, 0.02, 1.1] : [1.1, 0.02, 0.12]} />
              </mesh>
            );
          })}
        </group>
      ))}
      {/* plaza paving */}
      <mesh position={[0, 0.03, 0]} receiveShadow material={mat(PASTEL.plaza, { rough: 0.9 })}>
        <cylinderGeometry args={[5.6, 5.6, 0.06, 48]} />
      </mesh>
      <mesh position={[0, 0.045, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow material={mat('#f7d5bd', { rough: 0.9 })}>
        <torusGeometry args={[4.4, 0.08, 6, 48]} />
      </mesh>
    </group>
  );
}

export function Tree({ x, z, s }: { x: number; z: number; s: number }) {
  const ref = useRef<THREE.Group>(null);
  const ph = x * 0.37 + z * 0.11;
  useFrame(({ clock }) => {
    if (ref.current) ref.current.rotation.z = Math.sin(clock.elapsedTime * 0.8 + ph) * 0.025;
  });
  return (
    <group position={[x, 0, z]} scale={s}>
      <mesh position={[0, 0.6, 0]} castShadow material={mat(PASTEL.woodDark)}>
        <cylinderGeometry args={[0.16, 0.22, 1.2, 8]} />
      </mesh>
      <group ref={ref} position={[0, 1.2, 0]}>
        <mesh position={[0, 0.7, 0]} castShadow material={mat('#8fd18b', { rough: 0.9 })}>
          <icosahedronGeometry args={[0.95, 1]} />
        </mesh>
        <mesh position={[0.45, 0.35, 0.25]} castShadow material={mat('#a6dd8f', { rough: 0.9 })}>
          <icosahedronGeometry args={[0.6, 1]} />
        </mesh>
        <mesh position={[-0.4, 0.45, -0.25]} castShadow material={mat('#7cc47e', { rough: 0.9 })}>
          <icosahedronGeometry args={[0.6, 1]} />
        </mesh>
      </group>
    </group>
  );
}

export function Trees() {
  return <>{TREES.map((t, i) => <Tree key={i} {...t} />)}</>;
}

/** Human benches and street lamps — hidden once the daemon catifies them. */
export function StreetFurniture() {
  useStore((s) => s.sim.version);
  const used = useStore((s) => s.sim).usedSites;
  return (
    <group>
      {BENCHES.filter((b) => !used[b.id]).map((b) => (
        <group key={b.id} position={[b.x, 0, b.z]} rotation={[0, b.rot, 0]}>
          <mesh position={[0, 0.42, 0]} castShadow material={mat(PASTEL.wood)}>
            <boxGeometry args={[1.6, 0.1, 0.5]} />
          </mesh>
          <mesh position={[0, 0.72, -0.22]} castShadow material={mat(PASTEL.wood)}>
            <boxGeometry args={[1.6, 0.42, 0.08]} />
          </mesh>
          {[-0.65, 0.65].map((x) => (
            <mesh key={x} position={[x, 0.2, 0]} material={mat('#6f7a8f', { metal: 0.3, rough: 0.5 })}>
              <boxGeometry args={[0.08, 0.4, 0.45]} />
            </mesh>
          ))}
        </group>
      ))}
      {LAMPS.filter((l) => !used[l.id]).map((l) => (
        <group key={l.id} position={[l.x, 0, l.z]}>
          <mesh position={[0, 1.2, 0]} castShadow material={mat('#6f7a8f', { metal: 0.3, rough: 0.5 })}>
            <cylinderGeometry args={[0.06, 0.09, 2.4, 8]} />
          </mesh>
          <mesh position={[0, 2.5, 0]} material={lampGlowMat}>
            <sphereGeometry args={[0.24, 16, 12]} />
          </mesh>
          <mesh position={[0, 2.72, 0]} material={mat('#6f7a8f')}>
            <coneGeometry args={[0.26, 0.2, 12]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** Puffy clouds drifting around the floating island. */
export function Clouds() {
  const group = useRef<THREE.Group>(null);
  const clouds = useMemo(() => [
    { p: [-26, 12, -14], s: 1.4 }, { p: [24, 15, -22], s: 1.1 }, { p: [30, 10, 16], s: 1.6 },
    { p: [-30, 14, 22], s: 1.2 }, { p: [4, 18, -34], s: 1.5 }, { p: [-8, 9, 32], s: 1 },
  ], []);
  useFrame(({ clock }) => {
    if (group.current) group.current.rotation.y = clock.elapsedTime * 0.006;
  });
  return (
    <group ref={group}>
      {clouds.map((c, i) => (
        <group key={i} position={c.p as [number, number, number]} scale={c.s}>
          {[[0, 0, 0, 2], [1.8, -0.3, 0.4, 1.5], [-1.8, -0.4, -0.2, 1.4], [0.6, 0.9, 0, 1.4], [-0.8, 0.6, 0.6, 1.2]].map(([x, y, z, r], j) => (
            <mesh key={j} position={[x, y, z]} material={mat('#ffffff', { rough: 1 })}>
              <sphereGeometry args={[r, 14, 10]} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

/** Rain streaks, only on rainy days. */
export function Rain() {
  const ref = useRef<THREE.InstancedMesh>(null);
  const N = 500;
  const drops = useMemo(() => Array.from({ length: N }, (_, i) => ({ x: ((i * 37) % 44) - 22 + (i % 7) * 0.3, z: ((i * 53) % 44) - 22, y: (i * 13) % 20, v: 14 + (i % 5) })), []);
  const o = useMemo(() => new THREE.Object3D(), []);
  useFrame((_, dt) => {
    const m = ref.current;
    if (!m) return;
    const rainy = useStore.getState().sim.weather === 'rainy';
    m.visible = rainy;
    if (!rainy) return;
    drops.forEach((d, i) => {
      d.y -= d.v * Math.min(dt, 0.05);
      if (d.y < 0) d.y = 18 + (i % 5);
      o.position.set(d.x, d.y, d.z);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, N]}>
      <boxGeometry args={[0.03, 0.5, 0.03]} />
      <meshBasicMaterial color="#cfe3ff" transparent opacity={0.6} />
    </instancedMesh>
  );
}
