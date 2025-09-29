"use client";

import Link from "next/link";
import { ReactNode } from "react";

interface ButtonProps {
  text: string;
  href: string;
  className?: string;
  icon?: ReactNode; // optional icon
}

export default function ButtonPrimary({
  text,
  href,
  className,
  icon,
}: ButtonProps) {
  return (
    <Link
      href={href}
      className={`flex items-center justify-between gap-2 ps-4 pe-2  py-2 rounded-full bg-[#35039A] font-medium hover:bg-[#2a0279] min-w-[120px] w-fit text-center transition no-underline !text-white ${
        className ?? ""
      }`}
    >
      {text}
      {icon && <div className="bg-white p-2 rounded-full text-black"> <span className="flex justify-center items-center">{icon}</span></div>}
    </Link>
  );
}
