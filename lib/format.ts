export function inr(amount: number): string {
  return "₹" + amount.toLocaleString("en-IN");
}

export function dateISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function dateHuman(d: Date): string {
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

// Normalize a yyyy-mm-dd string to a UTC-midnight Date for stable uniqueness.
export function toUTCDate(isoDay: string): Date {
  return new Date(`${isoDay}T00:00:00.000Z`);
}

export function todayISO(): string {
  return dateISO(new Date());
}
