import React from 'react';
import { interpolate, useCurrentFrame, Easing } from 'remotion';
import { C, W, H } from '../constants';
import { AnimIn } from '../components/AnimIn';

const pains = [
  'Manually combing Google Maps',
  'Cold-calling the wrong people',
  'Writing the same message 50× a day',
];

const PainItem: React.FC<{ text: string; delay: number }> = ({ text, delay }) => {
  const frame = useCurrentFrame();
  const ease  = Easing.bezier(0.16, 1, 0.3, 1);

  const opacity = interpolate(frame, [delay, delay + 10], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  const tx = interpolate(frame, [delay, delay + 14], [50, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease,
  });

  // Strike-through width grows after dot appears
  const strikeW = interpolate(frame, [delay + 18, delay + 32], [0, 100], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease,
  });

  return (
    <div style={{ opacity, transform: `translateX(${tx}px)`, position: 'relative', display: 'flex', alignItems: 'center', gap: 22 }}>
      {/* Red dot */}
      <div style={{ width: 10, height: 10, borderRadius: '50%', background: C.red, flexShrink: 0 }} />
      {/* Text with animated strike-through */}
      <div style={{ position: 'relative' }}>
        <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 54, fontWeight: 300, color: C.z400, lineHeight: 1 }}>
          {text}
        </div>
        <div style={{
          position: 'absolute', top: '52%', left: 0,
          width: `${strikeW}%`, height: 3,
          background: C.z600, borderRadius: 2,
        }} />
      </div>
    </div>
  );
};

export const Scene2Pain: React.FC = () => {
  const frame = useCurrentFrame();

  const outroOpacity = interpolate(frame, [60, 74], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  const outroY = interpolate(frame, [60, 74], [30, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.16, 1, 0.3, 1),
  });
  const fadeAll = interpolate(frame, [80, 90], [1, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

  return (
    <div style={{ width: W, height: H, background: C.bg, position: 'relative', overflow: 'hidden', opacity: fadeAll }}>

      <div style={{ position: 'absolute', top: H/2 - 150, left: 120, display: 'flex', flexDirection: 'column', gap: 56 }}>
        {pains.map((p, i) => (
          <PainItem key={p} text={p} delay={i * 18} />
        ))}
      </div>

      {/* Outro */}
      <div style={{
        position: 'absolute', bottom: 170, left: 120,
        opacity: outroOpacity, transform: `translateY(${outroY}px)`,
        fontFamily: 'Inter, sans-serif', fontSize: 68, fontWeight: 900, color: C.white,
      }}>
        There's a better way.
      </div>

    </div>
  );
};
