import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./design-tokens.css";
import "./lab.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  applicationName: "DuckDive",
  title: { default: "DuckDive", template: "%s | DuckDive" },
  description: "Explore an included governed dataset, reshape live reports with DuckDive, and share inspectable answers.",
  keywords: ["governed analytics", "data visualisation", "embedded analytics", "AI report editing"],
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
    description: "Explore an included governed dataset and reshape live reports with DuckDive.",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "DuckDive" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "DuckDive",
    description: "Explore an included governed dataset and reshape live reports with DuckDive.",
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
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
