"use client";
import { useState } from "react";
import Link from "next/link";
import Dropdown from "./Dropdown";
import ButtonPrimary from "./ButtonPrimary";
import ButtonSecondary from "./ButtonSecondary";
import Image from "next/image";

export interface MenuItem {
  id: string;             // make id required for reliable keys
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
  { id: "about",        title: "About",        route: "/" },
  { id: "destinations", title: "Destinations", route: "/" },
  { id: "popular",      title: "Popular",      route: "/" },
  { id: "gallery",      title: "Gallery",      route: "/" },
];

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <nav className="bg-white">
      <div className="container flex justify-between items-center md:px-8 ">
        <div className="rounded-lg flex justify-between md:justify-start w-full py-2 items-center gap-12">
          <div className="z-50 flex items-center gap-8">
            <Link href={"/"}>
              <Image
                width={64}
                height={64}
                className="object-cover !m-0 !p-0"
                src={"/logo.jpg"}
                alt=""
              />
            </Link>

            <form method="GET" action="" className="hidden md:block">
              <div className="bg-[#f2f2f2] px-2 relative rounded-xl flex">
                <span className="w-auto flex justify-end items-center text-gray-500 p-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </span>
                <input
                  name="episodequery"
                  id="title"
                  className="border-white outline-none border-0 w-[300px] rounded-xl px-2 py-4"
                  type="text"
                  placeholder="Try 'Dubai'"
                />
              </div>
            </form>
          </div>

          <div className="md:hidden">
            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="!m-0 !py-2 block">
              {!isMenuOpen ? (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                  strokeWidth={1.5} stroke="currentColor" className="size-7">
                  <path strokeLinecap="round" strokeLinejoin="round"
                        d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                  strokeWidth={1.5} stroke="currentColor" className="size-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              )}
            </button>
          </div>

          <div className="gap-8 items-center text-[#131313] hidden md:flex">
            {menuItem.map((item) => (
              <Link
                key={item.id}                         // ← unique, stable
                href={item.route || ""}
                className="no-underline text-[14px] opacity-60 hover:opacity-100"
              >
                {item.title}
              </Link>
            ))}
          </div>
        </div>

        <div className="md:flex gap-4 items-center text-black hidden">
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
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                strokeWidth={1.5} stroke="currentColor" className="size-4">
                <path strokeLinecap="round" strokeLinejoin="round"
                      d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
              </svg>
            }
            href={""}
          />
          <ButtonSecondary text={"Sign Up"} href={""} />
        </div>
      </div>

      {isMenuOpen && (
        <div className="md:hidden relative bg-white border-t border-gray-200 z-50">
          <div className="flex flex-col p-4 gap-4">
            {menuItem.map((item) => (
              <Link
                key={`mobile-${item.id}`}            // ← unique in this list, too
                href={item.route || ""}
                className="no-underline text-[16px] text-gray-700 hover:text-black"
                onClick={() => setIsMenuOpen(false)}
              >
                {item.title}
              </Link>
            ))}

            <div className="flex flex-col gap-2 mt-4">
              <ButtonPrimary text="Login" href="" className="w-full justify-center py-3" />
              <ButtonSecondary text="Sign Up" href="" />
            </div>
          </div>
        </div>
      )}

      <div className="container mb-4 md:hidden">
        <form method="GET" action="">
          <div className="bg-[#f2f2f2] px-2 relative rounded-xl flex">
            <span className="w-auto flex justify-end items-center text-gray-500 p-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none"
                viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              name="episodequery"
              id="title"
              className="border-white outline-none border-0 w-full rounded-xl px-2 py-3"
              type="text"
              placeholder="Try 'Dubai'"
            />
          </div>
        </form>
      </div>
    </nav>
  );
}
