export function createRuntimeTraceEchoEntry() {
  return function runtimeTraceEchoEntry(runtimeInput) {
    return {
      source: runtimeInput.source?.kind || 'unknown',
      version: runtimeInput.source?.version || 'unknown',
      traceId: runtimeInput.trace?.traceId || 'missing-trace',
      trace: runtimeInput.trace,
      payload: runtimeInput.payload,
      received: true,
    };
  };
}
