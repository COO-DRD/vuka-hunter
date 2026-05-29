import React from 'react';
import { useCurrentFrame, interpolate, Easing } from 'remotion';
import { C, VW, VH } from '../../constants_v';

const WA_GREEN = '#075e54';
const WA_BUBBLE = '#128c7e';

const WA_MSG = `Hi James 👋

I noticed Meridian Solar Kenya is in a strong expansion phase — with Calendly active and a growing review base, you're clearly focused on growth.

We help solar companies in Kenya convert more of that online interest into actual meetings.

Would you be open to a quick 10-min call this week?`;

export const VS8Opener: React.FC = () => {
  const f = useCurrentFrame();

  const CHAR_LEN = WA_MSG.length;
  const typedChars = Math.round(interpolate(f, [20, 120], [0, CHAR_LEN], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  }));
  const typed = WA_MSG.slice(0, typedChars);

  const headerO = interpolate(f, [0, 18], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const phoneO  = interpolate(f, [8, 24], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const tagO    = interpolate(f, [130, 150], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const fadeOut  = interpolate(f, [152, 175], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <div style={{
      width: VW, height: VH, background: C.bg, display: 'flex',
      flexDirection: 'column', opacity: fadeOut, padding: '100px 52px 80px',
    }}>
      <div style={{ opacity: headerO, marginBottom: 32 }}>
        <div style={{
          fontSize: 22, fontWeight: 600, color: C.red, letterSpacing: '0.08em',
          textTransform: 'uppercase', marginBottom: 10,
          fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", Helvetica, sans-serif',
        }}>OUTREACH</div>
        <div style={{
          fontSize: 62, fontWeight: 800, color: C.white,
          letterSpacing: '-0.03em', lineHeight: 1.05,
          fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", Helvetica, sans-serif',
        }}>
          Your opener.<br />
          <span style={{ color: C.red }}>Written in 8s.</span>
        </div>
      </div>

      {/* WhatsApp phone mockup */}
      <div style={{
        opacity: phoneO,
        background: WA_GREEN,
        borderRadius: 28,
        overflow: 'hidden',
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        border: `1px solid #ffffff18`,
        maxHeight: 900,
      }}>
        {/* Header bar */}
        <div style={{
          background: '#054c43',
          padding: '20px 24px',
          display: 'flex', alignItems: 'center', gap: 16,
        }}>
          <div style={{
            width: 52, height: 52, borderRadius: '50%',
            background: WA_BUBBLE,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 26,
          }}>👔</div>
          <div>
            <div style={{
              fontSize: 26, fontWeight: 600, color: '#fff',
              fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", Helvetica, sans-serif',
            }}>James Kariuki</div>
            <div style={{
              fontSize: 18, color: '#ffffff88',
              fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", Helvetica, sans-serif',
            }}>CEO · Meridian Solar Kenya</div>
          </div>
        </div>

        {/* Chat area */}
        <div style={{
          flex: 1, padding: '20px 16px',
          background: '#0f1b18',
          display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
        }}>
          {/* Outgoing bubble */}
          <div style={{
            alignSelf: 'flex-end',
            background: WA_BUBBLE,
            borderRadius: '18px 18px 4px 18px',
            padding: '16px 20px',
            maxWidth: '85%',
          }}>
            <div style={{
              fontSize: 22, color: '#fff', lineHeight: 1.55, whiteSpace: 'pre-wrap',
              fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", Helvetica, sans-serif',
            }}>{typed}<span style={{ opacity: (f % 30 < 15) ? 1 : 0, borderRight: '2px solid #fff', marginLeft: 2 }}> </span></div>
            <div style={{
              fontSize: 16, color: '#ffffff66', textAlign: 'right', marginTop: 8,
              fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", Helvetica, sans-serif',
            }}>✓✓ Sent</div>
          </div>
        </div>
      </div>

      {/* Tag */}
      <div style={{
        opacity: tagO, marginTop: 24,
        fontSize: 24, fontWeight: 500, color: C.z500, textAlign: 'center',
        fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", Helvetica, sans-serif',
      }}>
        WhatsApp · Email · Both. Your choice.
      </div>
    </div>
  );
};
