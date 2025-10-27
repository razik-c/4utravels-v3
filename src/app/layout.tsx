// app/layout.tsx
"use client";

import { usePathname } from "next/navigation";
import { Geist, Geist_Mono, Borel } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Sidebar from "@/components/Sidebar";
import { Analytics } from "@vercel/analytics/next";
import Image from "next/image";
import Link from "next/link";

const SITE_URL = "https://www.4utravelandtours.com";
const LOGO_URL = `${SITE_URL}/logo.png`;
const OG_IMAGE = `${SITE_URL}/logo.png`; // create this if you haven't

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const borel = Borel({ variable: "--font-borel", subsets: ["latin"], weight: "400" });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isDashboard = pathname.startsWith("/dashboard");

  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} ${borel.variable}`}>
      <head>
        {/* Basic */}
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="canonical" href={`${SITE_URL}${pathname || ""}`} />

        {/* Favicon / Icons */}
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/logo.png" />
        <link rel="icon" type="image/png" href="/logo.png" sizes="192x192" />

        {/* Open Graph */}
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="4U Travel & Tours" />
        <meta property="og:url" content={`${SITE_URL}${pathname || ""}`} />
        <meta property="og:title" content="4U Travel & Tours" />
        <meta property="og:description" content="Customized tours, visas, and transport — book your next trip with 4U Travel & Tours." />
        <meta property="og:image" content={OG_IMAGE} />

        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="4U Travel & Tours" />
        <meta name="twitter:description" content="Customized tours, visas, and transport — book your next trip with 4U Travel & Tours." />
        <meta name="twitter:image" content={OG_IMAGE} />

        {/* Organization / Logo structured data */}
        <Script
          id="org-logo-schema"
          type="application/ld+json"
          strategy="afterInteractive"
          // Keep it minimal and valid; Google only needs url + logo
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              "name": "4U Travel & Tours",
              "url": SITE_URL,
              "logo": LOGO_URL
              // "sameAs": [ "https://www.facebook.com/yourpage", "https://www.instagram.com/yourpage" ]
            }),
          }}
        />
      </head>

      {isDashboard ? (
        <body className="antialiased text-[#030303]">
          <div className="grid grid-cols-12">
            <Sidebar />
            <main className="bg-[#f4f7fb] rounded-lg col-span-10">
              {children}
            </main>
          </div>
          <Analytics />
        </body>
      ) : (
        <body className="antialiased bg-[#F4F3F2] text-[#030303] overflow-x-hidden">
          <div className="prose md:prose-tablet lg:prose-desktop !max-w-none">
            <Header />
            <main className="prose md:prose-tablet lg:prose-desktop !max-w-none overflow-x-hidden">
              {children}
            </main>
            <Footer />
          </div>
          <Analytics />
        </body>
      )}
    </html>
  );
}
