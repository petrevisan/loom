// Imperative getUserMedia lifecycle for the Camera Bubble.
// Acquires the webcam once, attaches it to a <video> ref, and fully tears the
// stream down on unmount. A ref latch guards React StrictMode's double-mount so
// we never open the camera twice.
import { useEffect, useRef, useState } from 'react';

type UseCamera = {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  error: string | null;
};

export const useCamera = (): UseCamera => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const acquiredRef = useRef(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (acquiredRef.current) return;
    acquiredRef.current = true;

    let stream: MediaStream | null = null;
    let cancelled = false;

    const acquire = async (): Promise<void> => {
      try {
        const media = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
        if (cancelled) {
          for (const track of media.getTracks()) track.stop();
          return;
        }
        stream = media;
        if (videoRef.current) videoRef.current.srcObject = media;
      } catch (cause) {
        if (cancelled) return;
        setError(
          cause instanceof Error ? cause.message : 'Unable to access the camera.',
        );
      }
    };

    void acquire();

    return () => {
      cancelled = true;
      acquiredRef.current = false;
      if (stream) {
        for (const track of stream.getTracks()) track.stop();
      }
      if (videoRef.current) videoRef.current.srcObject = null;
    };
  }, []);

  return { videoRef, error };
};
