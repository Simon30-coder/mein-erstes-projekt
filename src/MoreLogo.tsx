import {
  AbsoluteFill,
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  Easing,
} from 'remotion';

/**
 * "more" logo reveal.
 *
 * - Background: transparent (render with an alpha-capable codec, e.g. ProRes 4444).
 * - Logo: bright red (#FF0000), vectorized for crisp edges through the 3D rotation.
 * - Entrance: blur-slide up (rises from below while a heavy blur resolves to sharp).
 * - Pose: rotated ~45deg on the Y axis with perspective, so it reads as 3D and
 *   grows in size from left to right (the right edge sits closer to the camera).
 */

// Final resting rotation. Negative tilts the RIGHT edge toward the camera,
// so the wordmark visibly gets bigger from left to right.
const FINAL_ROTATION_Y = -45;
const LOGO_WIDTH = 1180; // px, on the 1920x1080 canvas

export const MoreLogo: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  // Spring drives the slide-up so it eases in with a touch of natural settle.
  const enter = spring({
    frame,
    fps,
    config: {damping: 200, mass: 1.1, stiffness: 90},
    durationInFrames: 45,
  });

  // Slide up: starts 240px low, rises to its resting position.
  const translateY = interpolate(enter, [0, 1], [240, 0]);

  // Blur resolves from heavy to razor sharp over the first ~1.3s.
  const blur = interpolate(frame, [0, 38], [26, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });

  // Fade in alongside the blur.
  const opacity = interpolate(frame, [0, 30], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Rotation settles from a steeper angle into the final 45deg pose, adding
  // momentum to the 3D entrance.
  const rotateYEnter = interpolate(enter, [0, 1], [-68, FINAL_ROTATION_Y]);

  // Subtle, slow idle drift so the held frames stay alive (tiny breathing of
  // the angle + a gentle vertical bob) once it has settled.
  const idle = interpolate(frame, [45, 150], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const driftRotate = Math.sin(idle * Math.PI * 2) * 2.2; // +/- 2.2deg
  const driftY = Math.sin(idle * Math.PI * 2) * 6; // +/- 6px

  const rotateY = rotateYEnter + driftRotate;

  return (
    <AbsoluteFill style={{backgroundColor: 'transparent'}}>
      <AbsoluteFill
        style={{
          justifyContent: 'center',
          alignItems: 'center',
          // Perspective makes the Y rotation read as real depth.
          perspective: 1700,
          perspectiveOrigin: 'center center',
        }}
      >
        <div
          style={{
            width: LOGO_WIDTH,
            transformStyle: 'preserve-3d',
            transform: `translateY(${translateY + driftY}px) rotateY(${rotateY}deg)`,
            filter: `blur(${blur}px)`,
            opacity,
            // A soft drop shadow grounds the 3D pose.
            willChange: 'transform, filter, opacity',
          }}
        >
          <Img
            src={staticFile('logo-red.svg')}
            style={{
              width: '100%',
              height: 'auto',
              display: 'block',
              filter: 'drop-shadow(0 24px 40px rgba(180, 0, 0, 0.35))',
            }}
          />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
