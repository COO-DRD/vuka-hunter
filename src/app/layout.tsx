import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const viewport: Viewport = {
  themeColor: "#09090b",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "4unter — AI Lead Intelligence · Kenya",
  description: "Scrape, enrich, score and write outreach for Kenyan businesses in seconds. Proprietary AI intelligence built for the Kenyan market.",
  manifest: "/manifest.json",
  openGraph: {
    title: "4unter — AI Lead Intelligence · Kenya",
    description: "Find your next 100 clients. Automatically.",
    images: [{ url: "/hunter-og.svg", width: 1200, height: 630 }],
    siteName: "4unter",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "4unter — AI Lead Intelligence · Kenya",
    description: "Find your next 100 clients. Automatically.",
    images: ["/hunter-og.svg"],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "4unter",
    startupImage: "/icons/apple-touch-icon.png",
  },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: "/icons/apple-touch-icon.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      signInFallbackRedirectUrl="/dashboard"
      signUpFallbackRedirectUrl="/onboarding"
    >
      <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full`}>
        <head>
          <meta name="mobile-web-app-capable" content="yes" />
          <meta name="apple-touch-fullscreen" content="yes" />
          <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
          <link rel="apple-touch-icon" sizes="180x180" href="/icons/apple-touch-icon.png" />
        </head>
        <body className="min-h-full bg-zinc-950 text-zinc-100 antialiased">
          {children}
          <Toaster theme="dark" richColors position="top-center" />
          <Analytics />
          <SpeedInsights />
        </body>
      </html>
    </ClerkProvider>
  );
}
