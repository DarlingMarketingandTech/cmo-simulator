import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import '@/lib/env'; // Validate environment variables on startup
import { PwaRegistrar } from '@/components/PwaRegistrar';
import { ThemeProvider } from '@/components/ui/ThemeProvider';

export const metadata: Metadata = {
  title: "CMO Simulator - Executive Marketing Strategy Lab",
  description: "Run a simulated year as a CMO, make budget decisions under executive pressure, and leave with a useful growth strategy debrief.",
  keywords: ["CMO simulator", "marketing strategy simulator", "executive marketing training", "growth strategy assessment", "marketing leadership simulation", "business simulation"],
  authors: [{ name: "CMO Simulator Team" }],
  creator: "CMO Simulator",
  publisher: "CMO Simulator",
  manifest: '/manifest.webmanifest',
  icons: {
    icon: '/app-icon.svg',
    apple: '/app-icon.svg',
  },
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3002'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: "CMO Simulator - Executive Marketing Strategy Lab",
    description: "A playable marketing strategy lab for business owners and growth leaders.",
    url: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3002',
    siteName: "CMO Simulator",
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: "CMO Simulator - Marketing Strategy Game",
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: "CMO Simulator - Executive Marketing Strategy Lab",
    description: "Run a simulated year as a CMO and leave with a useful growth strategy debrief.",
    images: ['/og-image.png'],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'CMO Simulator',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });

export const viewport: Viewport = {
  themeColor: '#f2f4f7',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geist.variable} ${geistMono.variable} antialiased`} style={{ fontFamily: "var(--font-geist), Inter, system-ui, sans-serif", background: "#f2f4f7", color: "#0a0a0a" }}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <PwaRegistrar />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
