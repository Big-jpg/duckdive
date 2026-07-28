import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./lab.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL||"http://localhost:3000"),
  title: { default: "VIC House Data Lab", template: "%s | VIC House Data Lab" },
  description: "Explore an open, auditable Victorian detached-house sales estate through live MotherDuck Dives.",
  alternates: { canonical: "/" },
  openGraph: {
    url: "/",
    siteName: "VIC House Data Lab",
    type: "website",
    title: "VIC house data, made explorable.",
    description: "Live interactive analytics across an auditable Victorian house-sales estate.",
  },
  twitter: { card: "summary_large_image", title: "VIC House Data Lab", description: "Live interactive analytics across an auditable Victorian house-sales estate." },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
