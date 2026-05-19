"use client";

type ResumeInputProps = {
  id?: string;
  label?: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
};

export function ResumeInput({
  id = "resume-text",
  label = "Your resume",
  value,
  onChange,
  disabled,
  placeholder = "Paste your resume as plain text…",
}: ResumeInputProps) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-medium text-zinc-800">
        {label}
      </label>
      <textarea
        id={id}
        name="resumeText"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder={placeholder}
        rows={14}
        className="min-h-[12rem] w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 font-mono text-sm text-zinc-900 shadow-sm outline-none ring-zinc-400 placeholder:text-zinc-400 focus:border-zinc-500 focus:ring-2 disabled:cursor-not-allowed disabled:bg-zinc-100"
      />
    </div>
  );
}
