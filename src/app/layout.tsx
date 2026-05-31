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
  themeColor: "#F59E0B",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "4unter — AI Lead Intelligence for Kenya | Find B2B Leads Fast",
  description: "4unter helps Kenyan sales teams discover 200 pre-qualified B2B leads in minutes. AI-scored, WhatsApp-ready outreach for businesses across Nairobi, Mombasa, Kisumu and East Africa.",
  keywords: [
    "lead generation Kenya", "B2B leads Nairobi", "Kenya sales intelligence",
    "business prospecting Kenya", "WhatsApp outreach Kenya", "AI sales tool Kenya",
    "Kenyan business database", "B2B prospecting Nairobi", "sales automation Kenya",
    "lead scoring Kenya", "East Africa B2B leads", "Mombasa leads",
  ],
  manifest: "/manifest.json",
  robots: { index: true, follow: true },
  alternates: { canonical: "https://4unter.dullugroup.co.ke" },
  openGraph: {
    title: "4unter — AI Lead Intelligence for Kenyan Sales Teams",
    description: "Find 200 pre-qualified Kenyan businesses, score every lead with AI, and have a WhatsApp opener written — before your competitor finishes their first Google search.",
    images: [{ url: "/hunter-og.svg", width: 1200, height: 630 }],
    siteName: "4unter",
    type: "website",
    locale: "en_KE",
    url: "https://4unter.dullugroup.co.ke",
  },
  twitter: {
    card: "summary_large_image",
    title: "4unter — AI Lead Intelligence for Kenya",
    description: "200 pre-qualified Kenyan B2B leads in under 2 minutes. AI-scored, WhatsApp-ready.",
    images: ["/hunter-og.svg"],
    creator: "@iandullu",
    site: "@iandullu",
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
      <html lang="en" suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable} h-full`}>
        <head>
          <meta name="mobile-web-app-capable" content="yes" />
          <meta name="apple-touch-fullscreen" content="yes" />
          <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
          <link rel="apple-touch-icon" sizes="180x180" href="/icons/apple-touch-icon.png" />
        </head>
        <body className="min-h-full antialiased" style={{ background: "var(--background)", color: "var(--text-1)" }}>
          {children}
          <Toaster theme="dark" richColors position="top-center" />
          <Analytics />
          <SpeedInsights />
        </body>
      </html>
    </ClerkProvider>
  );
}
