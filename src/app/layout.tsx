import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://contextractor.vercel.app";

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#1E1E1E" },
    { media: "(prefers-color-scheme: light)", color: "#1E1E1E" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  colorScheme: "dark",
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Contextractor - Extract Code & Files to Text for AI & LLMs | Free Online Tool",
    template: "%s | Contextractor - AI Context Extractor",
  },
  description: "Free online tool to extract clean text from code files, ZIP archives, and GitHub repositories. Optimize context for ChatGPT, Claude, Gemini, and other AI/LLMs. Perfect for prompt engineering and AI development workflows.",
  keywords: [
    "context extractor",
    "code to text converter",
    "github to text",
    "llm context tool",
    "prompt engineering tool",
    "developer tools",
    "zip file extractor",
    "repository converter",
    "file flattener",
    "chatgpt context",
    "claude context",
    "ai code extractor",
    "code context for ai",
    "github file extractor",
    "source code to text",
    "codebase to text",
    "ai prompt builder",
    "llm file processor",
    "code snippet extractor",
    "ai development tools",
    "free code extractor",
    "online file converter",
    "text extraction tool",
    "repository text export"
  ],
  authors: [{ name: "Contextractor Team", url: siteUrl }],
  creator: "Contextractor",
  publisher: "Contextractor",
  applicationName: "Contextractor",
  generator: "Next.js",
  referrer: "origin-when-cross-origin",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: siteUrl,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    title: "Contextractor - Extract Code & Files to Text for AI & LLMs",
    description: "Free online tool to extract clean text from code files, ZIP archives, and GitHub repositories. Perfect for ChatGPT, Claude, and AI development.",
    siteName: "Contextractor",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Contextractor - AI Context Extraction Tool",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Contextractor - Extract Code to Text for AI & LLMs",
    description: "Free tool to extract clean text from code, ZIPs, and GitHub repos for ChatGPT, Claude & more.",
    images: ["/og-image.png"],
    creator: "@contextractor",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/icon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    other: [
      { rel: "mask-icon", url: "/safari-pinned-tab.svg", color: "#A8C7FA" },
    ],
  },
  manifest: "/manifest.json",
  category: "developer tools",
  classification: "Software, Developer Tools, AI Tools",
  verification: {
    google: "SeU7j1p_RghwijQK39HcGyU9L5su7-xhodHrPXhE2Xs",
  },
  other: {
    "msapplication-TileColor": "#1E1E1E",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
    "apple-mobile-web-app-title": "Contextractor",
  },
};

// JSON-LD Structured Data for SEO
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  "name": "Contextractor",
  "description": "Free online tool to extract clean text from code files, ZIP archives, and GitHub repositories for AI and LLM context optimization.",
  "url": siteUrl,
  "applicationCategory": "DeveloperApplication",
  "operatingSystem": "Any",
  "browserRequirements": "Requires JavaScript. Requires HTML5.",
  "softwareVersion": "1.0.0",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "USD",
  },
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.9",
    "ratingCount": "150",
    "bestRating": "5",
    "worstRating": "1",
  },
  "featureList": [
    "Extract text from code files",
    "Process ZIP archives",
    "Import GitHub repositories",
    "Optimize context for ChatGPT",
    "Optimize context for Claude",
    "Multiple output formats",
    "Drag and drop support",
    "Free to use",
  ],
  "screenshot": `${siteUrl}/og-image.png`,
  "creator": {
    "@type": "Organization",
    "name": "Contextractor",
    "url": siteUrl,
  },
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Contextractor",
  "url": siteUrl,
  "logo": `${siteUrl}/icon-512x512.png`,
  "sameAs": [],
};

const breadcrumbJsonLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    {
      "@type": "ListItem",
      "position": 1,
      "name": "Home",
      "item": siteUrl,
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Script to prevent flash of wrong theme
  const themeScript = `
    (function() {
      try {
        var theme = localStorage.getItem('contextractor-theme') || 'system';
        var resolved = theme;
        if (theme === 'system') {
          resolved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }
        document.documentElement.classList.add(resolved);
      } catch (e) {
        document.documentElement.classList.add('dark');
      }
    })();
  `;

  return (
    <html lang="en" className="scroll-smooth dark" dir="ltr" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://api.github.com" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-theme-bg text-theme-primary theme-transition`}
      >
        {children}
        <Analytics />
      </body>
    </html>
  );
}
