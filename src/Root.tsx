import {Composition} from 'remotion';
import {MoreLogo} from './MoreLogo';

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="MoreLogo"
      component={MoreLogo}
      durationInFrames={150}
      fps={30}
      width={1920}
      height={1080}
    />
  );
};
