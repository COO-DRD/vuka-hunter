import React from 'react';
import { interpolate, useCurrentFrame, Easing } from 'remotion';

interface Props {
  from?: number;
  duration?: number;
  slideY?: number;
  slideX?: number;
  children: React.ReactNode;
  style?: React.CSSProperties;
}

export const AnimIn: React.FC<Props> = ({
  from = 0,
  duration = 16,
  slideY = 0,
  slideX = 0,
  children,
  style,
}) => {
  const frame = useCurrentFrame();
  const ease  = Easing.bezier(0.16, 1, 0.3, 1);

  const opacity = interpolate(frame, [from, from + duration], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease,
  });
  const ty = interpolate(frame, [from, from + duration], [slideY, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease,
  });
  const tx = interpolate(frame, [from, from + duration], [slideX, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease,
  });

  return (
    <div style={{ opacity, transform: `translate(${tx}px, ${ty}px)`, ...style }}>
      {children}
    </div>
  );
};
