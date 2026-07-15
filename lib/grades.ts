// CBSE-style 9-point grading (secondary classes)
export function cbseGrade(pct: number): string {
  if (pct >= 91) return "A1";
  if (pct >= 81) return "A2";
  if (pct >= 71) return "B1";
  if (pct >= 61) return "B2";
  if (pct >= 51) return "C1";
  if (pct >= 41) return "C2";
  if (pct >= 33) return "D";
  return "E";
}

export function gradeRemark(pct: number): string {
  if (pct >= 91) return "Outstanding";
  if (pct >= 81) return "Excellent";
  if (pct >= 71) return "Very good";
  if (pct >= 61) return "Good";
  if (pct >= 51) return "Satisfactory";
  if (pct >= 41) return "Can do better with effort";
  if (pct >= 33) return "Needs improvement";
  return "Needs urgent attention";
}
