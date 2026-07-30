import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./lab.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL||"http://localhost:3000"),
  applicationName: "DuckDive",
  title: { default: "DuckDive", template: "%s | DuckDive" },
  description: "Trusted data. Clear views. DuckDive the next question.",
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
    title: "DuckDive",
    description: "Trusted data. Clear views. DuckDive the next question.",
    images: [{url:"/opengraph-image",width:1200,height:630,alt:"DuckDive"}],
  },
  twitter: {
    card: "summary_large_image",
    title: "DuckDive",
    description: "Trusted data. Clear views. DuckDive the next question.",
    images: ["/twitter-image"],
  },
  robots: {index:false,follow:false},
};

export const viewport:Viewport={themeColor:[{media:"(prefers-color-scheme: light)",color:"#52b7e2"},{media:"(prefers-color-scheme: dark)",color:"#17120d"}],colorScheme:"light dark"};

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
