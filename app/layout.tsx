import type { Metadata } from "next";
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

export const metadata: Metadata = {
  title: "QURAN RANKING LIVE – PPD MACHANG",

  description:
    "Sistem Pemantauan Bacaan Al-Quran Murid PPD Machang",

  applicationName:
    "QURAN RANKING LIVE – PPD MACHANG",

  generator: "Next.js",

  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },

  openGraph: {
    title: "QURAN RANKING LIVE – PPD MACHANG",
    description:
      "Sistem Pemantauan Bacaan Al-Quran Murid PPD Machang",
    type: "website",
    locale: "ms_MY",
    siteName:
      "QURAN RANKING LIVE – PPD MACHANG",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "QURAN RANKING LIVE – PPD MACHANG",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "QURAN RANKING LIVE – PPD MACHANG",
    description:
      "Sistem Pemantauan Bacaan Al-Quran Murid PPD Machang",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: LayoutProps<"/">) {
  return (
    <html
      lang="ms"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
      </body>
    </html>
  );
}