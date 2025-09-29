"use client";

import Link from "next/link";
import React, { useState } from "react";

export default function EnquiryForm({
  packageName,
  whatsAppNumber, // e.g. "9715XXXXXXXX" or leave empty to open WA without number
  className = "",
}: {
  packageName: string;
  whatsAppNumber?: string;
  className?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [values, setValues] = useState({
    name: "",
    email: "",
    phone: "",
    travelDate: "",
    message: "",
  });

  const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setValues((s) => ({ ...s, [name]: value }));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // TODO: send to your backend /api/enquiry
      // await fetch("/api/enquiry", { method: "POST", body: JSON.stringify({ ...values, packageName }) });
      console.log("Enquiry payload:", { ...values, packageName });
      alert("Enquiry sent. We’ll get back to you.");
    } catch (err) {
      console.error(err);
      alert("Failed to send. Try WhatsApp or email.");
    } finally {
      setLoading(false);
    }
  };

  const waBase = whatsAppNumber
    ? `https://wa.me/${whatsAppNumber}`
    : `https://wa.me/`;
  const waText = encodeURIComponent(
    `Hi! I'm interested in the "${packageName}" package.\n\nName: ${values.name || "-"}\nTravel date: ${values.travelDate || "-"}\nMessage: ${values.message || "-"}`
  );
  const waHref = `${waBase}?text=${waText}`;

  return (
    <section className={className}>
      <h2 className="text-xl md:text-2xl font-bold mb-4">Send an enquiry</h2>
      <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <input
          name="name"
          placeholder="Your name"
          value={values.name}
          onChange={onChange}
          required
          className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <input
          type="email"
          name="email"
          placeholder="Email"
          value={values.email}
          onChange={onChange}
          className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <input
          name="phone"
          placeholder="Phone"
          value={values.phone}
          onChange={onChange}
          className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <input
          type="date"
          name="travelDate"
          placeholder="Travel date"
          value={values.travelDate}
          onChange={onChange}
          className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <textarea
          name="message"
          placeholder="Tell us what you need"
          rows={4}
          value={values.message}
          onChange={onChange}
          className="md:col-span-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <div className="md:col-span-2 flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center justify-center rounded-lg bg-indigo-600 text-white px-4 py-2 font-medium hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading ? "Sending..." : "Send Enquiry"}
          </button>

          <Link
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-lg border border-green-600 text-green-700 dark:text-green-400 px-4 py-2 font-medium hover:bg-green-50 dark:hover:bg-green-900/20"
            aria-label="Chat on WhatsApp"
          >
            WhatsApp us about “{packageName}”
          </Link>
        </div>
      </form>
    </section>
  );
}
