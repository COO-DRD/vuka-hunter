import React from 'react';
import { interpolate, useCurrentFrame, Easing } from 'remotion';
import { C, W, H } from '../constants';
import { AnimIn } from '../components/AnimIn';
import { PopIn } from '../components/PopIn';
import { SceneLabel } from '../components/SceneLabel';

const signals = [
  { text: 'Booking gap',         color: C.red   },
  { text: 'High review volume',  color: C.green },
  { text: 'Established 2014',    color: C.amber },
  { text: 'Expanding',           color: C.amber },
];

export const Scene6Score: React.FC = () => {
  const frame = useCurrentFrame();
  const ease  = Easing.bezier(0.16, 1, 0.3, 1);
  const overshoot = Easing.bezier(0.34, 1.56, 0.64, 1);

  const cardTx = interpolate(frame, [20, 36], [100, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease,
  });
  const cardOp = interpolate(frame, [20, 32], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

  const numScale = interpolate(frame, [28, 46], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: overshoot,
  });
  const numOp = interpolate(frame, [28, 36], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

  const barW = interpolate(frame, [36, 70], [0, 94], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease,
  });

  const fadeAll = interpolate(frame, [110, 120], [1, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

  return (
    <div style={{ width: W, height: H, background: C.bg, position: 'relative', overflow: 'hidden', opacity: fadeAll }}>

      <SceneLabel number="03" label="Score" />

      <AnimIn from={10} duration={16} slideY={30} style={{ position: 'absolute', top: H/2 - 210, left: 120 }}>
        <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 80, fontWeight: 900, color: C.white, lineHeight: 1.1 }}>
          AI scores every lead.<br />You focus on<br />the 90s.
        </div>
      </AnimIn>

      {/* Score card */}
      <div style={{
        position: 'absolute', top: H/2 - 280, right: 60,
        width: 760, opacity: cardOp, transform: `translateX(${cardTx}px)`,
        background: C.z900, borderRadius: 20,
        border: `1px solid ${C.z800}`, padding: '40px 44px',
      }}>
        {/* Lead name */}
        <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 20, color: C.z400, marginBottom: 4 }}>
          Dental Smiles Clinic · Westlands
        </div>

        {/* Big score */}
        <div style={{
          display: 'flex', alignItems: 'flex-end', gap: 12,
          transform: `scale(${numScale})`, opacity: numOp,
          transformOrigin: 'left center', marginBottom: 16,
        }}>
          <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 200, fontWeight: 900, color: C.green, lineHeight: 1 }}>
            94
          </div>
          <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 44, color: C.z600, fontWeight: 300, paddingBottom: 28 }}>
            / 100
          </div>
        </div>

        {/* Bar */}
        <AnimIn from={34} duration={8}>
          <div style={{ height: 10, background: C.z800, borderRadius: 5, marginBottom: 28, overflow: 'hidden' }}>
            <div style={{ width: `${barW}%`, height: '100%', background: C.green, borderRadius: 5 }} />
          </div>
        </AnimIn>

        {/* Signal chips */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 28 }}>
          {signals.map((s, i) => (
            <PopIn key={s.text} from={48 + i * 7} duration={12}>
              <div style={{
                fontFamily: 'Inter, sans-serif', fontSize: 16, fontWeight: 700,
                color: s.color, background: C.z800,
                border: `1px solid ${C.z700}`,
                padding: '6px 16px', borderRadius: 20,
              }}>
                {s.text}
              </div>
            </PopIn>
          ))}
        </div>

        {/* Reasoning */}
        <AnimIn from={60} duration={12}>
          <div style={{
            background: C.z800, borderRadius: 12,
            border: `1px solid ${C.z700}`,
            padding: '18px 22px',
          }}>
            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 16, color: C.z500, marginBottom: 8, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              AI Reasoning
            </div>
            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 20, color: C.z300, lineHeight: 1.6 }}>
              4.9★ with 312 reviews — very busy practice.<br />
              No booking system = appointments lost every night.<br />
              Established 10 years. Strong candidate.
            </div>
          </div>
        </AnimIn>
      </div>

    </div>
  );
};
