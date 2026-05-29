import React from 'react';
import { useCurrentFrame, interpolate, Easing } from 'remotion';
import { C, VW, VH } from '../../constants_v';

// Hunter H mark as inline SVG
const HMark: React.FC<{ size: number; opacity: number }> = ({ size, opacity }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" style={{ opacity }}>
    <rect width="64" height="64" rx="16" fill="#dc2626" />
    <path d="M14 14H24V28H40V14H50V50H40V36H24V50H14V14Z" fill="white" />
  </svg>
);

export const VS3Brand: React.FC = () => {
  const f = useCurrentFrame();

  const markScale = interpolate(f, [0, 30], [0.4, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
    easing: Easing.out(Easing.back(1.4)),
  });
  const markO = interpolate(f, [0, 20], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const wordO = interpolate(f, [28, 50], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const tagO  = interpolate(f, [50, 72], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const sub1O = interpolate(f, [70, 90], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const fadeOut = interpolate(f, [130, 148], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // Subtle pulse on mark
  const pulse = 1 + 0.015 * Math.sin(f * 0.12);

  return (
    <div style={{
      width: VW, height: VH, background: C.bg, display: 'flex',
      flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      opacity: fadeOut, gap: 0, padding: '0 64px',
    }}>
      {/* Mark */}
      <div style={{ transform: `scale(${markScale * pulse})`, marginBottom: 44 }}>
        <HMark size={120} opacity={markO} />
      </div>

      {/* Wordmark */}
      <div style={{
        opacity: wordO,
        fontSize: 120, fontWeight: 800, color: C.white,
        letterSpacing: '-0.04em', lineHeight: 1.0,
        fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", Helvetica, sans-serif',
      }}>
        Hunter.
      </div>

      {/* Tagline */}
      <div style={{
        opacity: tagO, marginTop: 24,
        fontSize: 38, fontWeight: 500, color: C.red,
        letterSpacing: '-0.01em',
        fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", Helvetica, sans-serif',
      }}>
        B2B Lead Intelligence.
      </div>

      {/* Sub-tagline */}
      <div style={{
        opacity: sub1O, marginTop: 20,
        fontSize: 28, fontWeight: 400, color: C.z500,
        letterSpacing: '-0.005em', textAlign: 'center',
        fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", Helvetica, sans-serif',
      }}>
        Built for the African market.
      </div>
    </div>
  );
};
