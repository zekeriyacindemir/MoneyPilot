'use client';

import { useEffect, useRef, useState } from 'react';

interface AmbientVideoProps {
  src: string;
  poster: string;
  className?: string;
  /** Shows a small pause/play button; required where the video is the main visual (WCAG 2.2.2). */
  withControl?: boolean;
}

/**
 * Decorative, muted background video. It only plays while on screen, and stays on its poster
 * frame for visitors who prefer reduced motion or have data saving turned on.
 */
export function AmbientVideo({
  src,
  poster,
  className = '',
  withControl = false,
}: AmbientVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [allowed, setAllowed] = useState(false);
  const [pausedByUser, setPausedByUser] = useState(false);

  useEffect(() => {
    const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } })
      .connection;
    const update = () => setAllowed(!reduceMotion.matches && !connection?.saveData);
    update();
    reduceMotion.addEventListener('change', update);
    return () => reduceMotion.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (!allowed || pausedByUser) {
      video.pause();
      return;
    }
    video.muted = true;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) void video.play().catch(() => undefined);
        else video.pause();
      },
      { threshold: 0.15 },
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, [allowed, pausedByUser]);

  return (
    <>
      <video
        ref={videoRef}
        aria-hidden="true"
        className={`pointer-events-none object-cover ${className}`}
        loop
        muted
        playsInline
        poster={poster}
        preload={allowed ? 'auto' : 'none'}
        src={src}
        tabIndex={-1}
      />
      {withControl && allowed ? (
        <button
          type="button"
          onClick={() => setPausedByUser((value) => !value)}
          aria-label={pausedByUser ? 'Arka plan videosunu oynat' : 'Arka plan videosunu durdur'}
          className="absolute right-5 bottom-5 z-20 inline-flex size-10 items-center justify-center rounded-full border border-white/20 bg-black/35 text-white backdrop-blur-md hover:bg-black/55 sm:right-8 sm:bottom-8"
        >
          {pausedByUser ? (
            <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden="true">
              <path d="M8 5.5v13l10-6.5z" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden="true">
              <path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" />
            </svg>
          )}
        </button>
      ) : null}
    </>
  );
}
