import React from 'react';
import { useCurrentFrame, interpolate, Easing } from 'remotion';
import { C, VW, VH } from '../../constants_v';

const Row: React.FC<{ label: string; value: string; icon: string; start: number; frame: number; accent?: string }> = ({
  label, value, icon, start, frame, accent,
}) => {
  const o = interpolate(frame, [start, start + 14], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });
  const x = interpolate(frame, [start, start + 14], [20, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });
  return (
    <div style={{
      opacity: o, transform: `translateX(${x}px)`,
      display: 'flex', alignItems: 'center', gap: 20,
      background: C.z900, borderRadius: 18,
      border: `1px solid ${C.z800}`, padding: '22px 26px',
    }}>
      <div style={{ fontSize: 36 }}>{icon}</div>
      <div style={{ flex: 1 }}>
        <div style={{
          fontSize: 20, fontWeight: 500, color: C.z500, marginBottom: 4,
          fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", Helvetica, sans-serif',
          letterSpacing: '0.02em', textTransform: 'uppercase',
        }}>{label}</div>
        <div style={{
          fontSize: 28, fontWeight: 600, color: accent ?? C.z100,
          fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", Helvetica, sans-serif',
          letterSpacing: '-0.01em',
        }}>{value}</div>
      </div>
    </div>
  );
};

export const VS5Enrich: React.FC = () => {
  const f = useCurrentFrame();

  const headerO = interpolate(f, [0, 18], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const fadeOut  = interpolate(f, [152, 175], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <div style={{
      width: VW, height: VH, background: C.bg, display: 'flex',
      flexDirection: 'column', opacity: fadeOut, padding: '120px 52px 80px',
    }}>
      <div style={{ opacity: headerO, marginBottom: 40 }}>
        <div style={{
          fontSize: 22, fontWeight: 600, color: C.red, letterSpacing: '0.08em',
          textTransform: 'uppercase', marginBottom: 10,
          fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", Helvetica, sans-serif',
        }}>ENRICH</div>
        <div style={{
          fontSize: 68, fontWeight: 800, color: C.white,
          letterSpacing: '-0.03em', lineHeight: 1.05,
          fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", Helvetica, sans-serif',
        }}>
          Every lead.<br />
          <span style={{ color: C.red }}>Fully mapped.</span>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Row icon="🌐" label="Website"    value="meridiansolark.co.ke"  start={16} frame={f} accent={C.z200} />
        <Row icon="📧" label="Email"      value="info@meridiansolark.co.ke" start={28} frame={f} accent={C.green} />
        <Row icon="📞" label="Phone"      value="+254 722 456 789"      start={40} frame={f} />
        <Row icon="⚡" label="Tech Stack" value="WordPress · Calendly · WhatsApp" start={52} frame={f} />
        <Row icon="📍" label="Location"   value="Westlands, Nairobi"    start={64} frame={f} />
        <Row icon="⭐" label="Rating"     value="4.6 · 142 reviews"     start={76} frame={f} accent={C.amber} />
        <Row icon="🔖" label="Booking"    value="Calendly detected"     start={88} frame={f} accent={C.green} />
        <Row icon="💬" label="Live Chat"  value="Tawk.to detected"      start={100} frame={f} accent={C.green} />
      </div>
    </div>
  );
};
