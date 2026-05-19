"use client";

import React, { useState, useCallback } from "react";

type PDFExportButtonProps = {
  label: string;
  description?: string;
  tailoringRunId: string | null;
  kind: "tailored" | "comparison";
  disabled?: boolean;
};

export function PDFExportButton({
  label,
  description,
  tailoringRunId,
  kind,
  disabled = false,
}: PDFExportButtonProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const triggerDownload = useCallback(async () => {
    if (!tailoringRunId) return;

    setIsDownloading(true);
    setError(null);

    const idempotencyKey = `${tailoringRunId}-${kind}`;

    try {
      const response = await fetch("/api/export/pdf", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify({
          tailoringRunId,
          kind,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to download PDF");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = kind === "tailored" ? "resume_tailored.pdf" : "resume_comparison_report.pdf";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error exporting document";
      setError(message);
    } finally {
      setIsDownloading(false);
    }
  }, [tailoringRunId, kind]);

  const isDisabled = !tailoringRunId || isDownloading || disabled;

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition-all hover:border-zinc-300 hover:shadow-md">
      <div className="flex-1">
        <h3 className="text-sm font-semibold text-zinc-900">{label}</h3>
        {description ? (
          <p className="mt-1 text-xs text-zinc-500 leading-relaxed">{description}</p>
        ) : (
          <p className="mt-1 text-xs text-zinc-500 leading-relaxed">
            {kind === "tailored"
              ? "Download your ATS-optimized tailored resume as a clean draft."
              : "Download a comprehensive visual side-by-side comparison report with insights."}
          </p>
        )}
      </div>

      {error && (
        <div className="mt-3 rounded-lg bg-red-50 p-2.5 text-xs text-red-700 leading-relaxed">
          <strong>Download Error:</strong> {error}
        </div>
      )}

      <button
        type="button"
        onClick={triggerDownload}
        disabled={isDisabled}
        className={`mt-4 w-full flex items-center justify-center gap-2 rounded-lg py-2 text-xs font-semibold shadow-sm transition-all ${
          isDisabled
            ? "cursor-not-allowed bg-zinc-100 text-zinc-400"
            : "bg-zinc-950 text-white hover:bg-zinc-800 active:scale-[0.98]"
        }`}
      >
        {isDownloading ? (
          <>
            <svg
              className="h-3.5 w-3.5 animate-spin text-zinc-400"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Generating PDF...
          </>
        ) : (
          <>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="h-3.5 w-3.5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3"
              />
            </svg>
            Download Document
          </>
        )}
      </button>
    </div>
  );
}
