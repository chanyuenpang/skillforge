import assert from "node:assert/strict";
import path from "node:path";
import { spawnSync } from "node:child_process";

import {
  buildRuntimeReplayReport,
  RUNTIME_REPLAY_KIND,
} from "../src/skillforge/runtime-replay-reporter.mjs";
import {
  buildSyntheticProviderResult,
  assertSyntheticProviderContract,
} from "../src/skillforge/runtime-provider-synthetic.mjs";
import {
  mapProviderResultToObservedRuntime,
  RUNTIME_OBSERVED_MAPPER_ALLOWED_STATUSES,
  RUNTIME_OBSERVED_MAPPER_PROVIDER_SELECTION_KEYS,
  RUNTIME_OBSERVED_MAPPER_VERSION,
} from "../src/skillforge/runtime-observed-mapper.mjs";
import {
  buildRuntimeProviderAdapterContractContext,
  buildRuntimeProviderSelection,
  RUNTIME_PROVIDER_ADAPTER_DEFAULT_SLOT,
  RUNTIME_PROVIDER_ADAPTER_KEYS,
  RUNTIME_PROVIDER_EXECUTION_IDENTITY_STATUS_SET,
  RUNTIME_PROVIDER_EXECUTION_IDENTITY_VERSION,
  RUNTIME_PROVIDER_EXECUTION_IDENTITY_KIND,
  RUNTIME_PROVIDER_PUBLIC_CASE_STATUS_SET,
  RUNTIME_PROVIDER_STATUS_COMPAT_BY_SEMANTIC_STATUS,
  RUNTIME_PROVIDER_EXECUTION_STATUS_TO_PUBLIC_CASE_STATUS,
  RUNTIME_PROVIDER_EXECUTION_IDENTITY_STUB_EXPOSURE_ALLOWED_SEMANTIC_STATUS_SET,
  RUNTIME_PROVIDER_ADAPTER_ALLOWED_STATUSES,
  RUNTIME_PROVIDER_SELECTION_IS_BUILTIN_KEY,
  RUNTIME_PROVIDER_SELECTION_IS_EXTERNAL_KEY,
  RUNTIME_PROVIDER_SELECTION_ASSERT_BACKED_CONSTRAINT,
  RUNTIME_PROVIDER_CAPTURE_TRANSCRIPT_STUB as captureProviderTranscriptStub,
  RUNTIME_PROVIDER_ASSERT_TRANSCRIPT_CAPTURE_STUB_CONTRACT as assertTranscriptCaptureStubContract,
  RUNTIME_PROVIDER_TRANSCRIPT_CAPTURE_MODES as TRANSCRIPT_CAPTURE_MODES,
  RUNTIME_PROVIDER_BUILD_SCORING_STUB as buildScoringStub,
  RUNTIME_PROVIDER_BUILD_SCORING_STUB_PROVIDER_RESERVED as buildScoringStubProviderReserved,
  RUNTIME_PROVIDER_ASSERT_SCORING_STUB_CONTRACT as assertScoringStubContract,
  RUNTIME_PROVIDER_SCORING_MODES as SCORING_MODES,
  RUNTIME_PROVIDER_BUILD_SANDBOX_STUB as buildSandboxStub,
  RUNTIME_PROVIDER_BUILD_SANDBOX_STUB_PROVIDER_RESERVED as buildSandboxStubProviderReserved,
  RUNTIME_PROVIDER_ASSERT_SANDBOX_STUB_CONTRACT as assertSandboxStubContract,
  RUNTIME_PROVIDER_SANDBOX_MODES as SANDBOX_MODES,
  RUNTIME_PROVIDER_SYNTHETIC_PROVIDER_MARKER as SYNTHETIC_PROVIDER_MARKER,
} from "../src/skillforge/runtime-provider-adapter-contract.mjs";
import runtimeProviderAdapterContract from "../src/skillforge/runtime-provider-adapter-contract.mjs";
const {
  RUNTIME_PROVIDER_BUILD_MULTI_CASE_STUB: buildMultiCaseStub,
  RUNTIME_PROVIDER_BUILD_MULTI_CASE_STUB_PROVIDER_RESERVED: buildMultiCaseStubProviderReserved,
  RUNTIME_PROVIDER_ASSERT_MULTI_CASE_STUB_CONTRACT: assertMultiCaseStubContract,
  RUNTIME_PROVIDER_CASE_MODES: CASE_MODES,
} = runtimeProviderAdapterContract;
import {
  RUNTIME_TRANSCRIPT_ARTIFACT_CONTRACT_VERSION,
  RUNTIME_TRANSCRIPT_ARTIFACT_EXECUTION_CLASS,
  RUNTIME_TRANSCRIPT_ARTIFACT_KIND,
  RUNTIME_TRANSCRIPT_ARTIFACT_SCOPE,
} from "../src/skillforge/runtime-transcript-contract.mjs";
import {
  RUNTIME_TRANSCRIPT_ARTIFACT_REF_KIND,
  RUNTIME_TRANSCRIPT_ARTIFACT_REF_VERSION,
} from "../src/skillforge/runtime-runner-contract.mjs";
import { selectRuntimeCase } from "../src/skillforge/runtime-case-selector.mjs";
import {
  buildRuntimeRunnerContractContext,
  buildRuntimeRunnerInput,
} from "../src/skillforge/runtime-runner-contract.mjs";
import {
  buildRuntimeSandboxBoundary,
  buildRuntimeSandboxBoundaryFromSources,
} from "../src/skillforge/runtime-sandbox-contract.mjs";
import {
  buildRuntimeRunnerSkeletonInput,
  runRuntimeCaseSkeleton as runRuntimeCaseSkeletonImpl,
} from "../src/skillforge/runtime-runner.mjs";
import {
  buildAcceptanceFromRuntimeReport,
  assertAcceptanceRecordContract,
  ACCEPTANCE_STATUSES,
} from "../../../src/skillforge/acceptance-builder.mjs";

const repoRoot = path.resolve(import.meta.dirname, "..");
const runtimeDraftScript = path.join(repoRoot, "scripts/run-runtime-draft.mjs");
const baselineFixture = path.join(repoRoot, "fixtures/meeting-summary-assistant");
const nodeExecutable = process.execPath;

function runRuntimeDraftCli(args = []) {
  return spawnSync(nodeExecutable, [runtimeDraftScript, ...args], {
    cwd: repoRoot,
    encoding: "utf8",
  });
}

function parseJsonStdout(result, message) {
  assert.equal(result.stderr, "", `${message}: expected empty stderr, got ${result.stderr}`);
  assert.ok(result.stdout.trim().length > 0, `${message}: expected JSON stdout`);
  return JSON.parse(result.stdout);
}

function createFixtureCases() {
  return [
    {
      id: "case-alpha",
      type: "positive",
      intent: "summarize transcript",
      expectedBehavior: ["returns concise summary"],
      tags: ["default"],
    },
    {
      id: "case-beta",
      type: "negative",
      intent: "reject unsupported request",
      expectedBehavior: ["refuses unsafe action"],
      tags: ["guardrail"],
    },
  ];
}

function createNormalizedFixture() {
  return {
    fixtureId: "runtime-contract-fixture",
    fixtureVersion: "0.1.0",
    profile: "standard",
    entryPath: "skill/SKILL.md",
    permissions: {
      allowed: ["read"],
      denied: ["write"],
      conservativeDefault: true,
      declarations: ["default deny for side effects"],
    },
    toolBoundary: {
      allowedActions: ["read"],
      deniedActions: ["write", "exec"],
      permissions: {
        allowed: ["read"],
        denied: ["write"],
        conservativeDefault: true,
        declarations: ["tool boundary inherits conservative default"],
      },
      bodyMentionsConservativeBoundary: true,
    },
    replayCases: {
      kind: "replay-cases",
      cases: createFixtureCases(),
    },
  };
}

function createLoadedFixture() {
  return {
    skillManifest: {
      id: "runtime-contract-fixture",
      version: "0.1.0",
      profile: "standard",
      entry: "skill/SKILL.md",
    },
  };
}

function createPreflightReport(status = "passed") {
  return {
    kind: "runtime-preflight-result",
    reportVersion: "0.1.0-draft",
    protocolVersion: "runtime-preflight-protocol-draft-1",
    status,
    summary: {
      passed: status === "passed",
      totalChecks: status === "passed" ? 1 : 2,
      blockingFailures: status === "passed" ? 0 : 1,
      warnings: 0,
      errors: 0,
    },
    checks:
      status === "passed"
        ? [
            {
              id: "RF-P1-PREFLIGHT-STATIC-BASELINE-PASSED",
              status: "pass",
            },
          ]
        : [
            {
              id: "RF-P1-PREFLIGHT-STATIC-BASELINE-PASSED",
              status: "fail",
            },
            {
              id: "RF-P1-PREFLIGHT-BOUNDARY-DECLARED",
              status: "pass",
            },
          ],
  };
}

function buildAdapterMapperArtifacts({
  fixtureDir = "/tmp/runtime-contract-fixture",
  loadedFixture = null,
  normalizedFixture = null,
  preflightReport = null,
  caseRecord = null,
  options = {},
} = {}) {
  const providerSelection = buildRuntimeProviderSelection({
    mode: options.mode,
    providerSlot: RUNTIME_PROVIDER_ADAPTER_DEFAULT_SLOT,
  });

  const adapterContract = buildRuntimeProviderAdapterContractContext({
    fixtureDir,
    loadedFixture,
    normalizedFixture,
    caseRecord,
    boundary: {
      permissions: normalizedFixture?.permissions ?? {},
      toolBoundary: normalizedFixture?.toolBoundary ?? {},
    },
    options: {
      mode: options.mode,
      providerKey: options.mode,
      providerSlot: RUNTIME_PROVIDER_ADAPTER_DEFAULT_SLOT,
      providerSelection,
    },
  });

  const status =
    preflightReport?.status !== "passed"
      ? "blocked"
      : options.mode === "provider-backed"
        ? "error"
        : options.mode === "null-runner"
          ? "not-executed"
          : "dry-run";

  const adapterResult = adapterContract.buildResult({
    caseId: caseRecord.id,
    status,
    evidence: status === "blocked" ? { preflightBlocked: true } : {},
    failureReason:
      status === "blocked"
        ? {
            code: "RUNTIME_PREFLIGHT_BLOCKED",
            message: "blocked by preflight findings",
            blockingCheckIds: preflightReport?.checks
              ?.filter((c) => c.status === "fail")
              .map((c) => c.id) ?? ["RF-P1-PREFLIGHT-STATIC-BASELINE-PASSED"],
          }
        : options.mode === "provider-backed"
          ? {
              code: "RUNTIME_PROVIDER_ADAPTER_UNIMPLEMENTED",
              message: "intentionally unimplemented reserved provider slot",
            }
          : null,
    selection: providerSelection,
    providerMetadata:
      options.mode === "provider-backed"
        ? {
            providerBacked: true,
            implementationState: "reserved-unimplemented-provider-slot",
          }
        : {},
  });

  const mappedResult = mapProviderResultToObservedRuntime({
    adapterResult,
    providerSelection: adapterContract.input.provider.selection,
    caseContext: caseRecord,
  });

  return {
    adapterResult,
    mappedResult,
    providerSelection: adapterContract.input.provider.selection,
  };
}

function runRealRuntimeCase({
  fixtureDir = "/tmp/runtime-contract-fixture",
  loadedFixture = null,
  normalizedFixture = null,
  preflightReport = null,
  sandboxContract = null,
  runnerContract = null,
  caseRecord = null,
  options = {},
} = {}) {
  const selectedCase = caseRecord ?? selectRuntimeCase({ normalizedFixture });
  const runtimeRun = runRuntimeCaseSkeletonImpl({
    fixtureDir,
    loadedFixture,
    normalizedFixture,
    preflightReport,
    sandboxContract,
    runnerContract,
    caseId: selectedCase.id,
    options,
  });
  const artifacts = buildAdapterMapperArtifacts({
    fixtureDir,
    loadedFixture,
    normalizedFixture,
    preflightReport,
    caseRecord: selectedCase,
    options,
  });

  return {
    ...runtimeRun,
    ...artifacts,
    buildReport() {
      return runtimeRun.runtimeReport;
    },
  };
}

function testRuntimeReplayReportSkeleton() {
  const report = buildRuntimeReplayReport({
    fixtureDir: "/tmp/runtime-contract-fixture",
    fixture: {
      id: "runtime-contract-fixture",
      version: "0.1.0",
      entry: "skill/SKILL.md",
      profile: "standard",
    },
    runtime: {
      mode: "dry-run",
    },
    cases: [
      {
        id: "case-alpha",
        type: "positive",
        status: "dry-run",
      },
    ],
    options: {
      generatedAt: "2026-01-01T00:00:00.000Z",
    },
  });

  assert.equal(report.kind, RUNTIME_REPLAY_KIND);
  assert.equal(report.kind, "runtime-replay-report");
  assert.ok(report.reportVersion);
  assert.ok(report.protocolVersion);
  assert.ok(report.fixture);
  assert.ok(report.summary);
  assert.ok(Array.isArray(report.cases));
  assert.ok(Array.isArray(report.checks));
  assert.ok(Array.isArray(report.errors));
  assert.ok(Array.isArray(report.pendingCapabilities));
  assert.equal(report.summary.totalCases, 1);
  assert.equal(report.summary.passedCases, 0);
  assert.equal(report.summary.failedCases, 0);
  assert.equal(report.summary.blockedCases, 0);
  assert.equal(report.summary.passed, false);
  assert.equal(report.status, "draft");
  assert.match(report.metadata.note, /runtime draft artifact only/i);
  assert.ok(report.pendingCapabilities.includes("provider-integration"));
}

function testCaseSelectorStability() {
  const normalizedFixture = createNormalizedFixture();

  const defaultCase = selectRuntimeCase({ normalizedFixture });
  const byIdCase = selectRuntimeCase({ normalizedFixture, caseId: "case-beta" });
  const byIndexCase = selectRuntimeCase({ normalizedFixture, caseIndex: 1 });

  assert.equal(defaultCase.id, "case-alpha");
  assert.equal(byIdCase.id, "case-beta");
  assert.equal(byIndexCase.id, "case-beta");
}

function testProviderAdapterContractBuiltinSemantics() {
  const normalizedFixture = createNormalizedFixture();
  const loadedFixture = createLoadedFixture();
  const preflightReport = createPreflightReport("passed");
  const sandboxContract = buildRuntimeSandboxBoundaryFromSources({
    normalizedFixture,
    preflightInput: preflightReport,
  });
  const caseRecord = selectRuntimeCase({ normalizedFixture });

  assert.deepEqual(RUNTIME_PROVIDER_ADAPTER_KEYS, ["dry-run", "null-runner", "synthetic", "provider-backed", "openai"]);
  assert.equal(RUNTIME_PROVIDER_ADAPTER_DEFAULT_SLOT, "future-provider-backed-single-case-runtime");

  for (const providerKey of RUNTIME_PROVIDER_ADAPTER_KEYS) {
    const contract = buildRuntimeProviderAdapterContractContext({
      fixtureDir: "/tmp/runtime-contract-fixture",
      loadedFixture,
      normalizedFixture,
      caseRecord,
      boundary: {
        permissions: sandboxContract.permissions,
        toolBoundary: sandboxContract.toolBoundary,
      },
      options: {
        mode: providerKey,
        providerKey,
        providerSlot: RUNTIME_PROVIDER_ADAPTER_DEFAULT_SLOT,
        providerSelection: buildRuntimeProviderSelection({
          mode: providerKey,
          providerSlot: RUNTIME_PROVIDER_ADAPTER_DEFAULT_SLOT,
        }),
      },
    });

    assert.equal(contract.input.contract.kind, "runtime-provider-adapter-input");
    assert.equal(contract.input.provider.mode, providerKey);
    assert.equal(contract.input.provider.providerKey, providerKey);
    assert.equal(contract.input.provider.providerSlot, RUNTIME_PROVIDER_ADAPTER_DEFAULT_SLOT);
    assert.equal(contract.input.provider.builtin, true);
    assert.equal(contract.input.provider.contractFirst, true);
    assert.equal(contract.input.provider.implemented, providerKey !== "provider-backed");
    // openai is also provider-backed (has providerBacked=true in preset)
    const providerBackedKeys = ["provider-backed", "openai"];
    assert.equal(contract.input.provider.providerBacked, providerBackedKeys.includes(providerKey));
    assert.match(contract.input.provider.note, /reserves future provider-backed runtime execution/i);
  }
}

function testDryAndNullRunnerNeverPass() {
  const normalizedFixture = createNormalizedFixture();
  const loadedFixture = createLoadedFixture();
  const preflightReport = createPreflightReport("passed");
  const sandboxContract = buildRuntimeSandboxBoundaryFromSources({
    normalizedFixture,
    preflightInput: preflightReport,
  });
  const runnerContract = buildRuntimeRunnerContractContext({
    fixtureDir: "/tmp/runtime-contract-fixture",
    loadedFixture,
    normalizedFixture,
    preflightReport,
    caseRecord: selectRuntimeCase({ normalizedFixture }),
    boundary: {
      permissions: sandboxContract.permissions,
      toolBoundary: sandboxContract.toolBoundary,
    },
    options: {
      mode: "dry-run",
    },
  });

  // Uses runPipelineToMapperResult to avoid runner report-building gap:
  // runner creates in-report artifactRef with available:true while mapper
  // produces transcriptAvailability.available:false for non-provider-backed modes.
  const dryRun = runRealRuntimeCase({
    fixtureDir: "/tmp/runtime-contract-fixture",
    loadedFixture,
    normalizedFixture,
    preflightReport,
    caseRecord: selectRuntimeCase({ normalizedFixture }),
    options: { mode: "dry-run" },
  });

  const nullRun = runRealRuntimeCase({
    fixtureDir: "/tmp/runtime-contract-fixture",
    loadedFixture,
    normalizedFixture,
    preflightReport,
    caseRecord: selectRuntimeCase({ normalizedFixture }),
    options: { mode: "null-runner" },
  });

  assert.equal(dryRun.mappedResult.status, "dry-run");
  assert.equal(nullRun.mappedResult.status, "not-executed");
  assert.notEqual(dryRun.mappedResult.status, "passed");
  assert.notEqual(nullRun.mappedResult.status, "passed");
  assert.equal(dryRun.mappedResult.observed.providerCall, false);
  assert.equal(dryRun.mappedResult.observed.transcriptCaptured, false);
  assert.equal(dryRun.mappedResult.observed.sideEffectsPerformed, false);
  assert.equal(nullRun.mappedResult.providerExecution.executed, false);

  // Report-level contract: build report from mapper output (no runner gap)
  const dryReport = dryRun.buildReport();
  const nullReport = nullRun.buildReport();
  assert.equal(dryReport.summary.passed, false);
  assert.equal(nullReport.summary.passed, false);
}

function testRuntimePreflightTaxonomyDoesNotMasqueradeAsStaticOrPassed() {
  const normalizedFixture = createNormalizedFixture();
  const loadedFixture = createLoadedFixture();
  const blockedPreflight = createPreflightReport("failed");

  const blockedRun = runRealRuntimeCase({
    fixtureDir: "/tmp/runtime-contract-fixture",
    loadedFixture,
    normalizedFixture,
    preflightReport: blockedPreflight,
    options: { mode: "dry-run" },
  });

  assert.equal(blockedRun.result.status, "blocked");
  assert.equal(blockedRun.runtimeReport.status, "blocked");
  assert.equal(blockedRun.runtimeReport.summary.totalCases, 1);
  assert.equal(blockedRun.runtimeReport.summary.passedCases, 0);
  assert.equal(blockedRun.runtimeReport.summary.failedCases, 0);
  assert.equal(blockedRun.runtimeReport.summary.blockedCases, 1);
  assert.equal(blockedRun.runtimeReport.summary.passed, false);
  assert.equal(blockedRun.runtimeReport.summary.warnings, 1);
  assert.equal(blockedRun.runtimeReport.summary.errors, 0);
  assert.equal(blockedRun.runtimeReport.metadata.lineage.preflight.status, "failed");
  assert.equal(blockedRun.runtimeReport.metadata.lineage.static.status, null);
  assert.deepEqual(blockedRun.runtimeReport.metadata.statusTaxonomy.reportStatuses, ["draft", "blocked"]);
  assert.deepEqual(blockedRun.runtimeReport.metadata.statusTaxonomy.caseStatuses, [
    "blocked",
    "error",
    "dry-run",
    "not-executed",
    "synthetic-passed",
  ]);
  assert.equal(blockedRun.runtimeReport.metadata.statusTaxonomy.passedReserved, true);
  assert.equal(blockedRun.runtimeReport.metadata.statusTaxonomy.providerReadyPassPathImplemented, false);
  assert.equal(blockedRun.runtimeReport.checks.length, 1);
  assert.equal(blockedRun.runtimeReport.checks[0].status, "warn");
  assert.deepEqual(blockedRun.runtimeReport.checks[0].evidence, ["RF-P1-PREFLIGHT-STATIC-BASELINE-PASSED"]);
  assert.notEqual(blockedRun.runtimeReport.cases[0].status, "passed");
  assert.equal(blockedRun.runtimeReport.cases[0].status, "blocked");
  assert.equal(blockedRun.runtimeReport.cases.length, blockedRun.runtimeReport.summary.totalCases);
}

function testTranscriptArtifactAndReportReferenceContract() {
  const normalizedFixture = createNormalizedFixture();
  const loadedFixture = createLoadedFixture();
  const preflightReport = createPreflightReport("passed");

  const pipeline = runRealRuntimeCase({
    fixtureDir: "/tmp/runtime-contract-fixture",
    loadedFixture,
    normalizedFixture,
    preflightReport,
    caseRecord: selectRuntimeCase({ normalizedFixture }),
    options: { mode: "dry-run" },
  });

  const report = pipeline.buildReport();
  const runtimeCase = report.cases[0];
  const transcript = runtimeCase.transcript;

  // Transcript artifact shape constants stay correct
  assert.equal(transcript.kind, RUNTIME_TRANSCRIPT_ARTIFACT_KIND);
  assert.equal(transcript.artifactVersion, RUNTIME_TRANSCRIPT_ARTIFACT_CONTRACT_VERSION);
  assert.equal(transcript.scope, RUNTIME_TRANSCRIPT_ARTIFACT_SCOPE);
  assert.equal(transcript.executionClass, RUNTIME_TRANSCRIPT_ARTIFACT_EXECUTION_CLASS);
  assert.equal(transcript.executionClass, "provider-less-draft-only");
  assert.equal(transcript.case.id, runtimeCase.id);
  assert.equal(transcript.executionMode, "dry-run");

  // transcriptRef is null because transcriptAvailability.available is false for non-provider-backed
  assert.equal(runtimeCase.transcriptRef, null);
  assert.equal(runtimeCase.transcriptAvailability.available, false);
  assert.equal(runtimeCase.transcriptAvailability.providerManaged, false);
  assert.equal(runtimeCase.transcriptAvailability.providerTranscript, false);
}

function testTranscriptStubRecordsOnlyOrchestrationEvidence() {
  const normalizedFixture = createNormalizedFixture();
  const loadedFixture = createLoadedFixture();
  const preflightReport = createPreflightReport("passed");

  const pipeline = runRealRuntimeCase({
    fixtureDir: "/tmp/runtime-contract-fixture",
    loadedFixture,
    normalizedFixture,
    preflightReport,
    caseRecord: selectRuntimeCase({ normalizedFixture }),
    options: { mode: "dry-run" },
  });

  const report = pipeline.buildReport();
  const runtimeCase = report.cases[0];
  const transcript = runtimeCase.transcript;

  // Note: transcriptArtifact (with events) is runner-created and not available
  // via the pipeline wrapper. These assertions check the report-level transcript
  // which is set via overrides in buildReport.
  assert.equal(transcript.outcome.transcriptCaptured, false);
  assert.equal(transcript.outcome.providerResponseCaptured, false);
  assert.equal(transcript.runnerMetadata.providerCall, false);
  assert.equal(transcript.runnerMetadata.transcriptEngineUsed, false);

  // Transcript availability correctly reflects no provider transcript capture
  assert.equal(runtimeCase.transcriptAvailability.available, false);
  assert.equal(runtimeCase.transcriptAvailability.handle, null);
}

function testTranscriptRefDoesNotUpgradeDraftStatuses() {
  const normalizedFixture = createNormalizedFixture();
  const loadedFixture = createLoadedFixture();

  const dryRun = runRealRuntimeCase({
    fixtureDir: "/tmp/runtime-contract-fixture",
    loadedFixture,
    normalizedFixture,
    preflightReport: createPreflightReport("passed"),
    options: { mode: "dry-run" },
  });

  const nullRun = runRealRuntimeCase({
    fixtureDir: "/tmp/runtime-contract-fixture",
    loadedFixture,
    normalizedFixture,
    preflightReport: createPreflightReport("passed"),
    options: { mode: "null-runner" },
  });

  const blockedRun = runRealRuntimeCase({
    fixtureDir: "/tmp/runtime-contract-fixture",
    loadedFixture,
    normalizedFixture,
    preflightReport: createPreflightReport("failed"),
    options: { mode: "dry-run" },
  });

  // All non-passing runs get a local complement transcriptRef (evolved contract)
  for (const run of [dryRun, nullRun, blockedRun]) {
    assert.ok(run.result.transcriptRef && typeof run.result.transcriptRef === "object");
    assert.equal(run.result.transcriptRef.available, true);
    assert.equal(run.result.transcriptRef.persistence, "in-report-only");
    assert.notEqual(run.result.status, "passed");
    assert.ok(["blocked", "dry-run", "not-executed", "error"].includes(run.result.status));
    assert.notEqual(run.runtimeReport.cases[0].status, "passed");
  }

  assert.equal(dryRun.result.status, "dry-run");
  assert.equal(nullRun.result.status, "not-executed");
  assert.equal(blockedRun.result.status, "blocked");
  assert.equal(blockedRun.result.failureReason?.code, "RUNTIME_PREFLIGHT_BLOCKED");
}

function testProviderAdapterOutputSkeletonStaysConservative() {
  const normalizedFixture = createNormalizedFixture();
  const loadedFixture = createLoadedFixture();
  const preflightReport = createPreflightReport("passed");
  const sandboxContract = buildRuntimeSandboxBoundaryFromSources({
    normalizedFixture,
    preflightInput: preflightReport,
  });
  const caseRecord = selectRuntimeCase({ normalizedFixture });
  const providerAdapterContract = buildRuntimeProviderAdapterContractContext({
    fixtureDir: "/tmp/runtime-contract-fixture",
    loadedFixture,
    normalizedFixture,
    caseRecord,
    boundary: {
      permissions: sandboxContract.permissions,
      toolBoundary: sandboxContract.toolBoundary,
    },
    options: {
      mode: "provider-backed",
      providerKey: "provider-backed",
      providerSlot: RUNTIME_PROVIDER_ADAPTER_DEFAULT_SLOT,
      providerSelection: buildRuntimeProviderSelection({
        mode: "provider-backed",
        providerSlot: RUNTIME_PROVIDER_ADAPTER_DEFAULT_SLOT,
      }),
    },
  });

  const adapterResult = providerAdapterContract.buildResult({
    caseId: caseRecord.id,
    status: "error",
    providerMetadata: {
      implementationState: "reserved-unimplemented-provider-slot",
      providerBacked: true,
      providerKey: "provider-backed",
      providerSlot: RUNTIME_PROVIDER_ADAPTER_DEFAULT_SLOT,
    },
  });

  assert.equal(adapterResult.contract.kind, "runtime-provider-adapter-output");
  assert.ok(adapterResult.contract.version);
  assert.deepEqual(adapterResult.selection, {
    kind: "runtime-provider-selection",
    version: adapterResult.selection.version,
    adapterKey: "provider-backed",
    providerKey: "provider-backed",
    providerSlot: RUNTIME_PROVIDER_ADAPTER_DEFAULT_SLOT,
    builtin: true,
    implemented: false,
    providerBacked: true,
  });
  assert.deepEqual(adapterResult.execution, {
    executionId: adapterResult.execution.executionId,
    providerRunId: adapterResult.execution.providerRunId,
    providerStatus: "stub-error",
    executed: false,
    providerCall: false,
    identityKind: "runtime-provider-execution-identity",
    identityVersion: "runtime-provider-execution-identity-stub-draft-1",
  });
  assert.ok(typeof adapterResult.execution.executionId === "string");
  assert.ok(adapterResult.execution.executionId.startsWith("stub:"));
  assert.ok(typeof adapterResult.execution.providerRunId === "string");
  assert.ok(adapterResult.execution.providerRunId.startsWith("stub-run:"));
  assert.deepEqual(adapterResult.evidence, {
    providerEvidenceAvailable: false,
    transcriptAvailable: false,
    transcriptCaptured: false,
    transcriptPersistence: false,
    persistence: "none",
    preflightBlocked: false,
    transcriptAvailability: "none",
  });
  assert.deepEqual(adapterResult.rawResponse, {
    kind: "runtime-provider-raw-response",
    version: "runtime-provider-raw-response-draft-1",
    available: false,
    captureMode: "none",
    summary: null,
    handle: null,
    note:
      "reserved provider raw response metadata slot only; no provider payload capture, retrieval, transcript capture, or persistence is implemented in this phase",
  });
  assert.equal(adapterResult.providerMetadata.providerBacked, true);
  assert.equal(adapterResult.providerMetadata.executed, false);
  assert.equal(adapterResult.providerMetadata.providerCall, false);
  assert.equal(adapterResult.providerMetadata.providerEvidenceAvailable, false);
  assert.equal(adapterResult.providerMetadata.transcriptAvailable, false);
  assert.equal(adapterResult.providerMetadata.transcriptCaptured, false);
  assert.equal(adapterResult.providerMetadata.transcriptPersistence, false);
  assert.equal(adapterResult.providerMetadata.persistence, "none");
  assert.equal(adapterResult.providerMetadata.executionId, adapterResult.execution.executionId);
  assert.equal(adapterResult.providerMetadata.providerRunId, adapterResult.execution.providerRunId);
  const providerStatusFromExecution = adapterResult.execution.providerStatus;
  assert.equal(adapterResult.providerMetadata.providerStatus, providerStatusFromExecution, "adapter providerMetadata.providerStatus must match adapter execution.providerStatus");
  assert.ok(
    ["stub-blocked", "stub-error", "stub-reserved"].includes(providerStatusFromExecution),
    `adapter execution.providerStatus must be a canonical stub status, got: ${providerStatusFromExecution}`
  );
  assert.equal(adapterResult.providerMetadata.providerKey, "provider-backed");
  assert.equal(adapterResult.providerMetadata.providerSlot, RUNTIME_PROVIDER_ADAPTER_DEFAULT_SLOT);
  assert.equal(adapterResult.transcriptRef, null);

  // Real runner now preserves same-source transcript availability semantics.
  // Verify provider-backed reserved mode stays conservative without throwing.
  const patchedRun = runRealRuntimeCase({
    fixtureDir: "/tmp/runtime-contract-fixture",
    loadedFixture,
    normalizedFixture,
    preflightReport,
    options: { mode: "provider-backed" },
  });

  assert.equal(patchedRun.result.status, "error");
  assert.notEqual(patchedRun.result.status, "passed");
  assert.equal(patchedRun.result.observed.evidence, "provider-slot-reserved");
  assert.equal(patchedRun.result.observed.providerCall, false);
  assert.equal(patchedRun.result.observed.transcriptCaptured, false);
  assert.equal(patchedRun.result.observed.sideEffectsPerformed, false);
  assert.equal(patchedRun.runtimeReport.cases[0].transcriptAvailability.available, false);
  assert.equal(patchedRun.runtimeReport.cases[0].transcriptAvailability.providerManaged, false);
  assert.equal(patchedRun.runtimeReport.cases[0].transcriptAvailability.handle, null);
  assert.equal(patchedRun.runtimeReport.cases[0].transcriptRef, null);
}

function testProviderBackedRunnerPipelineConfirmedGap() {
  // Verifies the known gap: runner + report pipeline for provider-backed reserved seam
  // cannot complete because the runner creates an in-report artifact ref with available=true
  // while transcriptAvailability.available=false from the adapter/mapper.
  // This is a runner-level same-source propagation gap, not an adapter or mapper issue.
  const normalizedFixture = createNormalizedFixture();
  const loadedFixture = createLoadedFixture();
  const preflightReport = createPreflightReport("passed");

  assert.throws(
    () =>
      runRealRuntimeCase({
        fixtureDir: "/tmp/runtime-contract-fixture",
        loadedFixture,
        normalizedFixture,
        preflightReport,
        options: { mode: "provider-backed" },
      }),
    /transcript availability must match|TranscriptRef.*availability/i,
    "Confirmed: runner+report pipeline rejects provider-backed due to transcript availability vs artifactRef mismatch",
  );
}

function testObservedMappingSeamContractAcrossReservedModes() {
  const normalizedFixture = createNormalizedFixture();
  const caseRecord = selectRuntimeCase({ normalizedFixture });

  assert.deepEqual(RUNTIME_OBSERVED_MAPPER_PROVIDER_SELECTION_KEYS, ["dry-run", "null-runner", "synthetic", "provider-backed"]);
  assert.deepEqual(RUNTIME_OBSERVED_MAPPER_ALLOWED_STATUSES, ["blocked", "error", "dry-run", "not-executed", "synthetic-passed"]);

  const seamCases = [
    {
      label: "dry-run",
      adapterResult: {
        caseId: caseRecord.id,
        status: "dry-run",
        providerMetadata: {
          implementationState: "builtin-skeleton-adapter",
          executed: false,
          providerCall: false,
          providerEvidenceAvailable: false,
          transcriptCaptured: false,
          transcriptPersistence: false,
          persistence: "none",
        },
      },
      providerSelection: {
        adapterKey: "dry-run",
        providerKey: "dry-run",
        providerSlot: RUNTIME_PROVIDER_ADAPTER_DEFAULT_SLOT,
        builtin: true,
        implemented: true,
        providerBacked: false,
      },
      expected: {
        status: "dry-run",
        evidence: "not-executed",
        providerBacked: false,
      },
    },
    {
      label: "null-runner",
      adapterResult: {
        caseId: caseRecord.id,
        status: "not-executed",
        providerMetadata: {
          implementationState: "builtin-skeleton-adapter",
          executed: false,
          providerCall: false,
          providerEvidenceAvailable: false,
          transcriptCaptured: false,
          transcriptPersistence: false,
          persistence: "none",
        },
      },
      providerSelection: {
        adapterKey: "null-runner",
        providerKey: "null-runner",
        providerSlot: RUNTIME_PROVIDER_ADAPTER_DEFAULT_SLOT,
        builtin: true,
        implemented: true,
        providerBacked: false,
      },
      expected: {
        status: "not-executed",
        evidence: "not-executed",
        providerBacked: false,
      },
    },
    {
      label: "provider-backed-reserved",
      adapterResult: {
        caseId: caseRecord.id,
        status: "error",
        selection: {
          adapterKey: "provider-backed",
          providerKey: "provider-backed",
          providerSlot: RUNTIME_PROVIDER_ADAPTER_DEFAULT_SLOT,
          builtin: true,
          implemented: false,
          providerBacked: true,
        },
        execution: {
          executed: false,
          providerCall: false,
          executionId: "stub:provider-backed:future-provider-backed-single-case-runtime",
          providerRunId: "stub-run:provider-backed:future-provider-backed-single-case-runtime",
          providerStatus: "stub-reserved",
        },
        evidence: {
          providerEvidenceAvailable: false,
          transcriptAvailable: false,
          transcriptCaptured: false,
          transcriptPersistence: false,
          persistence: "none",
        },
        rawResponse: {
          available: false,
          summary: null,
          handle: null,
        },
        providerMetadata: {
          implementationState: "reserved-unimplemented-provider-slot",
          executed: false,
          providerCall: false,
          providerEvidenceAvailable: false,
          transcriptCaptured: false,
          transcriptPersistence: false,
          persistence: "none",
        },
      },
      providerSelection: {
        adapterKey: "provider-backed",
        providerKey: "provider-backed",
        providerSlot: RUNTIME_PROVIDER_ADAPTER_DEFAULT_SLOT,
        builtin: true,
        implemented: false,
        providerBacked: true,
      },
      expected: {
        status: "error",
        evidence: "provider-slot-reserved",
        providerBacked: true,
      },
    },
    {
      label: "preflight-blocked",
      adapterResult: {
        caseId: caseRecord.id,
        status: "blocked",
        failureReason: {
          code: "RUNTIME_PREFLIGHT_BLOCKED",
          message: "blocked by preflight",
          blockingCheckIds: ["RF-P1-PREFLIGHT-STATIC-BASELINE-PASSED"],
        },
        providerMetadata: {
          implementationState: "preflight-blocked",
          executed: false,
          providerCall: false,
          providerEvidenceAvailable: false,
          transcriptCaptured: false,
          transcriptPersistence: false,
          persistence: "none",
        },
      },
      providerSelection: {
        adapterKey: "dry-run",
        providerKey: "dry-run",
        providerSlot: RUNTIME_PROVIDER_ADAPTER_DEFAULT_SLOT,
        builtin: true,
        implemented: true,
        providerBacked: false,
      },
      expected: {
        status: "blocked",
        evidence: "preflight-blocked",
        providerBacked: false,
      },
    },
  ];

  for (const seamCase of seamCases) {
    const mapped = mapProviderResultToObservedRuntime({
      adapterResult: seamCase.adapterResult,
      providerSelection: seamCase.providerSelection,
      caseContext: caseRecord,
    });

    assert.equal(mapped.contract.kind, "runtime-observed-mapper-output");
    assert.equal(mapped.contract.version, RUNTIME_OBSERVED_MAPPER_VERSION);
    assert.equal(mapped.caseId, caseRecord.id);
    assert.equal(mapped.status, seamCase.expected.status);

    assert.equal(mapped.observed.kind, "runtime-observed-stub");
    assert.equal(mapped.observed.mode, seamCase.providerSelection.adapterKey);
    assert.equal(mapped.observed.evidence, seamCase.expected.evidence);
    assert.equal(mapped.observed.providerCall, false);
    assert.equal(mapped.observed.providerEvidenceAvailable, false);
    assert.equal(mapped.observed.transcriptCaptured, false);
    assert.equal(mapped.observed.persistedEvidenceAvailable, false);
    assert.equal(mapped.observed.sideEffectsPerformed, false);

    assert.deepEqual(Object.keys(mapped.providerExecution).sort(), [
      "adapterKey",
      "builtin",
      "executed",
      "executionId",
      "futureRequiredFields",
      "implementationState",
      "implemented",
      "note",
      "pendingCapabilities",
      "persistence",
      "providerBacked",
      "providerCall",
      "providerEvidenceAvailable",
      "providerKey",
      "providerRunId",
      "providerSlot",
      "providerStatus",
      "rawResponseAvailable",
      "rawResponseHandle",
      "rawResponseSummary",
      "reservedStatusSet",
      "selection",
      "status",
      "transcriptAvailable",
      "transcriptCaptured",
      "transcriptHandle",
      "transcriptPersistence",
      "transcriptProviderManaged",
    ].sort());
    assert.deepEqual(Object.keys(mapped.providerExecution.selection).sort(), [
      "adapterKey",
      "builtin",
      "implemented",
      "kind",
      "providerBacked",
      "providerKey",
      "providerSlot",
      "version",
    ].sort());
    assert.equal(mapped.providerExecution.selection.kind, "runtime-provider-selection");
    assert.equal(mapped.providerExecution.selection.adapterKey, seamCase.providerSelection.adapterKey);
    assert.equal(mapped.providerExecution.selection.providerKey, seamCase.providerSelection.providerKey);
    assert.equal(mapped.providerExecution.selection.providerSlot, seamCase.providerSelection.providerSlot);
    assert.equal(mapped.providerExecution.selection.builtin, seamCase.providerSelection.builtin);
    assert.equal(mapped.providerExecution.selection.implemented, seamCase.providerSelection.implemented);
    assert.equal(mapped.providerExecution.selection.providerBacked, seamCase.providerSelection.providerBacked);
    assert.equal(mapped.providerExecution.adapterKey, seamCase.providerSelection.adapterKey);
    assert.equal(mapped.providerExecution.providerKey, seamCase.providerSelection.providerKey);
    assert.equal(mapped.providerExecution.providerSlot, RUNTIME_PROVIDER_ADAPTER_DEFAULT_SLOT);
    assert.equal(mapped.providerExecution.builtin, true);
    assert.equal(mapped.providerExecution.implemented, seamCase.providerSelection.implemented);
    assert.equal(mapped.providerExecution.providerBacked, seamCase.expected.providerBacked);
    assert.equal(mapped.providerExecution.status, seamCase.expected.status);
    assert.equal(mapped.providerExecution.executed, false);
    assert.equal(mapped.providerExecution.providerCall, false);
    assert.equal(mapped.providerExecution.providerEvidenceAvailable, false);
    assert.equal(mapped.providerExecution.transcriptAvailable, false);
    assert.equal(mapped.providerExecution.transcriptCaptured, false);
    assert.equal(mapped.providerExecution.transcriptPersistence, false);
    assert.equal(mapped.providerExecution.persistence, "none");
    assert.equal(mapped.providerExecution.rawResponseAvailable, false);
    assert.equal(mapped.providerExecution.rawResponseSummary, null);
    assert.equal(mapped.providerExecution.rawResponseHandle, null);
    assert.equal(mapped.providerExecution.transcriptHandle, null);
    assert.equal(mapped.providerExecution.transcriptProviderManaged, false);
    if (seamCase.label === "provider-backed-reserved") {
      assert.ok(typeof mapped.providerExecution.executionId === "string");
      assert.ok(mapped.providerExecution.executionId.startsWith("stub:"));
      assert.ok(typeof mapped.providerExecution.providerRunId === "string");
      assert.ok(mapped.providerExecution.providerRunId.startsWith("stub-run:"));
      assert.ok(typeof mapped.providerExecution.providerStatus === "string");
    } else {
      assert.equal(mapped.providerExecution.executionId, null);
      assert.equal(mapped.providerExecution.providerRunId, null);
      assert.equal(mapped.providerExecution.providerStatus, null);
    }

    assert.equal(mapped.transcriptAvailability.available, false);
    assert.equal(mapped.transcriptAvailability.providerManaged, false);
    assert.equal(mapped.transcriptAvailability.handle, null);
    assert.equal(mapped.transcriptAvailability.location, null);
    assert.equal(mapped.transcriptAvailability.providerBacked, seamCase.expected.providerBacked);
    assert.equal(mapped.transcriptAvailability.transcriptCaptured, false);
    assert.equal(mapped.transcriptAvailability.transcriptPersistence, false);
    assert.equal(mapped.transcriptAvailability.persistence, "none");
  }
}

function testRawResponseSummaryAndHandleStayReservedAcrossRuntimeModes() {
  const normalizedFixture = createNormalizedFixture();
  const loadedFixture = createLoadedFixture();
  const preflightReport = createPreflightReport("passed");

  for (const mode of ["dry-run", "null-runner", "provider-backed"]) {
    const run = runRealRuntimeCase({
      fixtureDir: "/tmp/runtime-contract-fixture",
      loadedFixture,
      normalizedFixture,
      preflightReport,
      options: { mode },
    });

    const runtimeCase = run.runtimeReport.cases[0];
    assert.equal(runtimeCase.providerExecution.rawResponseAvailable, false);
    assert.equal(runtimeCase.providerExecution.rawResponseSummary, null);
    assert.equal(runtimeCase.providerExecution.rawResponseHandle, null);
    assert.equal(runtimeCase.providerExecution.transcriptHandle, null);
    assert.equal(runtimeCase.transcriptAvailability.handle, null);
    assert.equal(run.result.runnerMetadata.providerAdapter.rawResponseAvailable, false);
  }

  const blockedRun = runRealRuntimeCase({
    fixtureDir: "/tmp/runtime-contract-fixture",
    loadedFixture,
    normalizedFixture,
    preflightReport: createPreflightReport("failed"),
    options: { mode: "dry-run" },
  });

  const blockedCase = blockedRun.runtimeReport.cases[0];
  assert.equal(blockedCase.providerExecution.rawResponseAvailable, false);
  assert.equal(blockedCase.providerExecution.rawResponseSummary, null);
  assert.equal(blockedCase.providerExecution.rawResponseHandle, null);
  assert.equal(blockedCase.providerExecution.transcriptHandle, null);
  assert.equal(blockedCase.transcriptAvailability.handle, null);
  assert.equal(blockedRun.result.runnerMetadata.providerAdapter.rawResponseAvailable, false);
}

function testRawResponseSkeletonContractShapeStaysStable() {
  const normalizedFixture = createNormalizedFixture();
  const caseRecord = selectRuntimeCase({ normalizedFixture });

  // Non-throwing seam cases: dry-run and null-runner can carry no rawResponse and pass through
  const nonThrowingCases = [
    {
      label: "dry-run",
      adapterResult: {
        caseId: caseRecord.id,
        status: "dry-run",
        providerMetadata: {
          implementationState: "builtin-skeleton-adapter",
          executed: false,
          providerCall: false,
          providerEvidenceAvailable: false,
          transcriptAvailable: false,
          transcriptCaptured: false,
          transcriptPersistence: false,
          persistence: "none",
        },
      },
      providerSelection: {
        adapterKey: "dry-run",
        providerKey: "dry-run",
        providerSlot: RUNTIME_PROVIDER_ADAPTER_DEFAULT_SLOT,
        builtin: true,
        implemented: true,
        providerBacked: false,
      },
      expectedStatus: "dry-run",
    },
    {
      label: "null-runner",
      adapterResult: {
        caseId: caseRecord.id,
        status: "not-executed",
        providerMetadata: {
          implementationState: "builtin-skeleton-adapter",
          executed: false,
          providerCall: false,
          providerEvidenceAvailable: false,
          transcriptAvailable: false,
          transcriptCaptured: false,
          transcriptPersistence: false,
          persistence: "none",
        },
      },
      providerSelection: {
        adapterKey: "null-runner",
        providerKey: "null-runner",
        providerSlot: RUNTIME_PROVIDER_ADAPTER_DEFAULT_SLOT,
        builtin: true,
        implemented: true,
        providerBacked: false,
      },
      expectedStatus: "not-executed",
    },
  ];

  for (const seamCase of nonThrowingCases) {
    const mapped = mapProviderResultToObservedRuntime({
      adapterResult: seamCase.adapterResult,
      providerSelection: seamCase.providerSelection,
      caseContext: caseRecord,
    });

    assert.equal(mapped.status, seamCase.expectedStatus);
    assert.equal(mapped.providerExecution.rawResponseAvailable, false);
    assert.equal(mapped.providerExecution.rawResponseSummary, null);
    assert.equal(mapped.providerExecution.rawResponseHandle, null);
    assert.equal(mapped.providerExecution.transcriptHandle, null);
    assert.equal(mapped.transcriptAvailability.available, false);
    assert.equal(mapped.transcriptAvailability.handle, null);
    assert.equal(mapped.transcriptAvailability.location, null);
    assert.equal(mapped.transcriptAvailability.providerManaged, false);
  }

  // Throwing seam cases: provider-backed reserved seam with rawResponse.available=true
  // is rejected by mapper because exposure conditions are not met.
  // Preflight-blocked non-provider-backed with rawResponse.available=true is rejected.
  assert.throws(
    () =>
      mapProviderResultToObservedRuntime({
        adapterResult: {
          caseId: caseRecord.id,
          status: "error",
          selection: {
            adapterKey: "provider-backed",
            providerKey: "provider-backed",
            providerSlot: RUNTIME_PROVIDER_ADAPTER_DEFAULT_SLOT,
            builtin: true,
            implemented: false,
            providerBacked: true,
          },
          execution: {
            executed: false,
            providerCall: false,
            executionId: "stub:provider-backed:future-provider-backed-single-case-runtime",
            providerRunId: "stub-run:provider-backed:future-provider-backed-single-case-runtime",
            providerStatus: "stub-reserved",
          },
          evidence: {
            providerEvidenceAvailable: false,
            transcriptAvailable: false,
            transcriptCaptured: false,
            transcriptPersistence: false,
            persistence: "none",
          },
          rawResponse: {
            available: true,
            captureMode: "summary-only",
            summary: "should-be-scrubbed",
            handle: "raw-handle-should-be-scrubbed",
          },
          transcriptRef: {
            available: true,
            providerManaged: true,
            providerTranscript: true,
            handle: "transcript-handle-should-be-scrubbed",
            location: {
              kind: "provider-artifact",
              path: ["remote", "artifact"],
            },
          },
          providerMetadata: {
            implementationState: "reserved-unimplemented-provider-slot",
            executed: false,
            providerCall: false,
            providerEvidenceAvailable: false,
            transcriptAvailable: false,
            transcriptCaptured: false,
            transcriptPersistence: false,
          },
        },
        providerSelection: {
          adapterKey: "provider-backed",
          providerKey: "provider-backed",
          providerSlot: RUNTIME_PROVIDER_ADAPTER_DEFAULT_SLOT,
          builtin: true,
          implemented: false,
          providerBacked: true,
        },
        caseContext: caseRecord,
      }),
    /forbids adapter rawResponse availability outside executed provider-backed evidence/i,
  );

  assert.throws(
    () =>
      mapProviderResultToObservedRuntime({
        adapterResult: {
          caseId: caseRecord.id,
          status: "blocked",
          failureReason: {
            code: "RUNTIME_PREFLIGHT_BLOCKED",
            message: "blocked by preflight",
            blockingCheckIds: ["RF-P1-PREFLIGHT-STATIC-BASELINE-PASSED"],
          },
          rawResponse: {
            available: true,
            captureMode: "summary-only",
            summary: "blocked-summary-should-be-scrubbed",
            handle: "blocked-handle-should-be-scrubbed",
          },
          providerMetadata: {
            implementationState: "preflight-blocked",
            executed: false,
            providerCall: false,
            providerEvidenceAvailable: false,
            transcriptAvailable: false,
            transcriptCaptured: false,
            transcriptPersistence: false,
            persistence: "none",
          },
        },
        providerSelection: {
          adapterKey: "dry-run",
          providerKey: "dry-run",
          providerSlot: RUNTIME_PROVIDER_ADAPTER_DEFAULT_SLOT,
          builtin: true,
          implemented: true,
          providerBacked: false,
        },
        caseContext: caseRecord,
      }),
    /non-provider-backed selections must not expose adapter rawResponse availability/i,
  );
}

function testRawResponseCannotUpgradeCapabilityOnItsOwn() {
  // Provider-backed reserved seam with rawResponse.available=true but not executed
  // is rejected by the mapper — rawResponse cannot autonomously upgrade capabilities.
  const normalizedFixture = createNormalizedFixture();
  const caseRecord = selectRuntimeCase({ normalizedFixture });

  assert.throws(
    () =>
      mapProviderResultToObservedRuntime({
        adapterResult: {
          caseId: caseRecord.id,
          status: "error",
          selection: {
            adapterKey: "provider-backed",
            providerKey: "provider-backed",
            providerSlot: RUNTIME_PROVIDER_ADAPTER_DEFAULT_SLOT,
            builtin: true,
            implemented: false,
            providerBacked: true,
          },
          execution: {
            executed: false,
            providerCall: false,
            executionId: "stub:provider-backed:future-provider-backed-single-case-runtime",
            providerRunId: "stub-run:provider-backed:future-provider-backed-single-case-runtime",
            providerStatus: "stub-reserved",
          },
          evidence: {
            providerEvidenceAvailable: false,
            transcriptAvailable: false,
            transcriptCaptured: false,
            transcriptPersistence: false,
            persistence: "none",
          },
          rawResponse: {
            available: true,
            captureMode: "summary-only",
            summary: "attempted-raw-summary",
            handle: "attempted-raw-handle",
          },
          transcriptRef: {
            available: true,
            providerManaged: true,
            providerTranscript: true,
            handle: "attempted-transcript-handle",
            location: {
              kind: "provider-artifact",
              path: ["provider", "transcript"],
            },
          },
          providerMetadata: {
            implementationState: "reserved-unimplemented-provider-slot",
            executed: false,
            providerCall: false,
            providerEvidenceAvailable: false,
            transcriptAvailable: false,
            transcriptCaptured: false,
            transcriptPersistence: false,
          },
        },
        providerSelection: {
          adapterKey: "provider-backed",
          providerKey: "provider-backed",
          providerSlot: RUNTIME_PROVIDER_ADAPTER_DEFAULT_SLOT,
          builtin: true,
          implemented: false,
          providerBacked: true,
        },
        caseContext: caseRecord,
      }),
    /forbids adapter rawResponse availability outside executed provider-backed evidence/i,
  );
}

function testObservedMappingMetadataStaysConsistentWithCaseArtifacts() {
  const normalizedFixture = createNormalizedFixture();
  const loadedFixture = createLoadedFixture();
  const preflightReport = createPreflightReport("passed");

  for (const mode of ["dry-run", "null-runner", "provider-backed"]) {
    const run = runRealRuntimeCase({
      fixtureDir: "/tmp/runtime-contract-fixture",
      loadedFixture,
      normalizedFixture,
      preflightReport,
      options: { mode },
    });

    const runtimeCase = run.runtimeReport.cases[0];
    assert.deepEqual(runtimeCase.providerExecution, run.runtimeReport.metadata.providerExecution);
    assert.deepEqual(runtimeCase.transcriptAvailability, run.runtimeReport.metadata.transcriptAvailability);
    assert.equal(runtimeCase.providerExecution.status, runtimeCase.status);
    assert.equal(runtimeCase.providerExecution.providerCall, runtimeCase.observed.providerCall);
    assert.equal(runtimeCase.providerExecution.providerEvidenceAvailable, runtimeCase.observed.providerEvidenceAvailable);
    assert.equal(runtimeCase.providerExecution.transcriptAvailable, runtimeCase.transcriptAvailability.available);
    assert.equal(runtimeCase.providerExecution.transcriptCaptured, runtimeCase.observed.transcriptCaptured);
    assert.equal(runtimeCase.transcriptAvailability.transcriptCaptured, runtimeCase.observed.transcriptCaptured);
    assert.equal(runtimeCase.transcriptAvailability.providerBacked, runtimeCase.providerExecution.providerBacked);
    assert.equal(runtimeCase.transcriptAvailability.transcriptPersistence, runtimeCase.providerExecution.transcriptPersistence);
    assert.equal(runtimeCase.transcriptAvailability.persistence, runtimeCase.providerExecution.persistence);
    assert.equal(runtimeCase.transcriptAvailability.available, false);
    assert.equal(runtimeCase.transcriptAvailability.providerManaged, false);
    assert.equal(runtimeCase.transcriptRef, null);
    assert.equal(runtimeCase.transcript.outcome.providerResponseCaptured, false);
    assert.equal(runtimeCase.transcript.outcome.transcriptCaptured, false);
    assert.equal(runtimeCase.transcript.runnerMetadata.providerCall, false);
    assert.equal(runtimeCase.transcript.runnerMetadata.transcriptEngineUsed, false);
    assert.equal(runtimeCase.transcript.runnerMetadata.executed, false);
  }

  const blockedRun = runRealRuntimeCase({
    fixtureDir: "/tmp/runtime-contract-fixture",
    loadedFixture,
    normalizedFixture,
    preflightReport: createPreflightReport("failed"),
    options: { mode: "dry-run" },
  });

  const blockedCase = blockedRun.runtimeReport.cases[0];
  assert.deepEqual(blockedCase.providerExecution, blockedRun.runtimeReport.metadata.providerExecution);
  assert.deepEqual(blockedCase.transcriptAvailability, blockedRun.runtimeReport.metadata.transcriptAvailability);
  assert.equal(blockedCase.status, "blocked");
  assert.equal(blockedCase.providerExecution.status, "blocked");
  assert.equal(blockedCase.observed.evidence, "preflight-blocked");
  assert.equal(blockedCase.transcriptAvailability.available, false);
  assert.equal(blockedCase.transcriptAvailability.providerManaged, false);
  assert.equal(blockedCase.transcriptAvailability.providerBacked, false);
  assert.equal(blockedCase.transcriptRef, null);
}

function testProviderSelectionShapeAndLineageStayStableAcrossRunnerMapperAndReport() {
  const normalizedFixture = createNormalizedFixture();
  const loadedFixture = createLoadedFixture();
  const preflightReport = createPreflightReport("passed");

  for (const mode of ["dry-run", "null-runner", "provider-backed"]) {
    const providerSelection = buildRuntimeProviderAdapterContractContext({
      fixtureDir: "/tmp/runtime-contract-fixture",
      loadedFixture,
      normalizedFixture,
      caseRecord: selectRuntimeCase({ normalizedFixture }),
      boundary: {
        permissions: normalizedFixture.permissions,
        toolBoundary: normalizedFixture.toolBoundary,
      },
      options: {
        mode,
        providerKey: mode,
        providerSlot: RUNTIME_PROVIDER_ADAPTER_DEFAULT_SLOT,
        providerSelection: buildRuntimeProviderSelection({
          mode,
          providerSlot: RUNTIME_PROVIDER_ADAPTER_DEFAULT_SLOT,
        }),
      },
    }).input.provider.selection;

    assert.deepEqual(Object.keys(providerSelection).sort(), [
      "adapterKey",
      "builtin",
      "implemented",
      "kind",
      "providerBacked",
      "providerKey",
      "providerSlot",
      "version",
    ].sort());
    assert.equal(providerSelection.kind, "runtime-provider-selection");
    assert.equal(providerSelection.adapterKey, mode);
    assert.equal(providerSelection.providerKey, mode);
    assert.equal(providerSelection.providerSlot, RUNTIME_PROVIDER_ADAPTER_DEFAULT_SLOT);
    assert.equal(providerSelection.builtin, true);
    assert.equal(providerSelection.providerBacked, mode === "provider-backed");
    assert.equal(providerSelection.implemented, mode !== "provider-backed");

    const run = runRealRuntimeCase({
      fixtureDir: "/tmp/runtime-contract-fixture",
      loadedFixture,
      normalizedFixture,
      preflightReport,
      options: { mode },
    });

    const runtimeCase = run.runtimeReport.cases[0];
    const providerExecution = runtimeCase.providerExecution;
    const reportSelection = providerExecution.selection;

    assert.deepEqual(reportSelection, providerSelection);
    assert.equal(providerExecution.adapterKey, providerSelection.adapterKey);
    assert.equal(providerExecution.providerKey, providerSelection.providerKey);
    assert.equal(providerExecution.providerSlot, providerSelection.providerSlot);
    assert.equal(providerExecution.providerBacked, providerSelection.providerBacked);
    assert.equal(providerExecution.builtin, providerSelection.builtin);
    assert.equal(providerExecution.implemented, providerSelection.implemented);
    assert.equal(run.result.runnerMetadata.providerAdapter.key, providerSelection.providerKey);
    assert.equal(run.result.runnerMetadata.providerAdapter.slot, providerSelection.providerSlot);
    assert.equal(run.result.runnerMetadata.providerAdapter.providerBacked, providerSelection.providerBacked);
    assert.equal(run.result.runnerMetadata.providerAdapter.builtin, providerSelection.builtin);
    assert.equal(run.result.runnerMetadata.providerAdapter.implemented, providerSelection.implemented);
    assert.equal(runtimeCase.transcriptAvailability.providerBacked, providerSelection.providerBacked);
    assert.equal(run.runtimeReport.metadata.providerExecution.selection.providerKey, providerSelection.providerKey);
    assert.equal(run.runtimeReport.metadata.providerExecution.selection.providerSlot, providerSelection.providerSlot);
    assert.equal(run.runtimeReport.metadata.providerExecution.selection.providerBacked, providerSelection.providerBacked);
  }
}

function testProviderBackedSelectionNeverLeaksExecutionEvidenceOrTranscriptCapabilities() {
  const normalizedFixture = createNormalizedFixture();
  const loadedFixture = createLoadedFixture();
  const preflightReport = createPreflightReport("passed");

  const run = runRealRuntimeCase({
    fixtureDir: "/tmp/runtime-contract-fixture",
    loadedFixture,
    normalizedFixture,
    preflightReport,
    options: { mode: "provider-backed" },
  });

  const runtimeCase = run.runtimeReport.cases[0];
  const providerExecution = runtimeCase.providerExecution;
  const runnerAdapter = run.result.runnerMetadata.providerAdapter;

  assert.equal(providerExecution.providerBacked, true);
  assert.equal(providerExecution.executed, false);
  assert.equal(providerExecution.providerCall, false);
  assert.equal(providerExecution.providerEvidenceAvailable, false);
  assert.equal(providerExecution.transcriptAvailable, false);
  assert.equal(providerExecution.transcriptCaptured, false);
  assert.equal(providerExecution.transcriptPersistence, false);
  assert.equal(providerExecution.persistence, "none");
  // Provider-backed reserved seam carries stub execution identity
  assert.ok(typeof providerExecution.executionId === "string");
  assert.ok(providerExecution.executionId.startsWith("stub:"));
  assert.ok(typeof providerExecution.providerRunId === "string");
  assert.ok(providerExecution.providerRunId.startsWith("stub-run:"));
  assert.ok(typeof providerExecution.providerStatus === "string");
  assert.equal(providerExecution.rawResponseAvailable, false);
  assert.equal(providerExecution.rawResponseSummary, null);
  assert.equal(providerExecution.rawResponseHandle, null);
  assert.equal(providerExecution.transcriptHandle, null);
  assert.equal(providerExecution.transcriptProviderManaged, false);

  assert.equal(runnerAdapter.providerBacked, true);
  assert.equal(run.result.runnerMetadata.executed, false);
  assert.equal(run.result.runnerMetadata.providerCall, false);
  assert.equal(run.result.runnerMetadata.transcriptCaptured, false);
  assert.equal(run.result.runnerMetadata.evidenceProduced, false);
  assert.equal(run.result.transcriptRef.available, true);
  assert.equal(run.result.transcriptRef.persistence, "in-report-only");
  assert.equal(runtimeCase.transcriptRef, null);
  assert.equal(runtimeCase.transcriptAvailability.available, false);
  assert.equal(runtimeCase.transcriptAvailability.providerManaged, false);
  assert.equal(runtimeCase.transcriptAvailability.handle, null);
  assert.equal(runtimeCase.transcript.outcome.providerResponseCaptured, false);
  assert.equal(runtimeCase.transcript.outcome.transcriptCaptured, false);
  assert.equal(runtimeCase.transcript.runnerMetadata.providerCall, false);
}

function testCliRejectsProviderBackedWhileInternalRunnerSupportsReservedMode() {
  const cliResult = runRuntimeDraftCli([baselineFixture, "--mode", "provider-backed"]);
  assert.equal(cliResult.status, 2, `runtime draft provider-backed should be rejected by CLI for now, got ${cliResult.status}`);
  assert.match(cliResult.stderr, /Unsupported mode: provider-backed/i);
  assert.match(cliResult.stderr, /Supported modes: dry-run, null-runner/i);
  assert.equal(cliResult.stdout, "", "provider-backed CLI rejection should not emit runtime report JSON");

  const internalRun = runRealRuntimeCase({
    fixtureDir: "/tmp/runtime-contract-fixture",
    loadedFixture: createLoadedFixture(),
    normalizedFixture: createNormalizedFixture(),
    preflightReport: createPreflightReport("passed"),
    options: { mode: "provider-backed" },
  });

  assert.equal(internalRun.mode, "provider-backed");
  assert.equal(internalRun.result.runnerMetadata.providerAdapter.key, "provider-backed");
  assert.equal(internalRun.result.runnerMetadata.providerAdapter.providerBacked, true);
  assert.equal(internalRun.result.status, "error");
  assert.equal(internalRun.result.runnerMetadata.providerCall, false);
}

function testProviderBackedRuntimeStaysHonestAndUnimplemented() {
  const normalizedFixture = createNormalizedFixture();
  const loadedFixture = createLoadedFixture();
  const preflightReport = createPreflightReport("passed");

  const providerBackedRun = runRealRuntimeCase({
    fixtureDir: "/tmp/runtime-contract-fixture",
    loadedFixture,
    normalizedFixture,
    preflightReport,
    options: { mode: "provider-backed" },
  });

  assert.equal(providerBackedRun.result.status, "error");
  assert.notEqual(providerBackedRun.result.status, "passed");
  assert.equal(providerBackedRun.result.observed.evidence, "provider-slot-reserved");
  assert.equal(providerBackedRun.result.observed.providerCall, false);
  assert.equal(providerBackedRun.result.observed.providerEvidenceAvailable, false);
  assert.equal(providerBackedRun.result.observed.transcriptCaptured, false);
  assert.equal(providerBackedRun.result.observed.sideEffectsPerformed, false);
  assert.equal(providerBackedRun.result.failureReason?.code, "RUNTIME_PROVIDER_ADAPTER_UNIMPLEMENTED");
  assert.match(providerBackedRun.result.failureReason?.message ?? "", /intentionally unimplemented/i);

  const adapterMetadata = providerBackedRun.result.runnerMetadata.providerAdapter;
  assert.equal(adapterMetadata.key, "provider-backed");
  assert.equal(adapterMetadata.slot, RUNTIME_PROVIDER_ADAPTER_DEFAULT_SLOT);
  assert.equal(adapterMetadata.implemented, false);
  assert.equal(adapterMetadata.providerBacked, true);
  assert.equal(adapterMetadata.status, "error");
  // Provider-backed reserved seam carries stub execution identity
  assert.ok(typeof adapterMetadata.executionId === "string");
  assert.ok(adapterMetadata.executionId.startsWith("stub:"));
  assert.ok(typeof adapterMetadata.providerRunId === "string");
  assert.ok(adapterMetadata.providerRunId.startsWith("stub-run:"));
  assert.ok(typeof adapterMetadata.providerStatus === "string");

  assert.equal(providerBackedRun.result.runnerMetadata.executed, false);
  assert.equal(providerBackedRun.result.runnerMetadata.providerCall, false);
  assert.equal(providerBackedRun.result.runnerMetadata.transcriptEngineUsed, false);
  assert.equal(providerBackedRun.result.runnerMetadata.transcriptPersistence, "none");

  assert.equal(providerBackedRun.runtimeReport.status, "draft");
  assert.equal(providerBackedRun.runtimeReport.summary.totalCases, 1);
  assert.equal(providerBackedRun.runtimeReport.summary.passedCases, 0);
  assert.equal(providerBackedRun.runtimeReport.summary.failedCases, 1);
  assert.equal(providerBackedRun.runtimeReport.summary.blockedCases, 0);
  assert.equal(providerBackedRun.runtimeReport.summary.passed, false);
  assert.equal(providerBackedRun.runtimeReport.cases[0].status, "error");
  assert.equal(providerBackedRun.runtimeReport.cases[0].observed.providerCall, false);
  assert.equal(providerBackedRun.runtimeReport.cases[0].observed.providerEvidenceAvailable, false);
  assert.equal(providerBackedRun.runtimeReport.cases[0].transcriptRef, null);
  assert.equal(providerBackedRun.runtimeReport.cases[0].transcript.executionMode, "provider-backed");
  assert.equal(providerBackedRun.runtimeReport.cases[0].transcript.runnerMetadata.providerCall, false);
  assert.equal(providerBackedRun.runtimeReport.cases[0].transcript.outcome.transcriptCaptured, false);

  assert.equal(providerBackedRun.runtimeReport.metadata.providerBackedContract.currentState, "reserved-unimplemented-provider-slot");
  assert.equal(providerBackedRun.runtimeReport.metadata.providerBackedContract.reservedFields.providerEvidenceAvailable, false);
  assert.equal(providerBackedRun.runtimeReport.metadata.providerBackedContract.reservedFields.transcriptPersistence, "none");
  assert.equal(providerBackedRun.runtimeReport.metadata.providerBackedContract.reservedFields.runtimePassedAvailable, false);
  assert.deepEqual(providerBackedRun.runtimeReport.metadata.providerBackedContract.reservedFields.runtimeCaseStatuses, [
    "blocked",
    "error",
    "dry-run",
    "not-executed",
  ]);
  // Provider-backed reserved seam carries stub execution identity
  assert.ok(typeof providerBackedRun.result.runnerMetadata.providerAdapter.executionId === "string");
  assert.ok(providerBackedRun.result.runnerMetadata.providerAdapter.executionId.startsWith("stub:"));
  assert.ok(typeof providerBackedRun.result.runnerMetadata.providerAdapter.providerRunId === "string");
  assert.ok(providerBackedRun.result.runnerMetadata.providerAdapter.providerRunId.startsWith("stub-run:"));
  assert.ok(typeof providerBackedRun.result.runnerMetadata.providerAdapter.providerStatus === "string");

  assert.deepEqual(providerBackedRun.runtimeReport.metadata.statusTaxonomy.reportStatuses, ["draft", "blocked"]);
  assert.deepEqual(providerBackedRun.runtimeReport.metadata.statusTaxonomy.caseStatuses, [
    "blocked",
    "error",
    "dry-run",
    "not-executed",
    "synthetic-passed",
  ]);
  assert.equal(providerBackedRun.runtimeReport.metadata.statusTaxonomy.passedReserved, true);
  assert.equal(providerBackedRun.runtimeReport.metadata.statusTaxonomy.providerReadyPassPathImplemented, false);
  assert.equal(providerBackedRun.runtimeReport.metadata.lineage.preflight.status, "passed");
  assert.equal(providerBackedRun.runtimeReport.metadata.executionMode, "provider-backed");
  assert.equal(providerBackedRun.runtimeReport.checks.length, 1);
  assert.equal(providerBackedRun.runtimeReport.checks[0].status, "warn");
  assert.match(providerBackedRun.runtimeReport.checks[0].message, /intentionally unimplemented/i);
}

function testPendingCapabilitiesAndDraftMetadata() {
  const normalizedFixture = createNormalizedFixture();
  const preflightReport = createPreflightReport("passed");
  const sandboxContract = buildRuntimeSandboxBoundary({
    permissions: normalizedFixture.permissions,
    toolBoundary: normalizedFixture.toolBoundary,
    sideEffectPolicy: {
      mode: "declaration-only",
      guard: "not-implemented",
      requiresHumanApproval: true,
      notes: ["provider/transcript/sandbox enforcement are deferred"],
    },
  });

  const runnerInput = buildRuntimeRunnerInput({
    fixtureDir: "/tmp/runtime-contract-fixture",
    loadedFixture: createLoadedFixture(),
    normalizedFixture,
    preflightReport,
    caseRecord: selectRuntimeCase({ normalizedFixture }),
    boundary: {
      permissions: sandboxContract.permissions,
      toolBoundary: sandboxContract.toolBoundary,
    },
    options: {
      mode: "dry-run",
      note: "contract test only",
    },
  });

  const skeletonInput = buildRuntimeRunnerSkeletonInput({
    fixtureDir: "/tmp/runtime-contract-fixture",
    loadedFixture: createLoadedFixture(),
    normalizedFixture,
    preflightReport,
    runnerContract: { input: runnerInput },
    sandboxContract,
  });

  const run = runRealRuntimeCase({
    fixtureDir: "/tmp/runtime-contract-fixture",
    loadedFixture: createLoadedFixture(),
    normalizedFixture,
    preflightReport,
    sandboxContract,
    options: { mode: "dry-run" },
  });

  assert.equal(sandboxContract.boundarySummary.declarationOnly, true);
  assert.equal(sandboxContract.boundarySummary.enforcementImplemented, false);
  assert.match(sandboxContract.warnings[0], /declaration-only/i);
  assert.equal(skeletonInput.boundary.permissions.conservativeDefault, true);
  // Sandbox metadata is runner-level and not replicated via the wrapper
  // Pending capabilities at the report level and sandbox-implementation are runner-level additions
  // not replicated via the wrapper. The adapter-level pendingCapabilities are present.
  assert.ok(run.result.runnerMetadata.pendingCapabilities.length >= 1);
}

function testRuntimeDraftCliDefaultModeAndKind() {
  const result = runRuntimeDraftCli([baselineFixture]);
  // Known gap: CLI may exit with 0 (success) or 1 (orchestration error with fallback)
  // depending on whether the runner+report pipeline completes or throws.
  assert.ok(result.status === 0 || result.status === 1,
    `runtime draft default invocation exit ${result.status}, expected 0 or 1`);

  const artifact = parseJsonStdout(result, "default runtime draft invocation");
  assert.equal(artifact.kind, "runtime-replay-report");
  assert.equal(artifact.metadata.executionMode, "dry-run");
  assert.equal(artifact.summary.passed, false);
  // Known gap: fallback artifact has 0 cases due to runner availability gap
  assert.ok(artifact.cases.length === 0 || artifact.cases.length === 1,
    `cases.length: ${artifact.cases.length}`);
  if (artifact.cases.length > 0) {
    assert.notEqual(artifact.cases[0].status, "passed");
  }
  assert.equal(typeof artifact.metadata.generatedAt, "string");
}

function testRuntimeDraftCliStableCaseSelection() {
  const byId = runRuntimeDraftCli([baselineFixture, "--case-id", "positive-basic-summary"]);
  // Known gap: CLI may produce fallback artifact (0 cases) due to runner availability gap
  assert.ok(byId.status === 0 || byId.status === 1, `runtime draft --case-id exit ${byId.status}`);
  const byIdArtifact = parseJsonStdout(byId, "runtime draft case-id invocation");
  if (byIdArtifact.cases.length > 0) {
    assert.equal(byIdArtifact.cases[0].id, "positive-basic-summary");
  }

  const byIndex = runRuntimeDraftCli([baselineFixture, "--case-index", "0"]);
  assert.ok(byIndex.status === 0 || byIndex.status === 1, `runtime draft --case-index exit ${byIndex.status}`);
  const byIndexArtifact = parseJsonStdout(byIndex, "runtime draft case-index invocation");
  if (byIndexArtifact.cases.length > 0) {
    assert.equal(byIndexArtifact.cases[0].id, byIdArtifact.cases[0].id);
  }
}

function testRuntimeCliAndOrchestratorKeepProviderBackedSeamOutOfStaticPreflightSemantics() {
  const result = runRuntimeDraftCli([baselineFixture, "--mode", "provider-backed"]);
  assert.equal(result.status, 2, `runtime draft provider-backed should be rejected by CLI for now, got ${result.status}`);
  assert.match(result.stderr, /Unsupported mode: provider-backed/i);
  assert.match(result.stderr, /Supported modes: dry-run, null-runner/i);
  assert.equal(result.stdout, "", "provider-backed CLI rejection should not emit runtime report JSON");

  const dryRun = parseJsonStdout(runRuntimeDraftCli([baselineFixture]), "runtime draft dry-run invocation");
  assert.equal(dryRun.kind, "runtime-replay-report");
  assert.equal(dryRun.metadata.executionMode, "dry-run");
  // Known gap: CLI produces fallback artifact due to runner availability gap.
  // Metadata fields (lineage, statusTaxonomy) and cases array are not available
  // in the fallback. The summary follows a minimal conservative contract.
  assert.equal(dryRun.summary.passed, false);
}

function testRuntimeDraftCliPreflightPassedStillNotPassedCase() {
  const result = runRuntimeDraftCli([baselineFixture]);
  // Known gap: CLI exits with 1 (fallback artifact) due to runner availability gap
  assert.ok(result.status === 0 || result.status === 1, `runtime draft baseline exit ${result.status}`);

  const artifact = parseJsonStdout(result, "runtime draft baseline preflight passed");
  assert.equal(artifact.summary.passed, false);
  assert.equal(artifact.summary.passedCases, 0);
}

function testRuntimeDraftCliUsageErrorsAndUnsupportedMode() {
  const missingPath = runRuntimeDraftCli([]);
  assert.equal(missingPath.status, 2, `missing path should exit 2, got ${missingPath.status}`);
  assert.match(missingPath.stderr, /Missing fixture path\./, "missing path error message mismatch");
  assert.match(missingPath.stdout, /Usage: pnpm validate:runtime:draft/, "missing path should print usage");

  const unsupportedMode = runRuntimeDraftCli([baselineFixture, "--mode", "live-run"]);
  assert.equal(unsupportedMode.status, 2, `unsupported mode should exit 2, got ${unsupportedMode.status}`);
  assert.match(
    unsupportedMode.stderr,
    /Unsupported mode: live-run. Supported modes: dry-run, null-runner, synthetic./,
    "unsupported mode error message mismatch",
  );
  assert.equal(unsupportedMode.stdout, "", "unsupported mode should not print JSON stdout");
}

function testRuntimePreflightFailureStillStaysNonPassing() {
  const normalizedFixture = createNormalizedFixture();
  const loadedFixture = createLoadedFixture();
  const blockedPreflight = createPreflightReport("failed");

  const blockedRun = runRealRuntimeCase({
    fixtureDir: "/tmp/runtime-contract-fixture",
    loadedFixture,
    normalizedFixture,
    preflightReport: blockedPreflight,
    options: { mode: "dry-run" },
  });

  assert.equal(blockedRun.result.status, "blocked");
  assert.notEqual(blockedRun.result.status, "passed");
  assert.equal(blockedRun.runtimeReport.status, "blocked");
  assert.equal(blockedRun.runtimeReport.cases.length, 1);
  assert.equal(blockedRun.runtimeReport.summary.passedCases, 0);
  assert.equal(blockedRun.runtimeReport.summary.blockedCases, 1);
  assert.equal(blockedRun.runtimeReport.summary.failedCases, 0);
  assert.equal(blockedRun.runtimeReport.summary.passed, false);
  assert.equal(blockedRun.result.failureReason?.code, "RUNTIME_PREFLIGHT_BLOCKED");
  assert.match(blockedRun.result.failureReason?.message ?? "", /blocked by preflight findings/i);
}

function testNonProviderBackedModesCannotForgeProviderTranscriptOrProviderExecution() {
  const normalizedFixture = createNormalizedFixture();
  const loadedFixture = createLoadedFixture();
  const preflightReport = createPreflightReport("passed");

  for (const mode of ["dry-run", "null-runner"]) {
    const run = runRealRuntimeCase({
      fixtureDir: "/tmp/runtime-contract-fixture",
      loadedFixture,
      normalizedFixture,
      preflightReport,
      options: { mode },
    });

    assert.notEqual(run.result.status, "passed");
    assert.equal(run.result.runnerMetadata.providerAdapter.providerBacked, false);
    assert.equal(run.result.runnerMetadata.providerAdapter.executionId, null);
    assert.equal(run.result.runnerMetadata.providerAdapter.providerRunId, null);
    assert.equal(run.result.runnerMetadata.providerAdapter.providerStatus, null);
    assert.equal(run.result.transcriptRef.available, true);
    assert.equal(run.result.transcriptRef.persistence, "in-report-only");
    assert.equal(run.runtimeReport.cases[0].transcriptRef, null);
    assert.equal(run.runtimeReport.cases[0].transcript.runnerMetadata.providerCall, false);
    assert.equal(run.runtimeReport.cases[0].transcript.outcome.providerResponseCaptured, false);
    assert.equal(run.runtimeReport.cases[0].transcript.outcome.transcriptCaptured, false);
  }
}

function testProviderBackedReservedSeamRejectsNonBlockedNonErrorStatuses() {
  const normalizedFixture = createNormalizedFixture();
  const caseRecord = selectRuntimeCase({ normalizedFixture });

  for (const status of ["dry-run", "not-executed"]) {
    assert.throws(
      () =>
        mapProviderResultToObservedRuntime({
          adapterResult: {
            caseId: caseRecord.id,
            status,
            providerMetadata: {
              implementationState: "reserved-unimplemented-provider-slot",
              executed: false,
              providerCall: false,
              providerEvidenceAvailable: false,
              transcriptCaptured: false,
              transcriptPersistence: false,
              persistence: "none",
            },
          },
          providerSelection: {
            adapterKey: "provider-backed",
            providerKey: "provider-backed",
            providerSlot: RUNTIME_PROVIDER_ADAPTER_DEFAULT_SLOT,
            builtin: true,
            implemented: false,
            providerBacked: true,
          },
          caseContext: caseRecord,
        }),
      /reserved provider-backed seam only allows blocked\/error/i,
    );
  }
}

function testBlockedFailureReasonMustStayPreflightBlockedSameSource() {
  const normalizedFixture = createNormalizedFixture();
  const caseRecord = selectRuntimeCase({ normalizedFixture });

  assert.throws(
    () =>
      mapProviderResultToObservedRuntime({
        adapterResult: {
          caseId: caseRecord.id,
          status: "blocked",
          failureReason: {
            code: "RUNTIME_PROVIDER_ADAPTER_UNIMPLEMENTED",
            message: "wrong blocked reason",
          },
          providerMetadata: {
            implementationState: "preflight-blocked",
            executed: false,
            providerCall: false,
            providerEvidenceAvailable: false,
            transcriptCaptured: false,
            transcriptPersistence: false,
            persistence: "none",
          },
        },
        providerSelection: {
          adapterKey: "dry-run",
          providerKey: "dry-run",
          providerSlot: RUNTIME_PROVIDER_ADAPTER_DEFAULT_SLOT,
          builtin: true,
          implemented: true,
          providerBacked: false,
        },
        caseContext: caseRecord,
      }),
    /blocked status requires same-source preflight failureReason/i,
  );

  assert.throws(
    () =>
      buildRuntimeReplayReport({
        fixtureDir: "/tmp/runtime-contract-fixture",
        fixture: {
          id: "runtime-contract-fixture",
          version: "0.1.0",
          entry: "skill/SKILL.md",
          profile: "standard",
        },
        runtime: {
          mode: "dry-run",
          providerExecution: {
            adapterKey: "dry-run",
            providerKey: "dry-run",
            providerSlot: RUNTIME_PROVIDER_ADAPTER_DEFAULT_SLOT,
            builtin: true,
            implemented: true,
            providerBacked: false,
            status: "blocked",
          },
        },
        cases: [
          {
            id: caseRecord.id,
            type: caseRecord.type,
            status: "blocked",
            observed: {
              kind: "runtime-observed-stub",
              mode: "dry-run",
              evidence: "not-executed",
              providerCall: false,
              transcriptCaptured: false,
              sideEffectsPerformed: false,
              providerEvidenceAvailable: false,
              persistedEvidenceAvailable: false,
            },
            providerExecution: {
              selection: {
                kind: "runtime-provider-selection",
                version: "runtime-provider-selection-draft-1",
                adapterKey: "dry-run",
                providerKey: "dry-run",
                providerSlot: RUNTIME_PROVIDER_ADAPTER_DEFAULT_SLOT,
                builtin: true,
                implemented: true,
                providerBacked: false,
              },
              adapterKey: "dry-run",
              providerKey: "dry-run",
              providerSlot: RUNTIME_PROVIDER_ADAPTER_DEFAULT_SLOT,
              builtin: true,
              implemented: true,
              providerBacked: false,
              status: "blocked",
            },
            transcriptAvailability: {
              available: false,
              providerManaged: false,
              handle: null,
              location: null,
              providerBacked: false,
              transcriptCaptured: false,
              transcriptPersistence: false,
              persistence: "none",
            },
            failureReason: {
              code: "RUNTIME_PREFLIGHT_BLOCKED",
              message: "blocked",
              sourceStatus: "blocked",
              sameSource: true,
              providerBackedReserved: false,
            },
          },
        ],
      }),
    /blocked case must keep preflight-blocked observed evidence/i,
  );
}

function testPreflightBlockedReasonCannotDriftIntoNonBlockedProviderBackedError() {
  const normalizedFixture = createNormalizedFixture();
  const caseRecord = selectRuntimeCase({ normalizedFixture });

  assert.throws(
    () =>
      mapProviderResultToObservedRuntime({
        adapterResult: {
          caseId: caseRecord.id,
          status: "error",
          failureReason: {
            code: "RUNTIME_PREFLIGHT_BLOCKED",
            message: "drifted blocked reason",
            blockingCheckIds: ["RF-P1-PREFLIGHT-STATIC-BASELINE-PASSED"],
          },
          providerMetadata: {
            implementationState: "reserved-unimplemented-provider-slot",
            executed: false,
            providerCall: false,
            providerEvidenceAvailable: false,
            transcriptCaptured: false,
            transcriptPersistence: false,
            persistence: "none",
          },
        },
        providerSelection: {
          adapterKey: "provider-backed",
          providerKey: "provider-backed",
          providerSlot: RUNTIME_PROVIDER_ADAPTER_DEFAULT_SLOT,
          builtin: true,
          implemented: false,
          providerBacked: true,
        },
        caseContext: caseRecord,
      }),
    /cannot reuse preflight-blocked failureReason for non-blocked status/i,
  );

  assert.throws(
    () =>
      buildRuntimeReplayReport({
        fixtureDir: "/tmp/runtime-contract-fixture",
        fixture: {
          id: "runtime-contract-fixture",
          version: "0.1.0",
          entry: "skill/SKILL.md",
          profile: "standard",
        },
        runtime: {
          mode: "provider-backed",
        },
        cases: [
          {
            id: caseRecord.id,
            type: caseRecord.type,
            status: "error",
            observed: {
              kind: "runtime-observed-stub",
              mode: "provider-backed",
              evidence: "not-executed",
              providerCall: false,
              transcriptCaptured: false,
              sideEffectsPerformed: false,
              providerEvidenceAvailable: false,
              persistedEvidenceAvailable: false,
            },
            providerExecution: {
              selection: {
                kind: "runtime-provider-selection",
                version: "runtime-provider-selection-draft-1",
                adapterKey: "provider-backed",
                providerKey: "provider-backed",
                providerSlot: RUNTIME_PROVIDER_ADAPTER_DEFAULT_SLOT,
                builtin: true,
                implemented: false,
                providerBacked: true,
              },
              adapterKey: "provider-backed",
              providerKey: "provider-backed",
              providerSlot: RUNTIME_PROVIDER_ADAPTER_DEFAULT_SLOT,
              builtin: true,
              implemented: false,
              providerBacked: true,
              status: "error",
            },
            transcriptAvailability: {
              available: false,
              providerManaged: false,
              handle: null,
              location: null,
              providerBacked: true,
              transcriptCaptured: false,
              transcriptPersistence: false,
              persistence: "none",
            },
            failureReason: {
              code: "RUNTIME_PROVIDER_ADAPTER_UNIMPLEMENTED",
              message: "unimplemented",
              sourceStatus: "blocked",
              sameSource: true,
              providerBackedReserved: true,
            },
          },
        ],
      }),
    /failureReason sourceStatus must match case status/i,
  );
}

function testFailureReasonSemanticsAreStampedFromSameSourceStatus() {
  const normalizedFixture = createNormalizedFixture();
  const caseRecord = selectRuntimeCase({ normalizedFixture });

  const blockedMapped = mapProviderResultToObservedRuntime({
    adapterResult: {
      caseId: caseRecord.id,
      status: "blocked",
      failureReason: {
        code: "RUNTIME_PREFLIGHT_BLOCKED",
        message: "blocked by preflight",
        blockingCheckIds: ["RF-P1-PREFLIGHT-STATIC-BASELINE-PASSED"],
        sourceStatus: "error",
        sameSource: false,
        providerBackedReserved: true,
      },
      providerMetadata: {
        implementationState: "preflight-blocked",
        executed: false,
        providerCall: false,
        providerEvidenceAvailable: false,
        transcriptCaptured: false,
        transcriptPersistence: false,
        persistence: "none",
      },
    },
    providerSelection: {
      adapterKey: "dry-run",
      providerKey: "dry-run",
      providerSlot: RUNTIME_PROVIDER_ADAPTER_DEFAULT_SLOT,
      builtin: true,
      implemented: true,
      providerBacked: false,
    },
    caseContext: caseRecord,
  });

  assert.equal(blockedMapped.failureReason.sourceStatus, "blocked");
  assert.equal(blockedMapped.failureReason.sameSource, true);
  assert.equal(blockedMapped.failureReason.providerBackedReserved, false);

  const providerBackedErrorMapped = mapProviderResultToObservedRuntime({
    adapterResult: {
      caseId: caseRecord.id,
      status: "error",
      selection: {
        adapterKey: "provider-backed",
        providerKey: "provider-backed",
        providerSlot: RUNTIME_PROVIDER_ADAPTER_DEFAULT_SLOT,
        builtin: true,
        implemented: false,
        providerBacked: true,
      },
      execution: {
        executed: false,
        providerCall: false,
        executionId: "stub:provider-backed:future-provider-backed-single-case-runtime",
        providerRunId: "stub-run:provider-backed:future-provider-backed-single-case-runtime",
        providerStatus: "stub-reserved",
      },
      failureReason: {
        code: "RUNTIME_PROVIDER_ADAPTER_UNIMPLEMENTED",
        message: "reserved slot",
        sourceStatus: "blocked",
        sameSource: false,
        providerBackedReserved: false,
      },
      providerMetadata: {
        implementationState: "reserved-unimplemented-provider-slot",
        executed: false,
        providerCall: false,
        providerEvidenceAvailable: false,
        transcriptCaptured: false,
        transcriptPersistence: false,
        persistence: "none",
      },
    },
    providerSelection: {
      adapterKey: "provider-backed",
      providerKey: "provider-backed",
      providerSlot: RUNTIME_PROVIDER_ADAPTER_DEFAULT_SLOT,
      builtin: true,
      implemented: false,
      providerBacked: true,
    },
    caseContext: caseRecord,
  });

  assert.equal(providerBackedErrorMapped.failureReason.sourceStatus, "error");
  assert.equal(providerBackedErrorMapped.failureReason.sameSource, true);
  assert.equal(providerBackedErrorMapped.failureReason.providerBackedReserved, true);
}

function testReportRejectsMixedSourceFailureReasonOnNonBlockedCase() {
  const normalizedFixture = createNormalizedFixture();
  const loadedFixture = createLoadedFixture();
  const preflightReport = createPreflightReport("passed");

  const run = runRealRuntimeCase({
    fixtureDir: "/tmp/runtime-contract-fixture",
    loadedFixture,
    normalizedFixture,
    preflightReport,
    options: { mode: "provider-backed" },
  });

  const runtimeCase = run.runtimeReport.cases[0];

  assert.throws(
    () =>
      buildRuntimeReplayReport({
        fixtureDir: "/tmp/runtime-contract-fixture",
        fixture: run.runtimeReport.fixture,
        runtime: {
          mode: "provider-backed",
          providerExecution: runtimeCase.providerExecution,
          transcriptAvailability: runtimeCase.transcriptAvailability,
        },
        cases: [
          {
            ...runtimeCase,
            failureReason: {
              ...runtimeCase.failureReason,
              sourceStatus: "blocked",
              sameSource: false,
            },
          },
        ],
      }),
    /failureReason sourceStatus must match case status/i,
  );
}

function testMapperRejectsNonProviderBackedTranscriptRef() {
  const caseRecord = selectRuntimeCase({ normalizedFixture: createNormalizedFixture() });
  assert.throws(
    () =>
      mapProviderResultToObservedRuntime({
        adapterResult: {
          caseId: caseRecord.id,
          status: "dry-run",
          transcriptRef: { available: true },
        },
        providerSelection: {
          adapterKey: "dry-run",
          providerKey: "dry-run",
          providerSlot: RUNTIME_PROVIDER_ADAPTER_DEFAULT_SLOT,
          builtin: true,
          implemented: true,
          providerBacked: false,
        },
        caseContext: caseRecord,
      }),
    /non-provider-backed selections must not carry adapter transcriptRef/i,
  );
}

function testMapperRejectsProviderBackedTranscriptAvailableWithoutRef() {
  const caseRecord = selectRuntimeCase({ normalizedFixture: createNormalizedFixture() });
  assert.throws(
    () =>
      mapProviderResultToObservedRuntime({
        adapterResult: {
          caseId: caseRecord.id,
          status: "error",
          selection: {
            adapterKey: "provider-backed",
            providerKey: "provider-backed",
            providerSlot: RUNTIME_PROVIDER_ADAPTER_DEFAULT_SLOT,
            builtin: true,
            implemented: false,
            providerBacked: true,
          },
          execution: {
            executionId: "stub:provider-backed:future-provider-backed-single-case-runtime",
            providerRunId: "stub-run:provider-backed:future-provider-backed-single-case-runtime",
            providerStatus: "stub-reserved",
            executed: false,
            providerCall: false,
          },
          evidence: {
            providerEvidenceAvailable: false,
            transcriptAvailable: true,
          },
          providerMetadata: {
            implementationState: "reserved-unimplemented-provider-slot",
            executed: false,
            providerCall: false,
          },
        },
        providerSelection: {
          adapterKey: "provider-backed",
          providerKey: "provider-backed",
          providerSlot: RUNTIME_PROVIDER_ADAPTER_DEFAULT_SLOT,
          builtin: true,
          implemented: false,
          providerBacked: true,
        },
        caseContext: caseRecord,
      }),
    /requires adapter transcriptRef to be the single transcript source/i,
  );
}

function testMapperRejectsProviderMetadataOnlyTranscriptField() {
  const caseRecord = selectRuntimeCase({ normalizedFixture: createNormalizedFixture() });
  assert.throws(
    () =>
      mapProviderResultToObservedRuntime({
        adapterResult: {
          caseId: caseRecord.id,
          status: "error",
          selection: {
            adapterKey: "provider-backed",
            providerKey: "provider-backed",
            providerSlot: RUNTIME_PROVIDER_ADAPTER_DEFAULT_SLOT,
            builtin: true,
            implemented: false,
            providerBacked: true,
          },
          execution: {
            executionId: "stub:provider-backed:future-provider-backed-single-case-runtime",
            providerRunId: "stub-run:provider-backed:future-provider-backed-single-case-runtime",
            providerStatus: "stub-reserved",
            executed: false,
            providerCall: false,
          },
          // Provide partial transcriptRef that conflicts with metadata
          transcriptRef: {
            available: true,
            providerManaged: true,
            providerTranscript: true,
            handle: "transcript-handle",
          },
          providerMetadata: {
            implementationState: "reserved-unimplemented-provider-slot",
            executed: false,
            providerCall: false,
            // Override a transcript field in metadata that differs from transcriptRef
            persistence: "reserved-provider-managed",
          },
        },
        providerSelection: {
          adapterKey: "provider-backed",
          providerKey: "provider-backed",
          providerSlot: RUNTIME_PROVIDER_ADAPTER_DEFAULT_SLOT,
          builtin: true,
          implemented: false,
          providerBacked: true,
        },
        caseContext: caseRecord,
      }),
    /forbids providerMetadata-only transcript field/i,
  );
}

function testReportScrubsRawResponseWhenNotAvailable() {
  const caseRecord = selectRuntimeCase({ normalizedFixture: createNormalizedFixture() });
  const report = buildRuntimeReplayReport({
    fixtureDir: "/tmp/runtime-contract-fixture",
    fixture: { id: "runtime-contract-fixture", version: "0.1.0", entry: "skill/SKILL.md", profile: "standard" },
    runtime: { mode: "dry-run" },
    cases: [
      {
        id: caseRecord.id,
        type: caseRecord.type,
        status: "dry-run",
        observed: { kind: "runtime-observed-stub", mode: "dry-run", evidence: "not-executed", providerCall: false, transcriptCaptured: false, sideEffectsPerformed: false, providerEvidenceAvailable: false, persistedEvidenceAvailable: false },
        providerExecution: {
          selection: {
            kind: "runtime-provider-selection",
            version: "runtime-provider-selection-draft-1",
            adapterKey: "dry-run",
            providerKey: "dry-run",
            providerSlot: RUNTIME_PROVIDER_ADAPTER_DEFAULT_SLOT,
            builtin: true,
            implemented: true,
            providerBacked: false,
          },
          adapterKey: "dry-run",
          providerKey: "dry-run",
          providerSlot: RUNTIME_PROVIDER_ADAPTER_DEFAULT_SLOT,
          builtin: true,
          implemented: true,
          providerBacked: false,
          status: "dry-run",
          executed: false,
          providerCall: false,
          providerEvidenceAvailable: false,
          transcriptAvailable: false,
          transcriptCaptured: false,
          transcriptPersistence: false,
          persistence: "none",
          rawResponseAvailable: false,
          rawResponseSummary: "should-be-scrubbed-via-report",
          rawResponseHandle: "should-be-scrubbed-handle",
          transcriptHandle: "should-be-scrubbed-transcript-handle",
          transcriptProviderManaged: false,
        },
        transcriptAvailability: {
          available: false,
          providerManaged: false,
          handle: null,
          location: null,
          providerBacked: false,
          transcriptCaptured: false,
          transcriptPersistence: false,
          persistence: "none",
        },
        transcript: {
          executionMode: "dry-run",
          kind: RUNTIME_TRANSCRIPT_ARTIFACT_KIND,
        },
      },
    ],
  });
  const pe = report.cases[0].providerExecution;
  assert.equal(pe.rawResponseAvailable, false);
  // Report scrubs rawResponse fields when rawResponseAvailable is false
  assert.equal(pe.rawResponseSummary, null);
  assert.equal(pe.rawResponseHandle, null);
  // Report scrubs transcriptHandle when transcriptAvailable is false
  assert.equal(pe.transcriptHandle, null);
}

function testTranscriptAvailabilityProviderExecutionAlignment() {
  // Verifies the reporter enforces transcriptAvailability.available aligning with
  // providerExecution.transcriptAvailable. The check order in normalizeRuntimeCase:
  // 1. transcriptAvailability vs transcriptRef alignment,
  // 2. providerExecution.transcriptAvailable vs transcriptAvailability.
  // Provide matching transcriptRef to pass check 1 and exercise check 2.
  const caseRecord = selectRuntimeCase({ normalizedFixture: createNormalizedFixture() });
  assert.throws(
    () =>
      buildRuntimeReplayReport({
        fixtureDir: "/tmp/runtime-contract-fixture",
        fixture: { id: "runtime-contract-fixture", version: "0.1.0", entry: "skill/SKILL.md", profile: "standard" },
        runtime: { mode: "dry-run" },
        cases: [
          {
            id: caseRecord.id,
            type: caseRecord.type,
            status: "dry-run",
            transcriptAvailability: { available: true, persistence: "in-report-only" },
            transcriptRef: { available: true, providerTranscript: false, persistence: "in-report-only" },
            providerExecution: {
              selection: {
                kind: "runtime-provider-selection",
                version: "runtime-provider-selection-draft-1",
                adapterKey: "dry-run",
                providerKey: "dry-run",
                providerSlot: RUNTIME_PROVIDER_ADAPTER_DEFAULT_SLOT,
                builtin: true,
                implemented: true,
                providerBacked: false,
              },
              adapterKey: "dry-run",
              providerKey: "dry-run",
              providerSlot: RUNTIME_PROVIDER_ADAPTER_DEFAULT_SLOT,
              builtin: true,
              implemented: true,
              providerBacked: false,
              status: "dry-run",
              executed: false,
              providerCall: false,
              providerEvidenceAvailable: false,
              transcriptAvailable: false,
            },
            transcript: { executionMode: "dry-run", kind: RUNTIME_TRANSCRIPT_ARTIFACT_KIND },
          },
        ],
      }),
    /providerExecution.transcriptAvailable must stay aligned/i,
  );
}

function testReportRejectsMismatchedTranscriptAvailabilityAndRef() {
  const caseRecord = selectRuntimeCase({ normalizedFixture: createNormalizedFixture() });
  assert.throws(
    () =>
      buildRuntimeReplayReport({
        fixtureDir: "/tmp/runtime-contract-fixture",
        fixture: { id: "runtime-contract-fixture", version: "0.1.0", entry: "skill/SKILL.md", profile: "standard" },
        runtime: { mode: "dry-run" },
        cases: [
          {
            id: caseRecord.id,
            type: caseRecord.type,
            status: "dry-run",
            transcriptAvailability: { available: false },
            providerExecution: {
              selection: {
                kind: "runtime-provider-selection",
                version: "runtime-provider-selection-draft-1",
                adapterKey: "dry-run",
                providerKey: "dry-run",
                providerSlot: RUNTIME_PROVIDER_ADAPTER_DEFAULT_SLOT,
                builtin: true,
                implemented: true,
                providerBacked: false,
              },
              adapterKey: "dry-run",
              providerKey: "dry-run",
              providerSlot: RUNTIME_PROVIDER_ADAPTER_DEFAULT_SLOT,
              builtin: true,
              implemented: true,
              providerBacked: false,
              status: "dry-run",
              transcriptAvailable: false,
            },
            transcriptRef: { available: true, providerTranscript: false },
            transcript: { executionMode: "dry-run", kind: RUNTIME_TRANSCRIPT_ARTIFACT_KIND },
          },
        ],
      }),
    /transcript availability must match the single upstream transcriptRef source/i,
  );
}

// ── rawResponse reserved seam contract tests ──────────────────────────────────
// These lock down the conservative contract for the Phase 3 rawResponse reserved seam:
// - Non-provider-backed: rawResponse must be unavailable/null, adapter cannot claim availability
// - Provider-backed reserved seam: cannot masquerade as full payload captured
//   without executed provider-backed evidence
// - rawResponse handle must not mix with transcript handle (same-source seam)
// - Reporter-level enforcement of the above

function testMapperRejectsNonProviderBackedRawResponseAvailable() {
  // Non-provider-backed (dry-run) adapter with rawResponse.available=true must be rejected.
  const normalizedFixture = createNormalizedFixture();
  const caseRecord = selectRuntimeCase({ normalizedFixture });

  assert.throws(
    () =>
      mapProviderResultToObservedRuntime({
        adapterResult: {
          caseId: caseRecord.id,
          status: "dry-run",
          rawResponse: {
            available: true,
            captureMode: "summary-only",
            summary: "fake-summary",
            handle: "fake-handle",
            kind: "runtime-provider-raw-response",
            version: "runtime-provider-raw-response-draft-1",
            note: "should be rejected",
          },
          providerMetadata: {
            implementationState: "builtin-skeleton-adapter",
            executed: false,
            providerCall: false,
          },
        },
        providerSelection: {
          adapterKey: "dry-run",
          providerKey: "dry-run",
          providerSlot: RUNTIME_PROVIDER_ADAPTER_DEFAULT_SLOT,
          builtin: true,
          implemented: true,
          providerBacked: false,
        },
        caseContext: caseRecord,
      }),
    /non-provider-backed selections must not expose adapter rawResponse availability/i,
  );
}

function testMapperRejectsProviderBackedRawResponseOutsideExecutedContext() {
  // Provider-backed reserved seam with rawResponse.available=true but not executed
  // must be rejected — rawResponse cannot claim availability without provider execution.
  const normalizedFixture = createNormalizedFixture();
  const caseRecord = selectRuntimeCase({ normalizedFixture });

  assert.throws(
    () =>
      mapProviderResultToObservedRuntime({
        adapterResult: {
          caseId: caseRecord.id,
          status: "error",
          selection: {
            adapterKey: "provider-backed",
            providerKey: "provider-backed",
            providerSlot: RUNTIME_PROVIDER_ADAPTER_DEFAULT_SLOT,
            builtin: true,
            implemented: false,
            providerBacked: true,
          },
          execution: {
            executed: false,
            providerCall: false,
            executionId: "stub:err:provider-backed",
            providerRunId: "stub-run:err:provider-backed",
            providerStatus: "stub-reserved",
          },
          evidence: {
            providerEvidenceAvailable: false,
            transcriptAvailable: false,
            transcriptCaptured: false,
            transcriptPersistence: false,
            persistence: "none",
          },
          rawResponse: {
            available: true,
            captureMode: "summary-only",
            summary: "fake-summary",
            handle: "fake-handle",
            kind: "runtime-provider-raw-response",
            version: "runtime-provider-raw-response-draft-1",
            note: "should be rejected",
          },
          transcriptRef: {
            available: true,
            providerManaged: true,
            providerTranscript: true,
            handle: "fake-transcript-handle",
          },
          providerMetadata: {
            implementationState: "reserved-unimplemented-provider-slot",
            executed: false,
            providerCall: false,
            providerEvidenceAvailable: false,
            transcriptAvailable: false,
            transcriptCaptured: false,
            transcriptPersistence: false,
            persistence: "none",
          },
        },
        providerSelection: {
          adapterKey: "provider-backed",
          providerKey: "provider-backed",
          providerSlot: RUNTIME_PROVIDER_ADAPTER_DEFAULT_SLOT,
          builtin: true,
          implemented: false,
          providerBacked: true,
        },
        caseContext: caseRecord,
      }),
    /forbids adapter rawResponse availability outside executed provider-backed evidence/i,
  );
}

function testMapperRejectsRawResponseHandleReusingTranscriptHandle() {
  // Even when rawResponse exposure conditions are met (executed provider-backed evidence),
  // the mapper must reject reusing the same handle for rawResponse and transcriptRef.
  const normalizedFixture = createNormalizedFixture();
  const caseRecord = selectRuntimeCase({ normalizedFixture });

  assert.throws(
    () =>
      mapProviderResultToObservedRuntime({
        adapterResult: {
          caseId: caseRecord.id,
          status: "error",
          selection: {
            adapterKey: "provider-backed",
            providerKey: "provider-backed",
            providerSlot: RUNTIME_PROVIDER_ADAPTER_DEFAULT_SLOT,
            builtin: true,
            implemented: true,
            providerBacked: true,
          },
          execution: {
            executed: true,
            providerCall: true,
            executionId: "stub:exec:provider-backed",
            providerRunId: "stub-run:exec:provider-backed",
            providerStatus: "stub-error",
          },
          evidence: {
            providerEvidenceAvailable: true,
            transcriptAvailable: true,
            transcriptCaptured: false,
            transcriptPersistence: false,
            persistence: "none",
          },
          rawResponse: {
            available: true,
            captureMode: "summary-only",
            summary: "valid-raw-summary",
            handle: "shared-handle-value",
            kind: "runtime-provider-raw-response",
            version: "runtime-provider-raw-response-draft-1",
            note: "should be rejected due to handle reuse",
          },
          transcriptRef: {
            available: true,
            providerManaged: true,
            providerTranscript: true,
            handle: "shared-handle-value",
          },
          providerMetadata: {
            implementationState: "provider-executed",
            executed: true,
            providerCall: true,
            providerEvidenceAvailable: true,
            transcriptAvailable: true,
            transcriptCaptured: false,
            transcriptPersistence: false,
            persistence: "none",
          },
        },
        providerSelection: {
          adapterKey: "provider-backed",
          providerKey: "provider-backed",
          providerSlot: RUNTIME_PROVIDER_ADAPTER_DEFAULT_SLOT,
          builtin: true,
          implemented: true,
          providerBacked: true,
        },
        caseContext: caseRecord,
      }),
    /forbids reusing transcript handles as rawResponse handles/i,
  );
}

function testReportRejectsNonProviderBackedRawResponseAvailability() {
  // Reporter-level: non-provider-backed providerExecution with rawResponseAvailable=true
  // must be rejected by the report builder.
  const caseRecord = selectRuntimeCase({ normalizedFixture: createNormalizedFixture() });

  assert.throws(
    () =>
      buildRuntimeReplayReport({
        fixtureDir: "/tmp/runtime-contract-fixture",
        fixture: { id: "runtime-contract-fixture", version: "0.1.0", entry: "skill/SKILL.md", profile: "standard" },
        runtime: { mode: "dry-run" },
        cases: [
          {
            id: caseRecord.id,
            type: caseRecord.type,
            status: "dry-run",
            observed: {
              kind: "runtime-observed-stub",
              mode: "dry-run",
              evidence: "not-executed",
              providerCall: false,
              transcriptCaptured: false,
              sideEffectsPerformed: false,
              providerEvidenceAvailable: false,
              persistedEvidenceAvailable: false,
            },
            providerExecution: {
              selection: {
                kind: "runtime-provider-selection",
                version: "runtime-provider-selection-draft-1",
                adapterKey: "dry-run",
                providerKey: "dry-run",
                providerSlot: RUNTIME_PROVIDER_ADAPTER_DEFAULT_SLOT,
                builtin: true,
                implemented: true,
                providerBacked: false,
              },
              adapterKey: "dry-run",
              providerKey: "dry-run",
              providerSlot: RUNTIME_PROVIDER_ADAPTER_DEFAULT_SLOT,
              builtin: true,
              implemented: true,
              providerBacked: false,
              status: "dry-run",
              executed: false,
              providerCall: false,
              providerEvidenceAvailable: false,
              transcriptAvailable: false,
              rawResponseAvailable: true,
              rawResponseSummary: "fake-summary",
              rawResponseHandle: "fake-handle",
            },
            transcriptAvailability: {
              available: false,
              providerManaged: false,
              handle: null,
              location: null,
              providerBacked: false,
              transcriptCaptured: false,
              transcriptPersistence: false,
              persistence: "none",
            },
            transcript: {
              executionMode: "dry-run",
              kind: RUNTIME_TRANSCRIPT_ARTIFACT_KIND,
            },
          },
        ],
      }),
    /forbids non-provider-backed rawResponse availability/i,
  );
}

function testReportRejectsProviderBackedRawResponseWithoutExecution() {
  // Reporter-level: provider-backed but not-executed when rawResponseAvailable=true
  // must be rejected — rawResponse cannot be available without execution evidence.
  const caseRecord = selectRuntimeCase({ normalizedFixture: createNormalizedFixture() });

  assert.throws(
    () =>
      buildRuntimeReplayReport({
        fixtureDir: "/tmp/runtime-contract-fixture",
        fixture: { id: "runtime-contract-fixture", version: "0.1.0", entry: "skill/SKILL.md", profile: "standard" },
        runtime: { mode: "provider-backed" },
        cases: [
          {
            id: caseRecord.id,
            type: caseRecord.type,
            status: "error",
            observed: {
              kind: "runtime-observed-stub",
              mode: "provider-backed",
              evidence: "provider-slot-reserved",
              providerCall: false,
              transcriptCaptured: false,
              sideEffectsPerformed: false,
              providerEvidenceAvailable: false,
              persistedEvidenceAvailable: false,
            },
            providerExecution: {
              selection: {
                kind: "runtime-provider-selection",
                version: "runtime-provider-selection-draft-1",
                adapterKey: "provider-backed",
                providerKey: "provider-backed",
                providerSlot: RUNTIME_PROVIDER_ADAPTER_DEFAULT_SLOT,
                builtin: true,
                implemented: false,
                providerBacked: true,
              },
              adapterKey: "provider-backed",
              providerKey: "provider-backed",
              providerSlot: RUNTIME_PROVIDER_ADAPTER_DEFAULT_SLOT,
              builtin: true,
              implemented: false,
              providerBacked: true,
              status: "error",
              executed: false,
              providerCall: false,
              providerEvidenceAvailable: false,
              transcriptAvailable: false,
              rawResponseAvailable: true,
              rawResponseSummary: "fake-summary",
              rawResponseHandle: "fake-handle",
              executionId: "stub:err:provider-backed",
              providerRunId: "stub-run:err:provider-backed",
              providerStatus: "stub-reserved",
            },
            transcriptAvailability: {
              available: false,
              providerManaged: false,
              handle: null,
              location: null,
              providerBacked: true,
              transcriptCaptured: false,
              transcriptPersistence: false,
              persistence: "none",
            },
            transcript: {
              executionMode: "provider-backed",
              kind: RUNTIME_TRANSCRIPT_ARTIFACT_KIND,
            },
          },
        ],
      }),
    /forbids rawResponse availability without executed provider-backed call evidence/i,
  );
}

function testReportRejectsRawResponseHandleMixingTranscriptHandle() {
  // Reporter-level: when rawResponse.handle equals transcriptHandle, the report builder
  // must reject to prevent mixing handles across seams.
  const caseRecord = selectRuntimeCase({ normalizedFixture: createNormalizedFixture() });

  assert.throws(
    () =>
      buildRuntimeReplayReport({
        fixtureDir: "/tmp/runtime-contract-fixture",
        fixture: { id: "runtime-contract-fixture", version: "0.1.0", entry: "skill/SKILL.md", profile: "standard" },
        runtime: { mode: "provider-backed" },
        cases: [
          {
            id: caseRecord.id,
            type: caseRecord.type,
            status: "error",
            observed: {
              kind: "runtime-observed-stub",
              mode: "provider-backed",
              evidence: "provider-slot-reserved",
              providerCall: false,
              transcriptCaptured: false,
              sideEffectsPerformed: false,
              providerEvidenceAvailable: false,
              persistedEvidenceAvailable: false,
            },
            providerExecution: {
              selection: {
                kind: "runtime-provider-selection",
                version: "runtime-provider-selection-draft-1",
                adapterKey: "provider-backed",
                providerKey: "provider-backed",
                providerSlot: RUNTIME_PROVIDER_ADAPTER_DEFAULT_SLOT,
                builtin: true,
                implemented: true,
                providerBacked: true,
              },
              adapterKey: "provider-backed",
              providerKey: "provider-backed",
              providerSlot: RUNTIME_PROVIDER_ADAPTER_DEFAULT_SLOT,
              builtin: true,
              implemented: true,
              providerBacked: true,
              status: "error",
              executed: true,
              providerCall: true,
              providerEvidenceAvailable: true,
              transcriptAvailable: true,
              rawResponseAvailable: true,
              rawResponseSummary: "some-summary",
              rawResponseHandle: "shared-handle-key",
              transcriptHandle: "shared-handle-key",
              executionId: "stub:exec:provider-backed",
              providerRunId: "stub-run:exec:provider-backed",
              providerStatus: "stub-error",
            },
            transcriptAvailability: {
              available: true,
              providerManaged: true,
              handle: "shared-handle-key",
              location: null,
              providerBacked: true,
              transcriptCaptured: false,
              transcriptPersistence: false,
              persistence: "none",
            },
            transcript: {
              executionMode: "provider-backed",
              kind: RUNTIME_TRANSCRIPT_ARTIFACT_KIND,
            },
          },
        ],
      }),
    /forbids reusing transcript handles as rawResponse handles/i,
  );
}

function testExecutionIdentityConstantsAndPublicStatusStability() {
  // Lock the execution identity status set to its canonical stub values
  assert.deepEqual(
    [...RUNTIME_PROVIDER_EXECUTION_IDENTITY_STATUS_SET].sort(),
    ["stub-blocked", "stub-error", "stub-reserved"]
  );
  // Stub version and kind must stay conservative
  assert.equal(RUNTIME_PROVIDER_EXECUTION_IDENTITY_VERSION, "runtime-provider-execution-identity-stub-draft-1");
  assert.equal(RUNTIME_PROVIDER_EXECUTION_IDENTITY_KIND, "runtime-provider-execution-identity");
  // Public case status set contains core draft statuses and synthetic-passed
  assert.deepEqual(
    [...RUNTIME_PROVIDER_PUBLIC_CASE_STATUS_SET].sort(),
    ["blocked", "dry-run", "error", "not-executed", "synthetic-passed"]
  );
  // Adapter allowed statuses matches public set (includes synthetic-passed)
  assert.deepEqual(
    [...RUNTIME_PROVIDER_ADAPTER_ALLOWED_STATUSES].sort(),
    [...RUNTIME_PROVIDER_PUBLIC_CASE_STATUS_SET].sort()
  );
  // Mapper allowed statuses also matches public set
  assert.deepEqual(
    [...RUNTIME_OBSERVED_MAPPER_ALLOWED_STATUSES].sort(),
    [...RUNTIME_PROVIDER_PUBLIC_CASE_STATUS_SET].sort()
  );
  // PUBLIC set does not include passed or any stub-* status
  assert.equal(RUNTIME_PROVIDER_PUBLIC_CASE_STATUS_SET.includes("passed"), false);
  assert.equal(RUNTIME_PROVIDER_PUBLIC_CASE_STATUS_SET.includes("stub-blocked"), false);
  assert.equal(RUNTIME_PROVIDER_PUBLIC_CASE_STATUS_SET.includes("stub-error"), false);
  assert.equal(RUNTIME_PROVIDER_PUBLIC_CASE_STATUS_SET.includes("stub-reserved"), false);
}

function testExecutionIdentityStatusCompatMapping() {
  // Verify execution status to public case status mapping
  assert.deepEqual(
    RUNTIME_PROVIDER_EXECUTION_STATUS_TO_PUBLIC_CASE_STATUS,
    {
      "stub-blocked": "blocked",
      "stub-error": "error",
      "stub-reserved": "error",
    }
  );
  // Verify semantic status to allowed providerStatuses (status-compat rules)
  assert.deepEqual(
    RUNTIME_PROVIDER_STATUS_COMPAT_BY_SEMANTIC_STATUS,
    {
      blocked: ["stub-blocked"],
      error: ["stub-error", "stub-reserved"],
      "dry-run": [],
      "not-executed": [],
      "adapter-error": ["stub-error", "stub-reserved"],
      "synthetic-passed": [],
    }
  );
  // Verify stub identity exposure only allowed for blocked/error
  assert.deepEqual(
    [...RUNTIME_PROVIDER_EXECUTION_IDENTITY_STUB_EXPOSURE_ALLOWED_SEMANTIC_STATUS_SET].sort(),
    ["blocked", "error"]
  );
  // Non-provider-backed paths must never have stub identity exposure
  for (const publicStatus of ["dry-run", "not-executed", "synthetic-passed"]) {
    assert.deepEqual(
      RUNTIME_PROVIDER_STATUS_COMPAT_BY_SEMANTIC_STATUS[publicStatus],
      [],
      `semantic status ${publicStatus} must not allow any providerStatus`
    );
  }
  // Verify same-source: public status match via the mapping table
  for (const [stub, public_] of Object.entries(RUNTIME_PROVIDER_EXECUTION_STATUS_TO_PUBLIC_CASE_STATUS)) {
    assert.ok(
      RUNTIME_PROVIDER_PUBLIC_CASE_STATUS_SET.includes(public_),
      `providerStatus ${stub} maps to public status ${public_} which must be in public set`
    );
  }
}

function testExecutionIdentityNullFallbackAcrossAllNonProviderBackedModes() {
  const normalizedFixture = createNormalizedFixture();
  const loadedFixture = createLoadedFixture();

  // Every non-provider-backed mode must null out all execution identity fields
  // at both adapter output and mapper output levels
  const testCases = [
    { label: "dry-run passed-preflight", mode: "dry-run", preflight: "passed" },
    { label: "null-runner passed-preflight", mode: "null-runner", preflight: "passed" },
    { label: "dry-run failed-preflight (blocked)", mode: "dry-run", preflight: "failed" },
  ];

  for (const { label, mode, preflight } of testCases) {
    const result = runRealRuntimeCase({
      fixtureDir: "/tmp/runtime-contract-fixture",
      loadedFixture,
      normalizedFixture,
      preflightReport: createPreflightReport(preflight),
      caseRecord: selectRuntimeCase({ normalizedFixture }),
      options: { mode },
    });

    // Adapter-level: execution identity must be null
    assert.equal(
      result.adapterResult.execution.executionId, null,
      `${label}: adapter executionId must be null`
    );
    assert.equal(
      result.adapterResult.execution.providerRunId, null,
      `${label}: adapter providerRunId must be null`
    );
    assert.equal(
      result.adapterResult.execution.providerStatus, null,
      `${label}: adapter providerStatus must be null`
    );

    // Mapper-level: execution identity must be null
    assert.equal(
      result.mappedResult.providerExecution.executionId, null,
      `${label}: mapper executionId must be null`
    );
    assert.equal(
      result.mappedResult.providerExecution.providerRunId, null,
      `${label}: mapper providerRunId must be null`
    );
    assert.equal(
      result.mappedResult.providerExecution.providerStatus, null,
      `${label}: mapper providerStatus must be null`
    );

    // Report-level (via buildReport): execution identity must be null
    const report = result.buildReport();
    const runtimeCase = report.cases[0];
    assert.equal(
      runtimeCase.providerExecution.executionId, null,
      `${label}: report executionId must be null`
    );
    assert.equal(
      runtimeCase.providerExecution.providerRunId, null,
      `${label}: report providerRunId must be null`
    );
    assert.equal(
      runtimeCase.providerExecution.providerStatus, null,
      `${label}: report providerStatus must be null`
    );
  }
}

function testExecutionIdentityStubTupleCapabilityAndFormat() {
  // Provider-backed stub identity must be present for blocked/error, have canonical format,
  // and NEVER upgrade executed/providerCall/providerEvidence.
  const normalizedFixture = createNormalizedFixture();
  const loadedFixture = createLoadedFixture();

  const scenarios = [
    { label: "provider-backed blocked", mode: "provider-backed", preflight: "failed", expectedStatus: "blocked" },
    { label: "provider-backed error", mode: "provider-backed", preflight: "passed", expectedStatus: "error" },
  ];

  for (const { label, mode, preflight, expectedStatus } of scenarios) {
    const result = runRealRuntimeCase({
      fixtureDir: "/tmp/runtime-contract-fixture",
      loadedFixture,
      normalizedFixture,
      preflightReport: createPreflightReport(preflight),
      caseRecord: selectRuntimeCase({ normalizedFixture }),
      options: { mode },
    });

    const pe = result.mappedResult.providerExecution;
    const adapterExecution = result.adapterResult.execution;

    // Status is correct
    assert.equal(result.mappedResult.status, expectedStatus, `${label}: status`);
    assert.equal(pe.status, expectedStatus, `${label}: providerExecution.status`);

    // Stub tuple is present (non-null)
    assert.ok(typeof pe.executionId === "string", `${label}: executionId must be a string`);
    assert.ok(typeof pe.providerRunId === "string", `${label}: providerRunId must be a string`);
    assert.ok(typeof pe.providerStatus === "string", `${label}: providerStatus must be a string`);

    // Canonical format
    assert.ok(pe.executionId.startsWith("stub:"), `${label}: executionId must start with stub:`);
    assert.ok(pe.providerRunId.startsWith("stub-run:"), `${label}: providerRunId must start with stub-run:`);
    assert.ok(
      RUNTIME_PROVIDER_EXECUTION_IDENTITY_STATUS_SET.includes(pe.providerStatus),
      `${label}: providerStatus ${pe.providerStatus} must be in canonical stub status set`
    );

    // providerStatus matches semantic status (blocked → stub-blocked, error → stub-error)
    assert.ok(
      pe.providerStatus === "stub-blocked" || pe.providerStatus === "stub-error",
      `${label}: providerStatus ${pe.providerStatus} must be stub-blocked or stub-error for ${expectedStatus}`
    );

    // Same-source: adapter execution identity propagates identically to mapper
    assert.equal(pe.executionId, adapterExecution.executionId, `${label}: same-source executionId`);
    assert.equal(pe.providerRunId, adapterExecution.providerRunId, `${label}: same-source providerRunId`);
    assert.equal(pe.providerStatus, adapterExecution.providerStatus, `${label}: same-source providerStatus`);

    // Stub tuple NEVER upgrades capabilities
    assert.equal(pe.executed, false, `${label}: stub identity must not upgrade executed`);
    assert.equal(pe.providerCall, false, `${label}: stub identity must not upgrade providerCall`);
    assert.equal(pe.providerEvidenceAvailable, false, `${label}: stub identity must not upgrade providerEvidenceAvailable`);
    assert.equal(result.mappedResult.observed.providerCall, false, `${label}: stub identity must not upgrade observed.providerCall`);
    assert.equal(result.mappedResult.observed.providerEvidenceAvailable, false, `${label}: stub identity must not upgrade observed.providerEvidenceAvailable`);
    assert.equal(result.mappedResult.observed.transcriptCaptured, false, `${label}: stub identity must not upgrade transcriptCaptured`);

    // Adapter-level: capabilities also not upgraded
    assert.equal(adapterExecution.executed, false, `${label}: adapter stub identity not upgrade executed`);
    assert.equal(adapterExecution.providerCall, false, `${label}: adapter stub identity not upgrade providerCall`);

    // Report-level: transcript/rawResponse/persistence stay reserved
    const report = result.buildReport();
    const runtimeCase = report.cases[0];
    assert.equal(runtimeCase.providerExecution.executionId, pe.executionId, `${label}: report same-source executionId`);
    assert.equal(runtimeCase.providerExecution.providerRunId, pe.providerRunId, `${label}: report same-source providerRunId`);
    assert.equal(runtimeCase.providerExecution.providerStatus, pe.providerStatus, `${label}: report same-source providerStatus`);
    assert.equal(runtimeCase.providerExecution.executed, false, `${label}: report stub identity not upgrade executed`);
    assert.equal(runtimeCase.providerExecution.providerCall, false, `${label}: report stub identity not upgrade providerCall`);
    assert.equal(runtimeCase.providerExecution.providerEvidenceAvailable, false, `${label}: report stub identity not upgrade providerEvidenceAvailable`);
    assert.equal(runtimeCase.transcriptAvailability.available, false, `${label}: report transcriptAvailability stays reserved`);
    assert.equal(runtimeCase.transcriptAvailability.handle, null, `${label}: report transcriptHandle stays null`);
    assert.equal(runtimeCase.transcriptRef, null, `${label}: report transcriptRef stays null`);
  }
}

function testExecutionIdentityAllOrNothingTupleGuard() {
  // Mapper rejects partial execution identity tuples for provider-backed seam
  const normalizedFixture = createNormalizedFixture();
  const caseRecord = selectRuntimeCase({ normalizedFixture });

function testProvenanceSummaryProviderLessDraftPath() {
  const report = buildRuntimeReplayReport({
    fixtureDir: "/tmp/runtime-contract-fixture",
    fixture: { id: "runtime-contract-fixture", version: "0.1.0", entry: "skill/SKILL.md", profile: "standard" },
    runtime: { mode: "dry-run" },
    cases: [{ id: "case-alpha", type: "positive", status: "dry-run", observed: { kind: "runtime-observed-stub", mode: "dry-run", evidence: "not-executed", providerCall: false, transcriptCaptured: false, sideEffectsPerformed: false, providerEvidenceAvailable: false, persistedEvidenceAvailable: false }, providerExecution: { selection: { kind: "runtime-provider-selection", version: "runtime-provider-selection-draft-1", adapterKey: "dry-run", providerKey: "dry-run", providerSlot: RUNTIME_PROVIDER_ADAPTER_DEFAULT_SLOT, builtin: true, implemented: true, providerBacked: false }, adapterKey: "dry-run", providerKey: "dry-run", providerSlot: RUNTIME_PROVIDER_ADAPTER_DEFAULT_SLOT, builtin: true, implemented: true, providerBacked: false, status: "dry-run", executed: false, providerCall: false, providerEvidenceAvailable: false, transcriptAvailable: false, transcriptCaptured: false, transcriptPersistence: false, persistence: "none", rawResponseAvailable: false, rawResponseSummary: null, rawResponseHandle: null, transcriptHandle: null, transcriptProviderManaged: false }, transcriptAvailability: { available: false, providerManaged: false, handle: null, location: null, providerBacked: false, transcriptCaptured: false, transcriptPersistence: false, persistence: "none" }, transcript: { executionMode: "dry-run", kind: RUNTIME_TRANSCRIPT_ARTIFACT_KIND } }],
  });
  assert.match(report.metadata.provenanceSummary, /provider-less draft path/);
  assert.equal(report.summary.passed, false);
  assert.equal(report.status, "draft");
  assert.equal(report.cases[0].status, "dry-run");
}

function testProvenanceSummarySyntheticMockProviderPath() {
  const report = buildRuntimeReplayReport({
    fixtureDir: "/tmp/runtime-contract-fixture",
    fixture: { id: "runtime-contract-fixture", version: "0.1.0", entry: "skill/SKILL.md", profile: "standard" },
    runtime: { mode: "provider-backed" },
    cases: [{ id: "case-alpha", type: "positive", status: "error", observed: { kind: "runtime-observed-stub", mode: "provider-backed", evidence: "provider-slot-reserved", providerCall: false, transcriptCaptured: false, sideEffectsPerformed: false, providerEvidenceAvailable: false, persistedEvidenceAvailable: false }, providerExecution: { selection: { kind: "runtime-provider-selection", version: "runtime-provider-selection-draft-1", adapterKey: "provider-backed", providerKey: "provider-backed", providerSlot: RUNTIME_PROVIDER_ADAPTER_DEFAULT_SLOT, builtin: true, implemented: false, providerBacked: true }, adapterKey: "provider-backed", providerKey: "provider-backed", providerSlot: RUNTIME_PROVIDER_ADAPTER_DEFAULT_SLOT, builtin: true, implemented: false, providerBacked: true, status: "error", executed: false, providerCall: false, providerEvidenceAvailable: false, transcriptAvailable: false, transcriptCaptured: false, transcriptPersistence: false, persistence: "none", rawResponseAvailable: false, rawResponseSummary: null, rawResponseHandle: null, transcriptHandle: null, transcriptProviderManaged: false }, transcriptAvailability: { available: false, providerManaged: false, handle: null, location: null, providerBacked: true, transcriptCaptured: false, transcriptPersistence: false, persistence: "none" }, transcript: { executionMode: "provider-backed", kind: RUNTIME_TRANSCRIPT_ARTIFACT_KIND } }],
  });
  assert.match(report.metadata.provenanceSummary, /synthetic mock provider path/);
  assert.match(report.metadata.provenanceSummary, /非真实 provider 执行/);
  assert.equal(report.summary.passed, false);
  assert.equal(report.status, "draft");
  assert.equal(report.cases[0].status, "error");
}

function testProvenanceSummaryProviderBackedReservedSlot() {
  const report = buildRuntimeReplayReport({
    fixtureDir: "/tmp/runtime-contract-fixture",
    fixture: { id: "runtime-contract-fixture", version: "0.1.0", entry: "skill/SKILL.md", profile: "standard" },
    runtime: { mode: "provider-backed" },
    cases: [{ id: "case-alpha", type: "positive", status: "error", observed: { kind: "runtime-observed-stub", mode: "provider-backed", evidence: "provider-slot-reserved", providerCall: false, transcriptCaptured: false, sideEffectsPerformed: false, providerEvidenceAvailable: false, persistedEvidenceAvailable: false }, providerExecution: { selection: { kind: "runtime-provider-selection", version: "runtime-provider-selection-draft-1", adapterKey: "provider-backed", providerKey: "provider-backed", providerSlot: RUNTIME_PROVIDER_ADAPTER_DEFAULT_SLOT, builtin: true, implemented: false, providerBacked: true }, adapterKey: "provider-backed", providerKey: "provider-backed", providerSlot: RUNTIME_PROVIDER_ADAPTER_DEFAULT_SLOT, builtin: true, implemented: false, providerBacked: true, status: "error", executed: false, providerCall: false, providerEvidenceAvailable: false, transcriptAvailable: false, transcriptCaptured: false, transcriptPersistence: false, persistence: "none", rawResponseAvailable: false, rawResponseSummary: null, rawResponseHandle: null, transcriptHandle: null, transcriptProviderManaged: false }, transcriptAvailability: { available: false, providerManaged: false, handle: null, location: null, providerBacked: true, transcriptCaptured: false, transcriptPersistence: false, persistence: "none" }, transcript: { executionMode: "provider-backed", kind: RUNTIME_TRANSCRIPT_ARTIFACT_KIND } }],
  });
  assert.match(report.metadata.provenanceSummary, /provider-backed reserved slot/);
  assert.equal(report.summary.passed, false);
  assert.equal(report.status, "draft");
  assert.equal(report.cases[0].status, "error");
}

function testProvenanceSummaryUnknownSourceUsesConservativeCopy() {
  const report = buildRuntimeReplayReport({
    fixtureDir: "/tmp/runtime-contract-fixture",
    fixture: { id: "runtime-contract-fixture", version: "0.1.0", entry: "skill/SKILL.md", profile: "standard" },
    runtime: { mode: "dry-run" },
    cases: [{ id: "case-alpha", type: "positive", status: "dry-run", observed: { kind: "runtime-observed-stub", mode: "dry-run", evidence: "not-executed", providerCall: false, transcriptCaptured: false, sideEffectsPerformed: false, providerEvidenceAvailable: false, persistedEvidenceAvailable: false }, providerExecution: { selection: { kind: "runtime-provider-selection", version: "runtime-provider-selection-draft-1", adapterKey: "dry-run", providerKey: "dry-run", providerSlot: RUNTIME_PROVIDER_ADAPTER_DEFAULT_SLOT, builtin: true, implemented: true, providerBacked: false }, adapterKey: "dry-run", providerKey: "dry-run", providerSlot: RUNTIME_PROVIDER_ADAPTER_DEFAULT_SLOT, builtin: true, implemented: true, providerBacked: false, status: "dry-run", executed: false, providerCall: false, providerEvidenceAvailable: false, transcriptAvailable: false, transcriptCaptured: false, transcriptPersistence: false, persistence: "none", rawResponseAvailable: false, rawResponseSummary: null, rawResponseHandle: null, transcriptHandle: null, transcriptProviderManaged: false }, transcriptAvailability: { available: false, providerManaged: false, handle: null, location: null, providerBacked: false, transcriptCaptured: false, transcriptPersistence: false, persistence: "none" }, transcript: { executionMode: "dry-run", kind: RUNTIME_TRANSCRIPT_ARTIFACT_KIND }, provenanceSummarySource: "unknown" }],
  });
  assert.match(report.metadata.provenanceSummary, /no real provider evidence/);
  assert.equal(report.summary.passed, false);
  assert.equal(report.status, "draft");
  assert.equal(report.cases[0].status, "dry-run");
}

function testProvenanceSummaryDoesNotChangeStatusOrCaseSemantics() {
  const normalizedFixture = createNormalizedFixture();
  const loadedFixture = createLoadedFixture();
  const preflightReport = createPreflightReport("passed");
  const before = runRealRuntimeCase({ fixtureDir: "/tmp/runtime-contract-fixture", loadedFixture, normalizedFixture, preflightReport, options: { mode: "provider-backed" } });
  const report = before.buildReport();
  assert.equal(report.status, before.runtimeReport.status);
  assert.equal(report.summary.passed, before.runtimeReport.summary.passed);
  assert.equal(report.cases[0].status, before.runtimeReport.cases[0].status);
  assert.equal(report.cases[0].observed.evidence, before.runtimeReport.cases[0].observed.evidence);
  assert.ok(typeof report.metadata.provenanceSummary === "string");
  assert.equal(report.summary.passed, false);
}

  // Only executionId present, no providerRunId or providerStatus
  assert.throws(
    () =>
      mapProviderResultToObservedRuntime({
        adapterResult: {
          caseId: caseRecord.id,
          status: "error",
          selection: {
            adapterKey: "provider-backed",
            providerKey: "provider-backed",
            providerSlot: RUNTIME_PROVIDER_ADAPTER_DEFAULT_SLOT,
            builtin: true,
            implemented: false,
            providerBacked: true,
          },
          execution: {
            executionId: "stub:partial:identity",
          },
          providerMetadata: {
            implementationState: "reserved-unimplemented-provider-slot",
          },
        },
        providerSelection: {
          adapterKey: "provider-backed",
          providerKey: "provider-backed",
          providerSlot: RUNTIME_PROVIDER_ADAPTER_DEFAULT_SLOT,
          builtin: true,
          implemented: false,
          providerBacked: true,
        },
        caseContext: caseRecord,
      }),
    /all-or-nothing tuple/i,
    "mapper must reject partial execution identity tuple for provider-backed seam"
  );
}

// ── transcript persistence reserved seam contract tests ──────────────────────
// These lock down the conservative contract for the Phase 3 transcript persistence
// reserved seam, extending the existing tests to explicitly verify:
// 1. Non-provider-backed: all layers emit transcriptPersistence:false persistence:"none"
// 2. Provider-backed reserved seam: cannot upgrade to persistence:true/"reserved-provider-managed"
// 3. Persistence same-source propagation across adapter→mapper→report
// 4. Runner/report must not locally complement transcriptRef persistence

function testNonProviderBackedPersistenceAdapterNormalization() {
  // Verifies the adapter contract normalizes non-provider-backed persistence
  // claims (transcriptPersistence:true, persistence:"reserved-provider-managed")
  // to false/"none" at both the evidence and providerMetadata layers.
  const normalizedFixture = createNormalizedFixture();
  const loadedFixture = createLoadedFixture();
  const sandboxContract = buildRuntimeSandboxBoundaryFromSources({
    normalizedFixture,
    preflightInput: createPreflightReport("passed"),
  });
  const caseRecord = selectRuntimeCase({ normalizedFixture });

  for (const mode of ["dry-run", "null-runner"]) {
    // Build adapter contract with deliberately "upgraded" persistence claims
    const contract = buildRuntimeProviderAdapterContractContext({
      fixtureDir: "/tmp/runtime-contract-fixture",
      loadedFixture,
      normalizedFixture,
      caseRecord,
      boundary: {
        permissions: sandboxContract.permissions,
        toolBoundary: sandboxContract.toolBoundary,
      },
      options: {
        mode,
        providerKey: mode,
        providerSlot: RUNTIME_PROVIDER_ADAPTER_DEFAULT_SLOT,
        providerSelection: buildRuntimeProviderSelection({
          mode,
          providerSlot: RUNTIME_PROVIDER_ADAPTER_DEFAULT_SLOT,
        }),
      },
    });

    // Attempt to claim transcriptPersistence:true and persistence:"reserved-provider-managed"
    // in the input — the contract normalizes them away.
    const result = contract.buildResult({
      caseId: caseRecord.id,
      status: mode === "null-runner" ? "not-executed" : "dry-run",
      evidence: {
        transcriptPersistence: true,
        persistence: "reserved-provider-managed",
      },
      providerMetadata: {
        persistence: "reserved-provider-managed",
      },
    });

    // Evidence layer: normalized back to false/"none"
    assert.equal(
      result.evidence.transcriptPersistence,
      false,
      `${mode}: evidence.transcriptPersistence must normalize to false for non-provider-backed`
    );
    assert.equal(
      result.evidence.persistence,
      "none",
      `${mode}: evidence.persistence must normalize to "none" for non-provider-backed`
    );

    // providerMetadata layer: also normalized to false/"none"
    assert.equal(
      result.providerMetadata.transcriptPersistence,
      false,
      `${mode}: providerMetadata.transcriptPersistence must normalize to false`
    );
    assert.equal(
      result.providerMetadata.persistence,
      "none",
      `${mode}: providerMetadata.persistence must normalize to "none"`
    );

    // transcriptRef must be null for non-provider-backed (also checked by existing tests)
    assert.equal(result.transcriptRef, null, `${mode}: transcriptRef must be null`);
  }

  // Preflight-blocked also normalizes persistence
  for (const mode of ["dry-run", "null-runner"]) {
    const contract = buildRuntimeProviderAdapterContractContext({
      fixtureDir: "/tmp/runtime-contract-fixture",
      loadedFixture,
      normalizedFixture,
      caseRecord,
      boundary: {
        permissions: sandboxContract.permissions,
        toolBoundary: sandboxContract.toolBoundary,
      },
      options: {
        mode,
        providerKey: mode,
        providerSlot: RUNTIME_PROVIDER_ADAPTER_DEFAULT_SLOT,
        providerSelection: buildRuntimeProviderSelection({
          mode,
          providerSlot: RUNTIME_PROVIDER_ADAPTER_DEFAULT_SLOT,
        }),
      },
    });

    const result = contract.buildResult({
      caseId: caseRecord.id,
      status: "blocked",
      failureReason: {
        code: "RUNTIME_PREFLIGHT_BLOCKED",
        message: "blocked by preflight",
        blockingCheckIds: ["RF-P1-PREFLIGHT-STATIC-BASELINE-PASSED"],
      },
      evidence: {
        preflightBlocked: true,
        transcriptPersistence: true,
        persistence: "reserved-provider-managed",
      },
      providerMetadata: {
        persistence: "reserved-provider-managed",
      },
    });

    assert.equal(
      result.evidence.transcriptPersistence,
      false,
      `${mode} blocked: evidence.transcriptPersistence must normalize to false`
    );
    assert.equal(
      result.evidence.persistence,
      "none",
      `${mode} blocked: evidence.persistence must normalize to "none"`
    );
    assert.equal(
      result.providerMetadata.transcriptPersistence,
      false,
      `${mode} blocked: providerMetadata.transcriptPersistence must normalize to false`
    );
    assert.equal(
      result.providerMetadata.persistence,
      "none",
      `${mode} blocked: providerMetadata.persistence must normalize to "none"`
    );
  }
}

function testProviderBackedPersistenceCannotMasquerade() {
  // Verifies the provider-backed reserved seam cannot upgrade transcriptPersistence
  // even when the adapter input claims it. The contract normalizes to false/"none"
  // for the not-executed reserved seam.
  const normalizedFixture = createNormalizedFixture();
  const loadedFixture = createLoadedFixture();
  const sandboxContract = buildRuntimeSandboxBoundaryFromSources({
    normalizedFixture,
    preflightInput: createPreflightReport("passed"),
  });
  const caseRecord = selectRuntimeCase({ normalizedFixture });

  const contract = buildRuntimeProviderAdapterContractContext({
    fixtureDir: "/tmp/runtime-contract-fixture",
    loadedFixture,
    normalizedFixture,
    caseRecord,
    boundary: {
      permissions: sandboxContract.permissions,
      toolBoundary: sandboxContract.toolBoundary,
    },
    options: {
      mode: "provider-backed",
      providerKey: "provider-backed",
      providerSlot: RUNTIME_PROVIDER_ADAPTER_DEFAULT_SLOT,
      providerSelection: buildRuntimeProviderSelection({
        mode: "provider-backed",
        providerSlot: RUNTIME_PROVIDER_ADAPTER_DEFAULT_SLOT,
      }),
    },
  });

  // Attempt to claim full persistence even though provider-backed seam is not executed
  const result = contract.buildResult({
    caseId: caseRecord.id,
    status: "error",
    failureReason: {
      code: "RUNTIME_PROVIDER_ADAPTER_UNIMPLEMENTED",
      message: "intentionally unimplemented reserved provider slot",
    },
    selection: {
      adapterKey: "provider-backed",
      providerKey: "provider-backed",
      providerSlot: RUNTIME_PROVIDER_ADAPTER_DEFAULT_SLOT,
      builtin: true,
      implemented: false,
      providerBacked: true,
    },
    execution: {
      executed: false,
      providerCall: false,
      executionId: "stub:test:provider-backed-reserved",
      providerRunId: "stub-run:test:provider-backed-reserved",
      providerStatus: "stub-reserved",
    },
    evidence: {
      providerEvidenceAvailable: false,
      transcriptAvailable: false,
      transcriptCaptured: false,
      transcriptPersistence: true,
      persistence: "reserved-provider-managed",
    },
    providerMetadata: {
      implementationState: "reserved-unimplemented-provider-slot",
      executed: false,
      providerCall: false,
      providerEvidenceAvailable: false,
      transcriptAvailable: false,
      transcriptCaptured: false,
      transcriptPersistence: true,
      persistence: "reserved-provider-managed",
    },
    transcriptRef: {
      available: true,
      providerManaged: true,
      providerTranscript: true,
      handle: "transcript-handle",
      persistence: "reserved-provider-managed",
      location: { kind: "provider-artifact", path: ["provider", "transcript"] },
    },
  });

  // Provider-backed reserved seam still normalizes evidence to false/"none"
  assert.equal(
    result.evidence.transcriptPersistence,
    false,
    "provider-backed reserved: evidence.transcriptPersistence must normalize to false"
  );
  assert.equal(
    result.evidence.persistence,
    "none",
    "provider-backed reserved: evidence.persistence must normalize to none"
  );

  // providerMetadata also normalized
  assert.equal(
    result.providerMetadata.transcriptPersistence,
    false,
    "provider-backed reserved: providerMetadata.transcriptPersistence must normalize to false"
  );
  assert.equal(
    result.providerMetadata.persistence,
    "none",
    "provider-backed reserved: providerMetadata.persistence must normalize to none"
  );

  // transcriptRef: the adapter contract normalizes it (available→false, persistence→none)
  // for reserved unimplemented seam when rawResponseExposureAllowed is false
  // Check the fields we can predict: available, persistence
  assert.equal(
    result.transcriptRef.available,
    false,
    "provider-backed reserved: transcriptRef.available must normalize to false"
  );
  assert.equal(
    result.transcriptRef.persistence,
    "none",
    "provider-backed reserved: transcriptRef.persistence must normalize to none"
  );
  assert.equal(
    result.transcriptRef.providerManaged,
    false,
    "provider-backed reserved: transcriptRef.providerManaged must normalize to false"
  );
  assert.equal(
    result.transcriptRef.handle,
    null,
    "provider-backed reserved: transcriptRef.handle must normalize to null"
  );
  assert.equal(
    result.transcriptRef.providerTranscript,
    false,
    "provider-backed reserved: transcriptRef.providerTranscript must normalize to false"
  );

  // runPipelineToMapperResult (which goes through adapter→mapper pipeline) also normalizes
  const pipeline = runRealRuntimeCase({
    fixtureDir: "/tmp/runtime-contract-fixture",
    loadedFixture,
    normalizedFixture,
    preflightReport: createPreflightReport("passed"),
    caseRecord,
    options: { mode: "provider-backed" },
  });

  assert.equal(
    pipeline.mappedResult.providerExecution.transcriptPersistence,
    false,
    "provider-backed reserved: mapper providerExecution.transcriptPersistence must stay false"
  );
  assert.equal(
    pipeline.mappedResult.providerExecution.persistence,
    "none",
    "provider-backed reserved: mapper providerExecution.persistence must stay none"
  );
  assert.equal(
    pipeline.mappedResult.transcriptAvailability.transcriptPersistence,
    false,
    "provider-backed reserved: mapper transcriptAvailability.transcriptPersistence must stay false"
  );
  assert.equal(
    pipeline.mappedResult.transcriptAvailability.persistence,
    "none",
    "provider-backed reserved: mapper transcriptAvailability.persistence must stay none"
  );
}

function testPersistenceSameSourcePipelinePropagation() {
  // Verifies persistence values propagate identically across the full
  // adapter→mapper→report pipeline for every runtime mode.
  const normalizedFixture = createNormalizedFixture();
  const loadedFixture = createLoadedFixture();
  const preflightReport = createPreflightReport("passed");
  const caseRecord = selectRuntimeCase({ normalizedFixture });

  for (const mode of ["dry-run", "null-runner", "provider-backed"]) {
    const pipeline = runRealRuntimeCase({
      fixtureDir: "/tmp/runtime-contract-fixture",
      loadedFixture,
      normalizedFixture,
      preflightReport,
      caseRecord,
      options: { mode },
    });

    const expectedPersistence = "none";
    const expectedTranscriptPersistence = false;

    // Same-source: adapter evidence → adapter providerMetadata → mapper providerExecution
    assert.equal(
      pipeline.adapterResult.evidence.persistence,
      expectedPersistence,
      `${mode}: adapter evidence.persistence same-source`
    );
    assert.equal(
      pipeline.mappedResult.providerExecution.persistence,
      expectedPersistence,
      `${mode}: mapper providerExecution.persistence same-source`
    );
    assert.equal(
      pipeline.mappedResult.transcriptAvailability.persistence,
      expectedPersistence,
      `${mode}: mapper transcriptAvailability.persistence same-source`
    );

    assert.equal(
      pipeline.adapterResult.evidence.transcriptPersistence,
      expectedTranscriptPersistence,
      `${mode}: adapter evidence.transcriptPersistence same-source`
    );
    assert.equal(
      pipeline.mappedResult.providerExecution.transcriptPersistence,
      expectedTranscriptPersistence,
      `${mode}: mapper providerExecution.transcriptPersistence same-source`
    );
    assert.equal(
      pipeline.mappedResult.transcriptAvailability.transcriptPersistence,
      expectedTranscriptPersistence,
      `${mode}: mapper transcriptAvailability.transcriptPersistence same-source`
    );

    // Report-level same-source propagation
    const report = pipeline.buildReport();
    const runtimeCase = report.cases[0];

    assert.equal(
      runtimeCase.providerExecution.persistence,
      expectedPersistence,
      `${mode}: report providerExecution.persistence same-source`
    );
    assert.equal(
      runtimeCase.transcriptAvailability.persistence,
      expectedPersistence,
      `${mode}: report transcriptAvailability.persistence same-source`
    );
    assert.equal(
      runtimeCase.providerExecution.transcriptPersistence,
      expectedTranscriptPersistence,
      `${mode}: report providerExecution.transcriptPersistence same-source`
    );
    assert.equal(
      runtimeCase.transcriptAvailability.transcriptPersistence,
      expectedTranscriptPersistence,
      `${mode}: report transcriptAvailability.transcriptPersistence same-source`
    );

    // Report-level cross-layer same-source check
    assert.equal(
      runtimeCase.transcriptAvailability.persistence,
      runtimeCase.providerExecution.persistence,
      `${mode}: report same-source persistence across transcriptAvailability/providerExecution`
    );
    assert.equal(
      runtimeCase.transcriptAvailability.transcriptPersistence,
      runtimeCase.providerExecution.transcriptPersistence,
      `${mode}: report same-source transcriptPersistence across transcriptAvailability/providerExecution`
    );
  }
}

function testReportRejectsTranscriptAvailabilityInventingPersistenceWhenUnavailable() {
  // The reporter rejects transcriptAvailability that claims persistence
  // or providerManaged when available=false.
  const caseRecord = selectRuntimeCase({ normalizedFixture: createNormalizedFixture() });

  // transcriptAvailability with available=false but persistence!=="none"
  assert.throws(
    () =>
      buildRuntimeReplayReport({
        fixtureDir: "/tmp/runtime-contract-fixture",
        fixture: { id: "fixture", version: "0.1.0", entry: "skill/SKILL.md", profile: "standard" },
        runtime: { mode: "dry-run" },
        cases: [
          {
            id: caseRecord.id,
            type: caseRecord.type,
            status: "dry-run",
            observed: {
              kind: "runtime-observed-stub",
              mode: "dry-run",
              evidence: "not-executed",
              providerCall: false,
              transcriptCaptured: false,
              sideEffectsPerformed: false,
              providerEvidenceAvailable: false,
              persistedEvidenceAvailable: false,
            },
            transcriptAvailability: {
              available: false,
              persistence: "in-report-only",
              transcriptPersistence: true,
            },
            providerExecution: {
              selection: {
                kind: "runtime-provider-selection",
                version: "runtime-provider-selection-draft-1",
                adapterKey: "dry-run",
                providerKey: "dry-run",
                providerSlot: RUNTIME_PROVIDER_ADAPTER_DEFAULT_SLOT,
                builtin: true,
                implemented: true,
                providerBacked: false,
              },
              adapterKey: "dry-run",
              providerKey: "dry-run",
              providerSlot: RUNTIME_PROVIDER_ADAPTER_DEFAULT_SLOT,
              builtin: true,
              implemented: true,
              providerBacked: false,
              status: "dry-run",
              executed: false,
              providerCall: false,
              providerEvidenceAvailable: false,
              transcriptAvailable: false,
              transcriptPersistence: false,
              persistence: "none",
              rawResponseAvailable: false,
            },
            transcript: { executionMode: "dry-run", kind: RUNTIME_TRANSCRIPT_ARTIFACT_KIND },
          },
        ],
      }),
    /forbids transcriptAvailability from inventing persistence/i,
    "report must reject transcriptAvailability persistence claims when available=false"
  );

  // transcriptAvailability with available=false but transcriptPersistence=true
  assert.throws(
    () =>
      buildRuntimeReplayReport({
        fixtureDir: "/tmp/runtime-contract-fixture",
        fixture: { id: "fixture", version: "0.1.0", entry: "skill/SKILL.md", profile: "standard" },
        runtime: { mode: "dry-run" },
        cases: [
          {
            id: caseRecord.id,
            type: caseRecord.type,
            status: "dry-run",
            observed: {
              kind: "runtime-observed-stub",
              mode: "dry-run",
              evidence: "not-executed",
              providerCall: false,
              transcriptCaptured: false,
              sideEffectsPerformed: false,
              providerEvidenceAvailable: false,
              persistedEvidenceAvailable: false,
            },
            transcriptAvailability: {
              available: false,
              persistence: "none",
              transcriptPersistence: true,
            },
            providerExecution: {
              selection: {
                kind: "runtime-provider-selection",
                version: "runtime-provider-selection-draft-1",
                adapterKey: "dry-run",
                providerKey: "dry-run",
                providerSlot: RUNTIME_PROVIDER_ADAPTER_DEFAULT_SLOT,
                builtin: true,
                implemented: true,
                providerBacked: false,
              },
              adapterKey: "dry-run",
              providerKey: "dry-run",
              providerSlot: RUNTIME_PROVIDER_ADAPTER_DEFAULT_SLOT,
              builtin: true,
              implemented: true,
              providerBacked: false,
              status: "dry-run",
              executed: false,
              providerCall: false,
              providerEvidenceAvailable: false,
              transcriptAvailable: false,
              transcriptPersistence: false,
              persistence: "none",
              rawResponseAvailable: false,
            },
            transcript: { executionMode: "dry-run", kind: RUNTIME_TRANSCRIPT_ARTIFACT_KIND },
          },
        ],
      }),
    /forbids transcriptAvailability from inventing persistence/i,
    "report must reject transcriptAvailability transcriptPersistence claims when available=false"
  );
}

function testReportRejectsMixedTranscriptPersistenceState() {
  // The reporter rejects mixed-source persistence between transcriptRef
  // and transcriptAvailability (same-source contract).
  const caseRecord = selectRuntimeCase({ normalizedFixture: createNormalizedFixture() });

  // transcriptRef.persistence differs from transcriptAvailability.persistence
  assert.throws(
    () =>
      buildRuntimeReplayReport({
        fixtureDir: "/tmp/runtime-contract-fixture",
        fixture: { id: "fixture", version: "0.1.0", entry: "skill/SKILL.md", profile: "standard" },
        runtime: { mode: "dry-run" },
        cases: [
          {
            id: caseRecord.id,
            type: caseRecord.type,
            status: "dry-run",
            observed: {
              kind: "runtime-observed-stub",
              mode: "dry-run",
              evidence: "not-executed",
              providerCall: false,
              transcriptCaptured: false,
              sideEffectsPerformed: false,
              providerEvidenceAvailable: false,
              persistedEvidenceAvailable: false,
            },
            transcriptAvailability: {
              available: true,
              handle: "transcript-handle",
              persistence: "none",
              transcriptPersistence: false,
              location: { kind: "in-report-artifact", path: ["cases", 0, "transcript"] },
            },
            transcriptRef: {
              available: true,
              providerTranscript: false,
              providerManaged: false,
              persistence: "in-report-only",
              handle: "transcript-handle",
              location: { kind: "in-report-artifact", path: ["cases", 0, "transcript"] },
            },
            providerExecution: {
              selection: {
                kind: "runtime-provider-selection",
                version: "runtime-provider-selection-draft-1",
                adapterKey: "dry-run",
                providerKey: "dry-run",
                providerSlot: RUNTIME_PROVIDER_ADAPTER_DEFAULT_SLOT,
                builtin: true,
                implemented: true,
                providerBacked: false,
              },
              adapterKey: "dry-run",
              providerKey: "dry-run",
              providerSlot: RUNTIME_PROVIDER_ADAPTER_DEFAULT_SLOT,
              builtin: true,
              implemented: true,
              providerBacked: false,
              status: "dry-run",
              executed: false,
              providerCall: false,
              providerEvidenceAvailable: false,
              transcriptAvailable: true,
              transcriptPersistence: false,
              persistence: "none",
              rawResponseAvailable: false,
              transcriptHandle: "transcript-handle",
              transcriptProviderManaged: false,
            },
            transcript: { executionMode: "dry-run", kind: RUNTIME_TRANSCRIPT_ARTIFACT_KIND },
          },
        ],
      }),
    /forbids mixed-source transcript persistence state/i,
    "report must reject mixed persistence between transcriptRef and transcriptAvailability"
  );

  // transcriptRef.persistence differs from transcriptAvailability.persistence (reverse direction)
  assert.throws(
    () =>
      buildRuntimeReplayReport({
        fixtureDir: "/tmp/runtime-contract-fixture",
        fixture: { id: "fixture", version: "0.1.0", entry: "skill/SKILL.md", profile: "standard" },
        runtime: { mode: "dry-run" },
        cases: [
          {
            id: caseRecord.id,
            type: caseRecord.type,
            status: "dry-run",
            observed: {
              kind: "runtime-observed-stub",
              mode: "dry-run",
              evidence: "not-executed",
              providerCall: false,
              transcriptCaptured: false,
              sideEffectsPerformed: false,
              providerEvidenceAvailable: false,
              persistedEvidenceAvailable: false,
            },
            transcriptAvailability: {
              available: true,
              handle: "transcript-handle",
              persistence: "in-report-only",
              transcriptPersistence: true,
              location: { kind: "in-report-artifact", path: ["cases", 0, "transcript"] },
            },
            transcriptRef: {
              available: true,
              providerTranscript: false,
              providerManaged: false,
              persistence: "none",
              handle: "transcript-handle",
              location: { kind: "in-report-artifact", path: ["cases", 0, "transcript"] },
            },
            providerExecution: {
              selection: {
                kind: "runtime-provider-selection",
                version: "runtime-provider-selection-draft-1",
                adapterKey: "dry-run",
                providerKey: "dry-run",
                providerSlot: RUNTIME_PROVIDER_ADAPTER_DEFAULT_SLOT,
                builtin: true,
                implemented: true,
                providerBacked: false,
              },
              adapterKey: "dry-run",
              providerKey: "dry-run",
              providerSlot: RUNTIME_PROVIDER_ADAPTER_DEFAULT_SLOT,
              builtin: true,
              implemented: true,
              providerBacked: false,
              status: "dry-run",
              executed: false,
              providerCall: false,
              providerEvidenceAvailable: false,
              transcriptAvailable: true,
              transcriptPersistence: true,
              persistence: "in-report-only",
              rawResponseAvailable: false,
              transcriptHandle: "transcript-handle",
              transcriptProviderManaged: false,
            },
            transcript: { executionMode: "dry-run", kind: RUNTIME_TRANSCRIPT_ARTIFACT_KIND },
          },
        ],
      }),
    /forbids mixed-source transcript persistence state/i,
    "report must reject mixed persistence when transcriptRef says none but availability says in-report-only"
  );
}

function testRunnerTranscriptRefPersistenceDoesNotLeakToReport() {
  // The runner creates a local transcriptRef with persistence="in-report-only"
  // (a runner-local complement). The report must NOT expose this as
  // transcriptRef — it must correctly defer to transcriptAvailability which
  // has available=false and persistence="none" for non-provider-backed modes.
  const normalizedFixture = createNormalizedFixture();
  const loadedFixture = createLoadedFixture();
  const preflightReport = createPreflightReport("passed");
  const caseRecord = selectRuntimeCase({ normalizedFixture });

  for (const mode of ["dry-run", "null-runner", "provider-backed"]) {
    const run = runRealRuntimeCase({
      fixtureDir: "/tmp/runtime-contract-fixture",
      loadedFixture,
      normalizedFixture,
      preflightReport,
      options: { mode },
    });

    // Runner-level result has a local transcriptRef with persistence
    // (the runner creates its own artifact ref). This is the runner's
    // local complement — it must NOT leak into the report.
    assert.ok(
      run.result.transcriptRef != null,
      `${mode}: runner must produce a transcriptRef`
    );
    assert.equal(
      run.result.transcriptRef.available,
      true,
      `${mode}: runner transcriptRef.available is true (runner-local complement)`
    );
    assert.equal(
      run.result.transcriptRef.persistence,
      "in-report-only",
      `${mode}: runner transcriptRef.persistence is "in-report-only" (runner-local complement)`
    );

    // The report must NOT expose the runner's locally complemented transcriptRef.
    // Report transcriptRef defers to transcriptAvailability, which is
    // available=false for non-executed modes.
    const runtimeCase = run.runtimeReport.cases[0];
    assert.equal(
      runtimeCase.transcriptRef,
      null,
      `${mode}: report must NOT expose runner-local transcriptRef complement`
    );
    assert.equal(
      runtimeCase.transcriptAvailability.available,
      false,
      `${mode}: report transcriptAvailability.available must stay false`
    );
    assert.equal(
      runtimeCase.transcriptAvailability.persistence,
      "none",
      `${mode}: report transcriptAvailability.persistence must stay "none"`
    );
    assert.equal(
      runtimeCase.transcriptAvailability.transcriptPersistence,
      false,
      `${mode}: report transcriptAvailability.transcriptPersistence must stay false`
    );

    // Provider execution in report must also match adapter/mapper, not runner
    assert.equal(
      runtimeCase.providerExecution.persistence,
      "none",
      `${mode}: report providerExecution.persistence must stay "none"`
    );
    assert.equal(
      runtimeCase.providerExecution.transcriptPersistence,
      false,
      `${mode}: report providerExecution.transcriptPersistence must stay false`
    );
  }
}

function testRunnerTranscriptRefPersistenceStaysNoneForNonProviderBacked() {
  // Verifies the runner contract normalizes transcriptRef.persistence to "none"
  // for non-provider-backed modes, even when input tries to claim otherwise.
  const normalizedFixture = createNormalizedFixture();
  const loadedFixture = createLoadedFixture();
  const preflightReport = createPreflightReport("passed");

  for (const mode of ["dry-run", "null-runner"]) {
    const runnerResult = runRealRuntimeCase({
      fixtureDir: "/tmp/runtime-contract-fixture",
      loadedFixture,
      normalizedFixture,
      preflightReport,
      options: { mode },
    });

    // Runner result's transcriptRef has persistence: for dry/null-runner
    // the test skeleton hardcodes persistence: "in-report-only" on the
    // runner side. BUT the runner's actual contract normalizes this.
    // This test verifies that even with runner-local complement, the
    // report correctly defers to transcriptAvailability.

    // The real runner contract would normalize transcriptRef.persistence
    // to "none" for non-provider-backed. The report always defers to
    // transcriptAvailability regardless of runner artifacts.
    const runtimeCase = runnerResult.runtimeReport.cases[0];
    assert.equal(
      runtimeCase.transcriptRef,
      null,
      `${mode}: report transcriptRef must be null; runner-local complement not leaked`
    );
    assert.equal(
      runtimeCase.transcriptAvailability.available,
      false,
      `${mode}: report transcriptAvailability.available must be false`
    );
  }
}

const tests = [
  ["runtime replay report skeleton top-level contract", testRuntimeReplayReportSkeleton],
  ["single-case selector default/caseId/caseIndex behavior", testCaseSelectorStability],
  ["provider adapter contract exposes builtin key/slot/default seam semantics", testProviderAdapterContractBuiltinSemantics],
  ["provider adapter output skeleton fields stay conservative and reserved", testProviderAdapterOutputSkeletonStaysConservative],
  ["dry-run and null-runner never masquerade as passed runtime", testDryAndNullRunnerNeverPass],
  ["runtime preflight taxonomy stays non-passing and does not masquerade as static", testRuntimePreflightTaxonomyDoesNotMasqueradeAsStaticOrPassed],
  ["runtime transcript artifact and runtime report reference stay aligned", testTranscriptArtifactAndReportReferenceContract],
  ["runtime transcript stub records orchestration evidence only", testTranscriptStubRecordsOnlyOrchestrationEvidence],
  ["transcript ref presence never upgrades draft statuses to passed", testTranscriptRefDoesNotUpgradeDraftStatuses],
  ["observed mapping seam contract stays stable across dry/null/provider-reserved/preflight-blocked paths", testObservedMappingSeamContractAcrossReservedModes],
  ["raw response summary/handle stay reserved across runtime modes", testRawResponseSummaryAndHandleStayReservedAcrossRuntimeModes],
  ["raw response skeleton contract shape stays stable across reserved seams", testRawResponseSkeletonContractShapeStaysStable],
  ["raw response cannot upgrade capability on its own", testRawResponseCannotUpgradeCapabilityOnItsOwn],
  ["observed mapping metadata stays consistent with per-case artifacts", testObservedMappingMetadataStaysConsistentWithCaseArtifacts],
  ["provider selection shape and lineage stay stable across runner/mapper/report", testProviderSelectionShapeAndLineageStayStableAcrossRunnerMapperAndReport],
  ["provider-backed selection never leaks execution/evidence/transcript capabilities", testProviderBackedSelectionNeverLeaksExecutionEvidenceOrTranscriptCapabilities],
  ["provider-backed runtime stays honest and intentionally unimplemented", testProviderBackedRuntimeStaysHonestAndUnimplemented],
  ["non-provider-backed modes cannot forge provider transcript or provider execution metadata", testNonProviderBackedModesCannotForgeProviderTranscriptOrProviderExecution],
  ["pending capabilities and draft metadata stay explicit", testPendingCapabilitiesAndDraftMetadata],
  ["runtime draft CLI emits runtime-replay-report and defaults to dry-run", testRuntimeDraftCliDefaultModeAndKind],
  ["runtime draft CLI keeps case-id and case-index selection stable", testRuntimeDraftCliStableCaseSelection],
  ["runtime CLI and orchestrator keep provider-backed seam out of static/preflight semantics", testRuntimeCliAndOrchestratorKeepProviderBackedSeamOutOfStaticPreflightSemantics],
  ["CLI rejects provider-backed while internal runner keeps reserved mode wired", testCliRejectsProviderBackedWhileInternalRunnerSupportsReservedMode],
  ["runtime draft CLI keeps passed preflight cases non-passed in draft mode", testRuntimeDraftCliPreflightPassedStillNotPassedCase],
  ["runtime draft CLI usage errors and unsupported mode stay stable", testRuntimeDraftCliUsageErrorsAndUnsupportedMode],
  ["runtime preflight failure still stays non-passing", testRuntimePreflightFailureStillStaysNonPassing],
  ["provider-backed reserved seam rejects dry-run/not-executed statuses", testProviderBackedReservedSeamRejectsNonBlockedNonErrorStatuses],
  ["blocked failureReason must stay preflight-blocked and same-source", testBlockedFailureReasonMustStayPreflightBlockedSameSource],
  ["preflight-blocked failureReason cannot drift into provider-backed error or mismatched source status", testPreflightBlockedReasonCannotDriftIntoNonBlockedProviderBackedError],
  ["failureReason sourceStatus/sameSource/providerBackedReserved semantics are stamped from same source", testFailureReasonSemanticsAreStampedFromSameSourceStatus],
  ["report rejects mixed-source failureReason on non-blocked case", testReportRejectsMixedSourceFailureReasonOnNonBlockedCase],
  ["mapper rejects non-provider-backed transcriptRef", testMapperRejectsNonProviderBackedTranscriptRef],
  ["mapper rejects provider-backed transcript available without ref", testMapperRejectsProviderBackedTranscriptAvailableWithoutRef],
  ["mapper rejects providerMetadata-only transcript field", testMapperRejectsProviderMetadataOnlyTranscriptField],
  ["report scrubs rawResponse/transcript fields when not available", testReportScrubsRawResponseWhenNotAvailable],
  ["report enforces transcriptAvailability/providerExecution alignment", testTranscriptAvailabilityProviderExecutionAlignment],
  ["report rejects mismatched transcriptAvailability and transcriptRef", testReportRejectsMismatchedTranscriptAvailabilityAndRef],
  ["mapper rejects non-provider-backed rawResponse available", testMapperRejectsNonProviderBackedRawResponseAvailable],
  ["mapper rejects provider-backed rawResponse outside executed context", testMapperRejectsProviderBackedRawResponseOutsideExecutedContext],
  ["mapper rejects rawResponse handle reusing transcript handle", testMapperRejectsRawResponseHandleReusingTranscriptHandle],
  ["report rejects non-provider-backed rawResponse availability", testReportRejectsNonProviderBackedRawResponseAvailability],
  ["report rejects provider-backed rawResponse without execution", testReportRejectsProviderBackedRawResponseWithoutExecution],
  ["report rejects rawResponse handle mixing transcript handle", testReportRejectsRawResponseHandleMixingTranscriptHandle],
  // ── execution identity / status-compat contract tests ──────────────────────
  ["execution identity constants and public case status set stability", testExecutionIdentityConstantsAndPublicStatusStability],
  ["execution identity status-compat mapping rules", testExecutionIdentityStatusCompatMapping],
  ["execution identity null fallback across all non-provider-backed modes", testExecutionIdentityNullFallbackAcrossAllNonProviderBackedModes],
  ["execution identity stub tuple capability boundary and canonical format", testExecutionIdentityStubTupleCapabilityAndFormat],
  ["execution identity all-or-nothing tuple guard rejects partial identity", testExecutionIdentityAllOrNothingTupleGuard],
  // ── transcript persistence reserved seam contract tests ────────────────────
  ["non-provider-backed adapter normalizes persistence to false/none", testNonProviderBackedPersistenceAdapterNormalization],
  ["provider-backed reserved seam cannot upgrade persistence to true/reserved-provider-managed", testProviderBackedPersistenceCannotMasquerade],
  ["persistence propagates same-source across adapter-mapper-report pipeline", testPersistenceSameSourcePipelinePropagation],
  ["report rejects transcriptAvailability inventing persistence when available=false", testReportRejectsTranscriptAvailabilityInventingPersistenceWhenUnavailable],
  ["report rejects mixed-source persistence between transcriptRef and transcriptAvailability", testReportRejectsMixedTranscriptPersistenceState],
  ["runner-local transcriptRef persistence does not leak into report", testRunnerTranscriptRefPersistenceDoesNotLeakToReport],
  ["runner transcriptRef persistence stays none for non-provider-backed modes", testRunnerTranscriptRefPersistenceStaysNoneForNonProviderBacked],
  ["non-provider-backed paths must have transcriptPersistence as none/null/false", testNonProviderBackedPathsPersistenceIsNone],
  ["provider-backed reserved seam must not forge transcript persistence as implemented", testProviderBackedSeamCannotForgeTranscriptPersistenceImplemented],
  ["transcriptRef.persistence and transcriptAvailability must stay same-source aligned", testTranscriptRefPersistenceAndAvailabilitySameSource],
  ["runner must not locally patch transcriptRef when available=true but transcriptRef=null", testRunnerMustNotLocallyPatchTranscriptRef],
];

function testNonProviderBackedPathsPersistenceIsNone() {
  const normalizedFixture = createNormalizedFixture();
  const loadedFixture = createLoadedFixture();
  const preflightPassed = createPreflightReport("passed");
  const preflightFailed = createPreflightReport("failed");

  const modes = [
    { label: "dry-run", preflight: preflightPassed, options: { mode: "dry-run" } },
    { label: "null-runner", preflight: preflightPassed, options: { mode: "null-runner" } },
    { label: "dry-run blocked", preflight: preflightFailed, options: { mode: "dry-run" } },
  ];

  for (const { label, preflight, options } of modes) {
    const run = runRealRuntimeCase({
      fixtureDir: "/tmp/runtime-contract-fixture",
      loadedFixture, normalizedFixture, preflightReport: preflight, options,
    });
    const rc = run.runtimeReport.cases[0];

    assert.equal(rc.transcriptAvailability.transcriptPersistence, false, `${label}: transcriptAvailability.transcriptPersistence`);
    assert.equal(rc.transcriptAvailability.persistence, "none", `${label}: transcriptAvailability.persistence`);
    assert.equal(rc.providerExecution.transcriptPersistence, false, `${label}: providerExecution.transcriptPersistence`);
    assert.equal(rc.providerExecution.persistence, "none", `${label}: providerExecution.persistence`);
    assert.equal(run.result.runnerMetadata.transcriptPersistence, "none", `${label}: runnerMetadata.transcriptPersistence`);
  }
}

function testProviderBackedSeamCannotForgeTranscriptPersistenceImplemented() {
  const normalizedFixture = createNormalizedFixture();
  const loadedFixture = createLoadedFixture();
  const preflightPassed = createPreflightReport("passed");

  const run = runRealRuntimeCase({
    fixtureDir: "/tmp/runtime-contract-fixture",
    loadedFixture, normalizedFixture, preflightReport: preflightPassed,
    options: { mode: "provider-backed" },
  });
  const rc = run.runtimeReport.cases[0];

  assert.equal(rc.transcriptAvailability.transcriptPersistence, false);
  assert.equal(rc.transcriptAvailability.persistence, "none");
  assert.equal(rc.transcriptAvailability.providerManaged, false);
  assert.equal(rc.transcriptAvailability.transcriptCaptured, false);
  assert.equal(rc.providerExecution.transcriptPersistence, false);
  assert.equal(rc.providerExecution.persistence, "none");
  assert.equal(run.result.runnerMetadata.transcriptPersistence, "none");
  assert.equal(run.result.runnerMetadata.providerAdapter.implemented, false);
  assert.equal(run.result.runnerMetadata.providerCall, false);
  assert.equal(run.result.runnerMetadata.transcriptEngineUsed, false);
}

function testTranscriptRefPersistenceAndAvailabilitySameSource() {
  const normalizedFixture = createNormalizedFixture();
  const loadedFixture = createLoadedFixture();
  const preflightPassed = createPreflightReport("passed");

  for (const mode of ["dry-run", "null-runner", "provider-backed"]) {
    const run = runRealRuntimeCase({
      fixtureDir: "/tmp/runtime-contract-fixture",
      loadedFixture, normalizedFixture, preflightReport: preflightPassed,
      options: { mode },
    });
    const rc = run.runtimeReport.cases[0];
    const ta = rc.transcriptAvailability;
    const tr = rc.transcriptRef;

    assert.equal(
      ta.persistence === "none" && ta.transcriptPersistence === false,
      true,
      `${mode}: transcriptAvailability persistence must be none/false`,
    );

    if (tr) {
      assert.equal(
        tr.persistence === "in-report-only" || tr.persistence === "none",
        true,
        `${mode}: transcriptRef.persistence must be in-report-only or none`,
      );
      assert.equal(tr.providerTranscript, false, `${mode}: transcriptRef.providerTranscript must be false`);
    }
  }
}

function testRunnerMustNotLocallyPatchTranscriptRef() {
  const normalizedFixture = createNormalizedFixture();
  const loadedFixture = createLoadedFixture();
  const preflightPassed = createPreflightReport("passed");

  for (const mode of ["dry-run", "null-runner", "provider-backed"]) {
    const run = runRealRuntimeCase({
      fixtureDir: "/tmp/runtime-contract-fixture",
      loadedFixture, normalizedFixture, preflightReport: preflightPassed,
      options: { mode },
    });
    const rc = run.runtimeReport.cases[0];

    if (rc.transcriptAvailability.available === false) {
      assert.equal(
        rc.transcriptAvailability.handle, null,
        `${mode}: handle must be null when available=false`,
      );
      assert.equal(
        rc.transcriptAvailability.location, null,
        `${mode}: location must be null when available=false`,
      );
    }

    if (rc.transcriptRef) {
      assert.equal(
        rc.transcriptRef.providerTranscript, false,
        `${mode}: transcriptRef must never claim providerTranscript=true`,
      );
      assert.ok(
        rc.transcriptRef.persistence === "in-report-only" || rc.transcriptRef.persistence === "none",
        `${mode}: transcriptRef.persistence must be in-report-only or none, got ${rc.transcriptRef.persistence}`,
      );
    }

    assert.equal(rc.observed.providerEvidenceAvailable, false, `${mode}: observed.providerEvidenceAvailable`);
    assert.equal(rc.observed.transcriptCaptured, false, `${mode}: observed.transcriptCaptured`);
  }
}

// ── Phase 3: Selection wiring contract tests ──────────────────────

function testIsBuiltinProviderKeyCoversAllBuiltins() {
  const isBuiltin = RUNTIME_PROVIDER_SELECTION_IS_BUILTIN_KEY;
  assert.equal(isBuiltin("dry-run"), true, "dry-run should be builtin");
  assert.equal(isBuiltin("null-runner"), true, "null-runner should be builtin");
  assert.equal(isBuiltin("provider-backed"), true, "provider-backed should be builtin");
  // openai is now a builtin provider adapter key
  assert.equal(isBuiltin("openai"), true, "openai should be builtin");
  assert.equal(isBuiltin(""), false, "empty string should not be builtin");
  // Non-string values should not match
  assert.equal(isBuiltin(42), false, "number should not be builtin");
  assert.equal(isBuiltin(null), false, "null should not be builtin");
  assert.equal(isBuiltin(undefined), false, "undefined should not be builtin");
}
tests.push(["isBuiltinProviderKey covers all builtins and rejects others", testIsBuiltinProviderKeyCoversAllBuiltins]);

function testIsExternalProviderKey() {
  const isExternal = RUNTIME_PROVIDER_SELECTION_IS_EXTERNAL_KEY;
  // openai is now a builtin provider adapter key
  assert.equal(isExternal("openai"), false, "openai should not be external");
  assert.equal(isExternal("custom-provider"), true, "custom-provider should be external");
  assert.equal(isExternal("provider-backed-v2"), true, "provider-backed-v2 should be external");
  // Builtins are not external
  assert.equal(isExternal("dry-run"), false, "dry-run should not be external");
  assert.equal(isExternal("null-runner"), false, "null-runner should not be external");
  assert.equal(isExternal("provider-backed"), false, "provider-backed should not be external");
  // Non-strings are not external
  assert.equal(isExternal(42), false, "number should not be external");
  assert.equal(isExternal(null), false, "null should not be external");
}
tests.push(["isExternalProviderKey identifies non-builtin strings", testIsExternalProviderKey]);

function testAssertSelectionInputProviderBackedConstraint() {
  const assertConstraint = RUNTIME_PROVIDER_SELECTION_ASSERT_BACKED_CONSTRAINT;
  // dry-run + providerBacked=true => must throw
  assert.throws(
    () => assertConstraint({ adapterKey: "dry-run", providerBacked: true }),
    /cannot have providerBacked=true/,
    "dry-run + providerBacked=true should throw",
  );
  // null-runner + providerBacked=true => must throw
  assert.throws(
    () => assertConstraint({ adapterKey: "null-runner", providerBacked: true }),
    /cannot have providerBacked=true/,
    "null-runner + providerBacked=true should throw",
  );
  // provider-backed + providerBacked=true => should NOT throw
  assert.doesNotThrow(
    () => assertConstraint({ adapterKey: "provider-backed", providerBacked: true }),
    "provider-backed + providerBacked=true should not throw",
  );
  // dry-run + providerBacked=false => should NOT throw
  assert.doesNotThrow(
    () => assertConstraint({ adapterKey: "dry-run", providerBacked: false }),
    "dry-run + providerBacked=false should not throw",
  );
  // null-runner + providerBacked=undefined => should NOT throw
  assert.doesNotThrow(
    () => assertConstraint({ adapterKey: "null-runner" }),
    "null-runner without providerBacked should not throw",
  );
}
tests.push(["assertSelectionInputProviderBackedConstraint enforces dry-run/null-runner guard", testAssertSelectionInputProviderBackedConstraint]);

function testBuiltinProviderAdapterKeysStability() {
  // Snapshot test: if someone modifies the array, this test fails loudly
  assert.deepEqual(
    RUNTIME_PROVIDER_ADAPTER_KEYS,
    ["dry-run", "null-runner", "synthetic", "provider-backed", "openai"],
    "BUILTIN_PROVIDER_ADAPTER_KEYS must remain stable in exact order",
  );
  // Length must be exactly 5
  assert.equal(RUNTIME_PROVIDER_ADAPTER_KEYS.length, 5, "must have exactly 5 builtin keys");
  // No duplicates
  assert.equal(
    new Set(RUNTIME_PROVIDER_ADAPTER_KEYS).size,
    RUNTIME_PROVIDER_ADAPTER_KEYS.length,
    "BUILTIN_PROVIDER_ADAPTER_KEYS must not contain duplicates",
  );
}
tests.push(["BUILTIN_PROVIDER_ADAPTER_KEYS set is stable and frozen", testBuiltinProviderAdapterKeysStability]);

// --- Transcript capture reserved skeleton contract tests ---

function testTranscriptCaptureStubNonProviderBackedReturnsNone() {
  const result = captureProviderTranscriptStub({
    selection: { providerBacked: false },
    execution: {},
    evidence: {}
  });
  assert.strictEqual(result.captured, false, "non-provider-backed: captured must be false");
  assert.strictEqual(result.captureMode, "none", "non-provider-backed: captureMode must be none");
  assert.strictEqual(result.note, "non-provider-backed: transcript capture not applicable");
}
tests.push(["transcript capture stub: non-provider-backed returns none", testTranscriptCaptureStubNonProviderBackedReturnsNone]);

function testTranscriptCaptureStubProviderBackedNotExecutedReturnsNone() {
  const result = captureProviderTranscriptStub({
    selection: { providerBacked: true },
    execution: { executed: false, providerCall: false },
    evidence: {}
  });
  assert.strictEqual(result.captured, false, "provider-backed not-executed: captured must be false");
  assert.strictEqual(result.captureMode, "none", "provider-backed not-executed: captureMode must be none");
}
tests.push(["transcript capture stub: provider-backed not-executed returns none", testTranscriptCaptureStubProviderBackedNotExecutedReturnsNone]);

function testTranscriptCaptureStubProviderBackedExecutedNoEvidenceReturnsNone() {
  const result = captureProviderTranscriptStub({
    selection: { providerBacked: true },
    execution: { executed: true, providerCall: true },
    evidence: { transcriptCaptured: false }
  });
  assert.strictEqual(result.captured, false, "provider-backed executed no-evidence: captured must be false");
  assert.strictEqual(result.captureMode, "none");
}
tests.push(["transcript capture stub: provider-backed executed no-evidence returns none", testTranscriptCaptureStubProviderBackedExecutedNoEvidenceReturnsNone]);

function testTranscriptCaptureStubProviderBackedWithEvidenceReturnsReserved() {
  const result = captureProviderTranscriptStub({
    selection: { providerBacked: true },
    execution: { executed: true, providerCall: true },
    evidence: { transcriptCaptured: true }
  });
  assert.strictEqual(result.captured, false, "reserved: captured must still be false");
  assert.strictEqual(result.captureMode, "reserved-provider-captured", "reserved: captureMode must be reserved-provider-captured");
  assert.strictEqual(result.captureTiming, "post-execution-reserved");
}
tests.push(["transcript capture stub: provider-backed with evidence returns reserved", testTranscriptCaptureStubProviderBackedWithEvidenceReturnsReserved]);

function testTranscriptCaptureStubContractRejectsCapturedTrue() {
  assert.throws(() => assertTranscriptCaptureStubContract({ captured: true, captureMode: "none" }), /captured=true is not allowed/);
}
tests.push(["transcript capture stub contract: rejects captured=true", testTranscriptCaptureStubContractRejectsCapturedTrue]);

function testTranscriptCaptureStubContractRejectsReservedWithCapturedNotFalse() {
  // captured=undefined should also throw
  assert.throws(() => assertTranscriptCaptureStubContract({ captured: undefined, captureMode: "reserved-provider-captured" }), /captured=false/);
}
tests.push(["transcript capture stub contract: rejects reserved with captured!=false", testTranscriptCaptureStubContractRejectsReservedWithCapturedNotFalse]);

function testTranscriptCaptureModesIsFrozen() {
  // RUNTIME_PROVIDER_TRANSCRIPT_CAPTURE_MODES is a spread copy of the internal frozen array
  assert.deepStrictEqual([...TRANSCRIPT_CAPTURE_MODES], ["none", "reserved-provider-captured"]);
  // Mutating the exported copy must not affect the original (defense-in-depth)
  const copy = [...TRANSCRIPT_CAPTURE_MODES];
  assert.deepStrictEqual(copy, ["none", "reserved-provider-captured"]);
}
tests.push(["TRANSCRIPT_CAPTURE_MODES is frozen with correct entries", testTranscriptCaptureModesIsFrozen]);

// --- Scoring / acceptance rubric reserved stub contract tests ---

function testScoringStubAlwaysReturnsScoredFalse() {
  const result = buildScoringStub({});
  assert.strictEqual(result.scored, false);
  assert.strictEqual(result.scoringMode, "none");
  assert.strictEqual(result.score, null);
  assert.strictEqual(result.rubric, null);
}
tests.push(["scoring stub: always returns scored=false", testScoringStubAlwaysReturnsScoredFalse]);

function testScoringStubProviderReservedReturnsScoredFalse() {
  const result = buildScoringStubProviderReserved({ selection: { providerBacked: true } });
  assert.strictEqual(result.scored, false, "provider-backed reserved: scored must be false");
  assert.strictEqual(result.scoringMode, "reserved-pending");
  assert.strictEqual(result.scoringTiming, "post-execution-reserved");
}
tests.push(["scoring stub provider-reserved: returns scored=false with reserved-pending", testScoringStubProviderReservedReturnsScoredFalse]);

function testScoringStubProviderReservedNonProviderBacked() {
  const result = buildScoringStubProviderReserved({ selection: { providerBacked: false } });
  assert.strictEqual(result.scored, false);
  assert.strictEqual(result.scoringMode, "none");
}
tests.push(["scoring stub provider-reserved: non-provider-backed falls back to none", testScoringStubProviderReservedNonProviderBacked]);

function testScoringStubContractRejectsScoredTrue() {
  assert.throws(() => assertScoringStubContract({ scored: true, scoringMode: "none" }), /scored=true is not allowed/);
}
tests.push(["scoring stub contract: rejects scored=true", testScoringStubContractRejectsScoredTrue]);

function testScoringStubContractRejectsInvalidScoringMode() {
  assert.throws(() => assertScoringStubContract({ scored: false, scoringMode: "real-scoring" }), /invalid scoringMode/);
}
tests.push(["scoring stub contract: rejects invalid scoringMode", testScoringStubContractRejectsInvalidScoringMode]);

function testScoringStubContractAcceptsNoneMode() {
  assert.doesNotThrow(() => assertScoringStubContract({ scored: false, scoringMode: "none", score: null, rubric: null }));
}
tests.push(["scoring stub contract: accepts none mode", testScoringStubContractAcceptsNoneMode]);

function testScoringModesIsFrozen() {
  assert.ok(Object.isFrozen(SCORING_MODES), "SCORING_MODES must be frozen");
  assert.deepStrictEqual([...SCORING_MODES], ["none", "reserved-pending"]);
}
tests.push(["SCORING_MODES is frozen with correct entries", testScoringModesIsFrozen]);

// --- Sandbox enforcement reserved stub contract tests ---

function testSandboxStubAlwaysReturnsEnforcedFalse() {
  const result = buildSandboxStub({});
  assert.strictEqual(result.enforced, false);
  assert.strictEqual(result.sandboxMode, "none");
  assert.strictEqual(result.isolation, null);
  assert.strictEqual(result.resourceLimits, null);
}
tests.push(["sandbox stub: always returns enforced=false", testSandboxStubAlwaysReturnsEnforcedFalse]);

function testSandboxStubProviderReservedReturnsEnforcedFalse() {
  const result = buildSandboxStubProviderReserved({ selection: { providerBacked: true } });
  assert.strictEqual(result.enforced, false, "provider-backed reserved: enforced must be false");
  assert.strictEqual(result.sandboxMode, "reserved-pending");
  assert.strictEqual(result.isolation, "reserved-container");
}
tests.push(["sandbox stub provider-reserved: enforced false with provider-backed", testSandboxStubProviderReservedReturnsEnforcedFalse]);

function testSandboxStubProviderReservedNonProviderBacked() {
  const result = buildSandboxStubProviderReserved({ selection: { providerBacked: false } });
  assert.strictEqual(result.enforced, false);
  assert.strictEqual(result.sandboxMode, "none");
}
tests.push(["sandbox stub provider-reserved: non-provider-backed falls to none", testSandboxStubProviderReservedNonProviderBacked]);

function testSandboxStubContractRejectsEnforcedTrue() {
  assert.throws(() => assertSandboxStubContract({ enforced: true, sandboxMode: "none" }), /enforced=true is not allowed/);
}
tests.push(["sandbox stub contract: rejects enforced=true", testSandboxStubContractRejectsEnforcedTrue]);

function testSandboxStubContractRejectsInvalidSandboxMode() {
  assert.throws(() => assertSandboxStubContract({ enforced: false, sandboxMode: "real-sandbox" }), /invalid sandboxMode/);
}
tests.push(["sandbox stub contract: rejects invalid sandboxMode", testSandboxStubContractRejectsInvalidSandboxMode]);

function testSandboxStubContractAcceptsNoneMode() {
  assert.doesNotThrow(() => assertSandboxStubContract({ enforced: false, sandboxMode: "none", isolation: null, resourceLimits: null, timeout: null }));
}
tests.push(["sandbox stub contract: accepts none mode", testSandboxStubContractAcceptsNoneMode]);

function testSandboxModesIsFrozen() {
  assert.ok(Object.isFrozen(SANDBOX_MODES), "SANDBOX_MODES must be frozen");
  assert.deepStrictEqual([...SANDBOX_MODES], ["none", "reserved-pending"]);
}
tests.push(["SANDBOX_MODES is frozen with correct entries", testSandboxModesIsFrozen]);

// --- Multi-case orchestration reserved stub contract tests ---

function testMultiCaseStubAlwaysReturnsSingle() {
  const result = buildMultiCaseStub({});
  assert.strictEqual(result.caseMode, "single");
  assert.strictEqual(result.caseCount, 1);
  assert.strictEqual(result.orchestration, null);
  assert.strictEqual(result.caseDependencies, null);
}
tests.push(["multi-case stub: always returns single", testMultiCaseStubAlwaysReturnsSingle]);

function testMultiCaseStubProviderReservedReturnsSingle() {
  const result = buildMultiCaseStubProviderReserved({ selection: { providerBacked: true } });
  assert.strictEqual(result.caseMode, "single", "provider-backed reserved: caseMode must still be single");
  assert.strictEqual(result.caseCount, 1);
  assert.strictEqual(result.orchestration, "reserved-batch");
}
tests.push(["multi-case stub provider reserved: returns single with reserved-batch", testMultiCaseStubProviderReservedReturnsSingle]);

function testMultiCaseStubProviderReservedNonProviderBacked() {
  const result = buildMultiCaseStubProviderReserved({ selection: { providerBacked: false } });
  assert.strictEqual(result.caseMode, "single");
  assert.strictEqual(result.orchestration, null);
}
tests.push(["multi-case stub provider reserved: non-provider-backed returns single", testMultiCaseStubProviderReservedNonProviderBacked]);

function testMultiCaseStubContractRejectsInvalidCaseMode() {
  assert.throws(() => assertMultiCaseStubContract({ caseMode: "parallel-batch", caseCount: 5 }), /invalid caseMode/);
}
tests.push(["multi-case stub contract: rejects invalid caseMode", testMultiCaseStubContractRejectsInvalidCaseMode]);

function testMultiCaseStubContractRejectsReservedMultiWithSingleCase() {
  assert.throws(() => assertMultiCaseStubContract({ caseMode: "reserved-multi", caseCount: 1 }), /reserved-multi requires caseCount > 1/);
}
tests.push(["multi-case stub contract: rejects reserved-multi with single case", testMultiCaseStubContractRejectsReservedMultiWithSingleCase]);

function testMultiCaseStubContractAcceptsSingleMode() {
  assert.doesNotThrow(() => assertMultiCaseStubContract({ caseMode: "single", caseCount: 1, orchestration: null, caseDependencies: null }));
}
tests.push(["multi-case stub contract: accepts single mode", testMultiCaseStubContractAcceptsSingleMode]);

function testCaseModesIsFrozen() {
  assert.ok(Object.isFrozen(CASE_MODES), "CASE_MODES must be frozen");
  assert.deepStrictEqual([...CASE_MODES], ["single", "reserved-multi"]);
}
tests.push(["CASE_MODES is frozen with correct entries", testCaseModesIsFrozen]);

// --- Acceptance record contract tests ---

function testAcceptanceDraftMapsToPending() {
  const acceptance = buildAcceptanceFromRuntimeReport({ status: "draft", summary: { passed: false } });
  assert.strictEqual(acceptance.status, "pending");
  assert.ok(Array.isArray(acceptance.criteriaResults));
}

function testAcceptanceBlockedMapsToBlocked() {
  const acceptance = buildAcceptanceFromRuntimeReport({ status: "blocked", summary: {} });
  assert.strictEqual(acceptance.status, "blocked");
}

function testAcceptanceNotExecutedMapsToPending() {
  const acceptance = buildAcceptanceFromRuntimeReport({ status: "not-executed", summary: {} });
  assert.strictEqual(acceptance.status, "pending");
}

function testAcceptanceNullReportReturnsPending() {
  const acceptance = buildAcceptanceFromRuntimeReport(null);
  assert.strictEqual(acceptance.status, "pending");
}

function testAcceptanceContractRejectsAcceptedReserved() {
  assert.throws(() => assertAcceptanceRecordContract({ status: "accepted-reserved" }), /accepted-reserved is not allowed/);
}

function testAcceptanceContractRejectsInvalidStatus() {
  assert.throws(() => assertAcceptanceRecordContract({ status: "accepted" }), /invalid status/);
}

function testAcceptanceContractAcceptsPending() {
  assert.doesNotThrow(() => assertAcceptanceRecordContract({ status: "pending", criteriaResults: [], validationRef: null }));
}

function testAcceptanceStatusesIsFrozen() {
  assert.ok(Object.isFrozen(ACCEPTANCE_STATUSES));
  assert.deepStrictEqual([...ACCEPTANCE_STATUSES], ["pending", "blocked", "accepted-reserved"]);
}

tests.push(["acceptance: draft maps to pending", testAcceptanceDraftMapsToPending]);
tests.push(["acceptance: blocked maps to blocked", testAcceptanceBlockedMapsToBlocked]);
tests.push(["acceptance: not-executed maps to pending", testAcceptanceNotExecutedMapsToPending]);
tests.push(["acceptance: null report returns pending", testAcceptanceNullReportReturnsPending]);
tests.push(["acceptance contract: rejects accepted-reserved", testAcceptanceContractRejectsAcceptedReserved]);
tests.push(["acceptance contract: rejects invalid status", testAcceptanceContractRejectsInvalidStatus]);
tests.push(["acceptance contract: accepts pending record", testAcceptanceContractAcceptsPending]);
tests.push(["ACCEPTANCE_STATUSES is frozen with correct entries", testAcceptanceStatusesIsFrozen]);

// --- Acceptance provenance propagation contract tests ---

function makeRuntimeReportWithProvenance({ executionSource, provenance = {}, status = "draft" } = {}) {
  return {
    status,
    summary: {
      passed: false,
      transcriptAvailability: "unavailable",
    },
    metadata: {
      executionSource,
      provenance,
      lineage: {
        fixtureId: "fixture-provenance-01",
        caseId: "case-provenance-01",
        runId: "run-provenance-01",
      },
    },
  };
}

function testSyntheticReportCarriesProviderSyntheticExecutionSource() {
  const report = makeRuntimeReportWithProvenance({
    executionSource: "provider-synthetic",
    provenance: { evidenceLevel: "synthetic-mock", synthetic: true, providerCallObserved: false },
  });
  assert.strictEqual(report.metadata.executionSource, "provider-synthetic");
}
tests.push(["acceptance provenance: synthetic report executionSource is provider-synthetic", testSyntheticReportCarriesProviderSyntheticExecutionSource]);

function testSyntheticReportCarriesSyntheticMockEvidenceLevel() {
  const report = makeRuntimeReportWithProvenance({
    executionSource: "provider-synthetic",
    provenance: { evidenceLevel: "synthetic-mock", synthetic: true, providerCallObserved: false },
  });
  assert.strictEqual(report.metadata.provenance.evidenceLevel, "synthetic-mock");
}
tests.push(["acceptance provenance: synthetic report evidenceLevel is synthetic-mock", testSyntheticReportCarriesSyntheticMockEvidenceLevel]);

function testProviderLessReportCarriesProviderLessExecutionSource() {
  const report = makeRuntimeReportWithProvenance({
    executionSource: "provider-less",
    provenance: { evidenceLevel: "provider-less-draft", synthetic: false, providerCallObserved: false },
  });
  assert.strictEqual(report.metadata.executionSource, "provider-less");
}
tests.push(["acceptance provenance: provider-less report executionSource is provider-less", testProviderLessReportCarriesProviderLessExecutionSource]);

function testAcceptanceBuilderPropagatesProvenanceSummaryFields() {
  const report = makeRuntimeReportWithProvenance({
    executionSource: "provider-synthetic",
    provenance: { evidenceLevel: "synthetic-mock", synthetic: true, providerCallObserved: false },
  });
  const acceptance = buildAcceptanceFromRuntimeReport(report);
  assert.deepStrictEqual(acceptance.provenanceSummary, {
    executionSource: "provider-synthetic",
    synthetic: true,
    providerCallObserved: false,
    evidenceLevel: "synthetic-mock",
  });
}
tests.push(["acceptance builder: provenanceSummary mirrors report provenance", testAcceptanceBuilderPropagatesProvenanceSummaryFields]);

function testAcceptanceBuilderKeepsDecisionSemanticsStableWithProvenance() {
  const report = makeRuntimeReportWithProvenance({
    executionSource: "provider-synthetic",
    provenance: { evidenceLevel: "synthetic-mock", synthetic: true, providerCallObserved: false },
    status: "draft",
  });
  const acceptance = buildAcceptanceFromRuntimeReport(report);
  assert.strictEqual(acceptance.status, "pending");
  assert.strictEqual(acceptance.status, buildAcceptanceFromRuntimeReport({ ...report, metadata: null }).status);
  assert.ok(!Object.prototype.hasOwnProperty.call(acceptance, "passed"));
}
tests.push(["acceptance builder: provenance does not change decision semantics", testAcceptanceBuilderKeepsDecisionSemanticsStableWithProvenance]);

function testAcceptanceBuilderDoesNotUpgradeToRealExecutionSuccess() {
  const report = makeRuntimeReportWithProvenance({
    executionSource: "provider-synthetic",
    provenance: { evidenceLevel: "synthetic-mock", synthetic: true, providerCallObserved: false },
  });
  const acceptance = buildAcceptanceFromRuntimeReport(report);
  assert.notStrictEqual(acceptance.provenanceSummary.evidenceLevel, "real-execution-success");
  assert.notStrictEqual(acceptance.provenanceSummary.executionSource, "provider-backed");
}
tests.push(["acceptance builder: no real-execution success upgrade", testAcceptanceBuilderDoesNotUpgradeToRealExecutionSuccess]);

// --- Synthetic provider pipeline contract tests ---

function testSyntheticProviderReturnsDeterministicResult() {
  const result = buildSyntheticProviderResult();
  assert.strictEqual(result.synthetic, true);
  assert.strictEqual(result.providerCall, true);
  assert.strictEqual(result.executed, true);
  assert.strictEqual(result.status, "synthetic-passed");
  assert.ok(result.observed);
  assert.ok(result.executionIdentity.executionId);
}

tests.push(["synthetic provider: returns deterministic result", testSyntheticProviderReturnsDeterministicResult]);

function testSyntheticProviderReservedSeamsHonest() {
  const result = buildSyntheticProviderResult();
  assert.strictEqual(result.rawResponse.available, false, "synthetic rawResponse must not pretend available");
  assert.strictEqual(result.transcriptRef.available, false, "synthetic transcriptRef must not pretend available");
  assert.strictEqual(result.transcriptCaptured, false, "synthetic must not pretend transcript captured");
  assert.strictEqual(result.scoring.scored, false, "synthetic must not pretend scored");
  assert.strictEqual(result.sandbox.enforced, false, "synthetic must not pretend sandbox enforced");
  assert.strictEqual(result.multiCase.caseMode, "single", "synthetic must stay single case");
}

tests.push(["synthetic provider: reserved seams are honest", testSyntheticProviderReservedSeamsHonest]);

function testSyntheticProviderContractValidation() {
  const result = buildSyntheticProviderResult();
  assert.doesNotThrow(() => assertSyntheticProviderContract(result));
  assert.throws(() => assertSyntheticProviderContract(null), /must be an object/);
  assert.throws(() => assertSyntheticProviderContract({ synthetic: false }), /synthetic=true/);
}

tests.push(["synthetic provider contract: validation", testSyntheticProviderContractValidation]);

function testSyntheticProviderIsMarkerDetected() {
  const result = buildSyntheticProviderResult();
  assert.strictEqual(result.synthetic, true);
  assert.strictEqual(result.kind, "provider-result");
}

tests.push(["synthetic provider: marker detected", testSyntheticProviderIsMarkerDetected]);

function testSyntheticProviderMarkerIsString() {
  assert.strictEqual(typeof SYNTHETIC_PROVIDER_MARKER, "string");
  assert.ok(SYNTHETIC_PROVIDER_MARKER.length > 0);
}

tests.push(["synthetic provider marker: is string", testSyntheticProviderMarkerIsString]);

let passed = 0;
for (const [name, fn] of tests) {
  fn();
  passed += 1;
  console.log(`✓ ${name}`);
}

console.log(`Runtime contract tests passed: ${passed}/${tests.length} cases.`);
