import type { AnalyzeResponse, TailorResponse } from "@/lib/api/types";

const PENDING_SAVE_KEY = "rs_pending_resume";
const TOOL_STATE_KEY = "rs_tool_state";
const PENDING_TTL_MS = 24 * 60 * 60 * 1000;

export type PendingResumeSave = {
  tailoringRunId: string;
  resumeText: string;
  jdText: string;
  analyze: AnalyzeResponse;
  tailor: TailorResponse;
  savedAt: number;
};

export type ToolFlowPersistedState = {
  step: "input" | "analysis" | "tailor" | "export";
  resumeText: string;
  jdText: string;
  tailoringRunId: string | null;
  analyze: AnalyzeResponse | null;
  tailor: TailorResponse | null;
  reviewedAndVerified: boolean;
  savedAt: number;
};

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function savePendingResume(data: Omit<PendingResumeSave, "savedAt">): void {
  if (!isBrowser()) return;
  const payload: PendingResumeSave = { ...data, savedAt: Date.now() };
  sessionStorage.setItem(PENDING_SAVE_KEY, JSON.stringify(payload));
}

export function getPendingResume(): PendingResumeSave | null {
  if (!isBrowser()) return null;
  const raw = sessionStorage.getItem(PENDING_SAVE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as PendingResumeSave;
    if (Date.now() - parsed.savedAt > PENDING_TTL_MS) {
      clearPendingResume();
      return null;
    }
    return parsed;
  } catch {
    clearPendingResume();
    return null;
  }
}

export function clearPendingResume(): void {
  if (!isBrowser()) return;
  sessionStorage.removeItem(PENDING_SAVE_KEY);
}

export function saveToolFlowState(
  state: Omit<ToolFlowPersistedState, "savedAt">
): void {
  if (!isBrowser()) return;
  const payload: ToolFlowPersistedState = { ...state, savedAt: Date.now() };
  sessionStorage.setItem(TOOL_STATE_KEY, JSON.stringify(payload));
}

export function getToolFlowState(): ToolFlowPersistedState | null {
  if (!isBrowser()) return null;
  const raw = sessionStorage.getItem(TOOL_STATE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as ToolFlowPersistedState;
    if (Date.now() - parsed.savedAt > PENDING_TTL_MS) {
      clearToolFlowState();
      return null;
    }
    return parsed;
  } catch {
    clearToolFlowState();
    return null;
  }
}

export function clearToolFlowState(): void {
  if (!isBrowser()) return;
  sessionStorage.removeItem(TOOL_STATE_KEY);
}

export function buildAuthRedirectUrl(
  authPath: "/login" | "/signup",
  returnTo = "/tool"
): string {
  const params = new URLSearchParams({ returnTo });
  return `${authPath}?${params.toString()}`;
}
