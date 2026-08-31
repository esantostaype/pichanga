import type { MetadataRoute } from "next";

import { SITE, THEME } from "@/lib/site";

/**
 * What the phone reads when somebody adds the app to their home screen.
 *
 * A route rather than the `manifest.json` the icon generator wrote, for two
 * reasons: that file names the app "App" and points at `/android-icon-*.png`
 * at the root, where nothing lives, and a manifest is fetched without cookies
 * -- so there is no language to read here and the words stay English on
 * purpose rather than by accident.
 *
 * Next serves this at `/manifest.webmanifest` and links it from every page, so
 * nothing has to reference it by hand.
 */
export default function manifest(): MetadataRoute.Manifest {
  const png = (size: number) => ({
    src: `/images/favicon/android-icon-${size}x${size}.png`,
    sizes: `${size}x${size}`,
    type: "image/png",
  });

  return {
    name: SITE.title,
    short_name: SITE.name,
    description: SITE.description,
    start_url: "/",
    display: "standalone",
    background_color: THEME,
    theme_color: THEME,
    icons: [36, 48, 72, 96, 144, 192].map(png),
  };
}
