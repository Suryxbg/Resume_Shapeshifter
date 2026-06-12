"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AnalyzeResponse, TailorResponse } from "@/lib/api/types";
import { GapAnalysis } from "@/components/tool/GapAnalysis";
import { JDInput } from "@/components/tool/JDInput";
import { PDFExportButton } from "@/components/tool/PDFExportButton";
import { ResumeInput } from "@/components/tool/ResumeInput";
import { ResumeUpload } from "@/components/tool/ResumeUpload";
import { SaveResumeBanner } from "@/components/tool/SaveResumeBanner";
import { ScoreCard } from "@/components/tool/ScoreCard";
import { SideBySideDiff } from "@/components/tool/SideBySideDiff";
import {
  clearPendingResume,
  clearToolFlowState,
  getPendingResume,
  getToolFlowState,
  savePendingResume,
  saveToolFlowState,
} from "@/lib/resume/pending";
import { SAMPLE_RESUME, SAMPLE_JD } from "@/lib/data/sample-data";

type Step = "input" | "analysis" | "tailor" | "export";

async function readApiError(res: Response): Promise<string> {
  try {
    const data = (await res.json()) as {
      error?: string;
      code?: string;
      fields?: Record<string, unknown>;
    };
    if (data.error) return data.error;
    return `Request failed (${res.status})`;
  } catch {
    return `Request failed (${res.status})`;
  }
}

type ToolFlowProps = {
  initialUser?: { id: string; email: string } | null;
};

export function ToolFlow({ initialUser = null }: ToolFlowProps) {
  const [step, setStep] = useState<Step>("input");
  const [resumeText, setResumeText] = useState("");
  const [jdText, setJdText] = useState("");
  const [tailoringRunId, setTailoringRunId] = useState<string | null>(null);
  const [analyze, setAnalyze] = useState<AnalyzeResponse | null>(null);
  const [tailor, setTailor] = useState<TailorResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inferenceNotice, setInferenceNotice] = useState<string | null>(null);
  const [uploadNotice, setUploadNotice] = useState<string | null>(null);
  const [reviewedAndVerified, setReviewedAndVerified] = useState(false);
  const [user, setUser] = useState(initialUser);
  const [savedResumeId, setSavedResumeId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(
    null
  );
  const pendingSaveAttempted = useRef(false);
  const stateRestored = useRef(false);

  const loadSampleData = useCallback(() => {
    setResumeText(SAMPLE_RESUME);
    setJdText(SAMPLE_JD);
    setUploadNotice("Sample data loaded. Click Analyze to continue.");
  }, []);

  const reset = useCallback(() => {
    setStep("input");
    setResumeText("");
    setJdText("");
    setTailoringRunId(null);
    setAnalyze(null);
    setTailor(null);
    setError(null);
    setInferenceNotice(null);
    setUploadNotice(null);
    setLoading(false);
    setReviewedAndVerified(false);
    setSavedResumeId(null);
    setSaveError(null);
    setSaveSuccessMessage(null);
    clearPendingResume();
    clearToolFlowState();
    pendingSaveAttempted.current = false;
  }, []);

  const saveResume = useCallback(async () => {
    if (!tailoringRunId || !analyze || !tailor || !user) return;

    setIsSaving(true);
    setSaveError(null);
    try {
      const res = await fetch("/api/resumes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tailoringRunId,
          resumeText,
          jdText,
          analyze,
          tailor,
        }),
      });
      const data = (await res.json()) as { error?: string; id?: string };
      if (!res.ok) {
        setSaveError(data.error || "Failed to save resume");
        return;
      }
      setSavedResumeId(data.id ?? "saved");
      setSaveSuccessMessage("Resume saved to your account.");
      clearPendingResume();
      clearToolFlowState();
    } catch {
      setSaveError("Network error — could not save resume.");
    } finally {
      setIsSaving(false);
    }
  }, [tailoringRunId, analyze, tailor, user, resumeText, jdText]);

  const persistForAuth = useCallback(() => {
    if (!tailoringRunId || !analyze || !tailor) return;
    savePendingResume({
      tailoringRunId,
      resumeText,
      jdText,
      analyze,
      tailor,
    });
    saveToolFlowState({
      step,
      resumeText,
      jdText,
      tailoringRunId,
      analyze,
      tailor,
      reviewedAndVerified,
    });
  }, [
    tailoringRunId,
    analyze,
    tailor,
    resumeText,
    jdText,
    step,
    reviewedAndVerified,
  ]);

  useEffect(() => {
    if (stateRestored.current) return;
    stateRestored.current = true;

    const restored = getToolFlowState();
    if (restored) {
      setStep(restored.step);
      setResumeText(restored.resumeText);
      setJdText(restored.jdText);
      setTailoringRunId(restored.tailoringRunId);
      setAnalyze(restored.analyze);
      setTailor(restored.tailor);
      setReviewedAndVerified(restored.reviewedAndVerified);
    }
  }, []);

  useEffect(() => {
    if (!initialUser) return;
    setUser(initialUser);
  }, [initialUser]);

  useEffect(() => {
    if (!user || pendingSaveAttempted.current) return;

    const pending = getPendingResume();
    if (!pending) return;

    pendingSaveAttempted.current = true;

    const autoSave = async () => {
      setIsSaving(true);
      setSaveError(null);
      try {
        const res = await fetch("/api/resumes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tailoringRunId: pending.tailoringRunId,
            resumeText: pending.resumeText,
            jdText: pending.jdText,
            analyze: pending.analyze,
            tailor: pending.tailor,
          }),
        });
        const data = (await res.json()) as { error?: string; id?: string };
        if (!res.ok) {
          setSaveError(data.error || "Failed to save resume after sign-in");
          pendingSaveAttempted.current = false;
          return;
        }

        setTailoringRunId(pending.tailoringRunId);
        setResumeText(pending.resumeText);
        setJdText(pending.jdText);
        setAnalyze(pending.analyze);
        setTailor(pending.tailor);
        setStep("export");
        setSavedResumeId(data.id ?? "saved");
        setSaveSuccessMessage(
          "Welcome back! Your resume has been saved to your account."
        );
        clearPendingResume();
        clearToolFlowState();
      } catch {
        setSaveError("Could not save resume after sign-in. Try again.");
        pendingSaveAttempted.current = false;
      } finally {
        setIsSaving(false);
      }
    };

    void autoSave();
  }, [user]);

  const runAnalyze = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeText, jdText }),
      });
      if (!res.ok) {
        setError(await readApiError(res));
        return;
      }
      const data = (await res.json()) as AnalyzeResponse;
      setAnalyze(data);
      setTailoringRunId(data.tailoringRunId);
      setTailor(null);
      setInferenceNotice(data.inferenceNotice ?? null);
      setStep("analysis");
    } catch {
      setError("Network error — try again.");
    } finally {
      setLoading(false);
    }
  }, [resumeText, jdText]);

  const runTailor = useCallback(async () => {
    if (!tailoringRunId) {
      setError("Missing tailoring run. Analyze first.");
      return;
    }
    if (!analyze) {
      setError("Missing analysis data. Please analyze first.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/tailor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tailoringRunId,
          fallback: {
            resumeText,
            jdText,
            resumeProfile: analyze.resumeProfile,
            jobDescriptionProfile: analyze.jobDescriptionProfile,
            matchOriginal: analyze.matchOriginal,
            gapAnalysis: analyze.gapAnalysis,
          },
        }),
      });
      if (!res.ok) {
        setError(await readApiError(res));
        return;
      }
      const data = (await res.json()) as TailorResponse;
      setTailor(data);
      if (data.inferenceNotice) setInferenceNotice(data.inferenceNotice);
      setStep("tailor");
    } catch {
      setError("Network error — try again.");
    } finally {
      setLoading(false);
    }
  }, [tailoringRunId, analyze, resumeText, jdText]);

  const goExport = useCallback(() => {
    setStep("export");
  }, []);

  const inputDisabled = loading || step !== "input";

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Tailoring workflow
          </h1>
          <p className="mt-1 text-sm text-zinc-600">
            Paste resume + JD → analyze → tailor → review. Uses Groq when{" "}
            <code className="rounded bg-zinc-200 px-1 text-xs">
              GROQ_API_KEY
            </code>{" "}
            is set in{" "}
            <code className="rounded bg-zinc-200 px-1 text-xs">.env</code>.
          </p>
        </div>
        <div className="flex gap-2">
          {step === "input" && (
            <button
              type="button"
              onClick={loadSampleData}
              disabled={loading}
              className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 shadow-sm hover:bg-zinc-50 disabled:opacity-50"
            >
              Load sample data
            </button>
          )}
          <button
            type="button"
            onClick={reset}
            className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 shadow-sm hover:bg-zinc-50"
          >
            Start over
          </button>
        </div>
      </div>

      <ol className="mb-8 flex flex-wrap gap-2 text-xs font-medium text-zinc-600">
        {(
          [
            ["input", "1. Input"],
            ["analysis", "2. Analysis"],
            ["tailor", "3. Tailor"],
            ["export", "4. Export"],
          ] as const
        ).map(([id, label]) => {
          const isUnlocked =
            id === "input" ||
            (id === "analysis" && analyze !== null) ||
            (id === "tailor" && tailor !== null) ||
            (id === "export" && tailor !== null);

          return (
            <li key={id} className="flex">
              {isUnlocked ? (
                <button
                  type="button"
                  onClick={() => setStep(id)}
                  className={`rounded-full px-3 py-1 transition-all ${
                    step === id
                      ? "bg-zinc-900 font-semibold text-white shadow-sm"
                      : "bg-zinc-200 text-zinc-700 hover:bg-zinc-300 active:scale-[0.98]"
                  }`}
                >
                  {label}
                </button>
              ) : (
                <span
                  className="cursor-not-allowed select-none rounded-full bg-zinc-100 px-3 py-1 text-zinc-400"
                  title="Complete the previous steps to unlock this phase"
                >
                  {label}
                </span>
              )}
            </li>
          );
        })}
      </ol>

      {inferenceNotice ? (
        <div
          className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
          role="status"
        >
          {inferenceNotice}
        </div>
      ) : null}

      {error ? (
        <div
          className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900"
          role="alert"
        >
          {error}
        </div>
      ) : null}

      {step === "input" && (
        <section className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-zinc-800">
              Upload your resume (PDF or DOCX)
            </label>
            <ResumeUpload
              onUploadSuccess={(text, filename) => {
                setResumeText(text);
                setUploadNotice(
                  `Successfully extracted text from "${filename}". Please review and edit the parsed text below.`
                );
              }}
              onUploadError={(err) => {
                setError(err);
                setUploadNotice(null);
              }}
              disabled={inputDisabled}
            />
          </div>

          {uploadNotice && (
            <div
              className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-950"
              role="status"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="h-5 w-5 flex-shrink-0 text-green-600"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z"
                  clipRule="evenodd"
                />
              </svg>
              <span>{uploadNotice}</span>
            </div>
          )}

          <ResumeInput
            value={resumeText}
            onChange={(val) => {
              setResumeText(val);
              setUploadNotice(null);
            }}
            disabled={inputDisabled}
          />
          <JDInput
            value={jdText}
            onChange={setJdText}
            disabled={inputDisabled}
          />
          <button
            type="button"
            onClick={runAnalyze}
            disabled={loading || !resumeText.trim() || !jdText.trim()}
            className="flex items-center justify-center gap-2 rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white shadow transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400"
          >
            {loading ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                Analyzing…
              </>
            ) : (
              "Analyze"
            )}
          </button>
        </section>
      )}

      {step === "analysis" && analyze && (
        <section className="flex flex-col gap-8">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900">Job summary</h2>
            <p className="mt-1 text-sm text-zinc-600">
              {analyze.jobDescriptionProfile.jobTitle}
              {analyze.jobDescriptionProfile.company
                ? ` · ${analyze.jobDescriptionProfile.company}`
                : null}
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <h3 className="text-xs font-semibold uppercase text-zinc-500">
                  Required skills
                </h3>
                <ul className="mt-2 list-inside list-disc text-sm text-zinc-800">
                  {analyze.jobDescriptionProfile.requiredSkills.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="text-xs font-semibold uppercase text-zinc-500">
                  Responsibilities
                </h3>
                <ul className="mt-2 list-inside list-disc text-sm text-zinc-800">
                  {analyze.jobDescriptionProfile.responsibilities.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <ScoreCard title="Original match" score={analyze.matchOriginal} />

          <div>
            <h2 className="text-lg font-semibold text-zinc-900">
              Gap analysis
            </h2>
            <div className="mt-3">
              <GapAnalysis analysis={analyze.gapAnalysis} />
            </div>
          </div>

          <button
            type="button"
            onClick={runTailor}
            disabled={loading}
            className="flex items-center justify-center gap-2 self-start rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white shadow transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400"
          >
            {loading ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                Tailoring…
              </>
            ) : (
              "Generate tailored resume"
            )}
          </button>
        </section>
      )}

      {saveSuccessMessage ? (
        <div
          className="mb-6 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-950"
          role="status"
        >
          {saveSuccessMessage}
        </div>
      ) : null}

      {step === "tailor" && analyze && tailor && (
        <section className="flex flex-col gap-8">
          <SaveResumeBanner
            isAuthenticated={!!user}
            isSaved={!!savedResumeId}
            isSaving={isSaving}
            saveError={saveError}
            onSave={saveResume}
            onAuthRedirect={persistForAuth}
          />

          <div className="grid gap-4 lg:grid-cols-2">
            <ScoreCard title="Original match" score={analyze.matchOriginal} />
            <ScoreCard title="Tailored match" score={tailor.matchTailored} />
          </div>

          <div>
            <h2 className="text-lg font-semibold text-zinc-900">
              Tailored summary
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-zinc-800">
              {tailor.tailoredResume.tailoredSummary}
            </p>
            <p className="mt-2 text-xs font-medium uppercase text-zinc-500">
              Skills order
            </p>
            <p className="text-sm text-zinc-700">
              {tailor.tailoredResume.tailoredSkills.join(" · ")}
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-zinc-900">
              Bullets — original vs tailored
            </h2>
            <div className="mt-3">
              <SideBySideDiff
                resume={analyze.resumeProfile}
                tailored={tailor.tailoredResume}
              />
            </div>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-zinc-900">
              Gaps (after tailoring)
            </h2>
            <div className="mt-3">
              <GapAnalysis analysis={tailor.gapAnalysis} />
            </div>
          </div>

          <button
            type="button"
            onClick={goExport}
            className="self-start rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-900 shadow-sm hover:bg-zinc-50"
          >
            Continue to export
          </button>
        </section>
      )}

      {step === "export" && (
        <section className="flex flex-col gap-6">
          {tailor && analyze ? (
            <SaveResumeBanner
              isAuthenticated={!!user}
              isSaved={!!savedResumeId}
              isSaving={isSaving}
              saveError={saveError}
              onSave={saveResume}
              onAuthRedirect={persistForAuth}
            />
          ) : null}

          <div>
            <h2 className="text-lg font-semibold text-zinc-900">
              Download Resumes & Reports
            </h2>
            <p className="mt-1 text-sm text-zinc-600">
              Your tailored documents have been generated on the server using
              high-fidelity rendering engines. Download them below.
            </p>
          </div>

          {/* AI Accuracy Auditing & Disclaimers */}
          {(() => {
            const lowConfidenceCount =
              tailor?.tailoredResume?.tailoredExperience?.reduce(
                (count, exp) =>
                  count +
                  (exp.bullets?.filter((b) => b.confidence === "low").length ||
                    0),
                0
              ) || 0;
            const consistencyReport = tailor?.consistencyReport;
            const hasConsistencyWarnings =
              consistencyReport &&
              (consistencyReport.warnings.length > 0 ||
                consistencyReport.errors.length > 0);

            if (lowConfidenceCount === 0 && !hasConsistencyWarnings)
              return null;

            return (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-amber-900">
                  ⚠️ AI Accuracy & Consistency Audit Note
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-amber-800">
                  Our consistency validation engine completed an audit on the
                  generated updates:
                </p>
                <ul className="mt-1.5 flex list-inside list-disc flex-col gap-1 text-[11px] leading-normal text-amber-700">
                  {lowConfidenceCount > 0 && (
                    <li>
                      <strong>{lowConfidenceCount}</strong> tailored update
                      {lowConfidenceCount > 1 ? "s were" : " was"} marked with{" "}
                      <strong>low confidence</strong> by the LLM
                      bullet-rewriting pipeline.
                    </li>
                  )}
                  {consistencyReport?.errors.map((err, idx) => (
                    <li key={`err-${idx}`}>
                      <strong>Consistency Error:</strong> {err}
                    </li>
                  ))}
                  {consistencyReport?.warnings.map((warn, idx) => (
                    <li key={`warn-${idx}`}>
                      <strong>Audit Warning:</strong> {warn}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })()}

          {/* Verification gate */}
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-5 shadow-sm">
            <label className="flex cursor-pointer select-none items-start gap-4">
              <input
                type="checkbox"
                id="verification-gate-checkbox"
                checked={reviewedAndVerified}
                onChange={(e) => setReviewedAndVerified(e.target.checked)}
                className="mt-0.5 h-5 w-5 cursor-pointer rounded border-zinc-300 text-zinc-950 focus:ring-zinc-900"
              />
              <div className="flex-1">
                <span className="text-sm font-semibold text-zinc-900">
                  Mandatory Accuracy Verification Gate
                </span>
                <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                  I acknowledge that I have personally reviewed all AI-suggested
                  rephrasings, bullet adjustments, and matching audits. I
                  confirm that all details and descriptions contained within the
                  generated documents are fully accurate, represent my genuine
                  professional work experience, and are free of fabrications.
                </p>
              </div>
            </label>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <PDFExportButton
              label="ATS-Tailored Resume PDF"
              description="A clean, ATS-compliant, single-column document utilizing professional serif typography designed specifically for corporate screening systems."
              tailoringRunId={tailoringRunId}
              kind="tailored"
              disabled={!reviewedAndVerified}
              runFallback={{
                resumeText,
                jdText,
                resumeProfile: analyze?.resumeProfile,
                jobDescriptionProfile: analyze?.jobDescriptionProfile,
                matchOriginal: analyze?.matchOriginal,
                matchTailored: tailor?.matchTailored,
                tailoredResume: tailor?.tailoredResume,
                gapAnalysis: tailor?.gapAnalysis ?? analyze?.gapAnalysis,
              }}
            />
            <PDFExportButton
              label="Side-by-Side Comparison PDF"
              description="A complete visual audit report showing score gains, job criteria matching, gap resolutions, and dynamic original vs. tailored bullet diffs."
              tailoringRunId={tailoringRunId}
              kind="comparison"
              disabled={!reviewedAndVerified}
              runFallback={{
                resumeText,
                jdText,
                resumeProfile: analyze?.resumeProfile,
                jobDescriptionProfile: analyze?.jobDescriptionProfile,
                matchOriginal: analyze?.matchOriginal,
                matchTailored: tailor?.matchTailored,
                tailoredResume: tailor?.tailoredResume,
                gapAnalysis: tailor?.gapAnalysis ?? analyze?.gapAnalysis,
              }}
            />
          </div>

          <button
            type="button"
            onClick={reset}
            className="text-zinc-750 mt-4 self-start rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold shadow-sm hover:bg-zinc-50"
          >
            Start New Tailoring Session
          </button>
        </section>
      )}
    </div>
  );
}
