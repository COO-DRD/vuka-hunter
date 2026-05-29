import React from 'react';
import { interpolate, useCurrentFrame, Easing } from 'remotion';
import { C, W, H } from '../constants';
import { AnimIn } from '../components/AnimIn';
import { PopIn } from '../components/PopIn';
import { SceneLabel } from '../components/SceneLabel';

const cards = [
  { label: 'Tech Stack',      value: 'WordPress · No Analytics', color: C.amber },
  { label: 'Booking System',  value: 'Not found — gap detected',  color: C.red   },
  { label: 'Live Chat',       value: 'None — losing leads nightly', color: C.red  },
  { label: 'Email',           value: 'info@dentalsmiles.co.ke',    color: C.green },
  { label: 'WhatsApp',        value: 'wa.me/254722xxxxxx',          color: C.green },
  { label: 'Custom Signal',   value: 'Expanding — 2nd branch soon', color: C.amber },
];

export const Scene5Enrich: React.FC = () => {
  const frame = useCurrentFrame();
  const ease  = Easing.bezier(0.16, 1, 0.3, 1);

  const scanW = interpolate(frame, [24, 105], [0, 100], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease,
  });

  const fadeAll = interpolate(frame, [108, 120], [1, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

  return (
    <div style={{ width: W, height: H, background: C.bg, position: 'relative', overflow: 'hidden', opacity: fadeAll }}>

      <SceneLabel number="02" label="Enrich" />

      <AnimIn from={10} duration={16} slideY={30} style={{ position: 'absolute', top: H/2 - 210, left: 120 }}>
        <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 80, fontWeight: 900, color: C.white, lineHeight: 1.1 }}>
          We crawl their site.<br />You get the<br />intelligence.
        </div>
      </AnimIn>

      {/* Data cards grid */}
      <div style={{
        position: 'absolute', top: H/2 - 150, right: 60,
        display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16,
        width: 900,
      }}>
        {cards.map((card, i) => (
          <PopIn key={card.label} from={20 + i * 10} duration={14}>
            <div style={{
              background: C.z800, borderRadius: 14,
              border: `1px solid ${C.z700}`,
              padding: '20px 22px',
            }}>
              <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 15, color: C.z500, marginBottom: 6, fontWeight: 400 }}>
                {card.label}
              </div>
              <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 19, color: card.color, fontWeight: 700, lineHeight: 1.3 }}>
                {card.value}
              </div>
            </div>
          </PopIn>
        ))}
      </div>

      {/* Scan progress bar */}
      <AnimIn from={20} duration={10} style={{ position: 'absolute', bottom: 120, left: 120, right: 80 }}>
        <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 18, color: C.z500, marginBottom: 10 }}>
          Scanning dentalsmiles.co.ke...
        </div>
        <div style={{ height: 6, background: C.z800, borderRadius: 3, overflow: 'hidden' }}>
          <div style={{ width: `${scanW}%`, height: '100%', background: C.red, borderRadius: 3, transition: 'none' }} />
        </div>
      </AnimIn>

    </div>
  );
};
