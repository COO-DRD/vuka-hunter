import React from 'react';
import { interpolate, useCurrentFrame, Easing } from 'remotion';
import { C, W, H } from '../constants';

export const Scene3Brand: React.FC = () => {
  const frame = useCurrentFrame();
  const ease  = Easing.bezier(0.16, 1, 0.3, 1);
  const overshoot = Easing.bezier(0.34, 1.56, 0.64, 1);

  // Red glow wash
  const glowOp = interpolate(frame, [0, 10, 70, 88], [0, 0.14, 0.14, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

  // HUNTER wordmark
  const brandScale = interpolate(frame, [0, 18], [0.84, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: overshoot,
  });
  const brandOp = interpolate(frame, [0, 10], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

  // Red underbar width
  const barW = interpolate(frame, [10, 26], [0, 620], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease,
  });

  // Tagline
  const tagOp = interpolate(frame, [18, 30], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  const tagY = interpolate(frame, [18, 30], [18, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease,
  });

  const fadeAll = interpolate(frame, [78, 90], [1, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

  return (
    <div style={{ width: W, height: H, background: C.bg, position: 'relative', overflow: 'hidden', opacity: fadeAll }}>

      {/* Glow wash */}
      <div style={{
        position: 'absolute', inset: 0,
        background: `radial-gradient(ellipse 900px 600px at center, ${C.red}22 0%, transparent 70%)`,
        opacity: glowOp * 7,
      }} />

      {/* HUNTER */}
      <div style={{
        position: 'absolute', top: H/2 - 115, left: 0, right: 0,
        display: 'flex', justifyContent: 'center',
        transform: `scale(${brandScale})`, opacity: brandOp,
        fontFamily: 'Inter, sans-serif', fontSize: 184, fontWeight: 900,
        color: C.white, letterSpacing: '0.08em', textTransform: 'uppercase',
      }}>
        HUNTER
      </div>

      {/* Underbar */}
      <div style={{
        position: 'absolute', top: H/2 + 82,
        left: (W - barW) / 2,
        width: barW, height: 4, background: C.red, borderRadius: 2,
      }} />

      {/* Tagline */}
      <div style={{
        position: 'absolute', top: H/2 + 102, left: 0, right: 0,
        display: 'flex', justifyContent: 'center',
        opacity: tagOp, transform: `translateY(${tagY}px)`,
        fontFamily: 'Inter, sans-serif', fontSize: 28, fontWeight: 400,
        color: C.red, letterSpacing: '0.38em', textTransform: 'uppercase',
      }}>
        AI Lead Intelligence · Kenya
      </div>

    </div>
  );
};
