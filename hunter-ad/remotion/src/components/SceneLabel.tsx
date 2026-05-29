import React from 'react';
import { C } from '../constants';
import { AnimIn } from './AnimIn';

interface Props {
  number: string;
  label: string;
}

export const SceneLabel: React.FC<Props> = ({ number, label }) => (
  <AnimIn from={0} duration={10} style={{ position: 'absolute', top: 56, left: 120 }}>
    <div style={{
      fontFamily: 'Inter, sans-serif',
      fontSize: 22,
      fontWeight: 400,
      color: C.red,
      letterSpacing: '0.28em',
      textTransform: 'uppercase',
    }}>
      {number}&nbsp;&nbsp;{label}
    </div>
  </AnimIn>
);
