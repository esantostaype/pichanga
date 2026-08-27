/**
 * Cloudinary delivery URLs.
 *
 * The database stores the original, which is whatever came out of somebody's
 * phone -- several megabytes of it. Nothing shows the original directly: the
 * transformation goes in the URL and Cloudinary renders and caches the size we
 * actually need.
 */

/** Inserts a transformation into a delivery URL, after `/upload/`. */
function transform(url: string, params: string) {
  const marker = "/upload/";
  const at = url.indexOf(marker);
  // Not a delivery URL we recognise: better the original than a broken link.
  if (at === -1) return url;

  const head = url.slice(0, at + marker.length);
  return `${head}${params}/${url.slice(at + marker.length)}`;
}

/** A square crop for the grid. Small on purpose: the album has many of these. */
export const thumbUrl = (url: string) =>
  transform(url, "c_fill,g_auto,w_400,h_400,q_auto,f_auto");

/**
 * The first thing the viewer paints: forty pixels wide, a couple of kilobytes,
 * blown up and left pixelated on purpose while the real photo arrives.
 */
export const pixelatedUrl = (url: string) =>
  transform(url, "c_limit,w_40,q_30,f_auto");

/** The one worth looking at. Capped so a 6000px original is not sent whole. */
export const fullUrl = (url: string) =>
  transform(url, "c_limit,w_2400,q_auto,f_auto");
