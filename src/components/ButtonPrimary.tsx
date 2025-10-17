"use client";

import Link from "next/link";
import { ReactNode } from "react";

interface ButtonProps {
  text: string;
  href: string;
  className?: string;
  icon?: ReactNode;
  target?: "_blank" | "_self" | "_parent" | "_top";
  rel?: string;
}

export default function ButtonPrimary({
  text,
  href,
  className,
  icon,
  target,
  rel,
}: ButtonProps) {
  return (
    <Link
      href={href}
      target={target}
      rel={rel}
      className={`flex items-center justify-between gap-2 ps-4 pe-2 py-2 rounded-full bg-[#35039A] font-medium hover:bg-[#2a0279] min-w-[120px] w-fit text-center transition no-underline !text-white ${
        className ?? ""
      }`}
    >
      {text}
      {icon && (
        <div className="bg-white p-2 rounded-full text-black">
          <span className="flex justify-center items-center">{icon}</span>
        </div>
      )}
    </Link>
  );
}
