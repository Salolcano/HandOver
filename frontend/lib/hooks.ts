"use client";
import { useCallback, useEffect, useRef, useState } from "react";

/** Load something from the chain; reload() re-reads it, error is a sentence. */
export function useLoad<T>(load: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const loader = useRef(load);
  loader.current = load;

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setData(await loader.current());
      setError("");
    } catch (err) {
      const e = err as { message?: string };
      setError(e?.message ? String(e.message).slice(0, 240) : "Could not read from the chain.");
    } finally {
      setLoading(false);
    }
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { void reload(); }, deps);
  return { data, error, loading, reload };
}
