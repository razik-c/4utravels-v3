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
    <nav className="py-1 bg-white shadow-sm">
      <div className="container flex justify-between items-center md:px-8 ">
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
                  className="mr-1 inline-flex items-center rounded-full border border-gray-400 p-2 text-black hover:bg-[#35039A] hover:text-white"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="1.5"
                    stroke="currentColor"
                    className="size-5"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
                    />
                  </svg>
                </button>
              </div>
            </form>
          </div>

          <div className="lg:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="!m-0 text-gray-600 !py-2 block"
              aria-expanded={isMenuOpen}
              aria-label="Toggle menu"
            >
              {!isMenuOpen ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="size-7"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
                  />
                </svg>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="size-6"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18 18 6M6 6l12 12"
                  />
                </svg>
              )}
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

        {/* Right controls */}
        <div className="lg:flex gap-4 items-center text-black hidden">
          {dropDownItem.map((item) =>
            item.children?.length ? (
              <Dropdown key={item.id} item={item} />
            ) : (
              <Link
                key={item.id}
                href={item.route || ""}
                className="no-underline text-[14px]"
              >
                {item.title}
              </Link>
            )
          )}

          <ButtonPrimary
            text={"Login"}
            icon={
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="size-4"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"
                />
              </svg>
            }
            href={"/sign-in"}
          />
          <ButtonSecondary text={"Sign Up"} href={""} />
        </div>
      </div>

      {/* Mobile search (basic) */}
      <div className="container mb-4 lg:hidden mt-1">
        <form method="GET" action="/search" className="">
          <div className="bg-[#f3f3f6] ps-4 pe-2 relative rounded-full w-full py-1 flex justify-between items-center gap-2">
            <input
              name="q"
              id="q-desktop"
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
                className="mr-1 inline-flex items-center rounded-full border border-gray-400 p-2 text-black hover:bg-[#35039A] hover:text-white"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="1.5"
                  stroke="currentColor"
                  className="size-5"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
                  />
                </svg>
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Mobile menu */}
      {isMenuOpen && (
        <div className="lg:hidden relative bg-white border-t border-gray-200 z-50">
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
              <ButtonPrimary
                text="Login"
                href="/sign-in"
                className="w-full justify-center py-3"
              />
              <ButtonSecondary text="Sign Up" href="" />
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
