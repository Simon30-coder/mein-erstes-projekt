import React from "react";
import {
  AbsoluteFill,
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

// ---------------------------------------------------------------------------
// Timeline (30fps, 120 frames ≈ 4s)
//   0   – 45 : "before" photo holds full-width across the top half
//   45        : fat red cross slams in + red overlay fades in
//   48  – ~82 : before photo shrinks/slides to the left 50%; "after" pops in
//   82  – 120 : final side-by-side hold
// ---------------------------------------------------------------------------
const HOLD = 45;
const CROSS_IN = 45;
const TRANSITION_START = 48;
const AFTER_POP_START = 50;

type Box = { left: number; top: number; width: number; height: number };

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lerpBox = (a: Box, b: Box, t: number): Box => ({
  left: lerp(a.left, b.left, t),
  top: lerp(a.top, b.top, t),
  width: lerp(a.width, b.width, t),
  height: lerp(a.height, b.height, t),
});

export const BeforeAfter: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  // The whole composition plays out in the TOP HALF of the 9:16 frame.
  const stageHeight = height / 2;

  // "before" photo geometry: starts full-width, ends in the left half.
  const fullBox: Box = { left: 0, top: 0, width, height: stageHeight };
  const leftBox: Box = { left: 0, top: 0, width: width / 2, height: stageHeight };
  const rightBox: Box = {
    left: width / 2,
    top: 0,
    width: width / 2,
    height: stageHeight,
  };

  // Smooth shrink/slide of the before photo.
  const transition = spring({
    frame: frame - TRANSITION_START,
    fps,
    config: { damping: 200, mass: 1, stiffness: 80 },
    durationInFrames: 34,
  });
  const beforeBox = lerpBox(fullBox, leftBox, transition);

  // Red cross slams in with a touch of overshoot.
  const crossProgress = spring({
    frame: frame - CROSS_IN,
    fps,
    config: { damping: 11, mass: 0.6, stiffness: 220 },
  });
  // Grow from nothing so the cross is fully invisible during the opening hold.
  const crossScale = crossProgress;
  const crossOpacity = Math.min(1, crossProgress * 2);

  // Slight red rejection overlay fades in with the cross.
  const overlayOpacity = interpolate(
    frame,
    [CROSS_IN, CROSS_IN + 8],
    [0, 0.32],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // "after" photo pops in.
  const afterPop = spring({
    frame: frame - AFTER_POP_START,
    fps,
    config: { damping: 13, mass: 0.8, stiffness: 170 },
  });
  const afterScale = interpolate(afterPop, [0, 1], [0.55, 1]);
  const afterOpacity = interpolate(afterPop, [0, 0.35], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        background: "linear-gradient(160deg, #20242e 0%, #0a0b0e 100%)",
      }}
    >
      {/* AFTER photo — pops in on the right 50% of the top half */}
      <div
        style={{
          position: "absolute",
          left: rightBox.left,
          top: rightBox.top,
          width: rightBox.width,
          height: rightBox.height,
          opacity: afterOpacity,
          transform: `scale(${afterScale})`,
          overflow: "hidden",
        }}
      >
        <Img
          src={staticFile("before.jpeg")}
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />
      </div>

      {/* BEFORE photo — shrinks from full-width to the left 50% */}
      <div
        style={{
          position: "absolute",
          left: beforeBox.left,
          top: beforeBox.top,
          width: beforeBox.width,
          height: beforeBox.height,
          overflow: "hidden",
        }}
      >
        <Img
          src={staticFile("after.jpeg")}
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />

        {/* Slight red rejection overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundColor: "rgba(220, 20, 20, 1)",
            opacity: overlayOpacity,
          }}
        />

        {/* Fat red cross (corner-to-corner X), adapts to the current box size */}
        <RedCross
          width={beforeBox.width}
          height={beforeBox.height}
          scale={crossScale}
          opacity={crossOpacity}
        />
      </div>
    </AbsoluteFill>
  );
};

// A bold red X built from two rotated bars so it always reaches the corners
// of whatever box it is given (full-width or shrunken left half).
const RedCross: React.FC<{
  width: number;
  height: number;
  scale: number;
  opacity: number;
}> = ({ width, height, scale, opacity }) => {
  const diagonal = Math.sqrt(width * width + height * height);
  const angle = (Math.atan2(height, width) * 180) / Math.PI;
  const thickness = Math.max(18, width * 0.13);

  const bar: React.CSSProperties = {
    position: "absolute",
    top: "50%",
    left: "50%",
    width: diagonal,
    height: thickness,
    backgroundColor: "#e60023",
    borderRadius: thickness / 2,
    boxShadow: "0 0 24px rgba(0,0,0,0.45)",
  };

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        transform: `scale(${scale})`,
        opacity,
      }}
    >
      <div
        style={{
          ...bar,
          transform: `translate(-50%, -50%) rotate(${angle}deg)`,
        }}
      />
      <div
        style={{
          ...bar,
          transform: `translate(-50%, -50%) rotate(${-angle}deg)`,
        }}
      />
    </div>
  );
};
