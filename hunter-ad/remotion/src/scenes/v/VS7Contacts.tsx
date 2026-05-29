import React from 'react';
import { useCurrentFrame, interpolate, Easing } from 'remotion';
import { C, VW, VH } from '../../constants_v';

const CONTACTS = [
  { name: 'James Kariuki',    title: 'CEO',              conf: 'High',   emoji: '👔' },
  { name: 'Amina Waweru',     title: 'Sales Director',   conf: 'High',   emoji: '💼' },
  { name: 'Brian Otieno',     title: 'Operations Lead',  conf: 'Medium', emoji: '⚙️' },
  { name: 'Fatuma Hassan',    title: 'Head of Marketing', conf: 'High',  emoji: '📣' },
];

export const VS7Contacts: React.FC = () => {
  const f = useCurrentFrame();

  const headerO = interpolate(f, [0, 18], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const noteO   = interpolate(f, [90, 110], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
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
        }}>CONTACTS</div>
        <div style={{
          fontSize: 68, fontWeight: 800, color: C.white,
          letterSpacing: '-0.03em', lineHeight: 1.05,
          fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", Helvetica, sans-serif',
        }}>
          Not the<br />
          <span style={{ color: C.red }}>front desk.</span>
        </div>
        <div style={{
          fontSize: 28, fontWeight: 400, color: C.z500, marginTop: 16,
          fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", Helvetica, sans-serif',
        }}>
          Hunter finds who actually decides.
        </div>
      </div>

      {/* Contact cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {CONTACTS.map((c, i) => {
          const start = 18 + i * 18;
          const o = interpolate(f, [start, start + 16], [0, 1], {
            extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
            easing: Easing.out(Easing.cubic),
          });
          const x = interpolate(f, [start, start + 16], [30, 0], {
            extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
            easing: Easing.out(Easing.cubic),
          });
          const confColor = c.conf === 'High' ? C.green : C.amber;
          return (
            <div key={c.name} style={{
              opacity: o, transform: `translateX(${x}px)`,
              background: C.z900, border: `1px solid ${C.z800}`,
              borderRadius: 20, padding: '24px 28px',
              display: 'flex', alignItems: 'center', gap: 20,
            }}>
              <div style={{ fontSize: 44 }}>{c.emoji}</div>
              <div style={{ flex: 1 }}>
                <div style={{
                  fontSize: 30, fontWeight: 700, color: C.z100,
                  fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", Helvetica, sans-serif',
                  letterSpacing: '-0.01em',
                }}>{c.name}</div>
                <div style={{
                  fontSize: 22, fontWeight: 400, color: C.z400, marginTop: 4,
                  fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", Helvetica, sans-serif',
                }}>{c.title}</div>
              </div>
              <div style={{
                fontSize: 18, fontWeight: 600, color: confColor,
                background: confColor + '15', border: `1px solid ${confColor}30`,
                borderRadius: 50, padding: '5px 16px',
                fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", Helvetica, sans-serif',
              }}>{c.conf}</div>
            </div>
          );
        })}
      </div>

      {/* Source note */}
      <div style={{
        opacity: noteO, marginTop: 36,
        background: C.z900, border: `1px solid ${C.z800}`,
        borderRadius: 16, padding: '18px 24px',
        fontSize: 22, fontWeight: 400, color: C.z500, textAlign: 'center',
        fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", Helvetica, sans-serif',
      }}>
        Sourced via website · LinkedIn · Google · Social bio
      </div>
    </div>
  );
};
