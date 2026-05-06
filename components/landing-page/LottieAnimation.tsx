"use client";

import lottie from "lottie-web";
import { useEffect, useRef } from "react";

export function LottieAnimation({
  path,
  className = "",
}: {
  path: string;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const animation = lottie.loadAnimation({
      container: containerRef.current,
      renderer: "svg",
      loop: true,
      autoplay: true,
      path,
    });

    return () => animation.destroy();
  }, [path]);

  return <div ref={containerRef} className={className} aria-hidden="true" />;
}
