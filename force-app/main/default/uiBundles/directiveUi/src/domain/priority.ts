import type { PriorityBand, ScoreContribution } from "./types";

/**
 * Priority bands per CONTRACT.md:
 *   Critical 90–100 · High 75–89 · Medium 50–74 · Low 25–49 · Background <25
 */
export function bandForScore(score: number): PriorityBand {
  if (score >= 90) return "Critical";
  if (score >= 75) return "High";
  if (score >= 50) return "Medium";
  if (score >= 25) return "Low";
  return "Background";
}

/** Semantic CSS-variable token name for a band (used for color + tint). */
export function bandToken(band: PriorityBand): string {
  switch (band) {
    case "Critical":
      return "band-critical";
    case "High":
      return "band-high";
    case "Medium":
      return "band-medium";
    case "Low":
      return "band-low";
    case "Background":
      return "band-background";
  }
}

/** Tailwind classes for a band chip. Non-color cues live in the component. */
export function bandChipClasses(band: PriorityBand): string {
  const token = bandToken(band);
  return `text-[hsl(var(--${token}))] bg-[hsl(var(--${token}))/0.12] border-[hsl(var(--${token}))/0.30]`;
}

export function bandLabel(band: PriorityBand): string {
  return band;
}

/** Sum of contributions clamped to the 0–100 range. */
export function scoreFromContributions(
  contributions: ScoreContribution[],
): number {
  const raw = contributions.reduce((acc, c) => acc + c.value, 0);
  return Math.max(0, Math.min(100, Math.round(raw)));
}

/** Order for display: positive drivers first (desc), then mitigations. */
export function sortContributions(
  contributions: ScoreContribution[],
): ScoreContribution[] {
  return [...contributions].sort((a, b) => b.value - a.value);
}
