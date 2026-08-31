import type { Metadata, Viewport } from "next";
import { Sofia_Sans, Sofia_Sans_Extra_Condensed } from "next/font/google";

import { LocaleProvider } from "@/components/providers/locale-provider";
import { Toaster } from "@/components/ui/toaster";
import { SceneTransitionProvider } from "@/components/layout/scene-transition";
import { TooltipProvider } from "@/components/ui/tooltip";
import { getDictionary, getLocale } from "@/i18n/server";
import { SITE } from "@/lib/site";
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

  icons: {
    icon: [{ url: "/images/favicon.svg", type: "image/svg+xml" }],
    shortcut: [{ url: "/images/favicon.svg", type: "image/svg+xml" }],
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
  themeColor: "#08090a",
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
