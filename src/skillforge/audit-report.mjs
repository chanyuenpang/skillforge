/**
 * audit-report.mjs — Slice E: Minimal audit/report read-only projection
 *
 * Replays events from risk, review, approval, and gating stores
 * to produce a unified, human-readable report and timeline.
 *
 * Principles:
 *   - Read-only: never writes back to A/B/C/D event sources
 *   - Event-driven: all views are computed via replay
 *   - Contract-first: stable output shape
 */

import { loadEventsByFixtureId } from "./risk-store.mjs";
import { loadReviewEvents, getReviewState } from "./review-store.mjs";
import { loadApprovalEvents, getApprovalState } from "./approval-store.mjs";
import { loadGatingEvents, getGatingState } from "./gating-store.mjs";

/**
 * @typedef {object} AuditReport
 * @property {string} fixtureId
 * @property {string} generatedAt - ISO timestamp of report generation
 * @property {object|null} riskFact - Summarised risk fact (latest)
 * @property {object|null} review - Review summary with decision and events
 * @property {object|null} approval - Approval summary with decision and events
 * @property {object|null} gating - Gating summary with decision and events
 * @property {AuditTimelineEntry[]} timeline - Chronologically ordered event timeline
 */

/**
 * @typedef {object} AuditTimelineEntry
 * @property {string} stage - "risk" | "review" | "approval" | "gating"
 * @property {string} eventType - The original event type
 * @property {string} eventId
 * @property {string} recordedAt - When the event was recorded
 * @property {object} detail - Key fields from the event
 */

// ── Helpers ────────────────────────────────────────────────────────────────

function summarizeRisk(events) {
  if (events.length === 0) return null;
  const last = events[events.length - 1];
  return {
    idempotencyKey: last.idempotencyKey,
    riskType: last.riskType,
    severity: last.severity,
    summary: last.summary,
    observedAt: last.observedAt,
    evidenceRefs: last.evidenceRefs,
    sourceLinks: last.sourceLinks,
    eventCount: events.length,
  };
}

function summarizeReview(fixtureId) {
  const state = getReviewState(fixtureId);
  const events = loadReviewEvents(fixtureId);
  if (events.length === 0) return null;
  return {
    status: state?.status ?? null,
    decision: state?.decision ?? null,
    lastEventType: state?.lastEventType ?? null,
    eventCount: events.length,
  };
}

function summarizeApproval(fixtureId) {
  const state = getApprovalState(fixtureId);
  const events = loadApprovalEvents(fixtureId);
  if (events.length === 0) return null;
  return {
    status: state?.status ?? null,
    decision: state?.decision ?? null,
    reviewEventRef: state?.reviewEventRef ?? null,
    lastEventType: state?.lastEventType ?? null,
    eventCount: events.length,
  };
}

function summarizeGating(fixtureId) {
  const state = getGatingState(fixtureId);
  const events = loadGatingEvents(fixtureId);
  if (events.length === 0) return null;
  return {
    decision: state?.decision ?? null,
    reason: state?.reason ?? null,
    lastEventType: state?.lastEventType ?? null,
    eventCount: events.length,
  };
}

/**
 * Pick key detail fields from an event, stripping internal metadata.
 */
function eventDetail(raw) {
  // Clone and remove heavy/internal fields
  const d = { ...raw };
  delete d.kind;
  delete d.payload;
  delete d.metadata;
  delete d.inputs;
  delete d.fingerprint;
  return d;
}

function stageFor(event) {
  if (event.kind === "risk-event") return "risk";
  if (event.kind === "review-event") return "review";
  if (event.kind === "approval-event") return "approval";
  if (event.kind === "gating-event") return "gating";
  return "unknown";
}

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Generate a unified audit report for a fixture by replaying all events.
 *
 * @param {string} fixtureId
 * @returns {AuditReport}
 */
export function generateReport(fixtureId) {
  // Gather events from all sources
  const riskEvents = loadEventsByFixtureId(fixtureId);
  const reviewEvents = loadReviewEvents(fixtureId);
  const approvalEvents = loadApprovalEvents(fixtureId);
  const gatingEvents = loadGatingEvents(fixtureId);

  // Build a single unified timeline sorted by recordedAt
  const allEvents = [
    ...riskEvents,
    ...reviewEvents,
    ...approvalEvents,
    ...gatingEvents,
  ];

  const timeline = allEvents
    .map((raw) => ({
      stage: stageFor(raw),
      eventType: raw.type,
      eventId: raw.eventId,
      recordedAt: raw.recordedAt ?? raw.decidedAt ?? raw.createdAt,
      detail: eventDetail(raw),
    }))
    .sort(
      (a, b) =>
        new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime()
    );

  return {
    fixtureId,
    generatedAt: new Date().toISOString(),
    riskFact: summarizeRisk(riskEvents),
    review: summarizeReview(fixtureId),
    approval: summarizeApproval(fixtureId),
    gating: summarizeGating(fixtureId),
    timeline,
  };
}

/**
 * Return a chronological audit timeline for a fixture.
 *
 * This is the same timeline as inside generateReport, but exposed
 * as a standalone query for audit/verification use cases.
 *
 * @param {string} fixtureId
 * @returns {AuditTimelineEntry[]}
 */
export function getAuditTimeline(fixtureId) {
  const report = generateReport(fixtureId);
  return report.timeline;
}

/**
 * Validate that a report has all required cross-references intact.
 *
 * Checks:
 *  - fixtureId matches
 *  - timeline is ordered chronologically
 *  - if review exists, it references a risk-event stage entry
 *  - if approval exists, it references a review-event in the timeline
 *
 * @param {AuditReport} report
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateReportIntegrity(report) {
  const errors = [];

  if (!report || typeof report !== "object") {
    return { valid: false, errors: ["report must be an object"] };
  }

  if (typeof report.fixtureId !== "string" || !report.fixtureId) {
    errors.push("fixtureId is required");
  }

  if (!Array.isArray(report.timeline)) {
    errors.push("timeline must be an array");
    return { valid: false, errors };
  }

  // Chronological order check
  for (let i = 1; i < report.timeline.length; i += 1) {
    const prevTime = new Date(report.timeline[i - 1].recordedAt).getTime();
    const currTime = new Date(report.timeline[i].recordedAt).getTime();
    if (currTime < prevTime) {
      errors.push(
        `timeline out of order at index ${i}: ${report.timeline[i - 1].eventType} (${report.timeline[i - 1].recordedAt}) → ${report.timeline[i].eventType} (${report.timeline[i].recordedAt})`
      );
    }
  }

  // Cross-stage reference validation
  const timelineStages = report.timeline.map((e) => e.stage);

  if (timelineStages.includes("review") && !timelineStages.includes("risk")) {
    errors.push("review exists but no risk stage found in timeline");
  }

  if (
    timelineStages.includes("approval") &&
    !timelineStages.includes("review")
  ) {
    errors.push("approval exists but no review stage found in timeline");
  }

  if (
    timelineStages.includes("gating") &&
    !timelineStages.includes("risk")
  ) {
    errors.push("gating exists but no risk stage found in timeline");
  }

  return { valid: errors.length === 0, errors };
}

export default {
  generateReport,
  getAuditTimeline,
  validateReportIntegrity,
};
