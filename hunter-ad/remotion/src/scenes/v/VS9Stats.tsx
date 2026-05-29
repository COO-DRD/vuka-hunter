import React from 'react';
import { useCurrentFrame, interpolate, Easing } from 'remotion';
import { C, VW, VH } from '../../constants_v';

const STATS = [
  { value: '2 min',     label: 'First leads ready',      emoji: '⚡' },
  { value: '500+',      label: 'Leads per scrape',       emoji: '📍' },
  { value: '8 modes',   label: 'Industry enrichment',    emoji: '🎯' },
  { value: 'AI',        label: 'Scored & ranked',        emoji: '🧠' },
  { value: 'WhatsApp',  label: 'Outreach in your voice', emoji: '💬' },
  { value: 'KES 2,500', label: 'Per month after trial',  emoji: '💰' },
];

export const VS9Stats: React.FC = () => {
  const f = useCurrentFrame();

  const headerO = interpolate(f, [0, 18], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const fadeOut  = interpolate(f, [152, 175], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <div style={{
      width: VW, height: VH, background: C.bg, display: 'flex',
      flexDirection: 'column', opacity: fadeOut, padding: '120px 52px 80px',
    }}>
      <div style={{ opacity: headerO, marginBottom: 48 }}>
        <div style={{
          fontSize: 22, fontWeight: 600, color: C.red, letterSpacing: '0.08em',
          textTransform: 'uppercase', marginBottom: 10,
          fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", Helvetica, sans-serif',
        }}>BY THE NUMBERS</div>
        <div style={{
          fontSize: 72, fontWeight: 800, color: C.white,
          letterSpacing: '-0.03em', lineHeight: 1.0,
          fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", Helvetica, sans-serif',
        }}>
          Built for<br />results.
        </div>
      </div>

      {/* Stats grid */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16,
      }}>
        {STATS.map((stat, i) => {
          const start = 18 + i * 14;
          const o = interpolate(f, [start, start + 18], [0, 1], {
            extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
            easing: Easing.out(Easing.back(1.2)),
          });
          const scale = interpolate(f, [start, start + 18], [0.85, 1], {
            extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
            easing: Easing.out(Easing.back(1.2)),
          });
          return (
            <div key={stat.label} style={{
              opacity: o, transform: `scale(${scale})`,
              background: C.z900, border: `1px solid ${C.z800}`,
              borderRadius: 24, padding: '28px 24px',
              display: 'flex', flexDirection: 'column', gap: 8,
            }}>
              <div style={{ fontSize: 36 }}>{stat.emoji}</div>
              <div style={{
                fontSize: 38, fontWeight: 800, color: C.red,
                letterSpacing: '-0.02em',
                fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", Helvetica, sans-serif',
              }}>{stat.value}</div>
              <div style={{
                fontSize: 20, fontWeight: 500, color: C.z400, lineHeight: 1.3,
                fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", Helvetica, sans-serif',
              }}>{stat.label}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
