import { OrbitControls } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import type { OrbitControls as OrbitImpl } from 'three-stdlib';
import { useStore } from '../simulation/store';

export const DEFAULT_CAM = new THREE.Vector3(32, 30, 32);

/**
 * Orbit/zoom controls plus smooth "director" moves: when a story event
 * happens (or the user selects something) the camera glides to it, then
 * hands control back to the user.
 */
export function CameraRig() {
  const controls = useRef<OrbitImpl>(null);
  const { camera } = useThree();
  const anim = useRef<{ fromT: THREE.Vector3; toT: THREE.Vector3; fromP: THREE.Vector3; toP: THREE.Vector3; t: number } | null>(null);
  const focus = useStore((s) => s.focus);
  const showreel = useStore((s) => s.showreel);
  const lastUser = useRef(-10);

  useEffect(() => {
    if (!focus || !controls.current) return;
    const c = controls.current;
    const target = new THREE.Vector3(focus.pos.x, Math.max(0.5, focus.pos.y * 0.7), focus.pos.z);
    const dir = camera.position.clone().sub(c.target).normalize();
    if (dir.y < 0.35) dir.y = 0.35;
    dir.normalize();
    const toP = target.clone().add(dir.multiplyScalar(focus.dist));
    anim.current = { fromT: c.target.clone(), toT: target, fromP: camera.position.clone(), toP, t: 0 };
  }, [focus, camera]);

  useFrame((_, dt) => {
    const c = controls.current;
    if (!c) return;
    const a = anim.current;
    if (a) {
      a.t = Math.min(1, a.t + dt / 1.6);
      const e = 1 - Math.pow(1 - a.t, 3);
      c.target.lerpVectors(a.fromT, a.toT, e);
      camera.position.lerpVectors(a.fromP, a.toP, e);
      if (a.t >= 1) anim.current = null;
    } else {
      // gently follow the selected character
      const sel = useStore.getState().selected;
      const sim = useStore.getState().sim;
      let p: { x: number; y: number; z: number } | null = null;
      if (sel?.kind === 'citizen') p = sim.citizens[sel.id].pos;
      if (sel?.kind === 'cat') p = sim.cats[sel.id].pos;
      if (p && performance.now() / 1000 - lastUser.current > 2) {
        const want = new THREE.Vector3(p.x, Math.max(0.5, p.y), p.z);
        const delta = want.sub(c.target).multiplyScalar(Math.min(1, dt * 2));
        c.target.add(delta);
        camera.position.add(delta);
      }
    }
    c.autoRotate = showreel;
    c.autoRotateSpeed = 0.35;
    c.update();
  });

  return (
    <OrbitControls
      ref={controls as never}
      makeDefault
      enableDamping
      dampingFactor={0.08}
      minDistance={6}
      maxDistance={90}
      maxPolarAngle={Math.PI / 2.15}
      target={[0, 1, 0]}
      onStart={() => { anim.current = null; lastUser.current = performance.now() / 1000; }}
    />
  );
}
