"use client";

/**
 * The end of a game, made impossible to miss: the referee's whistle out loud,
 * and a notification from the browser -- the one that buzzes the phone and
 * shows on the lock screen.
 */

const WHISTLE = "/audio/whistle.mp3";

let whistle: HTMLAudioElement | null = null;

function element() {
  if (typeof window === "undefined") return null;
  if (!whistle) {
    whistle = new Audio(WHISTLE);
    whistle.preload = "auto";
  }
  return whistle;
}

/**
 * Asks for what the end of a game needs, from inside a tap.
 *
 * Both have to be asked from a gesture: a browser only lets a page make a
 * sound it has already been allowed to make, and only asks for notification
 * permission when somebody pressed something. Kick-off is that press. The
 * whistle is played silently once to unlock it, and the worker is registered
 * so the notification has something to come through.
 */
export async function prepareFullTime(matchId?: string) {
  const clip = element();
  if (clip) {
    clip.muted = true;
    try {
      await clip.play();
      clip.pause();
      clip.currentTime = 0;
    } catch {
      // Not allowed yet: the next gesture will try again.
    }
    clip.muted = false;
  }

  if ("serviceWorker" in navigator) {
    try {
      await navigator.serviceWorker.register("/sw.js");
    } catch {
      // No worker, no notification -- the whistle still blows.
    }
  }

  if ("Notification" in window && Notification.permission === "default") {
    try {
      await Notification.requestPermission();
    } catch {
      // Older Safari takes a callback instead; it simply goes unasked.
    }
  }

  if (matchId) await subscribeToPush(matchId);
}

/**
 * Signs this browser up for the pushes that reach a locked phone, following
 * this match.
 *
 * Needs the permission already granted and a key from the server's config;
 * without either it quietly does nothing, and the page's own whistle and
 * notification still cover a phone that is unlocked. On an iPhone it only
 * works with the app added to the home screen -- that is Apple's rule.
 */
async function subscribeToPush(matchId: string) {
  const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (
    !key ||
    !("serviceWorker" in navigator) ||
    !("PushManager" in window) ||
    Notification.permission !== "granted"
  ) {
    return;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription =
      (await registration.pushManager.getSubscription()) ??
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: fromBase64Url(key),
      }));

    await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...subscription.toJSON(), matchId }),
    });
  } catch {
    // Refused or unsupported: the page's own whistle still blows.
  }
}

/** The VAPID key arrives base64url-encoded; the browser wants the bytes. */
function fromBase64Url(value: string) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(padded + "=".repeat((4 - (padded.length % 4)) % 4));
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let index = 0; index < raw.length; index += 1) {
    bytes[index] = raw.charCodeAt(index);
  }
  return bytes;
}

/** The whistle. Quietly nothing when the sound is off or not allowed. */
export function blowWhistle() {
  const clip = element();
  if (!clip) return;
  clip.currentTime = 0;
  void clip.play().catch(() => undefined);
}

/**
 * The notification: through the worker when there is one, which is the only
 * way Android shows it, and straight from the page otherwise.
 */
export async function notifyFullTime({
  title,
  body,
  tag,
  url,
}: {
  title: string;
  body: string;
  /** One per game, so a second phone's echo replaces rather than stacks. */
  tag: string;
  url: string;
}) {
  if (!("Notification" in window) || Notification.permission !== "granted") {
    return;
  }

  const options = {
    body,
    tag,
    icon: "/images/favicon/android-icon-192x192.png",
    badge: "/images/favicon/android-icon-192x192.png",
    data: { url },
    // Buzz like a whistle: short, short, long.
    vibrate: [200, 120, 200, 120, 600],
    requireInteraction: false,
  } as NotificationOptions;

  try {
    const registration = await navigator.serviceWorker?.getRegistration();
    if (registration) {
      await registration.showNotification(title, options);
      return;
    }
    new Notification(title, options);
  } catch {
    // A browser that will not show it: the whistle has already blown.
  }
}
