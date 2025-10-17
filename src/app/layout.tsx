"use client";

import { usePathname } from "next/navigation";
import { Geist, Geist_Mono, Borel } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Sidebar from "@/components/Sidebar";

import Image from "next/image";
import Link from "next/link";



const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
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
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isDashboard = pathname.startsWith("/dashboard");

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${borel.variable}`}
    >
      {isDashboard ? (

        <body className="antialiased  text-[#030303]">
          <div className="grid grid-cols-12">
            {/* <div className="col-span-12 h-fit p-4 m-4 rounded-lg bg-[#fafaff]">
              <div className="flex justify-between items-center">
                <Link href={"/"}>
                  <Image
                    width={64}
                    height={64}
                    className="object-cover !m-0 !p-0"
                    src={"/logo.jpg"}
                    alt=""
                  />
                </Link>
              </div>
            </div> */}
            <Sidebar />
            <main className="bg-[#f4f7fb] rounded-lg col-span-10">
              {children}
            </main>
          </div>
        </body>
      ) : (
        <body className="antialiased bg-[#F4F3F2] text-[#030303]">
          <div className="prose md:prose-tablet lg:prose-desktop !max-w-none">
            <Header />
            <main className="prose md:prose-tablet lg:prose-desktop !max-w-none">
              {children}
            </main>
            <Footer />
          </div>
        </body>
      )}
    </html>
  );
}
