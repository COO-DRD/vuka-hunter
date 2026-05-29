import React from 'react';
import { Composition } from 'remotion';
import { HunterAd } from './HunterAd';
import { W, H, FPS, TOTAL_FRAMES } from './constants';
import { HunterAdVertical } from './HunterAdVertical';
import { VW, VH, TOTAL_FRAMES_V } from './constants_v';

export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="HunterAd"
      component={HunterAd}
      durationInFrames={TOTAL_FRAMES}
      fps={FPS}
      width={W}
      height={H}
    />
    <Composition
      id="HunterAdVertical"
      component={HunterAdVertical}
      durationInFrames={TOTAL_FRAMES_V}
      fps={FPS}
      width={VW}
      height={VH}
    />
  </>
);
