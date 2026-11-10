import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import { LAZY_ID } from '../data/characters';
import { useStore } from '../simulation/store';
import { mat } from '../world/materials';
import { Bubble } from './Bubble';

/** A tiny toy-like citizen. All animation is driven from the simulation state. */
export function Citizen({ id }: { id: number }) {
  const root = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const legL = useRef<THREE.Group>(null), legR = useRef<THREE.Group>(null);
  const armL = useRef<THREE.Group>(null), armR = useRef<THREE.Group>(null);
  const mouth = useRef<THREE.Mesh>(null);
  const costume = useRef<THREE.Group>(null);
  const sweat = useRef<THREE.Group>(null);
  const props = useRef<Record<string, THREE.Object3D | null>>({});
  const ring = useRef<THREE.Mesh>(null);
  const select = useStore((s) => s.select);
  const sim = useStore((s) => s.sim);
  const c = sim.citizens[id];
  const lazy = id === LAZY_ID;

  useFrame(({ clock }) => {
    const cz = useStore.getState().sim.citizens[id];
    const g = root.current, b = body.current;
    if (!g || !b) return;
    const t = clock.elapsedTime;
    g.visible = !cz.indoors;
    g.position.set(cz.pos.x, cz.pos.y, cz.pos.z);
    g.rotation.y = THREE.MathUtils.lerp(g.rotation.y, cz.heading, 0.25);
    // reset pose
    b.rotation.set(0, 0, 0); b.position.set(0, 0, 0);
    let swing = 0, armUp = 0, armFwd = 0;
    const task = cz.isServant ? cz.servantTask : null;
    const walking = cz.moving;
    if (walking) { swing = Math.sin(t * 14) * 0.6; b.position.y = Math.abs(Math.sin(t * 14)) * 0.05; }
    const lying = task === 'bed' || ((cz.activity === 'lazing' && !walking) || (cz.activity === 'sleeping' && !cz.indoors));
    if (lying) { b.rotation.x = -Math.PI / 2; b.position.y = 0.2; b.position.z = 0.4; }
    if (cz.activity === 'working') { armFwd = 0.9 + Math.sin(t * 9) * 0.4; }
    if (cz.activity === 'offering') { armFwd = 1.4; armUp = Math.sin(t * 4) * 0.1; }
    if (cz.activity === 'waking') { armUp = 2.6; }
    if (task === 'carry') { armUp = 2.8; b.rotation.z = Math.sin(t * 6) * 0.12; }
    if (task === 'feather') { armUp = 0; }
    if (task === 'tower') { armUp = 2.2 + Math.sin(t * 8) * 0.3; }
    if (task === 'serve') { armFwd = 1.3; }
    if (task === 'stroller') { armFwd = 1.2; }
    if (task === 'massage') { armFwd = 1.1 + Math.sin(t * 12) * 0.3; b.position.y = -0.12; }
    legL.current!.rotation.x = swing; legR.current!.rotation.x = -swing;
    armL.current!.rotation.x = -swing * 0.8 - armFwd - armUp;
    armR.current!.rotation.x = swing * 0.8 - armFwd - armUp;
    if (task === 'feather') armR.current!.rotation.x = -2.2 + Math.sin(t * 10) * 0.6;
    // exaggerated cartoon expression
    if (mouth.current) {
      const shocked = cz.isServant || cz.hunger > 70;
      mouth.current.scale.set(shocked ? 0.9 : 1.2, shocked ? 1.4 + Math.sin(t * 6) * 0.3 : 0.5, 1);
    }
    if (costume.current) costume.current.visible = cz.isServant;
    if (sweat.current) {
      sweat.current.visible = cz.isServant && cz.activity === 'servant';
      sweat.current.children.forEach((d, i) => { d.position.y = 1.05 - ((t * 1.2 + i * 0.5) % 1) * 0.5; });
    }
    for (const [k, o] of Object.entries(props.current)) if (o) o.visible = k === 'box' ? (!cz.ownsHouse && !cz.isServant && lying && cz.activity === 'sleeping') : task === k;
    const tower = props.current.tower;
    if (tower && tower.visible) tower.rotation.z = Math.sin(t * 3) * 0.12;
    const feather = props.current.feather;
    if (feather && feather.visible) feather.rotation.z = Math.sin(t * 10) * 0.6;
    const sel = useStore.getState().selected;
    if (ring.current) ring.current.visible = sel?.kind === 'citizen' && sel.id === id;
  });

  const skin = mat(c.colors.skin), shirt = mat(c.colors.shirt), pants = mat(c.colors.pants), hair = mat(c.colors.hair);
  return (
    <group ref={root} onClick={(e) => { e.stopPropagation(); select({ kind: 'citizen', id }); }}>
      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]} material={mat('#ffd166', { emissive: '#ffd166', ei: 0.8 })}>
        <ringGeometry args={[0.42, 0.52, 28]} />
      </mesh>
      <group ref={body}>
        <group ref={legL} position={[-0.08, 0.3, 0]}>
          <mesh position={[0, -0.15, 0]} castShadow material={pants}><capsuleGeometry args={[0.065, 0.18, 4, 8]} /></mesh>
        </group>
        <group ref={legR} position={[0.08, 0.3, 0]}>
          <mesh position={[0, -0.15, 0]} castShadow material={pants}><capsuleGeometry args={[0.065, 0.18, 4, 8]} /></mesh>
        </group>
        <mesh position={[0, 0.5, 0]} castShadow material={shirt}><capsuleGeometry args={[0.17, 0.2, 6, 12]} /></mesh>
        <group ref={armL} position={[-0.21, 0.6, 0]}>
          <mesh position={[0, -0.12, 0]} castShadow material={shirt}><capsuleGeometry args={[0.05, 0.16, 4, 8]} /></mesh>
          <mesh position={[0, -0.24, 0]} material={skin}><sphereGeometry args={[0.055, 8, 8]} /></mesh>
        </group>
        <group ref={armR} position={[0.21, 0.6, 0]}>
          <mesh position={[0, -0.12, 0]} castShadow material={shirt}><capsuleGeometry args={[0.05, 0.16, 4, 8]} /></mesh>
          <mesh position={[0, -0.24, 0]} material={skin}><sphereGeometry args={[0.055, 8, 8]} /></mesh>
          <group ref={(o) => { props.current.feather = o; }} position={[0, -0.26, 0.05]}>
            <mesh position={[0, -0.0, 0.3]} rotation={[Math.PI / 2, 0, 0]} material={mat('#9b6a42')}><cylinderGeometry args={[0.012, 0.012, 0.6, 4]} /></mesh>
            <mesh position={[0, 0, 0.66]} scale={[0.4, 0.15, 1]} material={mat('#ff8fab')}><sphereGeometry args={[0.14, 8, 6]} /></mesh>
          </group>
          <group ref={(o) => { props.current.serve = o; }} position={[0, -0.27, 0.12]}>
            <mesh material={mat('#d9d9e8', { metal: 0.6, rough: 0.3 })}><cylinderGeometry args={[0.18, 0.18, 0.02, 16]} /></mesh>
            <mesh position={[0, 0.05, 0]} scale={[1, 0.4, 0.45]} material={mat('#ffb84d')}><sphereGeometry args={[0.12, 10, 8]} /></mesh>
          </group>
        </group>
        {/* head */}
        <mesh position={[0, 0.86, 0]} castShadow material={skin}><sphereGeometry args={[0.2, 18, 14]} /></mesh>
        <mesh position={[0, 0.9, -0.02]} castShadow material={hair}><sphereGeometry args={[0.212, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2.1]} /></mesh>
        {[-0.07, 0.07].map((x) => <mesh key={x} position={[x, 0.86, 0.18]} material={mat('#2b2140')}><sphereGeometry args={[0.028, 8, 8]} /></mesh>)}
        {[-0.12, 0.12].map((x) => <mesh key={`c${x}`} position={[x, 0.8, 0.15]} material={mat('#ffb3c7')}><sphereGeometry args={[0.035, 8, 8]} /></mesh>)}
        <mesh ref={mouth} position={[0, 0.78, 0.19]} material={mat('#9b3a4a')}><sphereGeometry args={[0.025, 8, 8]} /></mesh>
        {lazy && (
          <group position={[0, 1.02, -0.03]} rotation={[-0.3, 0, 0.35]}>
            <mesh castShadow material={mat('#7a8aa6')}><coneGeometry args={[0.17, 0.36, 12]} /></mesh>
            <mesh position={[0, 0.2, 0]} material={mat('#ffffff')}><sphereGeometry args={[0.05, 8, 8]} /></mesh>
          </group>
        )}
        {/* the cat costume (mandatory for servants) */}
        <group ref={costume} visible={false}>
          {[-0.11, 0.11].map((x) => (
            <mesh key={x} position={[x, 1.08, 0]} rotation={[0, 0, x > 0 ? -0.3 : 0.3]} material={mat('#ffa552')}><coneGeometry args={[0.07, 0.16, 4]} /></mesh>
          ))}
          <mesh position={[0, 0.42, -0.24]} rotation={[-0.9, 0, 0]} material={mat('#ffa552')}><capsuleGeometry args={[0.035, 0.38, 4, 8]} /></mesh>
          <mesh position={[0, 0.66, 0.16]} material={mat('#ff6b8a')}><torusGeometry args={[0.06, 0.02, 6, 12]} /></mesh>
        </group>
        <group ref={sweat} visible={false}>
          {[0, 1].map((i) => <mesh key={i} position={[0.2 - i * 0.4, 1.0, 0.1]} material={mat('#8fd3ff', { rough: 0.1 })}><sphereGeometry args={[0.035, 8, 8]} /></mesh>)}
        </group>
      </group>
      {/* servant props (world-aligned to the citizen) */}
      <group ref={(o) => { props.current.stroller = o; }} position={[0, 0, 0.85]}>
        <mesh position={[0, 0.38, 0]} castShadow material={mat('#cdb8ff')}><boxGeometry args={[0.5, 0.28, 0.6]} /></mesh>
        <mesh position={[0, 0.6, -0.15]} rotation={[0.4, 0, 0]} castShadow material={mat('#ff8fab')}><sphereGeometry args={[0.32, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} /></mesh>
        {[[-0.25, -0.22], [0.25, -0.22], [-0.25, 0.22], [0.25, 0.22]].map(([x, z], i) => (
          <mesh key={i} position={[x, 0.1, z]} rotation={[0, 0, Math.PI / 2]} material={mat('#ffd166')}><torusGeometry args={[0.08, 0.025, 6, 12]} /></mesh>
        ))}
        <mesh position={[0, 0.55, -0.42]} rotation={[Math.PI / 2, 0, 0]} material={mat('#ffffff')}><cylinderGeometry args={[0.015, 0.015, 0.5, 4]} /></mesh>
      </group>
      <group ref={(o) => { props.current.tower = o; }} position={[0, 0, 0.9]}>
        {[0, 1, 2, 3].map((i) => (
          <group key={i} position={[(i % 2) * 0.08, 0.35 + i * 0.4, 0]}>
            <mesh material={mat('#e8cf9c', { rough: 1 })}><cylinderGeometry args={[0.07, 0.07, 0.4, 8]} /></mesh>
            <mesh position={[0, 0.2, 0]} material={mat(['#ff8fab', '#8ec5ff', '#b5ead7', '#ffd166'][i])}><cylinderGeometry args={[0.28 - i * 0.03, 0.28 - i * 0.03, 0.06, 12]} /></mesh>
          </group>
        ))}
      </group>
      <group ref={(o) => { props.current.box = o; }} position={[0, 0.25, 0.2]}>
        <mesh castShadow material={mat('#d8a86a', { rough: 1 })}><boxGeometry args={[0.6, 0.5, 0.8]} /></mesh>
      </group>
      <Bubble y={1.45} get={() => { const z = useStore.getState().sim.citizens[id]; return z.indoors ? '' : z.thought; }} />
    </group>
  );
}

export function Citizens() {
  const sim = useStore((s) => s.sim);
  return <>{sim.citizens.map((c) => <Citizen key={`${c.id}-${sim.seed}`} id={c.id} />)}</>;
}
