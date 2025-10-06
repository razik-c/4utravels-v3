"use client";
import { useState } from "react";
import Modal from "@/components/Modal";
import AddTransportForm from "./AddTransportsForm";

export function AddTransportButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center px-4 py-2 rounded-md bg-purple-600 text-white hover:bg-purple-700"
      >
        + Add Transport
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Add Transport">
        <AddTransportForm onDone={() => setOpen(false)} />
      </Modal>
    </>
  );
}
