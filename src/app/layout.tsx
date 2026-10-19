import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { siteConfig } from "@/lib/config";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: `${siteConfig.name} | Professional Cleaning Services`,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  keywords: [
    "cleaning services",
    "deep cleaning",
    "end of tenancy cleaning",
    "carpet cleaning",
    "London cleaning",
    "professional cleaning",
  ],
  authors: [{ name: siteConfig.name }],
  openGraph: {
    title: siteConfig.name,
    description: siteConfig.description,
    url: siteConfig.url,
    siteName: siteConfig.name,
    locale: "en_GB",
    type: "website",
    images: [{ url: siteConfig.logo, alt: siteConfig.name }],
  },
  icons: {
    icon: siteConfig.logo,
    apple: siteConfig.logo,
  },
  twitter: {
    card: "summary_large_image",
    title: `${siteConfig.name} | Less cleaning. More living.`,
    description: siteConfig.description,
    images: [siteConfig.logo],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-GB" className={`${inter.variable} scroll-smooth`}>
      <body className="min-h-screen bg-navy font-sans text-white antialiased">
        {children}
      </body>
    </html>
  );
}
