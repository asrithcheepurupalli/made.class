"use client";

export function PrintButton({ label = "Print / save PDF" }: { label?: string }) {
  return (
    <button className="btn" onClick={() => window.print()}>
      {label}
    </button>
  );
}
