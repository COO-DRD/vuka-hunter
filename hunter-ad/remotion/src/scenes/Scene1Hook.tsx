import React from 'react';
import { interpolate, useCurrentFrame, Easing } from 'remotion';
import { C, W, H } from '../constants';
import { AnimIn } from '../components/AnimIn';

export const Scene1Hook: React.FC = () => {
  const frame = useCurrentFrame();
  const ease  = Easing.bezier(0.16, 1, 0.3, 1);

  const hairW = interpolate(frame, [8, 24], [0, 260], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease,
  });

  const fadeAll = interpolate(frame, [76, 90], [1, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

  return (
    <div style={{ width: W, height: H, background: C.bg, position: 'relative', opacity: fadeAll, overflow: 'hidden' }}>

      {/* Red hairline */}
      <div style={{
        position: 'absolute', top: 22, left: 120,
        width: hairW, height: 3, background: C.red, borderRadius: 2,
      }} />

      {/* Line 1 */}
      <AnimIn from={0} duration={14} slideY={36} style={{ position: 'absolute', top: H/2 - 130, left: 120 }}>
        <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 96, fontWeight: 900, color: C.z300, lineHeight: 1 }}>
          Your leads are
        </div>
      </AnimIn>

      {/* Line 2 */}
      <AnimIn from={8} duration={14} slideY={36} style={{ position: 'absolute', top: H/2 - 18, left: 120 }}>
        <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 96, fontWeight: 900, color: C.white, lineHeight: 1 }}>
          chosen by guesswork.
        </div>
      </AnimIn>

      {/* Subtitle */}
      <AnimIn from={22} duration={10} style={{ position: 'absolute', top: H/2 + 108, left: 122 }}>
        <div style={{
          fontFamily: 'Inter, sans-serif', fontSize: 28, fontWeight: 400,
          color: C.red, letterSpacing: '0.34em', textTransform: 'uppercase',
        }}>
          Every cold call is a gamble.
        </div>
      </AnimIn>

    </div>
  );
};
