import type { Metadata, Viewport } from "next";
import { Sofia_Sans, Sofia_Sans_Extra_Condensed } from "next/font/google";

import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
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

export const metadata: Metadata = {
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

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={cn("dark", sofiaSans.variable, sofiaCondensed.variable)}
    >
      <body className="overflow-hidden bg-background text-foreground antialiased">
        <TooltipProvider delayDuration={250}>{children}</TooltipProvider>
        <Toaster />
      </body>
    </html>
  );
}
