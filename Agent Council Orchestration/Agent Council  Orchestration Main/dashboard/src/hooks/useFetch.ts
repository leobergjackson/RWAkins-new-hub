import { useState, useEffect, useCallback } from "react";

export const API_BASE = import.meta.env.PROD ? "" : "http://localhost:3001";

/**
 * Validates that API response shape matches the demo data shape.
 * If demoData is an array, response must also be an array.
 * If demoData is an object, response must also be an object (not null/array).
 * Returns null if validation fails (caller should fall back to demoData).
 */
function validateShape<T>(json: unknown, demoData: T): T | null {
  if (json == null) return null;
  if (Array.isArray(demoData)) {
    // demoData is an array — response MUST be an array
    if (Array.isArray(json)) return json as T;
    // Try common wrapper patterns: { data: [...] }, { items: [...] }, { results: [...] }
    if (typeof json === "object") {
      const obj = json as Record<string, unknown>;
      for (const key of Object.keys(obj)) {
        if (Array.isArray(obj[key])) return obj[key] as T;
      }
    }
    return null; // not an array and no array property found
  }
  if (typeof demoData === "object" && !Array.isArray(demoData)) {
    // demoData is an object — response should also be an object
    if (typeof json === "object" && !Array.isArray(json)) return json as T;
    return null;
  }
  // primitives
  return json as T;
}

export function useFetch<T>(path: string, demoData: T) {
  // Initialize with demoData instead of null to prevent any flash of undefined state
  const [data, setData] = useState<T>(demoData);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(true);
  const [tick, setTick] = useState(0);

  const refetch = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    // Keep previous data during refetch instead of resetting to null
    // This prevents "e.map is not a function" crashes during re-renders

    async function fetchData() {
      try {
        const res = await fetch(`${API_BASE}${path}`, {
          signal: AbortSignal.timeout(5000),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (!cancelled) {
          const validated = validateShape(json, demoData);
          if (validated !== null) {
            setData(validated);
            setIsDemo(false);
          } else {
            // API returned wrong shape — fall back to demo
            setData(demoData);
            setIsDemo(true);
          }
        }
      } catch {
        if (!cancelled) {
          setData(demoData);
          setIsDemo(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchData();
    return () => { cancelled = true; };
  }, [path, tick]);

  // Belt-and-suspenders: always guarantee data is never null/undefined
  const safeData = data ?? demoData;
  // Extra safety: if demoData is an array, ensure we always return an array
  if (Array.isArray(demoData) && !Array.isArray(safeData)) {
    return { data: demoData, loading, isDemo: true, refetch };
  }
  return { data: safeData, loading, isDemo, refetch };
}
