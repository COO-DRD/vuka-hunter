import React from 'react';
import { interpolate, useCurrentFrame, Easing } from 'remotion';
import { C, W, H } from '../constants';
import { AnimIn } from '../components/AnimIn';
import { PopIn } from '../components/PopIn';
import { SceneLabel } from '../components/SceneLabel';

interface Contact {
  name: string; title: string; initial: string;
  source: string; conf: string; confColor: string; sourceColor: string;
}

const ContactCard: React.FC<{ c: Contact; delay: number }> = ({ c, delay }) => {
  const frame = useCurrentFrame();
  const ease  = Easing.bezier(0.16, 1, 0.3, 1);

  const opacity = interpolate(frame, [delay, delay + 12], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  const ty = interpolate(frame, [delay, delay + 18], [50, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease,
  });

  return (
    <div style={{
      opacity, transform: `translateY(${ty}px)`,
      background: C.z800, borderRadius: 18,
      border: `1px solid ${C.z700}`,
      padding: '28px 30px', width: 400,
    }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 20 }}>
        {/* Avatar */}
        <div style={{
          width: 52, height: 52, borderRadius: '50%',
          background: C.z700, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'Inter, sans-serif', fontSize: 20, fontWeight: 700, color: C.z300, flexShrink: 0,
        }}>
          {c.initial}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 24, fontWeight: 700, color: C.z100 }}>
            {c.name}
          </div>
          <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 18, color: C.z400, marginTop: 2 }}>
            {c.title}
          </div>
        </div>
        {/* Confidence */}
        <div style={{
          background: c.confColor, color: '#000',
          fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 900,
          padding: '4px 10px', borderRadius: 20, letterSpacing: '0.1em',
          alignSelf: 'flex-start',
        }}>
          {c.conf}
        </div>
      </div>

      {/* Source badge */}
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 8,
        background: C.z900, border: `1px solid ${C.z700}`,
        borderRadius: 20, padding: '6px 16px',
        fontFamily: 'Inter, sans-serif', fontSize: 16, color: c.sourceColor, fontWeight: 400,
      }}>
        From: {c.source}
      </div>
    </div>
  );
};

export const Scene7Contacts: React.FC = () => {
  const frame = useCurrentFrame();

  const noteOp = interpolate(frame, [56, 66], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  const fadeAll = interpolate(frame, [78, 90], [1, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

  const contacts: Contact[] = [
    {
      name: 'Dr. Amina Hassan', title: 'Clinical Director', initial: 'AH',
      source: 'About Page', conf: 'HIGH', confColor: C.green, sourceColor: C.green,
    },
    {
      name: 'James Mwangi', title: 'Practice Manager', initial: 'JM',
      source: 'Instagram', conf: 'MED', confColor: C.amber, sourceColor: C.amber,
    },
  ];

  return (
    <div style={{ width: W, height: H, background: C.bg, position: 'relative', overflow: 'hidden', opacity: fadeAll }}>

      <SceneLabel number="04" label="Contacts" />

      <AnimIn from={10} duration={16} slideY={30} style={{ position: 'absolute', top: H/2 - 210, left: 120 }}>
        <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 80, fontWeight: 900, color: C.white, lineHeight: 1.1 }}>
          Skip the front desk.<br />Reach the decision<br />maker directly.
        </div>
      </AnimIn>

      {/* Contact cards */}
      <div style={{
        position: 'absolute', top: H/2 - 100, right: 60,
        display: 'flex', gap: 24,
      }}>
        {contacts.map((c, i) => (
          <ContactCard key={c.name} c={c} delay={18 + i * 20} />
        ))}
      </div>

      {/* Corroboration notice */}
      <AnimIn from={56} duration={10} style={{
        position: 'absolute', bottom: 110, right: 60,
        maxWidth: 840,
      }}>
        <div style={{
          fontFamily: 'Inter, sans-serif', fontSize: 20, color: C.green,
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span style={{ fontSize: 24 }}>⚡</span>
          Same name on About Page + Instagram — confidence upgraded to <strong>HIGH</strong>
        </div>
      </AnimIn>

    </div>
  );
};
