import React from 'react';
import { useCurrentFrame, interpolate, Easing } from 'remotion';
import { C, VW, VH } from '../../constants_v';

export const VS10CTA: React.FC = () => {
  const f = useCurrentFrame();

  const bgO  = interpolate(f, [0, 20], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const line1 = interpolate(f, [10, 32], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) });
  const line2 = interpolate(f, [28, 50], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) });
  const line3 = interpolate(f, [52, 74], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) });
  const btnO  = interpolate(f, [72, 95], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.back(1.2)) });
  const btnScale = interpolate(f, [72, 95], [0.8, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.back(1.2)) });
  const fadeOut = interpolate(f, [130, 148], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // Button pulse
  const pulse = 1 + 0.03 * Math.sin(f * 0.18);

  return (
    <div style={{
      width: VW, height: VH, background: C.bg,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      opacity: bgO * fadeOut, padding: '0 64px', gap: 0,
    }}>
      <div style={{
        opacity: line1, marginBottom: 8,
        fontSize: 22, fontWeight: 600, color: C.red, letterSpacing: '0.1em',
        textTransform: 'uppercase',
        fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", Helvetica, sans-serif',
      }}>7-DAY FREE TRIAL</div>

      <div style={{
        opacity: line2,
        fontSize: 110, fontWeight: 900, color: C.white,
        letterSpacing: '-0.04em', lineHeight: 0.95, textAlign: 'center',
        fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", Helvetica, sans-serif',
      }}>
        Start<br />Hunting.
      </div>

      <div style={{
        opacity: line3, marginTop: 24,
        fontSize: 30, fontWeight: 400, color: C.z500, textAlign: 'center',
        fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", Helvetica, sans-serif',
      }}>
        No credit card. Full access.<br />
        First leads in under 2 minutes.
      </div>

      {/* CTA button */}
      <div style={{
        opacity: btnO, transform: `scale(${btnScale * pulse})`, marginTop: 56,
        background: C.red, borderRadius: 60,
        padding: '28px 80px',
        fontSize: 34, fontWeight: 700, color: C.white,
        letterSpacing: '-0.01em',
        fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", Helvetica, sans-serif',
      }}>
        Try Hunter Free →
      </div>

      <div style={{
        opacity: btnO, marginTop: 20,
        fontSize: 22, fontWeight: 400, color: C.z600, textAlign: 'center',
        fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", Helvetica, sans-serif',
      }}>
        4unter.dullugroup.co.ke
      </div>
    </div>
  );
};
