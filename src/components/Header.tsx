"use client";
import { useEffect, useState } from "react";
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
  { id: "lang-en", title: "EN", children: [{ id: "lang-ar", title: "Arabic", route: "/" }] },
];

const menuItem: MenuItem[] = [
  { id: "visa", title: "Visa", route: "/visas" },
  { id: "packages", title: "Packages", route: "/tours/all" },
  { id: "transportation", title: "Transports", route: "/transports/all" },
  { id: "about", title: "About", route: "/" },
  { id: "gallery", title: "Gallery", route: "/" },
];

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Lock body scroll when drawer is open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = isMenuOpen ? "hidden" : prev || "";
    return () => {
      document.body.style.overflow = prev || "";
    };
  }, [isMenuOpen]);

  // Close on ESC
  useEffect(() => {
    if (!isMenuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsMenuOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isMenuOpen]);

  return (
    <nav className="py-1 bg-white shadow-sm">
      <div className="container flex justify-between items-center md:px-8">
        <div className="rounded-lg flex justify-between lg:justify-start w-full py-2 items-center gap-12">
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
            <form method="GET" action="/search" className="hidden lg:block">
              <div className="bg-[#f3f3f6] ps-4 pe-2 relative rounded-full py-1 flex items-center gap-2">
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
                  className="bg-transparent text-sm max-w-[20px] outline-none"
                  aria-label="Result type"
                  defaultValue=""
                >
                  <option value="">All</option>
                </select>
                <button
                  type="submit"
                  className="mr-1 inline-flex items-center cursor-pointer  rounded-full border border-gray-400 p-2 text-black hover:bg-[#35039A] hover:text-white"
                >
                  {/* search icon */}
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                    strokeWidth="1.5" stroke="currentColor" className="size-5">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
                    />
                  </svg>
                </button>
              </div>
            </form>
          </div>

          {/* Mobile hamburger */}
          <div className="lg:hidden">
            <button
              onClick={() => setIsMenuOpen(true)}
              className="!m-0 text-gray-600 !py-2 block"
              aria-expanded={isMenuOpen}
              aria-label="Open menu"
              aria-controls="mobile-drawer"
            >
              {/* hamburger */}
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                strokeWidth={1.5} stroke="currentColor" className="size-7">
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            </button>
          </div>

          {/* Desktop nav links */}
          <div className="gap-8 items-center text-[#000] hidden lg:flex">
            {menuItem.map((item) => (
              <Link
                key={item.id}
                href={item.route || ""}
                className="no-underline text-[14px] hover:underline"
              >
                {item.title}
              </Link>
            ))}
          </div>
        </div>

        {/* Right controls (desktop) */}
        <div className="lg:flex gap-4 items-center text-black hidden">
          {/* {dropDownItem.map((item) =>
            item.children?.length ? (
              <Dropdown key={item.id} item={item} />
            ) : (
              <Link key={item.id} href={item.route || ""} className="no-underline text-[14px]">
                {item.title}
              </Link>
            )
          )} */}

          <ButtonPrimary
            text={"Login"}
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                strokeWidth={1.5} stroke="currentColor" className="size-4">
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
              </svg>
            }
            href={"/sign-in"}
          />
          <ButtonSecondary text={"Sign Up"} href={""} />
        </div>
      </div>

      {/* Mobile search (basic) */}
      <div className="container mb-4 lg:hidden mt-1">
        <form method="GET" action="/search">
          <div className="bg-[#f3f3f6] ps-4 pe-2 relative rounded-full w-full py-1 flex justify-between items-center gap-2">
            <input
              name="q"
              id="q-mobile"
              className="border-0 bg-transparent outline-none w-[250px] rounded-xl px-1 py-3"
              type="text"
              placeholder="Search tours & transports"
              aria-label="Search"
            />
            <div className="flex gap-2">
              <select
                name="type"
                className="bg-transparent text-sm max-w-[20px] outline-none"
                aria-label="Result type"
                defaultValue=""
              >
                <option value="">All</option>
              </select>
              <button
                type="submit"
                className="mr-1 cursor-pointer inline-flex items-center rounded-full border border-gray-400 p-2 text-black hover:bg-[#35039A] hover:text-white"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                  strokeWidth="1.5" stroke="currentColor" className="cursor-pointer size-5">
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                </svg>
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* === Mobile Drawer (left slide-in) === */}
      {/* Overlay */}
      <div
        onClick={() => setIsMenuOpen(false)}
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-300 lg:hidden ${
          isMenuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        aria-hidden={!isMenuOpen}
      />

      {/* Drawer panel */}
      <aside
        id="mobile-drawer"
        role="dialog"
        aria-modal="true"
        className={`fixed top-0 left-0 z-50 h-full w-72 max-w-[85vw] bg-white shadow-xl lg:hidden
          transition-transform duration-300 will-change-transform
          ${isMenuOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex items-center justify-between p-4 border-b">
          <span className="text-lg font-semibold">Menu</span>
          <button
            aria-label="Close menu"
            onClick={() => setIsMenuOpen(false)}
            className="p-2"
          >
            {/* X icon */}
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
              strokeWidth={1.5} stroke="currentColor" className="size-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

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

          <div className="flex flex-col gap-2 mt-2">
            <ButtonPrimary text="Login" href="/sign-in" className="w-full justify-center py-3" />
            <ButtonSecondary text="Sign Up" href="" />
          </div>

          {/* Optional language selector inside drawer */}
          <div className="mt-4">
            {dropDownItem.map((item) =>
              item.children?.length ? (
                <Dropdown key={item.id} item={item} />
              ) : (
                <Link key={item.id} href={item.route || ""} className="no-underline text-[14px]">
                  {item.title}
                </Link>
              )
            )}
          </div>
        </div>
      </aside>
    </nav>
  );
}
