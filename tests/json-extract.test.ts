import { describe, expect, it } from "vitest";
import { extractJsonObject, parseJsonObject } from "@/lib/llm/json-extract";

describe("json-extract", () => {
  it("parses fenced JSON", () => {
    const raw = 'Here you go:\n```json\n{"a":1}\n```';
    expect(parseJsonObject(raw)).toEqual({ a: 1 });
  });

  it("extracts object from prose", () => {
    const raw = 'Note: {"x": true} done';
    expect(extractJsonObject(raw)).toBe('{"x": true}');
  });
});
