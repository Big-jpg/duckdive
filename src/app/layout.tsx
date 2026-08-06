import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { JourneyProvider } from "@/components/journey/JourneyProvider";
import "./design-tokens.css";
import "./lab.css";
import "./journey.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  applicationName: "DuckDive",
  title: { default: "DuckDive", template: "%s | DuckDive" },
  description: "From Duck Lake to Duck Dive: a simple way to teach analytics at any scale.",
  keywords: ["data lake", "analytics", "AI agents", "data visualisation"],
  creator: "DuckDive",
  publisher: "DuckDive",
  category: "technology",
  alternates: { canonical: "/" },
  icons: {
    icon: [
      { url: "/duckdive-icon.svg", type: "image/svg+xml" },
      { url: "/favicon.png", type: "image/png" },
    ],
    shortcut: "/duckdive-icon.svg",
    apple: "/favicon.png",
  },
  openGraph: {
    url: "/",
    siteName: "DuckDive",
    type: "website",
    locale: "en_AU",
    title: "DuckDive",
    description: "From Duck Lake to Duck Dive: a simple way to teach analytics at any scale.",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "DuckDive" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "DuckDive",
    description: "From Duck Lake to Duck Dive: a simple way to teach analytics at any scale.",
    images: ["/twitter-image"],
  },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f1d9a9" },
    { media: "(prefers-color-scheme: dark)", color: "#14152b" },
  ],
  colorScheme: "light dark",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main-content">
          Skip to Main Content
        </a>
        <JourneyProvider>{children}</JourneyProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
