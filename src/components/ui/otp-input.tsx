"use client";

import { useRef } from "react";

interface OtpInputProps {
  value: string;
  onChange: (v: string) => void;
  length?: number;
  disabled?: boolean;
}

export function OtpInput({ value, onChange, length = 6, disabled }: OtpInputProps) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = value.padEnd(length, " ").split("").slice(0, length);

  function setDigit(i: number, d: string) {
    const clean = d.replace(/\D/g, "").slice(0, 1);
    const arr = value.padEnd(length, " ").split("");
    arr[i] = clean || " ";
    onChange(arr.join("").trim());
    if (clean && i < length - 1) refs.current[i + 1]?.focus();
  }

  function handleKey(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[i].trim() && i > 0) {
      refs.current[i - 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    if (!pasted) return;
    onChange(pasted);
    refs.current[Math.min(pasted.length, length - 1)]?.focus();
  }

  return (
    <div className="flex justify-between gap-1.5 sm:gap-2">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={d.trim()}
          disabled={disabled}
          onChange={(e) => setDigit(i, e.target.value)}
          onKeyDown={(e) => handleKey(i, e)}
          onPaste={handlePaste}
          aria-label={`Chiffre ${i + 1}`}
          className="h-12 w-full min-w-0 rounded-lg border border-input bg-background text-center font-mono text-lg font-semibold text-foreground outline-none ring-offset-background transition focus:border-[var(--brand-green)] focus:ring-2 focus:ring-[var(--brand-green)]/40 disabled:opacity-50 sm:h-14 sm:text-xl"
        />
      ))}
    </div>
  );
}
