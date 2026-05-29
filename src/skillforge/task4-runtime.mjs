import { buildBetterPromptFromRawText } from './betterprompt-builder.mjs';

export async function executeTask4Runtime({
  inputText,
  language = 'zh-CN',
  metadata = null,
} = {}) {
  const raw = typeof inputText === 'string' ? inputText.trim() : '';
  if (!raw) {
    const err = new Error('task4-runtime requires non-empty inputText');
    err.code = 'INVALID_INPUT';
    throw err;
  }

  const startedAtMs = Date.now();
  const result = await buildBetterPromptFromRawText(raw, { language });
  const durationMs = Date.now() - startedAtMs;

  const output = {
    success_criteria: result.package?.success_criteria ?? null,
    done_definition: result.package?.intent?.done_definition ?? null,
    selected_skills: result.package?.selected_skills ?? null,
    qc_pass: result.qc_result?.pass ?? null,
    package_minimal_ready: result.package?.metadata?.package_minimal_ready ?? null,
    fallback_used: result.fallback?.fallback_used ?? null,
    prompt_has_ac_in_system: String(result.package?.prompt?.system || '').includes('验收标准'),
    prompt_has_skill_name: /skill|技能|skillforge|design|planning|automation|bundle/i.test(JSON.stringify(result.package?.prompt ?? {})),
  };

  return {
    ok: true,
    kind: 'task4-runtime',
    durationMs,
    input: {
      inputText: raw,
      language,
      metadata: metadata ?? null,
    },
    output,
    transcript: {
      kind: 'task4-runtime',
      output,
      durationMs,
    },
    persistenceHint: {
      source: 'task4-runtime',
      shouldPersistExecutionLog: true,
      shouldPersistTranscript: true,
      transcriptProvider: 'task4-runtime',
      transcriptModel: language,
    },
    rawResult: result,
  };
}
