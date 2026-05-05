"use client";

import { useEffect, useState } from "react";

/**
 * Client-only matchMedia; `defaultState` is used before mount (and for SSR).
 */
export function useMediaQuery(query: string, defaultState = false): boolean {
  const [matches, setMatches] = useState(defaultState);

  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = () => setMatches(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [query]);

  return matches;
}
