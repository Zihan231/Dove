"use client";

import { useState, type ReactNode } from "react";

type Props = {
  src: string;
  loop?: boolean;
  muted?: boolean;
  fallback: ReactNode;
  onTime?: (seconds: number) => void;
  onEnded?: () => void;
};

// Plays the mp4 at `src`; if the file is missing/unplayable, shows `fallback`.
export default function StageVideo({ src, loop, muted = true, fallback, onTime, onEnded }: Props) {
  const [failed, setFailed] = useState(false);

  if (failed) return <>{fallback}</>;

  return (
    <video
      className="absolute inset-0 h-full w-full object-cover"
      src={src}
      autoPlay
      muted={muted}
      playsInline
      loop={loop}
      preload="auto"
      onError={() => setFailed(true)}
      onTimeUpdate={(e) => onTime?.(e.currentTarget.currentTime)}
      onEnded={onEnded}
    />
  );
}
