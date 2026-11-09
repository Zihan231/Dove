"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { playPart2, stopPart2, startAmbient, stopAmbient, unlockAudio } from "@/lib/sound";
import PlaceholderVideo from "./PlaceholderVideo";
import StageVideo from "./StageVideo";

type Stage = "damaged" | "rewind";

function RewindIcon() {
  return (
    <svg viewBox="0 0 24 16" className="h-[38%] w-[56%]" fill="currentColor" aria-hidden>
      <path d="M12 0v16L0 8zM24 0v16L12 8z" />
    </svg>
  );
}

function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[50%] w-[50%]" fill="currentColor" aria-hidden>
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

  const goTo = useCallback((next: Stage) => {
    clearTimeout(timer.current);
    setLayers((prev) => [prev[prev.length - 1], next]);
    timer.current = setTimeout(() => setLayers([next]), FADE_MS + 100);
  }, []);

  // Kiosk only: an abandoned end screen returns to the start, and the page reloads itself hourly
  // (while idle on the start screen) so a long run never accumulates problems.
  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_KIOSK) return;
    let lastTouch = Date.now();
    const touch = () => (lastTouch = Date.now());
    window.addEventListener("pointerdown", touch);
    const id = setInterval(() => {
      const idle = Date.now() - lastTouch > 30_000;
      if (stage === "damaged" && idle && performance.now() > 60 * 60 * 1000) location.reload();
    }, 10_000);
    const back =
      stage === "rewind" && rewindDone
        ? setTimeout(() => {
            stopPart2();
            goTo("damaged");
            void startAmbient();
          }, 60_000)
        : undefined;
    return () => {
      window.removeEventListener("pointerdown", touch);
      clearInterval(id);
      clearTimeout(back);
    };
  }, [stage, rewindDone, goTo]);

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

  const goRewind = () => {
    stopAmbient();
    void playPart2();
    setRewindDone(false);
    goTo("rewind");
  };
  const goDamaged = () => {
    stopPart2();
    goTo("damaged");
    void startAmbient();
  };
  const onRewindEnded = useCallback(() => setRewindDone(true), []);

  const renderStage = (s: Stage) => {
    switch (s) {
      case "damaged":
        return (
          <StageVideo
            src="/videos/v1-loop-4.mp4"
            loop
            fallback={<PlaceholderVideo variant="damaged" />}
          />
        );
      case "rewind":
        return (
          <StageVideo
            src="/videos/v2-healing-4.mp4"
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

      {!isFullscreen && !process.env.NEXT_PUBLIC_KIOSK && (
        <button
          onClick={enterFullscreen}
          aria-label="Full screen"
          className="absolute right-4 top-4 flex h-12 w-12 items-center justify-center rounded-full bg-dove-gold text-dove-navy shadow-xl transition hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-dove-navy"
        >
          <FullscreenIcon />
        </button>
      )}

      <div className="absolute inset-x-0 bottom-[clamp(2.5rem,8vmin,10rem)] flex flex-col items-center gap-[clamp(0.75rem,2vmin,2.5rem)]">
        {stage === "damaged" && (
          <>
            <button
              onClick={goRewind}
              aria-label="Tap to rewind"
              className="flex h-[clamp(4rem,12vmin,14rem)] w-[clamp(4rem,12vmin,14rem)] items-center justify-center rounded-full bg-dove-gold text-dove-navy shadow-xl transition hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-dove-navy"
            >
              <RewindIcon />
            </button>
            <p className="rounded-full bg-white/85 px-[clamp(1rem,3vmin,3rem)] py-[clamp(0.375rem,1vmin,1rem)] text-[clamp(0.875rem,2.6vmin,3rem)] font-semibold uppercase tracking-[0.25em] text-dove-navy">
              Tap to rewind
            </p>
          </>
        )}
        {stage === "rewind" && rewindDone && (
          <>
            <button
              onClick={goDamaged}
              aria-label="Go home"
              className="flex h-[clamp(4rem,12vmin,14rem)] w-[clamp(4rem,12vmin,14rem)] items-center justify-center rounded-full bg-dove-gold text-dove-navy shadow-xl transition hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-dove-navy"
            >
              <HomeIcon />
            </button>
            <p className="rounded-full bg-white/85 px-[clamp(1rem,3vmin,3rem)] py-[clamp(0.375rem,1vmin,1rem)] text-[clamp(0.875rem,2.6vmin,3rem)] font-semibold uppercase tracking-[0.25em] text-dove-navy">
              Tap to go home
            </p>
          </>
        )}
      </div>
    </main>
  );
}
