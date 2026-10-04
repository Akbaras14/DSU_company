"use client";

/**
 * Adapted from React Bits Carousel by David Haz (2026).
 * Source: https://github.com/DavidHDev/react-bits/blob/main/src/ts-default/Components/Carousel/Carousel.tsx
 * License: MIT + Commons Clause; see LICENSE.md in this directory.
 * Adaptations: image layers with opacity crossfade instead of a draggable card
 * track; responsive storefront classes and automatic playback.
 */
import { useEffect, useState, type ReactNode } from "react";
import { motion } from "motion/react";

interface CarouselItem {
  src: string;
  name: string;
}

interface CarouselProps<T extends CarouselItem> {
  items: readonly T[];
  renderItem: (item: T, index: number) => ReactNode;
  autoplay?: boolean;
  autoplayDelay?: number;
  loop?: boolean;
  duration?: number;
  className?: string;
  slideClassName?: string;
}

export default function Carousel<T extends CarouselItem>({
  items,
  renderItem,
  autoplay = false,
  autoplayDelay = 3000,
  loop = false,
  duration = 1.2,
  className,
  slideClassName,
}: CarouselProps<T>) {
  const [position, setPosition] = useState(0);

  useEffect(() => {
    if (!autoplay || items.length <= 1) return;
    const timer = window.setInterval(() => {
      setPosition((previous) =>
        loop
          ? (previous + 1) % items.length
          : Math.min(previous + 1, items.length - 1),
      );
    }, autoplayDelay);
    return () => window.clearInterval(timer);
  }, [autoplay, autoplayDelay, items.length, loop]);

  return (
    <div
      className={className}
      role="group"
      aria-label="Koleksi tanaman pilihan"
    >
      {items.map((item, index) => (
        <motion.div
          key={item.src}
          className={slideClassName}
          initial={false}
          animate={{ opacity: position === index ? 1 : 0 }}
          transition={{
            duration,
            ease: "easeInOut",
          }}
          data-active={position === index}
          aria-hidden={position !== index}
        >
          {renderItem(item, index)}
        </motion.div>
      ))}
    </div>
  );
}
