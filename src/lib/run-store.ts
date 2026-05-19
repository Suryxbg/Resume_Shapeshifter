import { createHash, randomUUID } from "crypto";
import type { TailoringRun } from "@/schemas";

export type RunRecord = {
  tailoringRun: TailoringRun;
  /** Staged plaintext for later phases; kept in memory only (Phase 0). */
  resumeText: string;
  jdText: string;
};

const g = globalThis as unknown as { __tailoringRunStore?: Map<string, RunRecord> };

function getMap(): Map<string, RunRecord> {
  if (!g.__tailoringRunStore) {
    g.__tailoringRunStore = new Map();
  }
  return g.__tailoringRunStore;
}

export function createRun(input: {
  resumeText: string;
  jdText: string;
}): RunRecord {
  const id = randomUUID();
  const createdAt = new Date().toISOString();
  const jdTextHash = createHash("sha256")
    .update(input.jdText, "utf8")
    .digest("hex");

  const tailoringRun: TailoringRun = {
    id,
    createdAt,
    status: "draft",
    jdTextHash,
    resumeSourceRef: "inline-text",
  };

  const record: RunRecord = {
    tailoringRun,
    resumeText: input.resumeText,
    jdText: input.jdText,
  };
  getMap().set(id, record);
  return record;
}

export function getRun(id: string): RunRecord | undefined {
  return getMap().get(id);
}

/** Merge fields into the stored `TailoringRun` (shallow merge at run root). */
export function patchTailoringRun(
  id: string,
  partial: Partial<TailoringRun>
): RunRecord | undefined {
  const rec = getRun(id);
  if (!rec) return undefined;
  const tailoringRun: TailoringRun = { ...rec.tailoringRun, ...partial };
  const next: RunRecord = { ...rec, tailoringRun };
  getMap().set(id, next);
  return next;
}
