"use client";

import Link from "next/link";
import Image from "next/image";
import { FaFacebookF, FaInstagram, FaTwitter, FaYoutube } from "react-icons/fa";
import { MdEmail, MdPhone, MdLocationOn } from "react-icons/md";

export default function Footer() {
  return (
    <footer className="bg-[#f2f2f2]">
      <div className="max-w-screen-xl px-4 pt-16 pb-6 mx-auto sm:px-6 lg:px-8 lg:pt-24">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Logo + description + socials */}
          <div>
            <Image
              width={64}
              height={64}
              className="object-cover !m-0 !p-0"
              src={"/logo.jpg"}
              alt="4U Travels Logo"
            />

            <p className="mt-4 !text-[16px] text-black/80">
              Discover unforgettable journeys with handpicked destinations,
              affordable packages, and hassle-free booking.
            </p>

            <ul className="flex justify-center gap-6 !mt-8 md:gap-8 sm:justify-start">
              <li>
                <Link
                  href="https://facebook.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="!text-black transition hover:!text-black/75"
                >
                  <FaFacebookF className="w-5 h-5" />
                  <span className="sr-only">Facebook</span>
                </Link>
              </li>
              <li>
                <Link
                  href="https://instagram.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="!text-black transition hover:!text-black/75"
                >
                  <FaInstagram className="w-5 h-5" />
                  <span className="sr-only">Instagram</span>
                </Link>
              </li>
              <li>
                <Link
                  href="https://twitter.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="!text-black transition hover:!text-black/75"
                >
                  <FaTwitter className="w-5 h-5" />
                  <span className="sr-only">Twitter</span>
                </Link>
              </li>
              <li>
                <Link
                  href="https://youtube.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="!text-black transition hover:!text-black/75"
                >
                  <FaYoutube className="w-5 h-5" />
                  <span className="sr-only">YouTube</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Link columns */}
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:col-span-2 md:grid-cols-4">
            {/* Tours */}
            <div className="text-start sm:text-left">
              <p className="text-lg font-medium !text-black">Tours</p>
              <nav className="mt-8">
                <ul className="!space-y-4 text-sm">
                  <li>
                    <Link
                      href="/tours/dubai"
                      className="!text-black hover:!text-black/75 no-underline"
                    >
                      Dubai Tours
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/tours/desert-safari"
                      className="!text-black hover:!text-black/75 no-underline"
                    >
                      Desert Safari
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/tours/cruise"
                      className="!text-black hover:!text-black/75 no-underline"
                    >
                      Dhow Cruises
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/tours/adventure"
                      className="!text-black hover:!text-black/75 no-underline"
                    >
                      Adventure Trips
                    </Link>
                  </li>
                </ul>
              </nav>
            </div>

            {/* Destinations */}
            <div className="text-start sm:text-left">
              <p className="text-lg font-medium !text-black">Destinations</p>
              <nav className="mt-8">
                <ul className="!space-y-4 text-sm">
                  <li>
                    <Link
                      href="/destinations/uae"
                      className="!text-black hover:!text-black/75 no-underline"
                    >
                      UAE
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/destinations/azerbaijan"
                      className="!text-black hover:!text-black/75 no-underline"
                    >
                      Azerbaijan
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/destinations/kazakhstan"
                      className="!text-black hover:!text-black/75 no-underline"
                    >
                      Kazakhstan
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/destinations/armenia"
                      className="!text-black hover:!text-black/75 no-underline"
                    >
                      Armenia
                    </Link>
                  </li>
                </ul>
              </nav>
            </div>

            {/* Helpful Links */}
            <div className="text-start sm:text-left">
              <p className="text-lg font-medium !text-black">Helpful Links</p>
              <nav className="mt-8">
                <ul className="!space-y-4 text-sm">
                  <li>
                    <Link
                      href="/faqs"
                      className="!text-black hover:!text-black/75 no-underline"
                    >
                      FAQs
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/support"
                      className="!text-black hover:!text-black/75 no-underline"
                    >
                      Customer Support
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/contact"
                      className="!text-black hover:!text-black/75 no-underline"
                    >
                      Contact Us
                    </Link>
                  </li>
                </ul>
              </nav>
            </div>

            {/* Contact Us */}
            <div className="text-start sm:text-left">
              <p className="text-lg font-medium !text-black">Contact Us</p>
              <ul className="!mt-8 !space-y-4 text-sm">
                <li className="flex items-start justify-start sm:justify-start gap-1.5">
                  <MdEmail className="w-4 h-4 text-black" />
                  <Link
                    href="mailto:info@4utravels.com"
                    className="!text-black hover:!text-black/75 no-underline"
                  >
                    info@4utravels.com
                  </Link>
                </li>
                <li className="flex items-center justify-start sm:justify-start gap-1.5">
                  <MdPhone className="w-4 h-4 text-black" />
                  <Link
                    href="tel:+971500000000"
                    className="!text-black hover:!text-black/75 no-underline"
                  >
                    +971 50 000 0000
                  </Link>
                </li>
                <li className="flex items-start justify-start sm:justify-start gap-1.5">
                  <MdLocationOn className="w-4 h-4 text-black mt-0.5" />
                  <address className="not-italic !text-black">
                    Business Bay, Dubai, UAE
                  </address>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-6 mt-12 border-t border-gray-300">
          <div className="text-start sm:flex sm:justify-between gap-4 sm:text-left">
            <div className="flex gap-5 items-center">
              <div>
                <span className="block sm:inline">All rights reserved.</span>
              </div>
              <div>
                <Link
                  href="/terms"
                  className="inline-block !text-black underline hover:!text-black/75 text-[12px]"
                >
                  Terms &amp; Conditions
                </Link>
              </div>
              <div>
                <Link
                  href="/privacy"
                  className="inline-block !text-black underline hover:!text-black/75  text-[12px]"
                >
                  Privacy Policy
                </Link>
              </div>
            </div>
            <p className="mt-4 text-sm !text-gray-500 sm:order-first sm:mt-0 text-center">
              &copy; {new Date().getFullYear()} 4U Travels
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
