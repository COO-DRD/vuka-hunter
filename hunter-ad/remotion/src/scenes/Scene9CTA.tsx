import React from 'react';
import { interpolate, useCurrentFrame, Easing } from 'remotion';
import { C, W, H } from '../constants';
import { AnimIn } from '../components/AnimIn';
import { PopIn } from '../components/PopIn';

const pills = ['DISCOVER', 'ENRICH', 'SCORE', 'OUTREACH'];

export const Scene9CTA: React.FC = () => {
  const frame = useCurrentFrame();
  const ease  = Easing.bezier(0.16, 1, 0.3, 1);
  const overshoot = Easing.bezier(0.34, 1.56, 0.64, 1);

  // Red wash
  const glowOp = interpolate(frame, [0, 12], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

  const line1Scale = interpolate(frame, [0, 18], [0.9, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: overshoot,
  });
  const line1Op = interpolate(frame, [0, 12], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

  const line2Scale = interpolate(frame, [8, 24], [0.9, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: overshoot,
  });
  const line2Op = interpolate(frame, [8, 18], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

  const divW = interpolate(frame, [18, 32], [0, 560], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease,
  });

  const urlOp = interpolate(frame, [24, 36], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  const urlY  = interpolate(frame, [24, 36], [14, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease,
  });

  return (
    <div style={{ width: W, height: H, background: C.bg, position: 'relative', overflow: 'hidden' }}>

      {/* Radial red glow */}
      <div style={{
        position: 'absolute', inset: 0, opacity: glowOp * 0.3,
        background: `radial-gradient(ellipse 1200px 700px at center top, ${C.red}55 0%, transparent 65%)`,
      }} />

      {/* Headline line 1 */}
      <div style={{
        position: 'absolute', top: H/2 - 145, left: 0, right: 0,
        display: 'flex', justifyContent: 'center',
        transform: `scale(${line1Scale})`, opacity: line1Op,
        fontFamily: 'Inter, sans-serif', fontSize: 108, fontWeight: 900,
        color: C.white, letterSpacing: '-0.01em',
      }}>
        Start closing better deals.
      </div>

      {/* Headline line 2 */}
      <div style={{
        position: 'absolute', top: H/2 - 10, left: 0, right: 0,
        display: 'flex', justifyContent: 'center',
        transform: `scale(${line2Scale})`, opacity: line2Op,
        fontFamily: 'Inter, sans-serif', fontSize: 108, fontWeight: 900,
        color: C.red, letterSpacing: '-0.01em',
      }}>
        Today. Free.
      </div>

      {/* Divider */}
      <div style={{
        position: 'absolute', top: H/2 + 108,
        left: (W - divW) / 2,
        width: divW, height: 2, background: C.z700, borderRadius: 1,
      }} />

      {/* URL */}
      <div style={{
        position: 'absolute', top: H/2 + 132, left: 0, right: 0,
        display: 'flex', justifyContent: 'center',
        opacity: urlOp, transform: `translateY(${urlY}px)`,
        fontFamily: 'Inter, sans-serif', fontSize: 52, fontWeight: 700,
        color: C.white, letterSpacing: '0.01em',
      }}>
        4unter.dullugroup.co.ke
      </div>

      {/* Pipeline pills */}
      <div style={{
        position: 'absolute', bottom: 90, left: 0, right: 0,
        display: 'flex', justifyContent: 'center', gap: 18,
      }}>
        {pills.map((p, i) => (
          <PopIn key={p} from={32 + i * 7} duration={14}>
            <div style={{
              fontFamily: 'Inter, sans-serif', fontSize: 16, fontWeight: 700,
              color: C.z400, letterSpacing: '0.22em',
              background: C.z800, border: `1px solid ${C.z700}`,
              padding: '8px 24px', borderRadius: 24,
            }}>
              {p}
            </div>
          </PopIn>
        ))}
      </div>

    </div>
  );
};
