"use client";

import { useEffect, useState, type ComponentType } from "react";

type ToasterProps = {
  richColors?: boolean;
  position?: "top-right";
};

export function LazyToaster() {
  const [ToasterComponent, setToasterComponent] =
    useState<ComponentType<ToasterProps> | null>(null);

  useEffect(() => {
    const load = async () => {
      const sonner = await import("sonner");
      setToasterComponent(() => sonner.Toaster);
    };

    const idleId =
      "requestIdleCallback" in window
        ? window.requestIdleCallback(load, { timeout: 2000 })
        : globalThis.setTimeout(load, 1200);

    return () => {
      if ("cancelIdleCallback" in window && typeof idleId === "number") {
        window.cancelIdleCallback(idleId);
      } else {
        window.clearTimeout(idleId as number);
      }
    };
  }, []);

  return ToasterComponent ? <ToasterComponent richColors position="top-right" /> : null;
}
