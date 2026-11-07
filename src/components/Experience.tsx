"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { playRewind, startAmbient, stopAmbient, unlockAudio } from "@/lib/sound";
import PlaceholderVideo from "./PlaceholderVideo";
import StageVideo from "./StageVideo";

type Stage = "damaged" | "rewind";

function RewindIcon() {
  return (
    <svg viewBox="0 0 24 16" className="h-6 w-9" fill="currentColor" aria-hidden>
      <path d="M12 0v16L0 8zM24 0v16L12 8z" />
    </svg>
  );
}

function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-8 w-8" fill="currentColor" aria-hidden>
      <path d="M12 3 2 12h3v8h5v-5h4v5h5v-8h3z" />
    </svg>
  );
}

function FullscreenIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
    </svg>
  );
}

const FADE_MS = 1000;

// Fades its children in on mount (when startHidden) so a new video crossfades over the previous one.
function Layer({ startHidden, children }: { startHidden: boolean; children: ReactNode }) {
  const [visible, setVisible] = useState(!startHidden);

  useEffect(() => {
    if (visible) return;
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, [visible]);

  return (
    <div
      className="absolute inset-0 transition-opacity ease-in-out"
      style={{ opacity: visible ? 1 : 0, transitionDuration: `${FADE_MS}ms` }}
    >
      {children}
    </div>
  );
}

export default function Experience() {
  // The last layer is the current stage; the one before it is fading out underneath.
  const [layers, setLayers] = useState<Stage[]>(["damaged"]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [rewindDone, setRewindDone] = useState(false);
  const stage = layers[layers.length - 1];

  // Full track loops on the damaged screen. Browsers hold audio until a gesture, so any tap/key unlocks it.
  useEffect(() => {
    if (stage !== "damaged") return;
    void startAmbient();
    const events = ["pointerdown", "touchend", "click", "keydown"] as const;
    const unlock = () => void unlockAudio();
    events.forEach((e) => window.addEventListener(e, unlock));
    return () => {
      events.forEach((e) => window.removeEventListener(e, unlock));
    };
  }, [stage]);

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => {
      document.removeEventListener("fullscreenchange", onChange);
      clearTimeout(timer.current);
    };
  }, []);

  const enterFullscreen = () => {
    document.documentElement.requestFullscreen?.().catch(() => {});
  };

  const goTo = useCallback((next: Stage) => {
    clearTimeout(timer.current);
    setLayers((prev) => [prev[prev.length - 1], next]);
    timer.current = setTimeout(() => setLayers([next]), FADE_MS + 100);
  }, []);

  const goRewind = () => {
    stopAmbient();
    void playRewind();
    setRewindDone(false);
    goTo("rewind");
  };
  const goDamaged = () => {
    goTo("damaged");
    void startAmbient();
  };
  const onRewindEnded = useCallback(() => setRewindDone(true), []);

  const renderStage = (s: Stage) => {
    switch (s) {
      case "damaged":
        return (
          <StageVideo
            src="/videos/v1-loop.mp4"
            loop
            fallback={<PlaceholderVideo variant="damaged" />}
          />
        );
      case "rewind":
        return (
          <StageVideo
            src="/videos/v2-healing.mp4"
            muted={false}
            onEnded={onRewindEnded}
            fallback={<PlaceholderVideo variant="healing" onEnded={onRewindEnded} />}
          />
        );
    }
  };

  return (
    <main className="relative min-h-dvh w-full flex-1 overflow-hidden bg-white">
      {layers.map((s, i) => (
        <Layer key={s} startHidden={layers.length > 1 && i === layers.length - 1}>
          {renderStage(s)}
        </Layer>
      ))}

      {!isFullscreen && (
        <button
          onClick={enterFullscreen}
          aria-label="Full screen"
          className="absolute right-4 top-4 flex h-12 w-12 items-center justify-center rounded-full bg-dove-gold text-dove-navy shadow-xl transition hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-dove-navy"
        >
          <FullscreenIcon />
        </button>
      )}

      <div className="absolute inset-x-0 bottom-10 flex flex-col items-center gap-3">
        {stage === "damaged" && (
          <>
            <button
              onClick={goRewind}
              aria-label="Tap to rewind"
              className="flex h-16 w-16 items-center justify-center rounded-full bg-dove-gold text-dove-navy shadow-xl transition hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-dove-navy"
            >
              <RewindIcon />
            </button>
            <p className="rounded-full bg-white/85 px-4 py-1.5 text-sm font-semibold uppercase tracking-[0.25em] text-dove-navy">
              Tap to rewind
            </p>
          </>
        )}
        {stage === "rewind" && rewindDone && (
          <>
            <button
              onClick={goDamaged}
              aria-label="Go home"
              className="flex h-16 w-16 items-center justify-center rounded-full bg-dove-gold text-dove-navy shadow-xl transition hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-dove-navy"
            >
              <HomeIcon />
            </button>
            <p className="rounded-full bg-white/85 px-4 py-1.5 text-sm font-semibold uppercase tracking-[0.25em] text-dove-navy">
              Tap to go home
            </p>
          </>
        )}
      </div>
    </main>
  );
}
