import { ZodError } from "zod";

export type ApiFieldErrors = Record<string, string[] | undefined>;

export function formatZodError(error: ZodError): {
  error: string;
  code: "VALIDATION_ERROR";
  fields: ApiFieldErrors;
} {
  const flat = error.flatten();
  return {
    error: "Validation failed",
    code: "VALIDATION_ERROR",
    fields: flat.fieldErrors as ApiFieldErrors,
  };
}
