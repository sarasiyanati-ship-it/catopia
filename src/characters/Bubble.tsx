import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';

/**
 * Floating emoji bubble above a character. The text is pulled from the
 * simulation every frame and written straight into the DOM (no React
 * re-renders), which keeps 16 bubbles cheap.
 */
export function Bubble({ y, get, variant = 'thought' }: { y: number; get: () => string; variant?: 'thought' | 'shout' }) {
  const el = useRef<HTMLDivElement>(null);
  const last = useRef('');
  useFrame(() => {
    const v = get();
    if (v !== last.current && el.current) {
      last.current = v;
      el.current.textContent = v;
      el.current.style.display = v ? 'flex' : 'none';
      el.current.classList.remove('pop');
      void el.current.offsetWidth;
      el.current.classList.add('pop');
    }
  });
  return (
    <Html position={[0, y, 0]} center distanceFactor={16} zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
      <div ref={el} className={`bubble bubble-${variant}`} style={{ display: 'none' }} />
    </Html>
  );
}
