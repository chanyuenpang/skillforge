import { createSpawnSpec, validateSpawnSpec } from './spawn-spec-contract.mjs';

export function adaptSpawnSpecToRuntime(spec) {
  const normalized = spec?.kind === 'spawn-spec' ? spec : createSpawnSpec(spec);
  const validation = validateSpawnSpec(normalized);
  if (!validation.valid) {
    return { ok: false, errors: validation.errors };
  }
  return {
    ok: true,
    runtimeInput: Object.freeze({
      trace: Object.freeze({
        traceId: normalized.trace.traceId,
        source: normalized.trace.source,
        versionTag: normalized.trace.versionTag,
        origin: normalized.trace.origin,
      }),
      source: normalized.source,
      payload: normalized.payload,
    }),
  };
}

export function runSpawnSpecRuntime(spec, runtimeEntry) {
  const adapted = adaptSpawnSpecToRuntime(spec);
  if (!adapted.ok) return adapted;
  const output = runtimeEntry(adapted.runtimeInput);
  return Object.freeze({
    ok: true,
    trace: adapted.runtimeInput.trace,
    output,
  });
}
