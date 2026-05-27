export function buildBetterPromptFallbackEnvelope({ package: pkg, qc_result, reason = null } = {}) {
  const pass = qc_result?.pass === true;
  const issues = Array.isArray(qc_result?.issues) ? qc_result.issues : [];

  return {
    fallback_used: !pass,
    fallback_mode: pass ? 'none' : 'minimal_prompt_package',
    alert_level: pass ? 'info' : 'warn',
    recoverable: true,
    reason: reason || (pass ? null : 'betterprompt_qc_failed'),
    qc_issue_count: issues.length,
    qc_issues: issues,
    package_minimal_ready:
      Boolean(pkg?.prompt?.system) &&
      Boolean(pkg?.prompt?.user_template) &&
      Array.isArray(pkg?.prompt?.input_slots) &&
      pkg.prompt.input_slots.length > 0,
  };
}

export default buildBetterPromptFallbackEnvelope;
