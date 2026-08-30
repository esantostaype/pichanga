"use client";

import { useCallback, useSyncExternalStore } from "react";

/** Where the choice is kept. Per browser, because so is the phone. */
const KEY = "pichanga:goal-sound";

const FILE = "/audio/gol.mp3";

/**
 * The shout, out loud.
 *
 * One element for the whole page rather than one per goal: a goal can follow a
 * goal by a second and a half, and two overlapping clips is noise rather than a
 * celebration -- the second one rewinds the first.
 */
let clip: HTMLAudioElement | null = null;

function element() {
  if (typeof window === "undefined") return null;
  if (!clip) {
    clip = new Audio(FILE);
    clip.preload = "auto";
  }
  return clip;
}

/* ------------------------------ the switch ------------------------------ */

const listeners = new Set<() => void>();

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

/*
 * Read straight out of storage rather than mirrored into state: a `useEffect`
 * that reads it and calls `setState` is one render of the wrong icon, and this
 * app's lint rules refuse it anyway. `useSyncExternalStore` is the shape React
 * has for exactly this, and it takes the server's answer for the first paint,
 * so nothing mismatches on hydration.
 */
const read = () => {
  try {
    return window.localStorage.getItem(KEY) !== "off";
  } catch {
    // Private windows and locked-down browsers throw rather than return null.
    return true;
  }
};

/** On unless somebody said otherwise: the sound is the point of the shout. */
const onTheServer = () => true;

export function useGoalSound() {
  const enabled = useSyncExternalStore(subscribe, read, onTheServer);

  const setEnabled = useCallback((next: boolean) => {
    try {
      window.localStorage.setItem(KEY, next ? "on" : "off");
    } catch {
      // Nothing to remember it with; the choice lasts as long as the page.
    }

    /*
     * Turning it on is a tap, which is the browser's price for playing audio
     * at all: load it now, while the gesture that asked for it is still the
     * one being handled.
     */
    if (next) element()?.load();

    listeners.forEach((listener) => listener());
  }, []);

  const play = useCallback(() => {
    if (!enabled) return;

    const audio = element();
    if (!audio) return;

    /*
     * From the top every time: the previous goal may still be playing, and
     * `play()` on a running clip does nothing at all.
     */
    audio.currentTime = 0;

    // A phone that has not been touched yet is not allowed to make noise. That
    // is the browser's rule and it is the right one; the promise rejects and
    // the goal still goes up on the screen.
    void audio.play().catch(() => undefined);
  }, [enabled]);

  return { enabled, setEnabled, play };
}
