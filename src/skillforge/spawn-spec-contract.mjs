const SPAWN_SPEC_KIND = 'spawn-spec';
const SPAWN_SPEC_VERSION = 'spawn-spec-draft-1';
const SPAWN_TRACE_KIND = 'spawn-trace';
const SPAWN_TRACE_VERSION = 'spawn-trace-draft-1';

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function normalizeString(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function cloneArray(value) {
  return Array.isArray(value) ? [...value] : [];
}

function createSpawnTrace(trace = {}) {
  const normalized = {
    kind: SPAWN_TRACE_KIND,
    version: SPAWN_TRACE_VERSION,
    traceId: normalizeString(trace.traceId) || 'trace-unknown',
    source: normalizeString(trace.source) || 'unknown',
    versionTag: normalizeString(trace.versionTag) || 'unknown',
    origin: normalizeString(trace.origin) || 'unknown',
  };

  return Object.freeze(normalized);
}

function createSpawnSpec(input = {}) {
  const trace = createSpawnTrace(input.trace);
  const source = isPlainObject(input.source) ? input.source : {};
  const version = normalizeString(input.version) || '0.1.0';

  return Object.freeze({
    kind: SPAWN_SPEC_KIND,
    version,
    source: Object.freeze({
      kind: normalizeString(source.kind) || 'stage-e-artifact',
      name: normalizeString(source.name) || 'unknown-source',
      version: normalizeString(source.version) || version,
    }),
    trace,
    payload: Object.freeze({
      taskIds: Object.freeze(cloneArray(input.payload?.taskIds)),
      notes: normalizeString(input.payload?.notes) || '',
    }),
  });
}

function validateSpawnSpec(spec) {
  const errors = [];
  if (!isPlainObject(spec)) {
    errors.push({ field: '$', message: 'must be an object' });
    return { valid: false, errors };
  }
  if (spec.kind !== SPAWN_SPEC_KIND) errors.push({ field: 'kind', message: `expected ${SPAWN_SPEC_KIND}` });
  if (!normalizeString(spec.version)) errors.push({ field: 'version', message: 'must be a string' });
  if (!isPlainObject(spec.source)) errors.push({ field: 'source', message: 'must be an object' });
  if (!isPlainObject(spec.trace)) errors.push({ field: 'trace', message: 'must be an object' });
  if (!normalizeString(spec?.trace?.traceId)) errors.push({ field: 'trace.traceId', message: 'must be a string' });
  return { valid: errors.length === 0, errors };
}

function spawnSpecFromStageE(stageEArtifact = {}) {
  const source = {
    kind: 'stage-e-artifact',
    name: normalizeString(stageEArtifact.name) || normalizeString(stageEArtifact.skill?.name) || 'stage-e',
    version: normalizeString(stageEArtifact.version) || '0.1.0',
  };
  return createSpawnSpec({
    version: normalizeString(stageEArtifact.spawnSpecVersion) || '0.1.0',
    source,
    trace: stageEArtifact.trace,
    payload: stageEArtifact.payload,
  });
}

export {
  SPAWN_SPEC_KIND,
  SPAWN_SPEC_VERSION,
  SPAWN_TRACE_KIND,
  SPAWN_TRACE_VERSION,
  createSpawnTrace,
  createSpawnSpec,
  validateSpawnSpec,
  spawnSpecFromStageE,
};
