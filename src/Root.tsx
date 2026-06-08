import { Composition } from "remotion";
import { BeforeAfter } from "./BeforeAfter";

// 9:16 vertical format, 30fps, ~4s total.
export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="BeforeAfter"
      component={BeforeAfter}
      durationInFrames={120}
      fps={30}
      width={1080}
      height={1920}
    />
  );
};
