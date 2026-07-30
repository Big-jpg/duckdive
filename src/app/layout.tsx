import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./lab.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL||"http://localhost:3000"),
  applicationName: "DuckDive",
  title: { default: "DuckDive", template: "%s | DuckDive" },
  description: "Explore auditable Victorian house-sales data through live, interactive analytics.",
  keywords: ["Victorian house data", "property analytics", "MotherDuck", "data visualisation"],
  creator: "DuckDive",
  publisher: "DuckDive",
  category: "technology",
  alternates: { canonical: "/" },
  icons: {
    icon: [{url:"/duckdive-icon.svg",type:"image/svg+xml"},{url:"/favicon.png",type:"image/png"}],
    shortcut: "/duckdive-icon.svg",
    apple: "/favicon.png",
  },
  openGraph: {
    url: "/",
    siteName: "DuckDive",
    type: "website",
    locale: "en_AU",
    title: "DuckDive — Explore the Market. Keep the Meaning.",
    description: "Contract-first analytics across an auditable Victorian house-sales estate.",
    images: [{url:"/opengraph-image",width:1200,height:630,alt:"DuckDive — Explore the market. Keep the meaning."}],
  },
  twitter: {
    card: "summary_large_image",
    title: "DuckDive — Explore the Market. Keep the Meaning.",
    description: "Contract-first analytics across an auditable Victorian house-sales estate.",
    images: ["/twitter-image"],
  },
  robots: {index:false,follow:false},
};

export const viewport:Viewport={themeColor:"#f7f5ef",colorScheme:"light"};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main-content">Skip to Main Content</a>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
