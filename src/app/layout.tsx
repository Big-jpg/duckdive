import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./design-tokens.css";
import "./lab.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  applicationName: "DuckDive",
  title: { default: "DuckDive — Governed data you can explore", template: "%s | DuckDive" },
  description: "Explore a governed observation of WA's used-vehicle market, open live reports, and reshape them through an inspectable, owner-scoped workflow.",
  keywords: ["WA used vehicles", "governed analytics", "data visualisation", "inspectable reports"],
  creator: "DuckDive",
  publisher: "DuckDive",
  category: "technology",
  alternates: { canonical: "/" },
  icons: {
    icon: [{ url: "/favicon.png", type: "image/png" }],
    shortcut: "/favicon.png",
    apple: "/favicon.png",
  },
  openGraph: {
    url: "/",
    siteName: "DuckDive",
    type: "website",
    locale: "en_AU",
    title: "DuckDive — Governed data you can explore",
    description: "Explore WA's used-vehicle market through live, inspectable reports you can reshape.",
    images: [{ url: "/duckdive.png", width: 1486, height: 1059, alt: "DuckDive surfing beneath a blue wave" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "DuckDive — Governed data you can explore",
    description: "Explore WA's used-vehicle market through live, inspectable reports you can reshape.",
    images: ["/duckdive.png"],
  },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#dff3fb",
  colorScheme: "light",
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
