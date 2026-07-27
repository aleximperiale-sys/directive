import { describe, expect, it } from "vitest";
import {
  bandForScore,
  scoreFromContributions,
} from "@/domain/priority";
import type { ScoreContribution } from "@/domain/types";

describe("bandForScore", () => {
  it("maps scores to the correct priority band", () => {
    expect(bandForScore(100)).toBe("Critical");
    expect(bandForScore(90)).toBe("Critical");
    expect(bandForScore(89)).toBe("High");
    expect(bandForScore(75)).toBe("High");
    expect(bandForScore(74)).toBe("Medium");
    expect(bandForScore(50)).toBe("Medium");
    expect(bandForScore(49)).toBe("Low");
    expect(bandForScore(25)).toBe("Low");
    expect(bandForScore(24)).toBe("Background");
    expect(bandForScore(0)).toBe("Background");
  });
});

describe("scoreFromContributions", () => {
  it("sums contributions and clamps to 0–100", () => {
    const contributions: ScoreContribution[] = [
      { key: "BASE_RULE", label: "Base", value: 20 },
      { key: "URGENCY", label: "Urgency", value: 16 },
      { key: "MITIGATION", label: "Recovery", value: -8 },
    ];
    expect(scoreFromContributions(contributions)).toBe(28);
  });

  it("never returns more than 100 or less than 0", () => {
    expect(
      scoreFromContributions([
        { key: "BASE_RULE", label: "Base", value: 80 },
        { key: "URGENCY", label: "Urgency", value: 80 },
      ]),
    ).toBe(100);
    expect(
      scoreFromContributions([
        { key: "SUPPRESSION", label: "Dup", value: -50 },
      ]),
    ).toBe(0);
  });
});
