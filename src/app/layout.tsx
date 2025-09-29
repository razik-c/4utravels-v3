"use client";

import Script from "next/script";
import { useEffect } from "react";
import Header from "@/components/Header";
import { Geist, Geist_Mono, Borel } from "next/font/google";
import "./globals.css";
import Footer from "@/components/Footer";



const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const borel = Borel({
  variable: "--font-borel",
  subsets: ["latin"],
  weight: "400",
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
   return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${borel.variable}`}
    >
      <body className="antialiased bg-[#F4F3F2]">
        <div className="prose md:prose-tablet lg:prose-desktop text-[#030303] !max-w-none">
          <Header />
          <main className="prose md:prose-tablet lg:prose-desktop !max-w-none">
            {children}
          </main>
          <Footer />
        </div>
      </body>
    </html>
  );
}
