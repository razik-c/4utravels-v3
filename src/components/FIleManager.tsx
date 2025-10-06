"use client";

import React, {
  useState,
  useEffect,
  ChangeEvent,
  FormEvent,
  useMemo,
  useRef,
} from "react";
import { FileObject } from "../lib/r2";

type UploadStatus = "pending" | "uploading" | "done" | "error" | "cancelled";

type UploadItem = {
  id: string;
  file: File;
  progress: number;
  status: UploadStatus;
  error?: string;
  controller: AbortController;
};

export default function FileManager() {
  const [files, setFiles] = useState<FileObject[]>([]);
  const [queue, setQueue] = useState<UploadItem[]>([]);

  const isUploading = useMemo(
    () => queue.some((q) => q.status === "uploading"),
    [queue]
  );

  useEffect(() => {
    fetchFiles();
  }, []);

  const fetchFiles = async () => {
    try {
      const response = await fetch("/api/files");
      const data = await response.json();
      setFiles(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching files:", error);
      setFiles([]);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const fresh: UploadItem[] = Array.from(e.target.files).map((f) => ({
      id: crypto.randomUUID(),
      file: f,
      progress: 0,
      status: "pending",
      controller: new AbortController(),
    }));
    setQueue((prev) => [...prev, ...fresh]);
    e.target.value = "";
  };

  const handleUpload = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const pending = queue.filter((it) => it.status === "pending");
    if (pending.length === 0) return;

    // mark as uploading
    setQueue((prev) =>
      prev.map((it) =>
        it.status === "pending" ? { ...it, status: "uploading" } : it
      )
    );

    // 1) Build batch items
    const items = pending.map((it) => ({
      id: it.id,
      key: getObjectKey(it.file), // sanitized key
      contentType: it.file.type || "application/octet-stream",
    }));

    // 2) Ask server for signed URLs in one shot
    const resp = await fetch("/api/upload/batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: items.map(({ key, contentType }) => ({ key, contentType })),
      }),
    });
    if (!resp.ok) {
      const t = await resp.text().catch(() => "");
      throw new Error(`Batch sign failed: ${resp.status} ${t}`);
    }
    const { items: signed } = (await resp.json()) as {
      items: { key: string; signedUrl: string }[];
    };

    // 3) Map key -> signedUrl
    const urlByKey = new Map<string, string>(
      signed.map((x) => [x.key, x.signedUrl])
    );

    // 4) Concurrency pool to upload with pre-signed URLs
    let i = 0;
    const work = async () => {
      while (i < items.length) {
        const idx = i++;
        const it = items[idx];
        const signedUrl = urlByKey.get(it.key) 
        if (!signedUrl) {
          // mark error
          setQueue((prev) =>
            prev.map((q) =>
              q.id === it.id
                ? { ...q, status: "error", error: "Missing signed url" }
                : q
            )
          );
          continue;
        }
        await uploadWithSignedUrl(it.id, signedUrl);
      }
    };
    const workers = Array.from(
      { length: Math.min(MAX_CONCURRENCY, items.length) },
      work
    );
    await Promise.all(workers);

    await fetchFiles();
  };

  const uploadOne = async (id: string) => {
    const item = queue.find((q) => q.id === id);
    if (!item) return;

    const { file, controller } = item;

    try {
      const relPath =
        (file as any).webkitRelativePath &&
        (file as any).webkitRelativePath !== ""
          ? (file as any).webkitRelativePath.replace(/^\/+/, "")
          : file.name;

      const finalPath = relPath;

      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: file.name,
          fileType: file.type,
          relativePath: finalPath,
        }),
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`Signed URL request failed (${res.status})`);
      const { signedUrl } = await res.json();
      if (!signedUrl) throw new Error("signedUrl missing in response");

      await uploadFileWithProgress(file, signedUrl, controller.signal, (p) => {
        setQueue((prev) =>
          prev.map((q) => (q.id === id ? { ...q, progress: p } : q))
        );
      });

      setQueue((prev) =>
        prev.map((q) =>
          q.id === id ? { ...q, status: "done", progress: 100 } : q
        )
      );
    } catch (err: any) {
      const aborted = err?.name === "AbortError";
      setQueue((prev) =>
        prev.map((q) =>
          q.id === id
            ? {
                ...q,
                status: aborted ? "cancelled" : "error",
                error: aborted ? "Cancelled" : err?.message ?? "Upload failed",
              }
            : q
        )
      );
    }
  };

  const uploadFileWithProgress = (
    file: File,
    signedUrl: string,
    signal: AbortSignal,
    onProgress: (percent: number) => void
  ): Promise<void> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", signedUrl);
      xhr.setRequestHeader("Content-Type", file.type);

      xhr.upload.onprogress = (evt) => {
        if (evt.lengthComputable) {
          onProgress((evt.loaded / evt.total) * 100);
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
        } else {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      };

      xhr.onerror = () => reject(new Error("Network error during upload"));

      xhr.send(file);

      signal.addEventListener("abort", () => {
        xhr.abort();
        reject(new Error("AbortError"));
      });
    });
  };

  const handleCancelUpload = (id: string) => {
    setQueue((prev) => {
      const it = prev.find((q) => q.id === id);
      if (it && (it.status === "uploading" || it.status === "pending")) {
        it.controller.abort();
      }
      return [...prev];
    });
  };

  const clearFinished = () => {
    setQueue((prev) =>
      prev.filter((q) => q.status === "pending" || q.status === "uploading")
    );
  };

  const handleDownload = async (key: string) => {
    try {
      const response = await fetch("/api/files", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key }),
      });
      const { signedUrl } = await response.json();
      window.open(signedUrl, "_blank");
    } catch (error) {
      console.error("Error downloading file:", error);
      alert("Error downloading file");
    }
  };

  const handleDelete = async (key: string) => {
    try {
      await fetch("/api/files", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key }),
      });
      alert("File deleted successfully!");
      fetchFiles();
    } catch (error) {
      console.error("Error deleting file:", error);
      alert("Error deleting file");
    }
  };

  const uploadWithSignedUrl = async (id: string, signedUrl: string) => {
    const item = queue.find((q) => q.id === id);
    if (!item) return;
    const { file, controller } = item;

    try {
      await uploadFileWithProgress(file, signedUrl, controller.signal, (p) => {
        setQueue((prev) =>
          prev.map((q) => (q.id === id ? { ...q, progress: p } : q))
        );
      });

      setQueue((prev) =>
        prev.map((q) =>
          q.id === id ? { ...q, status: "done", progress: 100 } : q
        )
      );
    } catch (err: any) {
      const aborted = err?.name === "AbortError";
      setQueue((prev) =>
        prev.map((q) =>
          q.id === id
            ? {
                ...q,
                status: aborted ? "cancelled" : "error",
                error: aborted ? "Cancelled" : err?.message ?? "Upload failed",
              }
            : q
        )
      );
    }
  };

  const folderRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    folderRef.current?.setAttribute("webkitdirectory", "");
  }, []);

  const MAX_CONCURRENCY = 5;

  function sanitizeKey(s: string) {
    return String(s || "")
      .replaceAll("\\", "/")
      .replaceAll("..", "")
      .replace(/^[\/]+|[\/]+$/g, "")
      .replace(/[^\w\-./]/g, "_");
  }

  function getObjectKey(file: File) {
    const rel =
      (file as any).webkitRelativePath &&
      (file as any).webkitRelativePath !== ""
        ? (file as any).webkitRelativePath.replace(/^\/+/, "")
        : file.name;
    return sanitizeKey(rel);
  }

  return (
    <div className="max-w-2xl mx-auto mt-24 p-6 bg-white rounded-lg shadow-lg">

      <h2 className="text-2xl font-semibold mb-6 text-gray-800">
        Upload Files
      </h2>
      <form onSubmit={handleUpload} className="mb-8">
        <div className="flex items-center space-x-4">
          <label className="flex-1">
            <input
              ref={folderRef}
              type="file"
              multiple
              onChange={handleFileChange}
            />

            <div className="cursor-pointer bg-green-50 text-green-600 rounded-lg px-4 py-2 border border-green-300 hover:bg-green-100 transition">
              Choose a folder
            </div>
          </label>
          <button
            type="submit"
            disabled={queue.length === 0 || isUploading}
            className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUploading ? "Uploading..." : "Start Upload"}
          </button>
          <button
            type="button"
            onClick={clearFinished}
            disabled={queue.every(
              (q) => q.status === "pending" || q.status === "uploading"
            )}
            className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
            title="Remove completed/failed items from the queue"
          >
            Clear Finished
          </button>
        </div>
      </form>

      {queue.length > 0 && (
        <div className="mb-10">
          <h3 className="text-lg font-semibold mb-3 text-gray-700">
            Upload Queue
          </h3>
          <ul className="space-y-3">
            {queue.map((q) => (
              <li key={q.id} className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0 pr-4">
                    <p className="text-gray-800 truncate">{q.file.name}</p>
                    <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
                      <div
                        className={`h-2.5 rounded-full ${
                          q.status === "error"
                            ? "bg-red-500"
                            : q.status === "cancelled"
                            ? "bg-gray-400"
                            : "bg-blue-600"
                        }`}
                        style={{ width: `${Math.floor(q.progress)}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-600 mt-1">
                      {Math.floor(q.progress)}% • {q.status}
                      {q.error ? ` • ${q.error}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    {(q.status === "uploading" || q.status === "pending") && (
                      <button
                        onClick={() => handleCancelUpload(q.id)}
                        className="text-red-500 hover:text-red-600 transition"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* <h2 className="text-2xl font-semibold mb-4 text-gray-800">Files</h2>
      {files.length === 0 ? (
        <p className="text-gray-500 italic">No files found.</p>
      ) : (
        <ul className="space-y-4">
          {files.map((f) => (
            <li
              key={f.Key}
              className="flex items-center justify-between bg-gray-50 p-4 rounded-lg"
            >
              <span className="text-gray-700 truncate flex-1">{f.Key}</span>
              <div className="flex space-x-2">
                <button
                  onClick={() => f.Key && handleDownload(f.Key)}
                  className="text-blue-500 hover:text-blue-600 transition duration-300"
                >
                  Download
                </button>
                <button
                  onClick={() => f.Key && handleDelete(f.Key)}
                  className="text-red-500 hover:text-red-600 transition duration-300"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )} */}
    </div>
  );
}
