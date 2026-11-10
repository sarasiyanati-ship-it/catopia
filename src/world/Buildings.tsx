import { RoundedBox } from '@react-three/drei';
import type { ThreeEvent } from '@react-three/fiber';
import { useMemo, type ReactElement } from 'react';
import * as THREE from 'three';
import { BUILDINGS } from '../data/city';
import { useStore } from '../simulation/store';
import type { BuildingDef } from '../simulation/types';
import { mat, PASTEL, windowMat } from './materials';

/** Triangular prism roof; ridge runs along local x. */
export function gableGeometry(w: number, d: number, h: number) {
  const shape = new THREE.Shape();
  shape.moveTo(-d / 2, 0);
  shape.lineTo(d / 2, 0);
  shape.lineTo(0, h);
  shape.closePath();
  const g = new THREE.ExtrudeGeometry(shape, { depth: w, bevelEnabled: false });
  g.translate(0, 0, -w / 2);
  g.rotateY(Math.PI / 2);
  return g;
}

function Windows({ w, d, h, floors = 1, cols = 2 }: { w: number; d: number; h: number; floors?: number; cols?: number }) {
  const out: ReactElement[] = [];
  const fh = h / floors;
  for (let f = 0; f < floors; f++) {
    for (let c = 0; c < cols; c++) {
      const x = (c - (cols - 1) / 2) * (w / cols);
      const y = fh * f + fh * 0.58;
      if (f === 0 && Math.abs(x) < 0.5) continue; // leave room for the door
      out.push(
        <group key={`f${f}c${c}`} position={[x, y, d / 2 + 0.01]}>
          <mesh material={mat('#ffffff')} position={[0, 0, -0.005]}>
            <boxGeometry args={[0.62, 0.62, 0.04]} />
          </mesh>
          <mesh material={windowMat} position={[0, 0, 0.02]}>
            <boxGeometry args={[0.48, 0.48, 0.03]} />
          </mesh>
        </group>,
      );
    }
    // side windows
    out.push(
      <mesh key={`s${f}`} material={windowMat} position={[w / 2 + 0.01, fh * f + fh * 0.58, 0]} rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[0.46, 0.46, 0.03]} />
      </mesh>,
    );
  }
  return <>{out}</>;
}

function Door({ d, color = '#a8744f' }: { d: number; color?: string }) {
  return (
    <group position={[0, 0, d / 2 + 0.02]}>
      <mesh position={[0, 0.5, 0]} material={mat(color)}>
        <boxGeometry args={[0.58, 1.0, 0.06]} />
      </mesh>
      <mesh position={[0, 1.0, 0]} rotation={[Math.PI / 2, 0, 0]} material={mat(color)}>
        <cylinderGeometry args={[0.29, 0.29, 0.06, 16, 1, false, 0, Math.PI]} />
      </mesh>
      <mesh position={[0.17, 0.5, 0.05]} material={mat(PASTEL.gold, { metal: 0.5, rough: 0.3 })}>
        <sphereGeometry args={[0.04, 8, 8]} />
      </mesh>
    </group>
  );
}

function Awning({ w, d, y, a, b }: { w: number; d: number; y: number; a: string; b: string }) {
  const n = 6;
  return (
    <group position={[0, y, d / 2 + 0.35]} rotation={[0.45, 0, 0]}>
      {Array.from({ length: n }).map((_, i) => (
        <mesh key={i} position={[(i - (n - 1) / 2) * (w / n), 0, 0]} castShadow material={mat(i % 2 ? a : b)}>
          <boxGeometry args={[w / n, 0.06, 0.8]} />
        </mesh>
      ))}
    </group>
  );
}

export function Building({ b, roofHidden }: { b: BuildingDef; roofHidden: boolean }) {
  const select = useStore((s) => s.select);
  const onClick = (e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); select({ kind: 'building', id: b.id }); };
  const gable = useMemo(() => gableGeometry(b.w + 0.3, b.d + 0.3, b.kind === 'house' ? 1.25 : 1), [b]);
  const isOffice = b.kind === 'office';
  return (
    <group position={[b.pos.x, 0, b.pos.z]} rotation={[0, b.rot, 0]} onClick={onClick}>
      {/* plinth */}
      <mesh position={[0, 0.06, 0]} receiveShadow material={mat(PASTEL.curb)}>
        <boxGeometry args={[b.w + 0.5, 0.12, b.d + 0.5]} />
      </mesh>
      <RoundedBox args={[b.w, b.h, b.d]} radius={0.14} smoothness={3} position={[0, b.h / 2, 0]} castShadow receiveShadow material={mat(b.color)} />
      <Windows w={b.w} d={b.d} h={b.h} floors={isOffice ? 3 : b.h > 2.9 ? 2 : 1} cols={isOffice ? 3 : 2} />
      <Door d={b.d} />

      {!roofHidden && (b.kind === 'house' ? (
        <group>
          <mesh geometry={gable} position={[0, b.h, 0]} castShadow material={mat(b.roofColor)} />
          <mesh position={[b.w * 0.25, b.h + 0.85, -0.4]} castShadow material={mat('#c9a27e')}>
            <boxGeometry args={[0.32, 0.8, 0.32]} />
          </mesh>
        </group>
      ) : (
        <group>
          <RoundedBox args={[b.w + 0.25, 0.22, b.d + 0.25]} radius={0.08} position={[0, b.h + 0.08, 0]} castShadow material={mat(b.roofColor)} />
          {b.kind === 'office' && (
            <>
              <mesh position={[0.8, b.h + 0.8, -0.6]} material={mat('#7b86a8', { metal: 0.4 })}><cylinderGeometry args={[0.04, 0.04, 1.4, 6]} /></mesh>
              <mesh position={[0.8, b.h + 1.55, -0.6]} material={mat('#ff6b8a', { emissive: '#ff6b8a', ei: 0.6 })}><sphereGeometry args={[0.1, 10, 8]} /></mesh>
            </>
          )}
          {b.kind === 'bakery' && (
            <group position={[0, b.h + 0.6, 0.3]} rotation={[0, 0, Math.PI / 2]}>
              <mesh castShadow material={mat('#e9b36a')}><capsuleGeometry args={[0.35, 1.2, 6, 12]} /></mesh>
              {[-0.35, 0, 0.35].map((y) => <mesh key={y} position={[0.3, y, 0]} rotation={[0, 0, 0.5]} material={mat('#fff1d6')}><boxGeometry args={[0.08, 0.16, 0.45]} /></mesh>)}
            </group>
          )}
          {b.kind === 'workshop' && (
            <group position={[0, b.h + 0.2, 0]}>
              {[-0.8, 0.3].map((x) => (
                <mesh key={x} position={[x, 0.35, 0]} rotation={[0, 0, 0]} material={mat('#8cc97a')} castShadow>
                  <boxGeometry args={[0.9, 0.7, b.d]} />
                </mesh>
              ))}
              <mesh position={[1.1, 0.7, 0.6]} material={mat('#aa7a52')} castShadow><cylinderGeometry args={[0.18, 0.18, 1.4, 8]} /></mesh>
            </group>
          )}
          {b.kind === 'fishmarket' && (
            <group position={[0, b.h + 0.7, 0.2]}>
              <mesh scale={[1.3, 0.6, 0.35]} castShadow material={mat('#6ec6e6')}><sphereGeometry args={[0.6, 16, 12]} /></mesh>
              <mesh position={[-0.95, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow material={mat('#6ec6e6')}><coneGeometry args={[0.35, 0.5, 3]} /></mesh>
              <mesh position={[0.45, 0.1, 0.2]} material={mat('#2b2140')}><sphereGeometry args={[0.07, 8, 8]} /></mesh>
            </group>
          )}
          {b.kind === 'grocery' && (
            <group position={[0, b.h + 0.45, 0]}>
              {[[-0.6, '#ff6b6b'], [0, '#ffd166'], [0.6, '#7ccf7a']].map(([x, c]) => (
                <mesh key={x as number} position={[x as number, 0, 0]} castShadow material={mat(c as string)}><sphereGeometry args={[0.32, 14, 10]} /></mesh>
              ))}
            </group>
          )}
          {b.kind === 'homestore' && (
            <group position={[0, b.h + 0.3, 0]} scale={0.9}>
              <mesh position={[0, 0.25, 0]} castShadow material={mat('#ff9ec7')}><boxGeometry args={[1, 0.25, 0.9]} /></mesh>
              <mesh position={[0, 0.75, -0.4]} castShadow material={mat('#ff9ec7')}><boxGeometry args={[1, 0.8, 0.2]} /></mesh>
              {[-0.4, 0.4].map((x) => <mesh key={x} position={[x, 0.45, 0.05]} material={mat('#ff9ec7')}><boxGeometry args={[0.2, 0.35, 0.8]} /></mesh>)}
            </group>
          )}
        </group>
      ))}

      {b.kind === 'bakery' && <Awning w={b.w} d={b.d} y={1.45} a="#ff8fab" b="#ffffff" />}
      {b.kind === 'fishmarket' && <Awning w={b.w} d={b.d} y={1.45} a="#5fc6cf" b="#ffffff" />}
      {b.kind === 'grocery' && <Awning w={b.w} d={b.d} y={1.45} a="#ffb84d" b="#fff6d6" />}
      {b.kind === 'homestore' && <Awning w={b.w} d={b.d} y={1.45} a="#a98bf0" b="#ffffff" />}
      {b.kind === 'grocery' && (
        <group position={[1.15, 0, b.d / 2 + 0.55]}>
          <mesh position={[0, 0.2, 0]} material={mat(PASTEL.wood)}><boxGeometry args={[0.7, 0.4, 0.5]} /></mesh>
          {[[-0.18, '#ff6b6b'], [0.05, '#ffd166'], [0.2, '#7ccf7a']].map(([x, c]) => <mesh key={x as number} position={[x as number, 0.46, 0]} material={mat(c as string)}><sphereGeometry args={[0.11, 8, 8]} /></mesh>)}
        </group>
      )}
      {b.kind === 'house' && (
        <group position={[-0.95, 0, b.d / 2 + 0.35]}>
          <mesh position={[0, 0.25, 0]} material={mat('#e98c6b')}><cylinderGeometry args={[0.18, 0.14, 0.3, 10]} /></mesh>
          <mesh position={[0, 0.5, 0]} material={mat('#7cc47e')}><icosahedronGeometry args={[0.22, 0]} /></mesh>
        </group>
      )}
    </group>
  );
}

export function Buildings() {
  const sim = useStore((s) => s.sim);
  useStore((s) => s.sim.version);
  return (
    <group>
      {BUILDINGS.map((b) => {
        if (sim.houseState[b.id] && sim.houseState[b.id] !== 'human') return null;
        const roofUsed = !!sim.usedSites[`roof-${b.id}`];
        return <Building key={b.id} b={b} roofHidden={roofUsed} />;
      })}
    </group>
  );
}
