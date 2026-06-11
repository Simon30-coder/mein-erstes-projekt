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

export type MoreLogoProps = {
  // Background fill. Defaults to transparent (for alpha renders); pass an
  // opaque color (e.g. "#FFFFFF") for flat MP4 output.
  background: string;
};

export const MoreLogo: React.FC<MoreLogoProps> = ({background}) => {
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

  // Fixed 3D angle throughout — the logo holds the same pose with no rotation
  // settle on entry and no idle rocking once it lands.
  const rotateY = FINAL_ROTATION_Y;

  return (
    <AbsoluteFill style={{backgroundColor: background}}>
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
            transform: `translateY(${translateY}px) rotateY(${rotateY}deg)`,
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
