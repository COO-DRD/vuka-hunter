import React from 'react';
import { useCurrentFrame, interpolate, Easing } from 'remotion';
import { C, VW, VH } from '../../constants_v';

const SIGNALS = [
  { text: 'Calendly booking active',      color: C.green },
  { text: 'WhatsApp Business linked',     color: C.green },
  { text: 'Website live & mobile-ready',  color: C.green },
  { text: 'Recently reviewed',            color: C.green },
  { text: 'Solar expansion phase',        color: C.amber },
  { text: 'No AI chatbot yet',            color: C.amber },
];

export const VS6Score: React.FC = () => {
  const f = useCurrentFrame();

  const scoreTarget = 94;
  const score = Math.round(interpolate(f, [20, 80], [0, scoreTarget], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  }));
  const arcFill = interpolate(f, [20, 80], [0, scoreTarget / 100], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });

  const headerO = interpolate(f, [0, 18], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const labelO  = interpolate(f, [75, 95], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const fadeOut  = interpolate(f, [152, 175], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // Arc SVG — semi-circle arc
  const R = 160;
  const CX = 240, CY = 240;
  const circumference = Math.PI * R; // half circle
  const dashOffset = circumference * (1 - arcFill);

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
        }}>AI SCORE</div>
        <div style={{
          fontSize: 62, fontWeight: 800, color: C.white,
          letterSpacing: '-0.03em', lineHeight: 1.05,
          fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", Helvetica, sans-serif',
        }}>
          Who's ready<br />to buy.
        </div>
      </div>

      {/* Score ring */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 40, position: 'relative' }}>
        <svg width={480} height={280} viewBox="0 0 480 280">
          {/* Track */}
          <path
            d={`M ${CX - R} ${CY} A ${R} ${R} 0 0 1 ${CX + R} ${CY}`}
            fill="none" stroke={C.z800} strokeWidth={22} strokeLinecap="round"
          />
          {/* Fill */}
          <path
            d={`M ${CX - R} ${CY} A ${R} ${R} 0 0 1 ${CX + R} ${CY}`}
            fill="none" stroke={C.red} strokeWidth={22} strokeLinecap="round"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={dashOffset}
            style={{ transformOrigin: `${CX}px ${CY}px` }}
          />
          {/* Score number */}
          <text x={CX} y={CY - 24} textAnchor="middle"
            style={{ fontSize: 100, fontWeight: 800, fill: C.white,
              fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", Helvetica, sans-serif' }}>
            {score}
          </text>
          <text x={CX} y={CY + 16} textAnchor="middle"
            style={{ fontSize: 28, fontWeight: 500, fill: C.z500,
              fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", Helvetica, sans-serif' }}>
            out of 100
          </text>
        </svg>

        {/* Ready to buy label */}
        <div style={{
          position: 'absolute', bottom: -12,
          opacity: labelO, background: C.green + '22', border: `1px solid ${C.green}44`,
          borderRadius: 50, padding: '8px 28px',
          fontSize: 26, fontWeight: 600, color: C.green,
          fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", Helvetica, sans-serif',
        }}>
          Ready to buy
        </div>
      </div>

      {/* Signals */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 16 }}>
        {SIGNALS.map((sig, i) => {
          const o = interpolate(f, [88 + i * 8, 102 + i * 8], [0, 1], {
            extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
          });
          return (
            <div key={sig.text} style={{
              opacity: o, display: 'flex', alignItems: 'center', gap: 16,
            }}>
              <div style={{
                width: 10, height: 10, borderRadius: '50%',
                background: sig.color, flexShrink: 0,
              }} />
              <div style={{
                fontSize: 26, fontWeight: 500, color: C.z300,
                fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", Helvetica, sans-serif',
              }}>{sig.text}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
