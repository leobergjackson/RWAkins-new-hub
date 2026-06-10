import { useState, useEffect } from "react";

export function useUptime(startTime?: Date) {
  const [elapsed, setElapsed] = useState("0h 0m 0s");

  useEffect(() => {
    const start = startTime || new Date(Date.now() - 9_252_000);

    const update = () => {
      const diff = Date.now() - start.getTime();
      const h = Math.floor(diff / 3_600_000);
      const m = Math.floor((diff % 3_600_000) / 60_000);
      const s = Math.floor((diff % 60_000) / 1_000);
      setElapsed(`${h}h ${m}m ${s}s`);
    };

    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [startTime]);

  return elapsed;
}
