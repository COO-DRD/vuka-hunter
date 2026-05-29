import React from 'react';
import { interpolate, useCurrentFrame, Easing } from 'remotion';
import { C, W, H } from '../constants';
import { AnimIn } from '../components/AnimIn';
import { PopIn } from '../components/PopIn';
import { SceneLabel } from '../components/SceneLabel';

const leads = [
  { name: 'Dental Smiles Clinic',    meta: '4.9★ · 312 reviews · Westlands',       score: 94, good: true  },
  { name: 'Apex Logistics Ltd.',     meta: '4.7★ · 188 reviews · Industrial Area',  score: 87, good: true  },
  { name: 'Serene Hotel & Spa',      meta: '4.8★ · 541 reviews · Karen',            score: 91, good: true  },
  { name: 'Pioneer Solar Kenya',     meta: '4.6★ · 97 reviews · Kilimani',          score: 83, good: false },
  { name: 'TrustLaw Advocates',      meta: '4.9★ · 64 reviews · CBD',              score: 89, good: true  },
  { name: 'Kenya Breweries Sup.',    meta: '4.5★ · 433 reviews · Ruiru',           score: 78, good: false },
];

const LeadRow: React.FC<{ d: typeof leads[0]; delay: number }> = ({ d, delay }) => {
  const frame  = useCurrentFrame();
  const ease   = Easing.bezier(0.16, 1, 0.3, 1);

  const opacity = interpolate(frame, [delay, delay + 8], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  const tx = interpolate(frame, [delay, delay + 14], [60, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease,
  });

  return (
    <div style={{
      opacity, transform: `translateX(${tx}px)`,
      display: 'flex', alignItems: 'center', padding: '0 28px',
      height: 76, borderBottom: `1px solid ${C.z800}`,
      gap: 0,
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 22, fontWeight: 700, color: C.z100 }}>{d.name}</div>
        <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 17, fontWeight: 400, color: C.z400, marginTop: 2 }}>{d.meta}</div>
      </div>
      <div style={{
        background: d.good ? C.green : C.amber,
        color: '#000',
        fontFamily: 'Inter, sans-serif', fontSize: 15, fontWeight: 900,
        padding: '4px 14px', borderRadius: 20,
        letterSpacing: '0.04em',
      }}>
        {d.score}
      </div>
    </div>
  );
};

export const Scene4Discover: React.FC = () => {
  const frame  = useCurrentFrame();
  const ease   = Easing.bezier(0.16, 1, 0.3, 1);

  const panelTx = interpolate(frame, [22, 38], [120, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease,
  });
  const panelOp = interpolate(frame, [22, 34], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

  const fadeAll = interpolate(frame, [130, 150], [1, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

  return (
    <div style={{ width: W, height: H, background: C.bg, position: 'relative', overflow: 'hidden', opacity: fadeAll }}>

      <SceneLabel number="01" label="Discover" />

      {/* Headline left */}
      <AnimIn from={10} duration={16} slideY={30} style={{ position: 'absolute', top: H/2 - 200, left: 120 }}>
        <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 80, fontWeight: 900, color: C.white, lineHeight: 1.1, maxWidth: 680 }}>
          Find every qualified lead in Nairobi. Automatically.
        </div>
      </AnimIn>

      <AnimIn from={26} duration={14} style={{ position: 'absolute', bottom: 200, left: 120 }}>
        <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 30, color: C.z400, lineHeight: 1.5 }}>
          127 businesses matched your criteria.<br />
          <span style={{ color: C.green }}>Rated 4.5+</span> · Active · Reachable.
        </div>
      </AnimIn>

      {/* Right panel */}
      <div style={{
        position: 'absolute', top: H/2 - 356, right: 60,
        width: 860, opacity: panelOp, transform: `translateX(${panelTx}px)`,
        background: C.z900, borderRadius: 16,
        border: `1px solid ${C.z800}`, overflow: 'hidden',
      }}>
        {/* Panel header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 28px', height: 54, background: C.z800, borderBottom: `1px solid ${C.z700}`,
        }}>
          <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 20, fontWeight: 600, color: C.z200 }}>
            Hunter Leads — Nairobi
          </span>
          <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 16, color: C.z500 }}>
            127 results
          </span>
        </div>

        {/* Rows */}
        {leads.map((l, i) => (
          <LeadRow key={l.name} d={l} delay={30 + i * 7} />
        ))}

        {/* Footer */}
        <div style={{
          padding: '12px 28px',
          fontFamily: 'Inter, sans-serif', fontSize: 16, color: C.z600,
          borderTop: `1px solid ${C.z800}`,
        }}>
          Showing 1–6 of 127 · Page 1
        </div>
      </div>

    </div>
  );
};
