"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

type Props = {
  src: string;
  loop?: boolean;
  muted?: boolean;
  fallback: ReactNode;
  onTime?: (seconds: number) => void;
  onEnded?: () => void;
};

const MAX_ERRORS = 5;
const STALL_SECONDS = 5;

// Plays the mp4 at `src`. If the file is missing/unplayable it retries, then shows `fallback`.
// A watchdog restarts the video if it freezes (long-running kiosks can stall the decoder).
export default function StageVideo({ src, loop, muted = true, fallback, onTime, onEnded }: Props) {
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    let lastTime = -1;
    let stuck = 0;
    const id = setInterval(() => {
      const v = ref.current;
      if (!v || v.ended) return;
      if (!v.paused && v.currentTime !== lastTime) {
        lastTime = v.currentTime;
        stuck = 0;
        return;
      }
      if (++stuck < STALL_SECONDS) return;
      // Frozen or paused: nudge it, then reload the source, then remount the element.
      if (stuck === STALL_SECONDS) {
        void v.play().catch(() => {});
      } else if (stuck === STALL_SECONDS + 3) {
        v.load();
        void v.play().catch(() => {});
      } else if (stuck >= STALL_SECONDS + 6) {
        stuck = 0;
        setAttempt((a) => a + 1);
      }
    }, 1000);
    return () => clearInterval(id);
  }, [attempt]);

  if (failed) return <>{fallback}</>;

  return (
    <video
      key={attempt}
      ref={ref}
      className="absolute inset-0 h-full w-full object-cover"
      src={src}
      autoPlay
      muted={muted}
      playsInline
      loop={loop}
      preload="auto"
      onError={() => {
        if (attempt + 1 >= MAX_ERRORS) setFailed(true);
        else setTimeout(() => setAttempt((a) => a + 1), 1000);
      }}
      onTimeUpdate={(e) => onTime?.(e.currentTarget.currentTime)}
      onEnded={onEnded}
    />
  );
}
