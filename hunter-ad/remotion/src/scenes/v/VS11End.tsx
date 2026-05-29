import React from 'react';
import { useCurrentFrame, interpolate, Easing } from 'remotion';
import { C, VW, VH } from '../../constants_v';

const HMark: React.FC<{ size: number }> = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none">
    <rect width="64" height="64" rx="16" fill="#dc2626" />
    <path d="M14 14H24V28H40V14H50V50H40V36H24V50H14V14Z" fill="white" />
  </svg>
);

export const VS11End: React.FC = () => {
  const f = useCurrentFrame();

  const markO = interpolate(f, [0, 24], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });
  const markScale = interpolate(f, [0, 24], [0.7, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
    easing: Easing.out(Easing.back(1.3)),
  });
  const wordO   = interpolate(f, [24, 46], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) });
  const urlO    = interpolate(f, [46, 70], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const taglineO= interpolate(f, [64, 86], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const pulse = 1 + 0.02 * Math.sin(f * 0.1);

  return (
    <div style={{
      width: VW, height: VH, background: '#000000',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: 0,
    }}>
      <div style={{
        opacity: markO, transform: `scale(${markScale * pulse})`, marginBottom: 36,
      }}>
        <HMark size={140} />
      </div>

      <div style={{
        opacity: wordO,
        fontSize: 100, fontWeight: 900, color: C.white,
        letterSpacing: '-0.04em',
        fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", Helvetica, sans-serif',
      }}>
        Hunter.
      </div>

      <div style={{
        opacity: taglineO, marginTop: 16,
        fontSize: 30, fontWeight: 500, color: C.red,
        letterSpacing: '-0.01em',
        fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", Helvetica, sans-serif',
      }}>
        B2B Lead Intelligence
      </div>

      <div style={{
        opacity: urlO, marginTop: 12,
        fontSize: 26, fontWeight: 400, color: C.z600,
        fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", Helvetica, sans-serif',
      }}>
        hunter.dullugroup.co.ke
      </div>

      {/* Dullu Digital credit */}
      <div style={{
        opacity: urlO, position: 'absolute', bottom: 80,
        fontSize: 20, fontWeight: 400, color: C.z700,
        fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", Helvetica, sans-serif',
      }}>
        Dullu Digital · Kenya
      </div>
    </div>
  );
};
