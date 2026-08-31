import type { Metadata, Viewport } from "next";
import { Sofia_Sans, Sofia_Sans_Extra_Condensed } from "next/font/google";

import { LocaleProvider } from "@/components/providers/locale-provider";
import { Toaster } from "@/components/ui/toaster";
import { SceneTransitionProvider } from "@/components/layout/scene-transition";
import { TooltipProvider } from "@/components/ui/tooltip";
import { getDictionary, getLocale } from "@/i18n/server";
import { SITE, THEME } from "@/lib/site";
import { cn } from "@/lib/utils";
import "./globals.css";

/** UI text. */
const sofiaSans = Sofia_Sans({
  subsets: ["latin"],
  variable: "--font-sofia",
  display: "swap",
});

/** Headings and pitch tokens. Weight 500 is set by the `.font-display` class. */
const sofiaCondensed = Sofia_Sans_Extra_Condensed({
  subsets: ["latin"],
  variable: "--font-sofia-condensed",
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const t = await getDictionary();

  /*
   * The card the link shows in a chat carries the words too: a Spanish office
   * pasting the address into their group should not get an English preview.
   */
  return {
    ...metadata,
    title: t.site.title,
    description: t.site.description,
    openGraph: {
      ...metadata.openGraph,
      title: t.site.title,
      description: t.site.description,
    },
    twitter: {
      ...metadata.twitter,
      title: t.site.title,
      description: t.site.description,
    },
  };
}

const metadata: Metadata = {
  // Makes every relative path below resolve to an absolute URL.
  metadataBase: new URL(SITE.url),
  title: SITE.title,
  description: SITE.description,
  applicationName: SITE.name,
  alternates: { canonical: "/" },

  /*
   * The SVG first and on its own line: anything that understands one prefers
   * it, and it is the only mark that stays sharp at every size and follows the
   * tab's own light or dark. The PNGs underneath are for what cannot -- older
   * Android, the Windows tile, the .ico that a pinned shortcut still reaches
   * for -- and they all live in the folder the generator wrote.
   */
  icons: {
    icon: [
      { url: "/images/favicon.svg", type: "image/svg+xml" },
      { url: "/images/favicon/favicon.ico", sizes: "any" },
      {
        url: "/images/favicon/favicon-16x16.png",
        type: "image/png",
        sizes: "16x16",
      },
      {
        url: "/images/favicon/favicon-32x32.png",
        type: "image/png",
        sizes: "32x32",
      },
      {
        url: "/images/favicon/favicon-96x96.png",
        type: "image/png",
        sizes: "96x96",
      },
      {
        url: "/images/favicon/android-icon-192x192.png",
        type: "image/png",
        sizes: "192x192",
      },
    ],
    shortcut: [{ url: "/images/favicon.svg", type: "image/svg+xml" }],
    // Home-screen icons on iOS, which picks the closest size to its device.
    apple: [
      { url: "/images/favicon/apple-icon-57x57.png", sizes: "57x57" },
      { url: "/images/favicon/apple-icon-60x60.png", sizes: "60x60" },
      { url: "/images/favicon/apple-icon-72x72.png", sizes: "72x72" },
      { url: "/images/favicon/apple-icon-76x76.png", sizes: "76x76" },
      { url: "/images/favicon/apple-icon-114x114.png", sizes: "114x114" },
      { url: "/images/favicon/apple-icon-120x120.png", sizes: "120x120" },
      { url: "/images/favicon/apple-icon-144x144.png", sizes: "144x144" },
      { url: "/images/favicon/apple-icon-152x152.png", sizes: "152x152" },
      { url: "/images/favicon/apple-icon-180x180.png", sizes: "180x180" },
    ],
  },

  /*
   * The Windows tile. The generator suggested white for it and for the theme
   * colour; both stay the app's own black, because a white plate behind a dark
   * mark is the one place the icon would look broken.
   */
  other: {
    "msapplication-TileColor": THEME,
    "msapplication-TileImage": "/images/favicon/ms-icon-144x144.png",
  },

  openGraph: {
    type: "website",
    url: "/",
    siteName: SITE.name,
    title: SITE.title,
    description: SITE.description,
    locale: "en_US",
    images: [
      {
        url: SITE.cover.path,
        width: SITE.cover.width,
        height: SITE.cover.height,
        type: SITE.cover.type,
        alt: SITE.cover.alt,
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: SITE.title,
    description: SITE.description,
    images: [{ url: SITE.cover.path, alt: SITE.cover.alt }],
  },
};

export const viewport: Viewport = {
  themeColor: THEME,
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // The cookie decides the language, so the first paint is already in it --
  // no flash of the other one while JavaScript catches up.
  const locale = await getLocale();

  return (
    <html
      lang={locale}
      className={cn("dark", sofiaSans.variable, sofiaCondensed.variable)}
    >
      {/*
        The body scrolls when a page is taller than the window, and the pitch
        screens keep themselves still: they are `h-dvh` with their own
        `overflow-hidden`, so there is never anything to scroll there. Locking
        it here instead meant match night -- a page that grows -- could not
        scroll at all, whatever it did to itself.
      */}
      <body className="bg-background text-foreground antialiased">
        <LocaleProvider initial={locale}>
          <SceneTransitionProvider>
            <TooltipProvider delayDuration={250}>{children}</TooltipProvider>
          </SceneTransitionProvider>
        </LocaleProvider>
        <Toaster />
      </body>
    </html>
  );
}
