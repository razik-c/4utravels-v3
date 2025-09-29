// components/Dropdown.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

export interface MenuItem {
  id?: string;            // keep optional to avoid breaking callers
  title: string;
  route?: string;
  children?: MenuItem[];
}

type DropdownProps = {
  item: MenuItem;
  align?: "left" | "right";
};

export default function Dropdown({ item, align = "left" }: DropdownProps) {
  const [open, setOpen] = useState<boolean>(false);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLUListElement | null>(null);
  const itemRefs = useRef<Array<HTMLAnchorElement | null>>([]);

  // Stable parent id used for aria-controls and key fallback
  const parentId = useMemo<string>(() => {
    const base = (item.id ?? item.title ?? "menu").toString();
    return `dd-${base.toLowerCase().replace(/\s+/g, "-")}`;
  }, [item.id, item.title]);

  // Precompute normalized children + stable keys
  const childrenWithKeys = useMemo(() => {
    const children = item.children ?? [];
    return children.map((child, i) => {
      const raw = (child.route || child.title || "").toString();
      const normalized = raw.toLowerCase().replace(/\s+/g, "-");
      const fallbackKey = `${parentId}-c-${i}-${normalized || "item"}`;
      return {
        ...child,
        __key: child.id ?? fallbackKey,
        __href: child.route || "/", // never empty
      };
    });
  }, [item.children, parentId]);

  // Close on outside click
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!open) return;
      const t = e.target as Node;
      if (buttonRef.current?.contains(t)) return;
      if (menuRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!open) return;
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const onButtonKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setOpen(true);
      requestAnimationFrame(() => itemRefs.current[0]?.focus());
    }
  };

  const onMenuKeyDown = (e: React.KeyboardEvent<HTMLUListElement>) => {
    const total = childrenWithKeys.length;
    if (total === 0) return;

    const idx = itemRefs.current.findIndex(
      (el) => el === (document.activeElement as HTMLAnchorElement | null)
    );

    if (e.key === "ArrowDown") {
      e.preventDefault();
      const next = (idx + 1 + total) % total;
      itemRefs.current[next]?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const prev = (idx - 1 + total) % total;
      itemRefs.current[prev]?.focus();
    } else if (e.key === "Home") {
      e.preventDefault();
      itemRefs.current[0]?.focus();
    } else if (e.key === "End") {
      e.preventDefault();
      itemRefs.current[total - 1]?.focus();
    } else if (e.key === "Tab") {
      setOpen(false);
    }
  };

  // If it’s just a link (no children)
  if (!item.children?.length) {
    return (
      <Link href={item.route || "/"} className="hover:text-blue-500">
        {item.title}
      </Link>
    );
  }

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={parentId}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={onButtonKeyDown}
        className="inline-flex items-center gap-1 text-[14px] cursor-pointer"
      >
        {item.title}
        <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24">
          <path d="M7 10l5 5 5-5H7z" />
        </svg>
      </button>

      {open && (
        <div
          className={`absolute mt-5 z-50 bg-white text-black rounded shadow min-w-[200px] ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          <ul
            id={parentId}
            role="menu"
            aria-label={item.title}
            ref={menuRef}
            onKeyDown={onMenuKeyDown}
            className="outline-none list-none"
          >
            {childrenWithKeys.map((child, i) => (
              <li role="none" className="!p-1" key={child.__key}>
                <Link
                  role="menuitem"
                  href={child.__href}
                  ref={(el) => {
                    itemRefs.current[i] = el;
                  }}
                  className="block px-4 py-2 no-underline hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                  onClick={() => setOpen(false)}
                >
                  {child.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
