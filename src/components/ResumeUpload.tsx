"use client";

import React, { useCallback, useState, useRef } from "react";

type ResumeUploadProps = {
  onUploadSuccess: (text: string, filename: string) => void;
  onUploadError: (error: string) => void;
  disabled?: boolean;
};

export function ResumeUpload({
  onUploadSuccess,
  onUploadError,
  disabled = false,
}: ResumeUploadProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [fileDetails, setFileDetails] = useState<{ name: string; size: string } | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const uploadFile = useCallback(
    async (file: File) => {
      setIsUploading(true);
      setUploadError(null);
      setFileDetails({ name: file.name, size: formatFileSize(file.size) });

      const formData = new FormData();
      formData.append("file", file);

      try {
        const response = await fetch("/api/ingest", {
          method: "POST",
          body: formData,
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to process document");
        }

        onUploadSuccess(data.text, file.name);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Error uploading file";
        setUploadError(message);
        setFileDetails(null);
        onUploadError(message);
      } finally {
        setIsUploading(false);
      }
    },
    [onUploadSuccess, onUploadError]
  );

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragActive(false);

      if (disabled || isUploading) return;

      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        const file = e.dataTransfer.files[0];
        uploadFile(file);
      }
    },
    [disabled, isUploading, uploadFile]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      e.preventDefault();
      if (disabled || isUploading) return;

      if (e.target.files && e.target.files[0]) {
        uploadFile(e.target.files[0]);
      }
    },
    [disabled, isUploading, uploadFile]
  );

  const triggerFileInput = useCallback(() => {
    if (disabled || isUploading) return;
    fileInputRef.current?.click();
  }, [disabled, isUploading]);

  const clearFile = useCallback(() => {
    setFileDetails(null);
    setUploadError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  return (
    <div className="w-full">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleChange}
        accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        className="hidden"
        disabled={disabled || isUploading}
      />

      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={fileDetails || uploadError ? undefined : triggerFileInput}
        className={`relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center transition-all duration-300 ${
          fileDetails || uploadError ? "" : "cursor-pointer"
        } ${
          isDragActive
            ? "border-zinc-800 bg-zinc-50 scale-[0.99] ring-4 ring-zinc-100"
            : "border-zinc-300 bg-white hover:border-zinc-500 hover:bg-zinc-50/50"
        } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
      >
        {!fileDetails && !uploadError && !isUploading && (
          <div className="flex flex-col items-center">
            {/* Elegant animated upload icon */}
            <div className="mb-4 rounded-full bg-zinc-100 p-3 text-zinc-600 transition-transform duration-300 hover:scale-110">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="h-6 w-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 16.5V9.75m0 0 3 3m-3-3-3 3M6.75 19.5a4.5 4.5 0 0 1-1.41-8.775 5.25 5.25 0 0 1 10.233-2.33 3 3 0 0 1 3.758 3.848A3.752 3.752 0 0 1 18 19.5H6.75Z"
                />
              </svg>
            </div>
            <p className="text-sm font-semibold text-zinc-800">
              Drag & drop your resume file here
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              Supports PDF and DOCX formats (Max 5MB)
            </p>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                triggerFileInput();
              }}
              disabled={disabled}
              className="mt-4 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 shadow-sm transition-colors hover:bg-zinc-50 hover:text-zinc-900"
            >
              Browse files
            </button>
          </div>
        )}

        {isUploading && (
          <div className="flex flex-col items-center py-4">
            {/* Elegant pulse loader */}
            <div className="relative mb-4 flex h-10 w-10 items-center justify-center">
              <div className="absolute h-full w-full animate-ping rounded-full bg-zinc-200 opacity-75"></div>
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-800 border-t-transparent"></div>
            </div>
            <p className="text-sm font-semibold text-zinc-800">
              Extracting resume details...
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              Analyzing text layer with high fidelity parsers
            </p>
          </div>
        )}

        {fileDetails && !isUploading && (
          <div className="flex flex-col items-center">
            {/* Elegant green check badge */}
            <div className="mb-3 rounded-full bg-green-50 p-2.5 text-green-600">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="h-6 w-6"
              >
                <path
                  fillRule="evenodd"
                  d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <p className="text-sm font-semibold text-zinc-800">
              {fileDetails.name}
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              Successfully extracted ({fileDetails.size})
            </p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={clearFile}
                className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-600 hover:bg-zinc-50 hover:text-zinc-800"
              >
                Remove File
              </button>
              <button
                type="button"
                onClick={triggerFileInput}
                className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-zinc-800"
              >
                Upload Different File
              </button>
            </div>
          </div>
        )}

        {uploadError && !isUploading && (
          <div className="flex flex-col items-center">
            {/* Elegant warning badge */}
            <div className="mb-3 rounded-full bg-red-50 p-2.5 text-red-600">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="h-6 w-6"
              >
                <path
                  fillRule="evenodd"
                  d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003ZM12 8.25a.75.75 0 0 1 .75.75v3.75a.75.75 0 0 1-1.5 0V9a.75.75 0 0 1 .75-.75Zm0 8.25a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <p className="text-sm font-semibold text-red-800">
              Extraction Failed
            </p>
            <p className="mt-1 max-w-md text-xs text-red-600 leading-relaxed">
              {uploadError}
            </p>
            <button
              type="button"
              onClick={clearFile}
              className="mt-4 rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-zinc-800"
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
