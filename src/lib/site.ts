/**
 * Canonical origin used to turn relative metadata paths into absolute URLs.
 * Social crawlers reject relative `og:image` values, so this has to resolve to
 * a real origin in production.
 */
function resolveSiteUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  // Set automatically on Vercel deployments.
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  return "http://localhost:3000";
}

export const SITE = {
  url: resolveSiteUrl(),
  name: "Pichangapp",
  title: "Pichangapp - Office lineup",
  description:
    "Build the lineup for the office match: create the date, add players and watch them appear on the pitch in real time.",
  /** Open Graph expects 1200x630 (1.91:1). */
  cover: {
    path: "/images/cover.webp",
    width: 1200,
    height: 630,
    type: "image/webp",
    alt: "Pichangapp - the office match lineup on a football pitch",
  },
} as const;
