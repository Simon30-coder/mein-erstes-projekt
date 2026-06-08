import { Composition } from "remotion";
import { BeforeAfter } from "./BeforeAfter";

// 9:16 vertical format, 30fps, ~4.6s total (extended final hold).
export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="BeforeAfter"
      component={BeforeAfter}
      durationInFrames={138}
      fps={30}
      width={1080}
      height={1920}
    />
  );
};
