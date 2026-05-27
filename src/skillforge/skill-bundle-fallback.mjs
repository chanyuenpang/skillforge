function toFiniteNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function buildSkillBundleFallback(matchResult = {}, { lowConfidenceThreshold = 8 } = {}) {
  const score = toFiniteNumber(matchResult?.score, 0);
  const selected = Array.isArray(matchResult?.selectedSkills)
    ? matchResult.selectedSkills
    : Array.isArray(matchResult?.selected)
      ? matchResult.selected
      : [];

  const noHit = selected.length === 0;
  const lowConfidence = !noHit && score > 0 && score < lowConfidenceThreshold;
  const degraded = noHit || lowConfidence;

  const fallback_reason = noHit
    ? 'bundle_no_hit'
    : lowConfidence
      ? 'bundle_low_confidence'
      : null;

  return {
    fallback_used: degraded,
    fallback_mode: degraded ? 'soft_non_blocking' : 'none',
    confidence: noHit ? 'none' : lowConfidence ? 'low' : 'normal',
    alert_level: degraded ? 'warn' : 'info',
    non_blocking: true,
    recoverable: true,
    fallback_reason,
    score,
    selected_count: selected.length,
    threshold: lowConfidenceThreshold,
  };
}

export default buildSkillBundleFallback;
