"use client";

import { createContext, useContext } from "react";
import type { StudioClosure } from "./types";

// Studio closures are global, so they're shared through context rather
// than threaded through every card and list.
export const ClosuresContext = createContext<StudioClosure[]>([]);

export function useClosures() {
  return useContext(ClosuresContext);
}

// The closure a YYYY-MM-DD date falls in, if any. Dates compare as strings.
export function closureOn(
  iso: string,
  closures: StudioClosure[]
): StudioClosure | null {
  return closures.find((c) => iso >= c.start_date && iso <= c.end_date) ?? null;
}

// Closures that overlap [fromIso, toIso].
export function closuresBetween(
  fromIso: string,
  toIso: string,
  closures: StudioClosure[]
): StudioClosure[] {
  return closures.filter((c) => c.end_date >= fromIso && c.start_date <= toIso);
}

export function formatClosureRange(c: StudioClosure) {
  const fmt = (iso: string) => {
    const [y, m, d] = iso.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };
  return c.start_date === c.end_date
    ? fmt(c.start_date)
    : `${fmt(c.start_date)} to ${fmt(c.end_date)}`;
}
