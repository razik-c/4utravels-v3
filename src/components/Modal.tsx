"use client";
import { useEffect } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
};

export default function Modal({ open, onClose, children, title }: Props) {
  // Close on ESC
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) {
      document.body.style.overflow = "hidden"; // prevent background scroll
      document.addEventListener("keydown", onKey);
    }
    return () => {
      document.body.style.overflow = ""; // restore
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      aria-modal="true"
      role="dialog"
      aria-labelledby="modal-title"
    >
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />

      <div
        className="
          relative w-full max-w-2xl rounded-lg bg-white shadow-lg
          flex flex-col max-h-[90vh]      /* 90% viewport height */
        "
      >
        <div className="flex items-center justify-between border-b px-4 py-3 shrink-0">
          <h2 id="modal-title" className="text-base font-semibold">
            {title ?? "Modal Title"}
          </h2>
          <button
            onClick={onClose}
            className="rounded p-2 text-gray-500 hover:bg-gray-100"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="p-4 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}
