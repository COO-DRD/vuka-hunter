import React from 'react';
import { interpolate, useCurrentFrame, Easing } from 'remotion';
import { C, W, H } from '../constants';
import { AnimIn } from '../components/AnimIn';
import { PopIn } from '../components/PopIn';
import { SceneLabel } from '../components/SceneLabel';

export const Scene8Outreach: React.FC = () => {
  const frame = useCurrentFrame();
  const ease  = Easing.bezier(0.16, 1, 0.3, 1);
  const overshoot = Easing.bezier(0.34, 1.56, 0.64, 1);

  const chromeTx = interpolate(frame, [18, 34], [90, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease,
  });
  const chromeOp = interpolate(frame, [18, 30], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

  const bubbleScale = interpolate(frame, [30, 46], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: overshoot,
  });
  const bubbleOp = interpolate(frame, [30, 38], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

  const fadeAll = interpolate(frame, [78, 90], [1, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

  return (
    <div style={{ width: W, height: H, background: C.bg, position: 'relative', overflow: 'hidden', opacity: fadeAll }}>

      <SceneLabel number="05" label="Outreach" />

      <AnimIn from={10} duration={16} slideY={30} style={{ position: 'absolute', top: H/2 - 210, left: 120 }}>
        <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 80, fontWeight: 900, color: C.white, lineHeight: 1.1 }}>
          AI writes the perfect<br />opener. Personalised.<br />Instant.
        </div>
      </AnimIn>

      {/* WA Chrome panel */}
      <div style={{
        position: 'absolute', top: H/2 - 280, right: 60,
        width: 800, opacity: chromeOp, transform: `translateX(${chromeTx}px)`,
        background: C.z900, borderRadius: 20,
        border: `1px solid ${C.z800}`, overflow: 'hidden',
      }}>

        {/* Header bar */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 14,
          padding: '0 24px', height: 60,
          background: C.z800, borderBottom: `1px solid ${C.z700}`,
        }}>
          {/* Avatar */}
          <div style={{
            width: 36, height: 36, borderRadius: '50%', background: C.green,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'Inter, sans-serif', fontSize: 14, fontWeight: 900, color: '#000',
          }}>AH</div>
          <div>
            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 18, fontWeight: 700, color: C.z100 }}>
              Dr. Amina Hassan
            </div>
            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, color: C.green }}>Online</div>
          </div>
          <div style={{ marginLeft: 'auto', fontFamily: 'Inter, sans-serif', fontSize: 14, color: C.z500 }}>
            Clinical Director · Dental Smiles
          </div>
        </div>

        {/* WA bubble */}
        <div style={{ padding: '28px 24px 20px', minHeight: 180, background: '#111b21' }}>
          <div style={{
            transform: `scale(${bubbleScale})`, opacity: bubbleOp,
            transformOrigin: 'bottom left',
            background: C.waBubble, borderRadius: '4px 18px 18px 18px',
            padding: '18px 22px', display: 'inline-block', maxWidth: 680,
          }}>
            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 22, color: C.white, lineHeight: 1.55 }}>
              Hi Dr. Amina, noticed Dental Smiles doesn't have online booking — your 4.9★ rating is losing appointments every night. 2 minutes to fix that?
            </div>
            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, color: 'rgba(255,255,255,0.55)', marginTop: 8, textAlign: 'right' }}>
              10:42 AM ✓✓
            </div>
          </div>
        </div>

        {/* Email row */}
        <AnimIn from={52} duration={12}>
          <div style={{
            padding: '14px 24px',
            background: C.z800, borderTop: `1px solid ${C.z700}`,
            borderBottom: `1px solid ${C.z700}`,
          }}>
            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 18, fontWeight: 700, color: C.z200, marginBottom: 3 }}>
              Missing booking system at Dental Smiles?
            </div>
            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 16, color: C.z500 }}>
              Hi Dr. Hassan, your 4.9★ rating with 312 patients means you're leaving 20–30 appointments...
            </div>
          </div>
        </AnimIn>

        {/* Actions row */}
        <AnimIn from={60} duration={10}>
          <div style={{ padding: '18px 24px', display: 'flex', gap: 12 }}>
            <div style={{
              fontFamily: 'Inter, sans-serif', fontSize: 17, color: C.z300,
              background: C.z800, border: `1px solid ${C.z700}`,
              padding: '10px 24px', borderRadius: 10, cursor: 'pointer',
            }}>
              Copy WA
            </div>
            <PopIn from={64} duration={12}>
              <div style={{
                fontFamily: 'Inter, sans-serif', fontSize: 17, fontWeight: 700, color: C.white,
                background: C.red, padding: '10px 28px', borderRadius: 10,
              }}>
                Send via WhatsApp →
              </div>
            </PopIn>
          </div>
        </AnimIn>
      </div>

    </div>
  );
};
