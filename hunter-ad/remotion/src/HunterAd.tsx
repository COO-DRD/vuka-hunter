import React from 'react';
import { Sequence, AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { W, H, S } from './constants';
import { Scene1Hook }     from './scenes/Scene1Hook';
import { Scene2Pain }     from './scenes/Scene2Pain';
import { Scene3Brand }    from './scenes/Scene3Brand';
import { Scene4Discover } from './scenes/Scene4Discover';
import { Scene5Enrich }   from './scenes/Scene5Enrich';
import { Scene6Score }    from './scenes/Scene6Score';
import { Scene7Contacts } from './scenes/Scene7Contacts';
import { Scene8Outreach } from './scenes/Scene8Outreach';
import { Scene9CTA }      from './scenes/Scene9CTA';

// Full-comp cross-fade transition overlay between scenes
const SceneTransition: React.FC<{ at: number }> = ({ at }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [at - 4, at, at + 4], [0, 1, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  return (
    <div style={{
      position: 'absolute', inset: 0, background: '#000',
      opacity, pointerEvents: 'none',
    }} />
  );
};

export const HunterAd: React.FC = () => (
  <AbsoluteFill style={{ background: '#09090b', width: W, height: H }}>

    {/* ── Scenes ── */}
    <Sequence from={S.hook}     durationInFrames={90}><Scene1Hook /></Sequence>
    <Sequence from={S.pain}     durationInFrames={90}><Scene2Pain /></Sequence>
    <Sequence from={S.brand}    durationInFrames={90}><Scene3Brand /></Sequence>
    <Sequence from={S.discover} durationInFrames={150}><Scene4Discover /></Sequence>
    <Sequence from={S.enrich}   durationInFrames={120}><Scene5Enrich /></Sequence>
    <Sequence from={S.score}    durationInFrames={120}><Scene6Score /></Sequence>
    <Sequence from={S.contacts} durationInFrames={90}><Scene7Contacts /></Sequence>
    <Sequence from={S.outreach} durationInFrames={90}><Scene8Outreach /></Sequence>
    <Sequence from={S.cta}      durationInFrames={60}><Scene9CTA /></Sequence>

    {/* ── Flash cuts between scenes ── */}
    {[S.pain, S.brand, S.discover, S.enrich, S.score, S.contacts, S.outreach, S.cta].map(
      (at) => <SceneTransition key={at} at={at} />
    )}

  </AbsoluteFill>
);
