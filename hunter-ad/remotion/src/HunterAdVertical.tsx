import React from 'react';
import { Sequence, AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { VW, VH, VS } from './constants_v';
import { VS1Hook }     from './scenes/v/VS1Hook';
import { VS2Pain }     from './scenes/v/VS2Pain';
import { VS3Brand }    from './scenes/v/VS3Brand';
import { VS4Discover } from './scenes/v/VS4Discover';
import { VS5Enrich }   from './scenes/v/VS5Enrich';
import { VS6Score }    from './scenes/v/VS6Score';
import { VS7Contacts } from './scenes/v/VS7Contacts';
import { VS8Opener }   from './scenes/v/VS8Opener';
import { VS9Stats }    from './scenes/v/VS9Stats';
import { VS10CTA }     from './scenes/v/VS10CTA';
import { VS11End }     from './scenes/v/VS11End';

const Flash: React.FC<{ at: number }> = ({ at }) => {
  const f = useCurrentFrame();
  const o = interpolate(f, [at - 3, at, at + 3], [0, 1, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  return (
    <div style={{ position: 'absolute', inset: 0, background: '#000', opacity: o, pointerEvents: 'none' }} />
  );
};

export const HunterAdVertical: React.FC = () => (
  <AbsoluteFill style={{ background: '#09090b', width: VW, height: VH }}>

    <Sequence from={VS.hook}     durationInFrames={120}><VS1Hook /></Sequence>
    <Sequence from={VS.pain}     durationInFrames={120}><VS2Pain /></Sequence>
    <Sequence from={VS.brand}    durationInFrames={150}><VS3Brand /></Sequence>
    <Sequence from={VS.discover} durationInFrames={180}><VS4Discover /></Sequence>
    <Sequence from={VS.enrich}   durationInFrames={180}><VS5Enrich /></Sequence>
    <Sequence from={VS.score}    durationInFrames={180}><VS6Score /></Sequence>
    <Sequence from={VS.contacts} durationInFrames={180}><VS7Contacts /></Sequence>
    <Sequence from={VS.opener}   durationInFrames={180}><VS8Opener /></Sequence>
    <Sequence from={VS.stats}    durationInFrames={180}><VS9Stats /></Sequence>
    <Sequence from={VS.cta}      durationInFrames={150}><VS10CTA /></Sequence>
    <Sequence from={VS.end}      durationInFrames={180}><VS11End /></Sequence>

    {/* Flash cuts */}
    {[VS.pain, VS.brand, VS.discover, VS.enrich, VS.score, VS.contacts, VS.opener, VS.stats, VS.cta, VS.end].map(
      (at) => <Flash key={at} at={at} />,
    )}

  </AbsoluteFill>
);
