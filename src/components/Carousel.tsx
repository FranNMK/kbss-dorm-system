"use client";

import Image from "next/image";
import { useEffect, useRef, useState, useCallback } from "react";

export interface CarouselSlide {
  src: string;
  alt: string;
  caption?: string;
}

interface CarouselProps {
  slides: CarouselSlide[];
  /** Auto-advance interval in ms. Default: 4500 */
  interval?: number;
}

export default function Carousel({ slides, interval = 4500 }: CarouselProps) {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const total = slides.length;

  const next = useCallback(() => {
    setCurrent((c) => (c + 1) % total);
  }, [total]);

  const prev = useCallback(() => {
    setCurrent((c) => (c - 1 + total) % total);
  }, [total]);

  const goTo = useCallback((index: number) => {
    setCurrent(index);
  }, []);

  // Auto-advance timer
  useEffect(() => {
    if (paused) return;
    timerRef.current = setTimeout(next, interval);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [current, paused, next, interval]);

  // Keyboard navigation
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev]);

  return (
    <div
      className="relative w-full overflow-hidden bg-primary"
      style={{ aspectRatio: "16 / 7" }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      // Touch: pause while touching
      onTouchStart={() => setPaused(true)}
      onTouchEnd={() => setPaused(false)}
      aria-roledescription="carousel"
      aria-label="School photo carousel"
    >
      {/* Slides */}
      {slides.map((slide, i) => (
        <div
          key={i}
          role="group"
          aria-roledescription="slide"
          aria-label={`Slide ${i + 1} of ${total}`}
          aria-hidden={i !== current}
          className={`absolute inset-0 transition-opacity duration-700 ${
            i === current ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
        >
          <Image
            src={slide.src}
            alt={slide.alt}
            fill
            sizes="100vw"
            className="object-cover"
            loading={i === 0 ? "eager" : "lazy"}
            priority={i === 0}
          />

          {/* Flat scrim — NO gradient, just a flat semi-transparent overlay */}
          {slide.caption && (
            <div className="absolute inset-0" style={{ background: "rgba(20,33,61,0.55)" }}>
              <div className="absolute bottom-10 left-0 right-0 text-center px-4">
                <p className="text-neutral text-lg md:text-2xl font-semibold drop-shadow-none">
                  {slide.caption}
                </p>
              </div>
            </div>
          )}
        </div>
      ))}

      {/* Prev / Next buttons */}
      <button
        onClick={prev}
        aria-label="Previous slide"
        className="absolute left-3 top-1/2 -translate-y-1/2 z-10
          w-9 h-9 flex items-center justify-center
          bg-primary text-neutral rounded-sm
          hover:bg-accent hover:text-primary
          focus:outline-none focus-visible:ring-2 focus-visible:ring-accent
          transition-colors"
      >
        {/* Left chevron */}
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
          <path d="M10 3L5 8L10 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      <button
        onClick={next}
        aria-label="Next slide"
        className="absolute right-3 top-1/2 -translate-y-1/2 z-10
          w-9 h-9 flex items-center justify-center
          bg-primary text-neutral rounded-sm
          hover:bg-accent hover:text-primary
          focus:outline-none focus-visible:ring-2 focus-visible:ring-accent
          transition-colors"
      >
        {/* Right chevron */}
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
          <path d="M6 3L11 8L6 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {/* Dot indicators */}
      <div
        className="absolute bottom-3 left-0 right-0 z-10 flex justify-center gap-2"
        role="tablist"
        aria-label="Slide indicators"
      >
        {slides.map((_, i) => (
          <button
            key={i}
            role="tab"
            aria-selected={i === current}
            aria-label={`Go to slide ${i + 1}`}
            onClick={() => goTo(i)}
            className="w-2.5 h-2.5 rounded-full border-0 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            style={{
              background: i === current ? "#E8A33D" : "rgba(20,33,61,0.40)",
            }}
          />
        ))}
      </div>

      {/* Slide counter (screen-reader live region) */}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        Slide {current + 1} of {total}
      </div>
    </div>
  );
}
