import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Suspense } from 'react';
import { Cats } from '../characters/Cat';
import { Citizens } from '../characters/Citizen';
import { Daemon, Shrine } from '../daemon/Daemon';
import { useStore } from '../simulation/store';
import { Buildings } from './Buildings';
import { CameraRig, DEFAULT_CAM } from './CameraRig';
import { Effects } from './Effects';
import { Clouds, Island, Rain, Roads, StreetFurniture, Trees } from './Environment';
import { Lighting } from './Lighting';
import { Transformations } from './Transformations';

/** Drives the simulation clock from the render loop. */
function SimDriver() {
  const advance = useStore((s) => s.advance);
  const three = useThree();
  // Debug handle (renderer stats) — handy for performance checks in the console.
  (window as unknown as { __catopia: unknown }).__catopia = three;
  useFrame((_, dt) => advance(dt));
  return null;
}

export function Scene() {
  const select = useStore((s) => s.select);
  return (
    <Canvas
      shadows="percentage"
      dpr={[1, 1.75]}
      camera={{ position: DEFAULT_CAM.toArray(), fov: 30, near: 0.5, far: 400 }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      onPointerMissed={() => select(null)}
    >
      <SimDriver />
      <Lighting />
      <Suspense fallback={null}>
        <Island />
        <Roads />
        <Trees />
        <StreetFurniture />
        <Shrine />
        <Buildings />
        <Transformations />
        <Citizens />
        <Cats />
        <Daemon />
        <Effects />
        <Clouds />
        <Rain />
      </Suspense>
      <CameraRig />
    </Canvas>
  );
}
