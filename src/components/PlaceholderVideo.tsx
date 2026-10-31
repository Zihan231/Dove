"use client";

import { useEffect } from "react";

type Props = {
  variant: "damaged" | "healing";
  // Simulated playback for the healing stage so callouts/replay work without a real file.
  durationSeconds?: number;
  onTime?: (seconds: number) => void;
  onEnded?: () => void;
};

export default function PlaceholderVideo({ variant, durationSeconds = 7.8, onTime, onEnded }: Props) {
  useEffect(() => {
    if (variant !== "healing") return;
    const start = performance.now();
    const id = setInterval(() => {
      const t = (performance.now() - start) / 1000;
      onTime?.(Math.min(t, durationSeconds));
      if (t >= durationSeconds) {
        clearInterval(id);
        onEnded?.();
      }
    }, 100);
    return () => clearInterval(id);
  }, [variant, durationSeconds, onTime, onEnded]);

  const damaged = variant === "damaged";

  return (
    <div
      className="absolute inset-0 overflow-hidden"
      style={{
        background: damaged
          ? "linear-gradient(160deg, #d9d4cc 0%, #bdb6aa 100%)"
          : "linear-gradient(160deg, #fff6df 0%, #e8bc5d 100%)",
      }}
    >
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center text-dove-navy/70">
          <p className="text-sm uppercase tracking-[0.3em]">Placeholder</p>
          <p className="mt-2 text-2xl font-semibold">
            {damaged ? "Damaged hair loop" : "Healing video"}
          </p>
          <p className="mt-1 text-sm">
            Add public/videos/{damaged ? "damaged" : "healing"}.mp4
          </p>
        </div>
      </div>
      {!damaged && (
        <div
          className="absolute inset-y-0 w-1/3 bg-white/40 blur-2xl"
          style={{ animation: "sheen 3s ease-in-out infinite" }}
        />
      )}
    </div>
  );
}
