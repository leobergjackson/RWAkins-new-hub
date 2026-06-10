import { useState, useEffect, useRef } from "react";

export function useCountUp(target: number, duration = 2000, start = true) {
  const [value, setValue] = useState(0);
  const rafId = useRef<number>();
  const startTime = useRef<number | null>(null);

  useEffect(() => {
    if (!start || target === 0) {
      if (!start) setValue(0);
      return;
    }

    startTime.current = null;

    const animate = (timestamp: number) => {
      if (!startTime.current) startTime.current = timestamp;
      const progress = Math.min((timestamp - startTime.current) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.floor(eased * target));

      if (progress < 1) {
        rafId.current = requestAnimationFrame(animate);
      }
    };

    rafId.current = requestAnimationFrame(animate);
    return () => {
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, [target, duration, start]);

  return value;
}
