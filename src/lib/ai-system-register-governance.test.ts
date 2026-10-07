import { describe, expect, it } from "vitest";
import {
  computeNextReviewAt,
  diffMaterialChanges,
  initialAcceptanceStatus,
  isReviewDueSoon,
  isReviewOverdue,
  materialChangesStaleAssessment,
  requiresRiskAcceptance,
  requiresSecondReviewer,
  reviewCadenceDays,
  roleHasPermission,
  validateRiskAcceptance,
} from "@/lib/ai-system-register-governance";

describe("ai system register governance", () => {
  it("sets review cadence by risk tier", () => {
    expect(reviewCadenceDays("prohibited")).toBe(30);
    expect(reviewCadenceDays("high")).toBe(90);
    expect(reviewCadenceDays("limited")).toBe(180);
    expect(reviewCadenceDays("minimal")).toBe(365);
    const next = computeNextReviewAt("high", new Date("2026-01-01T00:00:00.000Z"));
    expect(next?.toISOString().slice(0, 10)).toBe("2026-04-01");
  });

  it("detects overdue and due-soon reviews", () => {
    const now = new Date("2026-06-01T12:00:00.000Z");
    expect(isReviewOverdue("2026-05-01T00:00:00.000Z", now)).toBe(true);
    expect(isReviewDueSoon("2026-06-10T00:00:00.000Z", 14, now)).toBe(true);
    expect(isReviewDueSoon("2026-08-01T00:00:00.000Z", 14, now)).toBe(false);
  });

  it("requires acceptance and dual control for elevated tiers", () => {
    expect(requiresRiskAcceptance("limited")).toBe(true);
    expect(requiresSecondReviewer("limited")).toBe(false);
    expect(requiresSecondReviewer("high")).toBe(true);
    expect(initialAcceptanceStatus("high")).toBe("pending");
    expect(initialAcceptanceStatus("minimal")).toBe("not_required");
  });

  it("validates risk acceptance payloads", () => {
    expect(
      validateRiskAcceptance({
        tier: "high",
        accepterEmail: "a@example.com",
        accepterName: "A",
        note: "Accepted under appetite.",
        secondReviewerEmail: "a@example.com",
        secondReviewerName: "A",
      })
    ).toMatch(/different/i);

    expect(
      validateRiskAcceptance({
        tier: "high",
        accepterEmail: "a@example.com",
        accepterName: "A",
        note: "Accepted under appetite.",
        secondReviewerEmail: "b@example.com",
        secondReviewerName: "B",
      })
    ).toBeNull();
  });

  it("marks assessment stale on material field diffs", () => {
    const changes = diffMaterialChanges(
      { decisionImpact: "advisory", vendor: "Acme" },
      { decisionImpact: "automated_decision", vendor: "Acme" }
    );
    expect(changes).toHaveLength(1);
    expect(materialChangesStaleAssessment(changes)).toBe(true);
  });

  it("maps org roles to permissions", () => {
    expect(roleHasPermission("viewer", "write_system")).toBe(false);
    expect(roleHasPermission("contributor", "accept_risk")).toBe(false);
    expect(roleHasPermission("risk_owner", "accept_risk")).toBe(true);
    expect(roleHasPermission("admin", "manage_members")).toBe(true);
  });
});
