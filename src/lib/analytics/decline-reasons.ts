/**
 * Single source of truth for the preset decline reasons used when a leader / ops
 * declines a claimed shift swap. The UI in `PendingShiftsPanel` writes the label
 * string to `ShiftTicket.decisionNotes`, so analytics buckets are derived by
 * exact-string matching against these labels.
 *
 * Anything that does not match (custom "Other" free-text, legacy free-form notes,
 * or a null) is bucketed as `other`.
 */

export const DECLINE_REASONS = [
  { key: "coverage", label: "Insufficient staffing or coverage" },
  { key: "policy", label: "Does not meet policy or scheduling rules" },
  { key: "eligibility", label: "Agent or swap not eligible" },
  { key: "timing", label: "Date or time slot is no longer valid" },
  { key: "duplicate", label: "Duplicate or overlapping request" },
  { key: "other", label: "Other (specify below)" },
] as const;

export type DeclineReasonKey = (typeof DECLINE_REASONS)[number]["key"];

export const DECLINE_REASON_KEYS: readonly DeclineReasonKey[] = DECLINE_REASONS.map(
  (r) => r.key,
);

export const DECLINE_REASON_LABELS: Record<DeclineReasonKey, string> = DECLINE_REASONS.reduce(
  (acc, r) => {
    acc[r.key] = r.label;
    return acc;
  },
  {} as Record<DeclineReasonKey, string>,
);

const LABEL_TO_KEY: ReadonlyMap<string, DeclineReasonKey> = new Map(
  DECLINE_REASONS.map((r) => [r.label, r.key as DeclineReasonKey]),
);

/**
 * Map a `decisionNotes` string to a reason bucket.
 * Returns `"other"` for empty / null / unmatched notes.
 */
export function bucketDeclineReason(
  notes: string | null | undefined,
): DeclineReasonKey {
  if (!notes) return "other";
  const trimmed = notes.trim();
  if (!trimmed) return "other";
  return LABEL_TO_KEY.get(trimmed) ?? "other";
}

/** Short, human-readable label for charts (without the "(specify below)" suffix on `other`). */
export const DECLINE_REASON_SHORT_LABELS: Record<DeclineReasonKey, string> = {
  coverage: "Coverage",
  policy: "Policy",
  eligibility: "Eligibility",
  timing: "Timing",
  duplicate: "Duplicate",
  other: "Other",
};
