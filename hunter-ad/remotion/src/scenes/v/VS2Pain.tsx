import React from 'react';
import { useCurrentFrame, interpolate, Easing } from 'remotion';
import { C, VW, VH } from '../../constants_v';

const WORDS = ['Manual.', 'Slow.', 'Unreliable.'];

export const VS2Pain: React.FC = () => {
  const f = useCurrentFrame();

  const fadeOut = interpolate(f, [98, 118], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <div style={{
      width: VW, height: VH, background: C.bg, display: 'flex',
      flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      opacity: fadeOut, gap: 0, padding: '0 64px',
    }}>
      {WORDS.map((word, i) => {
        const start = i * 28;
        const o = interpolate(f, [start, start + 16], [0, 1], {
          extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
          easing: Easing.out(Easing.cubic),
        });
        const x = interpolate(f, [start, start + 16], [-40, 0], {
          extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
          easing: Easing.out(Easing.cubic),
        });
        return (
          <div key={word} style={{
            opacity: o, transform: `translateX(${x}px)`,
            fontSize: 112, fontWeight: 800, color: C.z300,
            letterSpacing: '-0.03em', lineHeight: 1.0,
            fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", Helvetica, sans-serif',
            width: '100%', textAlign: 'left',
          }}>
            {word}
          </div>
        );
      })}
      {/* Subtext */}
      {(() => {
        const o = interpolate(f, [85, 100], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
        return (
          <div style={{
            opacity: o, marginTop: 48,
            fontSize: 34, fontWeight: 400, color: C.z500,
            letterSpacing: '-0.01em', lineHeight: 1.4, textAlign: 'left', width: '100%',
            fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", Helvetica, sans-serif',
          }}>
            Your team deserves better tools.
          </div>
        );
      })()}
    </div>
  );
};
