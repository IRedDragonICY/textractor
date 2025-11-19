import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: "#1E1E1E",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://textracktor.vercel.app"),
  title: {
    default: "Textracktor PRO - File to Text for LLMs",
    template: "%s | Textracktor PRO",
  },
  description: "Professional tool to extract clean text from code, ZIPs, and GitHub repositories. Optimize context for ChatGPT, Claude, and other LLMs.",
  keywords: [
    "text extractor",
    "code to text",
    "github to text",
    "llm context",
    "prompt engineering",
    "developer tools",
    "zip extractor",
    "repository converter",
    "file flattener"
  ],
  authors: [{ name: "Textracktor Team" }],
  creator: "Textracktor Team",
  publisher: "Textracktor",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    title: "Textracktor PRO - Advanced File to Text Extractor",
    description: "Extract clean text from code, ZIPs, and repositories for LLM context.",
    siteName: "Textracktor PRO",
  },
  twitter: {
    card: "summary_large_image",
    title: "Textracktor PRO",
    description: "Extract clean text from code, ZIPs, and repositories for LLM context.",
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png", // Assuming you might add this later
  },
  manifest: "/manifest.json",
  category: "productivity",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#131314] text-[#E3E3E3]`}
      >
        {children}
      </body>
    </html>
  );
}
