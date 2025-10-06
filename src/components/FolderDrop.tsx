"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  /** Form field name; API can read via form.getAll(name) */
  name: string;
  /** Optional: max filenames to preview under the box */
  previewLimit?: number;
  /** Optional: accept attribute (defaults to images) */
  accept?: string;
  /** Optional: called whenever files change */
  onFilesChange?: (files: File[]) => void;
  /** Optional: label override */
  label?: string;
};

export default function FolderDrop({
  name,
  previewLimit = 5,
  accept = "image/*",
  onFilesChange,
  label = "Click to select a folder or drag & drop files/folders here",
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [dragOver, setDragOver] = useState(false);

  // Enable directory picking on supported browsers
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.setAttribute("webkitdirectory", "");
      // Optional: also allow regular multiple file selection
      inputRef.current.setAttribute("multiple", "");
    }
  }, []);

  function handleChooseClick() {
    inputRef.current?.click();
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const list = e.target.files ? Array.from(e.target.files) : [];
    setFiles(list);
    onFilesChange?.(list);
  }

  function preventDefaults(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
  }

  function handleDragEnter(e: React.DragEvent) {
    preventDefaults(e);
    setDragOver(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    preventDefaults(e);
    setDragOver(false);
  }

  async function handleDrop(e: React.DragEvent) {
    preventDefaults(e);
    setDragOver(false);

    const dt = e.dataTransfer;
    if (!dt) return;

    // If we get DataTransferItem entries, try to traverse directories (Chrome)
    const items = dt.items ? Array.from(dt.items) : [];
    if (items.length) {
      const collected: File[] = [];
      const walkers: Promise<void>[] = [];

      const toEntry = (item: DataTransferItem) => item.webkitGetAsEntry?.();

      const walkEntry = async (entry: any, path = ""): Promise<void> => {
        if (!entry) return;
        if (entry.isFile) {
          await new Promise<void>((resolve) => {
            entry.file((file: File) => {
              // preserve relative path if possible
              const relPath = path ? `${path}/${file.name}` : file.name;
              try {
                // @ts-expect-error webkitRelativePath is settable in some browsers
                file.webkitRelativePath = relPath;
              } catch {}
              collected.push(file);
              resolve();
            });
          });
        } else if (entry.isDirectory) {
          await new Promise<void>((resolve) => {
            const reader = entry.createReader();
            const readEntries = () => {
              reader.readEntries(async (entries: any[]) => {
                if (!entries.length) return resolve();
                await Promise.all(
                  entries.map((ent) =>
                    walkEntry(ent, path ? `${path}/${entry.name}` : entry.name)
                  )
                );
                readEntries();
              });
            };
            readEntries();
          });
        }
      };

      for (const it of items) {
        if (it.kind === "file") {
          const entry = toEntry(it);
          if (entry) {
            walkers.push(walkEntry(entry));
          } else {
            const f = it.getAsFile();
            if (f) collected.push(f);
          }
        }
      }

      await Promise.all(walkers);

      if (collected.length) {
        setFiles(collected);
        onFilesChange?.(collected);

        // Reflect in the hidden input (so FormData picks them up).
        // We need a DataTransfer to programmatically set input.files.
        if (inputRef.current) {
          const dt2 = new DataTransfer();
          collected.forEach((f) => dt2.items.add(f));
          inputRef.current.files = dt2.files;
        }
        return;
      }
    }

    // Fallback: plain files array
    const fallback = Array.from(dt.files || []);
    setFiles(fallback);
    onFilesChange?.(fallback);
    if (inputRef.current) {
      const dt2 = new DataTransfer();
      fallback.forEach((f) => dt2.items.add(f));
      inputRef.current.files = dt2.files;
    }
  }

  const count = files.length;
  const preview = files.slice(0, previewLimit);
  const more = count - preview.length;

  return (
    <div className="space-y-2">
      <div
        onClick={handleChooseClick}
        onDragEnter={handleDragEnter}
        onDragOver={preventDefaults}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={[
          "flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-lg py-8 px-4 cursor-pointer transition-colors",
          dragOver ? "border-purple-500 bg-purple-50" : "border-gray-300 hover:border-purple-500",
        ].join(" ")}
      >
        {/* Icon */}
        <svg className="h-8 w-8 text-purple-600" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2a1 1 0 011 1v10.586l3.293-3.293a1 1 0 111.414 1.414l-5.007 5.007a1 1 0 01-1.414 0L6.279 11.707a1 1 0 111.414-1.414L11 13.586V3a1 1 0 011-1z" />
        </svg>

        <span className="text-sm text-center">
          <b className="text-purple-700">Upload images</b> — {label}
        </span>

        {/* Hidden input: folder-capable & multiple */}
        <input
          ref={inputRef}
          type="file"
          name={name}
          accept={accept}
          multiple
          className="hidden"
          onChange={handleInputChange}
        />

        {/* Selected summary */}
        {count > 0 && (
          <div className="text-xs text-gray-700 mt-2">
            Selected <b>{count}</b> file{count > 1 ? "s" : ""}
          </div>
        )}
      </div>

      {/* Small preview list */}
      {count > 0 && (
        <ul className="text-xs text-gray-600 space-y-1 max-h-28 overflow-auto border rounded-md p-2 bg-gray-50">
          {preview.map((f, i) => {
            const rel = f.webkitRelativePath || f.name;
            return <li key={`${rel}-${i}`} className="truncate">{rel}</li>;
          })}
          {more > 0 && (
            <li className="italic text-gray-500">…and {more} more</li>
          )}
        </ul>
      )}
    </div>
  );
}
