import React from 'react';
import { useCurrentFrame, interpolate, Easing } from 'remotion';
import { C, VW, VH } from '../../constants_v';

export const VS1Hook: React.FC = () => {
  const f = useCurrentFrame();

  const lineIn = (start: number, text: string, size: number, color = C.white, delay = 0) => {
    const o = interpolate(f, [start + delay, start + delay + 18], [0, 1], {
      extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
      easing: Easing.out(Easing.cubic),
    });
    const y = interpolate(f, [start + delay, start + delay + 18], [28, 0], {
      extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
      easing: Easing.out(Easing.cubic),
    });
    return (
      <div style={{
        opacity: o, transform: `translateY(${y}px)`,
        fontSize: size, fontWeight: 700, color, letterSpacing: '-0.02em',
        lineHeight: 1.08, textAlign: 'center', width: '100%',
        fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", Helvetica, sans-serif',
      }}>
        {text}
      </div>
    );
  };

  const bgO = interpolate(f, [0, 20], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const fadeOut = interpolate(f, [95, 118], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <div style={{
      width: VW, height: VH, background: C.bg, display: 'flex',
      flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      opacity: bgO * fadeOut, gap: 12, padding: '0 64px',
    }}>
      {lineIn(8, 'Finding leads', 96, C.z200)}
      {lineIn(14, 'takes forever.', 96, C.red)}
    </div>
  );
};
