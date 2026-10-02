"use client";

import { useRef, useState } from "react";

import { cn } from "@/lib/utils";

const LENGTH = 6;

export interface OtpInputProps {
  name: string;
  value?: string;
  onChange?: (value: string) => void;
}

/** Six single-digit boxes submitted as one hidden field. */
export function OtpInput({ name, value, onChange }: OtpInputProps) {
  const [internalDigits, setInternalDigits] = useState<string[]>(() => Array(LENGTH).fill(""));
  const refs = useRef<Array<HTMLInputElement | null>>([]);

  const isControlled = value !== undefined;
  const digits = isControlled
    ? (() => {
        const arr = value.split("").slice(0, LENGTH);
        while (arr.length < LENGTH) arr.push("");
        return arr;
      })()
    : internalDigits;

  const handleChange = (index: number, raw: string) => {
    const typed = raw.replace(/\D/g, "");

    const next = [...digits];
    if (!typed) {
      next[index] = "";
    } else {
      for (let k = 0; k < typed.length && index + k < LENGTH; k += 1) {
        next[index + k] = typed[k];
      }
    }
    if (!isControlled) {
      setInternalDigits(next);
    }
    onChange?.(next.join(""));

    if (typed) {
      refs.current[Math.min(index + typed.length, LENGTH - 1)]?.focus();
    }
  };

  const handleKeyDown = (
    index: number,
    event: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (event.key === "Backspace" && !digits[index] && index > 0) {
      refs.current[index - 1]?.focus();
    }
    if (event.key === "ArrowLeft" && index > 0) {
      event.preventDefault();
      refs.current[index - 1]?.focus();
    }
    if (event.key === "ArrowRight" && index < LENGTH - 1) {
      event.preventDefault();
      refs.current[index + 1]?.focus();
    }
  };

  return (
    <div className="flex justify-center gap-2">
      <input type="hidden" name={name} value={digits.join("")} />
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(el) => {
            refs.current[index] = el;
          }}
          value={digit}
          onChange={(event) => handleChange(index, event.target.value)}
          onKeyDown={(event) => handleKeyDown(index, event)}
          onFocus={(event) => event.target.select()}
          inputMode="numeric"
          autoComplete={index === 0 ? "one-time-code" : "off"}
          aria-label={`Digit ${index + 1} of ${LENGTH}`}
          className={cn(
            "aspect-square w-full min-w-0 max-w-12 flex-1 rounded-md border border-border",
            "bg-transparent text-center font-mono text-xl sm:text-2xl",
            "outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
          )}
        />
      ))}
    </div>
  );
}
