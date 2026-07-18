// The Camera Bubble surface (route #/bubble): a frameless, transparent,
// always-on-top window that floats over the screen and IS captured in the
// Recording. Fills the window with a circular webcam view; the whole window is
// an OS drag handle, and small S/M/L buttons ask the main process to resize it.
import type { BubbleSize } from '../../../shared/domain';
import { loom } from '../../lib/loom-api';
import { useCamera } from '../../hooks/use-camera';

// `-webkit-app-region` is a valid CSS property in Electron but is not part of the
// standard React.CSSProperties, so we widen the type with the vendor key.
type DraggableStyle = React.CSSProperties & {
  WebkitAppRegion?: 'drag' | 'no-drag';
};

const dragStyle: DraggableStyle = { WebkitAppRegion: 'drag' };
const noDragStyle: DraggableStyle = { WebkitAppRegion: 'no-drag' };

const SIZE_OPTIONS: ReadonlyArray<{ size: BubbleSize; label: string }> = [
  { size: 'small', label: 'S' },
  { size: 'medium', label: 'M' },
  { size: 'large', label: 'L' },
];

export const CameraBubble = () => {
  const { videoRef, error } = useCamera();

  return (
    <div
      className="group relative h-full w-full overflow-hidden rounded-full bg-black"
      style={dragStyle}
    >
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className="h-full w-full object-cover"
      />

      {error ? (
        <div className="absolute inset-0 flex items-center justify-center p-4 text-center text-xs text-white">
          {error}
        </div>
      ) : null}

      <div
        className="absolute inset-x-0 bottom-3 flex justify-center gap-1 opacity-0 transition-opacity duration-150 group-hover:opacity-100"
        style={noDragStyle}
      >
        {SIZE_OPTIONS.map(({ size, label }) => (
          <button
            key={size}
            type="button"
            style={noDragStyle}
            onClick={() => {
              void loom.setBubbleSize(size);
            }}
            className="flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-[10px] font-medium text-white transition-colors hover:bg-black/80"
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
};
