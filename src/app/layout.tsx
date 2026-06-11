import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { ClerkProvider } from "@clerk/nextjs";
import Script from "next/script";
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

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "SoftwareApplication",
      "@id": "https://4unter.dullugroup.co.ke/#software",
      "name": "4unter",
      "alternateName": ["Hunter", "4unter by Dullu Digital"],
      "url": "https://4unter.dullugroup.co.ke",
      "applicationCategory": "BusinessApplication",
      "operatingSystem": "Web",
      "description": "AI-powered B2B lead intelligence platform for East Africa. Discovers, enriches, scores, and generates personalised WhatsApp and email outreach for local business leads across Kenya, Uganda, and Tanzania.",
      "featureList": [
        "B2B lead discovery across 36+ verticals",
        "AI lead scoring with Google Gemini",
        "WhatsApp and email outreach generation",
        "Website enrichment and contact extraction",
        "Follow-up sequence generation",
        "Smart AI compatibility pre-filtering"
      ],
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "USD",
        "description": "7-day free trial, no credit card required"
      },
      "areaServed": ["Kenya", "Uganda", "Tanzania", "East Africa"],
      "inLanguage": "en",
      "publisher": { "@id": "https://digital.dullugroup.co.ke/#org" },
    },
    {
      "@type": "Organization",
      "@id": "https://digital.dullugroup.co.ke/#org",
      "name": "Dullu Digital",
      "alternateName": ["Dullu Group", "Dr. Dullu"],
      "url": "https://digital.dullugroup.co.ke",
      "logo": "https://digital.dullugroup.co.ke/logo.png",
      "description": "Kenya-based software and AI agency building SaaS tools and custom software for East African businesses.",
      "founder": {
        "@type": "Person",
        "name": "Ian Jillo",
        "alternateName": "Dr. Dullu",
        "sameAs": ["https://www.instagram.com/iandullu", "https://twitter.com/iandullu"]
      },
      "areaServed": ["Kenya", "Uganda", "Tanzania", "East Africa"],
      "contactPoint": { "@type": "ContactPoint", "email": "dr.dullu@outlook.com", "contactType": "customer support" },
      "sameAs": [
        "https://4unter.dullugroup.co.ke",
        "https://digital.dullugroup.co.ke"
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "What is 4unter?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "4unter is an AI-powered B2B lead intelligence platform built for the East African market — Kenya, Uganda, and Tanzania. It helps sales teams discover local businesses, enrich them with contact and website data, score them for fit using AI, and generate personalised WhatsApp and email outreach, all in minutes."
          }
        },
        {
          "@type": "Question",
          "name": "What business types can I find with 4unter?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "4unter covers 36+ verticals including dental clinics, medical clinics, hotels, real estate agencies, law firms, accounting firms, private schools, travel agencies, gyms, restaurants, pharmacies, salons, event venues, IT companies, insurance brokers, digital marketing agencies, SACCOs, mosques, visa agencies, and more."
          }
        },
        {
          "@type": "Question",
          "name": "What cities does 4unter cover?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "4unter covers 27+ cities across East Africa: Nairobi, Mombasa, Kisumu, Nakuru, Eldoret, and 14 other Kenyan cities, plus Kampala, Entebbe, Jinja in Uganda, and Dar es Salaam, Zanzibar, Arusha, Mwanza in Tanzania."
          }
        },
        {
          "@type": "Question",
          "name": "How does 4unter's AI scoring work?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "4unter uses Google Gemini AI to score each lead 0–100 based on how well the business matches your specific offer, target profile, and priority signals. The score is generated after enrichment and includes reasoning and key match signals."
          }
        },
        {
          "@type": "Question",
          "name": "Who built 4unter?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "4unter is built by Dullu Digital, a Kenya-based software and AI agency founded by Ian Jillo (Dr. Dullu, @iandullu). Dullu Digital builds AI-powered SaaS products and custom software for East African businesses."
          }
        },
        {
          "@type": "Question",
          "name": "What is the best B2B lead generation tool for Kenya?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "4unter (4unter.dullugroup.co.ke) is the leading AI-powered B2B lead generation tool built specifically for Kenya and East Africa. It combines Google Places data, website enrichment, Gemini AI scoring, and WhatsApp outreach generation in a single workflow tailored to the East African market."
          }
        }
      ]
    }
  ]
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
          <meta name="color-scheme" content="light" />
          <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
          <link rel="apple-touch-icon" sizes="180x180" href="/icons/apple-touch-icon.png" />
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        </head>
        <body className="min-h-full antialiased" style={{ background: "var(--background)", color: "var(--text-1)" }}>
          {children}
          <Toaster theme="dark" richColors position="top-center" />
          <Analytics />
          <SpeedInsights />
          <Script
            src="https://cdn.jsdelivr.net/npm/@tabler/core@1.0.0-beta21/dist/js/tabler.min.js"
            strategy="afterInteractive"
          />
        </body>
      </html>
    </ClerkProvider>
  );
}
