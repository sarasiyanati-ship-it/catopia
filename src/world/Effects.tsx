import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useStore } from '../simulation/store';
import type { Fx } from '../simulation/types';

/**
 * One-shot visual effects: offering orbs flying to the daemon, sparkle bursts,
 * construction poofs, hearts and Zzz's. The simulation only *requests* them;
 * timing here is in real seconds so they stay readable at any speed.
 */
export function Effects() {
  const [items, setItems] = useState<Fx[]>([]);
  const seen = useRef(0);
  useFrame(() => {
    const fx = useStore.getState().sim.fx;
    const fresh = fx.filter((f) => f.id > seen.current);
    if (fresh.length) {
      seen.current = fresh[fresh.length - 1].id;
      setItems((cur) => [...cur, ...fresh].slice(-30));
    }
  });
  const done = (id: number) => setItems((cur) => cur.filter((f) => f.id !== id));
  // reset when the simulation is reset
  const sim = useStore((s) => s.sim);
  useEffect(() => { seen.current = 0; setItems([]); }, [sim]);
  return (
    <>
      {items.map((f) => {
        if (f.kind === 'offering') return <OfferingOrb key={f.id} f={f} onDone={done} />;
        if (f.kind === 'burst' || f.kind === 'build') return <Burst key={f.id} f={f} onDone={done} big={f.kind === 'build'} />;
        return <Floater key={f.id} f={f} onDone={done} />;
      })}
    </>
  );
}

function useLife(duration: number, onEnd: () => void) {
  const start = useRef<number | null>(null);
  const ended = useRef(false);
  return (now: number) => {
    if (start.current === null) start.current = now;
    const t = (now - start.current) / duration;
    if (t >= 1 && !ended.current) { ended.current = true; onEnd(); }
    return Math.min(1, t);
  };
}

function OfferingOrb({ f, onDone }: { f: Fx; onDone: (id: number) => void }) {
  const g = useRef<THREE.Group>(null);
  const trail = useRef<THREE.Group>(null);
  const speed = useStore.getState().speed;
  const dur = Math.max(0.5, 1.6 / Math.sqrt(speed));
  const [landed, setLanded] = useState(false);
  const life = useLife(dur, () => setLanded(true));
  const from = new THREE.Vector3(f.from!.x, f.from!.y, f.from!.z);
  const mid = useMemo(() => new THREE.Vector3(), []);
  useFrame(({ clock }) => {
    if (landed) return;
    const t = life(clock.elapsedTime);
    const d = useStore.getState().sim.daemon.pos;
    const to = new THREE.Vector3(d.x, d.y, d.z);
    mid.copy(from).lerp(to, 0.5); mid.y += 4;
    const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    const p = from.clone().multiplyScalar((1 - e) ** 2).add(mid.clone().multiplyScalar(2 * (1 - e) * e)).add(to.clone().multiplyScalar(e * e));
    g.current?.position.copy(p);
    if (g.current) g.current.rotation.y = clock.elapsedTime * 4;
    trail.current?.children.forEach((c, i) => {
      const tt = Math.max(0, e - (i + 1) * 0.05);
      const q = from.clone().multiplyScalar((1 - tt) ** 2).add(mid.clone().multiplyScalar(2 * (1 - tt) * tt)).add(to.clone().multiplyScalar(tt * tt));
      c.position.copy(q);
      c.scale.setScalar(0.8 - i * 0.12);
    });
  });
  if (landed) return <Burst f={{ ...f, to: useStore.getState().sim.daemon.pos }} onDone={onDone} big={false} />;
  return (
    <>
      <group ref={g} position={from}>
        <mesh>
          <icosahedronGeometry args={[0.3, 1]} />
          <meshStandardMaterial color={f.color ?? '#ffd166'} emissive={f.color ?? '#ffd166'} emissiveIntensity={0.8} roughness={0.3} />
        </mesh>
        <mesh>
          <sphereGeometry args={[0.55, 16, 12]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.25} depthWrite={false} />
        </mesh>
        <Html center distanceFactor={14} style={{ pointerEvents: 'none' }}>
          <div className="fx-emoji">{f.emoji}</div>
        </Html>
      </group>
      <group ref={trail}>
        {[0, 1, 2, 3, 4].map((i) => (
          <mesh key={i}>
            <sphereGeometry args={[0.12, 8, 6]} />
            <meshBasicMaterial color="#fff6c9" transparent opacity={0.7} depthWrite={false} />
          </mesh>
        ))}
      </group>
    </>
  );
}

function Burst({ f, onDone, big }: { f: Fx; onDone: (id: number) => void; big: boolean }) {
  const g = useRef<THREE.Group>(null);
  const ring = useRef<THREE.Mesh>(null);
  const life = useLife(big ? 1.6 : 1.0, () => onDone(f.id));
  const parts = useMemo(() => Array.from({ length: big ? 26 : 14 }, (_, i) => {
    const a = (i / (big ? 26 : 14)) * Math.PI * 2;
    const up = 2 + ((i * 7) % 5) * 0.6;
    return { v: new THREE.Vector3(Math.cos(a) * (big ? 3.2 : 2), up, Math.sin(a) * (big ? 3.2 : 2)), c: ['#ffd166', '#ff8fab', '#b5ead7', '#cdb8ff', '#ffffff'][i % 5] };
  }), [big]);
  const pos = f.to ?? { x: 0, y: 0, z: 0 };
  useFrame(({ clock }) => {
    const t = life(clock.elapsedTime);
    g.current?.children.forEach((c, i) => {
      const p = parts[i];
      c.position.set(p.v.x * t, p.v.y * t - 4 * t * t, p.v.z * t);
      c.scale.setScalar(Math.max(0.001, 1 - t));
      c.rotation.set(t * 6, t * 4, 0);
    });
    if (ring.current) {
      ring.current.scale.setScalar(0.2 + t * (big ? 4 : 2));
      (ring.current.material as THREE.MeshBasicMaterial).opacity = 0.6 * (1 - t);
    }
  });
  return (
    <group position={[pos.x, pos.y, pos.z]}>
      <group ref={g}>
        {parts.map((p, i) => (
          <mesh key={i}>
            <octahedronGeometry args={[big ? 0.16 : 0.11, 0]} />
            <meshStandardMaterial color={p.c} emissive={p.c} emissiveIntensity={0.7} />
          </mesh>
        ))}
      </group>
      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.8, 1, 32]} />
        <meshBasicMaterial color="#fff2a8" transparent opacity={0.6} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      {big && f.emoji && (
        <Html center distanceFactor={14} position={[0, 1.5, 0]} style={{ pointerEvents: 'none' }}>
          <div className="fx-emoji fx-rise">{f.emoji}</div>
        </Html>
      )}
    </group>
  );
}

function Floater({ f, onDone }: { f: Fx; onDone: (id: number) => void }) {
  const g = useRef<THREE.Group>(null);
  const life = useLife(f.kind === 'zzz' ? 2.2 : 1.5, () => onDone(f.id));
  const pos = f.to ?? { x: 0, y: 0, z: 0 };
  const drift = useMemo(() => (f.id % 2 ? 0.6 : -0.6), [f.id]);
  useFrame(({ clock }) => {
    const t = life(clock.elapsedTime);
    if (g.current) g.current.position.set(pos.x + Math.sin(t * 6) * 0.3 + drift * t, pos.y + 1 + t * 2, pos.z);
  });
  return (
    <group ref={g} position={[pos.x, pos.y + 1, pos.z]}>
      <Html center distanceFactor={14} style={{ pointerEvents: 'none' }}>
        <div className={`fx-emoji fx-fade ${f.kind === 'zzz' ? 'fx-zzz' : ''}`}>{f.kind === 'zzz' ? 'Z' : '💖'}</div>
      </Html>
    </group>
  );
}
