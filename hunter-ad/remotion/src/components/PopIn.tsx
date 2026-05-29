import React from 'react';
import { interpolate, useCurrentFrame, Easing } from 'remotion';

interface Props {
  from?: number;
  duration?: number;
  children: React.ReactNode;
  style?: React.CSSProperties;
}

export const PopIn: React.FC<Props> = ({ from = 0, duration = 14, children, style }) => {
  const frame = useCurrentFrame();
  // Overshoot spring feel
  const ease  = Easing.bezier(0.34, 1.56, 0.64, 1);

  const scale = interpolate(frame, [from, from + duration], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease,
  });
  const opacity = interpolate(frame, [from, from + 6], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

  return (
    <div style={{ transform: `scale(${scale})`, opacity, transformOrigin: 'center', ...style }}>
      {children}
    </div>
  );
};
