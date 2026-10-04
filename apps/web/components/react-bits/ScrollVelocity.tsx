"use client";

/**
 * Adapted from React Bits ScrollVelocity, David Haz (2026).
 * https://github.com/DavidHDev/react-bits/blob/main/src/ts-default/TextAnimations/ScrollVelocity/ScrollVelocity.tsx
 * MIT + Commons Clause: see LICENSE.md.
 * Adaptations: responsive interactive cards instead of text, leftward movement,
 * pause on card hover/focus, constant speed independent of page scroll.
 * Retains the source's Motion frame updates and wrap loop.
 */
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  motion,
  useTransform,
  useMotionValue,
  useAnimationFrame,
} from "motion/react";

export default function ScrollVelocity<T extends { id: string }>({
  items,
  renderItem,
  velocity = 56,
}: {
  items: readonly T[];
  renderItem: (item: T) => ReactNode;
  velocity?: number;
}) {
  const container = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, visible: 3, gap: 18 });
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const baseX = useMotionValue(0);
  const cardWidth = (size.width - size.gap * (size.visible - 1)) / size.visible;
  const copyWidth = items.length * (cardWidth + size.gap);
  const x = useTransform(baseX, (value) => {
    if (copyWidth <= 0 || items.length <= size.visible) return 0;
    return (((value % copyWidth) + copyWidth) % copyWidth) - copyWidth;
  });

  useEffect(() => {
    const element = container.current;
    if (!element) return;
    const measure = () => {
      const viewport = window.innerWidth;
      setSize({
        width: element.clientWidth,
        visible: viewport >= 1200 ? 3 : viewport > 380 ? 2 : 1,
        gap: viewport < 768 ? 12 : 18,
      });
    };
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    window.addEventListener("resize", measure);
    measure();
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  useAnimationFrame((_, delta) => {
    if (hovered || focused || size.width === 0 || items.length <= size.visible)
      return;
    baseX.set(baseX.get() - velocity * (Math.min(delta, 50) / 1000));
  });

  const copies = items.length <= size.visible ? 1 : 2;
  return (
    <div
      ref={container}
      className="shop-product-carousel"
      role="region"
      aria-label="Tanaman pilihan"
      onFocusCapture={(event) =>
        setFocused(event.target.matches(":focus-visible"))
      }
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget))
          setFocused(false);
      }}
    >
      <motion.div className="shop-product-carousel-track" style={{ x }}>
        {Array.from({ length: copies }, (_, copy) => (
          <div
            key={copy}
            className="shop-product-velocity-copy"
            style={{ gap: size.gap, paddingRight: size.gap }}
          >
            {items.map((item) => (
              <div
                key={item.id}
                className="shop-product-carousel-slide"
                style={{ width: Math.max(cardWidth, 0) || undefined }}
                onMouseEnter={() => setHovered(true)}
                onMouseLeave={() => setHovered(false)}
              >
                {renderItem(item)}
              </div>
            ))}
          </div>
        ))}
      </motion.div>
    </div>
  );
}
