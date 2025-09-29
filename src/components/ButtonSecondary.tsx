"use client";

import Link from "next/link";
import { ReactNode } from "react";

interface ButtonProps {
  text: string;
  href: string;
  className?: string;
  icon?: ReactNode;
}

export default function ButtonSecondary({ text, href, className, icon }: ButtonProps) {
  return (
    <Link
      href={href}
      className={`flex justify-center items-center px-6 py-3 rounded-full border border-gray-400 text-gray-800 min-w-[120px] no-underline font-medium hover:bg-gray-100 transition ${className ?? ""}`}
    >
      {text}
      {icon && <span className="inline-flex">{icon}</span>}
    </Link>
  );
}
