"use client";
import { useState } from "react";
import Dropdown from "./Dropdown";
import ButtonPrimary from "./ButtonPrimary";
import ButtonSecondary from "./ButtonSecondary";
import Image from "next/image";
import Link from "next/link";

export interface MenuItem {
  id: string;
  title: string;
  route?: string;
  children?: MenuItem[];
}

const dropDownItem: MenuItem[] = [
  {
    id: "lang-en",
    title: "EN",
    children: [{ id: "lang-ar", title: "Arabic", route: "/" }],
  },
];

const menuItem: MenuItem[] = [
  { id: "about", title: "About", route: "/" },
  { id: "destinations", title: "Destinations", route: "/" },
  { id: "popular", title: "Popular", route: "/" },
  { id: "gallery", title: "Gallery", route: "/" },
];

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <nav className="py-1">
      <div className="container flex justify-between items-center md:px-8 ">
        <div className="rounded-lg flex justify-between md:justify-start w-full py-2 items-center gap-12">
          <div className="z-50 flex items-center gap-8">
            <Link href={"/"}>
              <Image
                width={64}
                height={64}
                className="object-cover !m-0 !p-0"
                src={"/logo.png"}
                alt="Logo"
              />
            </Link>

            {/* Desktop search (basic) */}
            <form method="GET" action="/search" className="hidden md:block">
              <div className="bg-[#f5f5f5] px-2 relative rounded-xl flex items-center gap-2">
                <span className="flex items-center text-gray-500 p-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                  </svg>
                </span>

                <input
                  name="q"
                  id="q-desktop"
                  className="border-0 bg-transparent outline-none w-[250px] rounded-xl px-1 py-3"
                  type="text"
                  placeholder="Search tours & transports"
                  aria-label="Search"
                />

                <select
                  name="type"
                  className="bg-transparent text-sm px-2 outline-none"
                  aria-label="Result type"
                  defaultValue=""
                >
                  <option value="">All</option>
                  <option value="tours">Tours</option>
                  <option value="transports">Transports</option>
                </select>

                <button
                  type="submit"
                  className="mr-1 inline-flex items-center rounded-lg bg-black px-3 py-2 text-white hover:bg-black/90"
                >
                  Search
                </button>
              </div>
            </form>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="!m-0 text-gray-600 !py-2 block"
              aria-expanded={isMenuOpen}
              aria-label="Toggle menu"
            >
              {!isMenuOpen ? (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-7">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"/>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12"/>
                </svg>
              )}
            </button>
          </div>

          {/* Desktop nav links */}
          <div className="gap-8 items-center text-[#131313] hidden md:flex">
            {menuItem.map((item) => (
              <Link
                key={item.id}
                href={item.route || ""}
                className="no-underline text-[14px] opacity-60 hover:opacity-100"
              >
                {item.title}
              </Link>
            ))}
          </div>
        </div>

        {/* Right controls */}
        <div className="md:flex gap-4 items-center text-black hidden">
          {dropDownItem.map((item) =>
            item.children?.length ? (
              <Dropdown key={item.id} item={item} />
            ) : (
              <Link key={item.id} href={item.route || ""} className="no-underline text-[14px]">
                {item.title}
              </Link>
            )
          )}

          <ButtonPrimary
            text={"Login"}
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"/>
              </svg>
            }
            href={"/sign-in"}
          />
          <ButtonSecondary text={"Sign Up"} href={""} />
        </div>
      </div>

      {/* Mobile search (basic) */}
      <div className="container mb-4 md:hidden mt-1">
        <form method="GET" action="/search" className="bg-white rounded-full">
          <div className="px-2 relative rounded-xl flex items-center">
            <span className="flex items-center text-gray-500 p-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
              </svg>
            </span>
            <input
              name="q"
              id="q-mobile"
              className="border-white outline-none border-0 w-full rounded-xl px-2 py-4"
              type="text"
              placeholder="Search tours & transports"
              aria-label="Search"
            />
            <select
              name="type"
              className="bg-transparent text-sm pr-2 outline-none"
              aria-label="Result type"
              defaultValue=""
            >
              <option value="">All</option>
              <option value="tours">Tours</option>
              <option value="transports">Transports</option>
            </select>
          </div>
        </form>
      </div>

      {/* Mobile menu */}
      {isMenuOpen && (
        <div className="md:hidden relative bg-white border-t border-gray-200 z-50">
          <div className="flex flex-col p-4 gap-4">
            {menuItem.map((item) => (
              <Link
                key={`mobile-${item.id}`}
                href={item.route || ""}
                className="no-underline text-[16px] text-gray-700 hover:text-black"
                onClick={() => setIsMenuOpen(false)}
              >
                {item.title}
              </Link>
            ))}

            <div className="flex flex-col gap-2 mt-4">
              <ButtonPrimary text="Login" href="/sign-in" className="w-full justify-center py-3" />
              <ButtonSecondary text="Sign Up" href="" />
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
