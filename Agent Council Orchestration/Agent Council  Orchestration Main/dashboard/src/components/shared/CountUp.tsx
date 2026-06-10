import { useRef, useState, useEffect } from "react";
import { useCountUp } from "@/hooks/useCountUp";

interface CountUpProps {
  target: number;
  duration?: number;
  className?: string;
}

export default function CountUp({ target, duration = 2000, className }: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const [started, setStarted] = useState(false);
  const value = useCountUp(target, duration, started);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setStarted(true);
          obs.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <span ref={ref} className={className}>
      {value.toLocaleString()}
    </span>
  );
}
