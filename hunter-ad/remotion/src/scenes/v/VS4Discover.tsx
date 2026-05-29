import React from 'react';
import { useCurrentFrame, interpolate, Easing } from 'remotion';
import { C, VW, VH } from '../../constants_v';

const LEADS = [
  { name: 'Savannah Insurance', city: 'Nairobi', score: 87 },
  { name: 'Meridian Solar Kenya', city: 'Mombasa', score: 91 },
  { name: 'Apex Micro Finance', city: 'Nairobi', score: 78 },
  { name: 'BrightPath Recruiters', city: 'Kisumu', score: 83 },
  { name: 'ConnectTel Africa', city: 'Nairobi', score: 94 },
  { name: 'Greenfield Wellness', city: 'Nakuru', score: 72 },
  { name: 'Summit Digital Agency', city: 'Nairobi', score: 88 },
  { name: 'ProHealth Clinics', city: 'Mombasa', score: 79 },
  { name: 'EastAfrica Lending Co', city: 'Nairobi', score: 85 },
];

const LeadCard: React.FC<{ lead: typeof LEADS[0]; idx: number; frame: number }> = ({ lead, idx, frame }) => {
  const start = idx * 12;
  const o = interpolate(frame, [start, start + 16], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });
  const y = interpolate(frame, [start, start + 16], [20, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });
  const scoreColor = lead.score >= 85 ? C.green : lead.score >= 75 ? C.amber : C.z400;
  return (
    <div style={{
      opacity: o, transform: `translateY(${y}px)`,
      background: C.z900, borderRadius: 16,
      border: `1px solid ${C.z800}`,
      padding: '18px 22px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    }}>
      <div>
        <div style={{
          fontSize: 26, fontWeight: 600, color: C.z100,
          fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", Helvetica, sans-serif',
          letterSpacing: '-0.01em',
        }}>{lead.name}</div>
        <div style={{
          fontSize: 20, fontWeight: 400, color: C.z500, marginTop: 4,
          fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", Helvetica, sans-serif',
        }}>{lead.city}</div>
      </div>
      <div style={{
        fontSize: 28, fontWeight: 700, color: scoreColor,
        fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", Helvetica, sans-serif',
        letterSpacing: '-0.02em',
      }}>{lead.score}</div>
    </div>
  );
};

export const VS4Discover: React.FC = () => {
  const f = useCurrentFrame();

  const headerO = interpolate(f, [0, 20], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const fadeOut  = interpolate(f, [152, 175], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // Counter
  const count = Math.round(interpolate(f, [20, 100], [0, 247], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
    easing: Easing.out(Easing.quad),
  }));

  return (
    <div style={{
      width: VW, height: VH, background: C.bg, display: 'flex',
      flexDirection: 'column', opacity: fadeOut, padding: '120px 52px 80px',
    }}>
      {/* Header */}
      <div style={{ opacity: headerO, marginBottom: 12 }}>
        <div style={{
          fontSize: 22, fontWeight: 600, color: C.red, letterSpacing: '0.08em',
          textTransform: 'uppercase',
          fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", Helvetica, sans-serif',
          marginBottom: 10,
        }}>
          DISCOVER
        </div>
        <div style={{
          fontSize: 72, fontWeight: 800, color: C.white,
          letterSpacing: '-0.03em', lineHeight: 1.0,
          fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", Helvetica, sans-serif',
        }}>
          <span style={{ color: C.red }}>{count}</span> leads.<br />
          Nairobi. Now.
        </div>
      </div>

      {/* Lead cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 32 }}>
        {LEADS.map((lead, i) => (
          <LeadCard key={lead.name} lead={lead} idx={i} frame={f - 10} />
        ))}
      </div>

      {/* Footer note */}
      {(() => {
        const o = interpolate(f, [130, 148], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
        return (
          <div style={{
            opacity: o, marginTop: 'auto', paddingTop: 24,
            fontSize: 24, fontWeight: 500, color: C.z500, textAlign: 'center',
            fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", Helvetica, sans-serif',
          }}>
            Google Maps · OpenStreetMap · Local directories
          </div>
        );
      })()}
    </div>
  );
};
