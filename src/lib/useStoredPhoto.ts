"use client";

import { useSyncExternalStore } from "react";

const KEY = "mona:photo";
const subscribe = () => () => {};

function getSnapshot(fallback: string) {
  try {
    return sessionStorage.getItem(KEY) || fallback;
  } catch {
    return fallback;
  }
}

/**
 * Reads the user's selected photo from sessionStorage without triggering
 * cascading renders. Falls back to the provided default image on the server
 * and when no photo has been selected yet.
 */
export function useStoredPhoto(fallback: string) {
  return useSyncExternalStore(
    subscribe,
    () => getSnapshot(fallback),
    () => fallback
  );
}
