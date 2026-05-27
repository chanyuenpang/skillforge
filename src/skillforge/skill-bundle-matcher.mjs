function toText(value) {
  return typeof value === "string" ? value : "";
}

function tokenize(text) {
  return toText(text)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .split(/\s+/u)
    .filter(Boolean);
}

function buildBundleSearchSpace(bundle) {
  const tags = Array.isArray(bundle?.tags) ? bundle.tags : [];
  const useCases = Array.isArray(bundle?.use_cases) ? bundle.use_cases : [];
  const preferredRefs = Array.isArray(bundle?.valid_skill_refs) ? bundle.valid_skill_refs : null;
  const fallbackRefs = Array.isArray(bundle?.skill_refs) ? bundle.skill_refs : [];
  const skillRefs = preferredRefs && preferredRefs.length > 0 ? preferredRefs : fallbackRefs;

  const fields = {
    name: toText(bundle?.name || bundle?.title),
    description: toText(bundle?.description),
    tags: tags.map((tag) => toText(tag)),
    use_cases: useCases.map((item) => toText(item)),
  };

  const tokenSet = new Set();
  Object.values(fields)
    .flat()
    .forEach((value) => {
      tokenize(value).forEach((token) => tokenSet.add(token));
    });

  return {
    fields,
    tokenSet,
    suggested_skill_refs: skillRefs.map((ref) => ref.skill_id).filter(Boolean),
  };
}

function scoreBundle(queryTokens, bundle) {
  const searchSpace = buildBundleSearchSpace(bundle);
  let matched = 0;

  for (const token of queryTokens) {
    if (searchSpace.tokenSet.has(token)) matched += 1;
  }

  if (queryTokens.length === 0) {
    return {
      score: 0,
      reason: "empty query",
      suggested_skill_refs: searchSpace.suggested_skill_refs,
    };
  }

  const coverage = matched / queryTokens.length;
  const score = Number((coverage * 100).toFixed(2));

  const reasons = [];
  for (const token of queryTokens) {
    if (searchSpace.fields.name && tokenize(searchSpace.fields.name).includes(token)) reasons.push(`name:${token}`);
    else if (searchSpace.fields.tags.some((tag) => tokenize(tag).includes(token))) reasons.push(`tag:${token}`);
    else if (searchSpace.fields.use_cases.some((item) => tokenize(item).includes(token))) reasons.push(`use_case:${token}`);
    else if (searchSpace.fields.description && tokenize(searchSpace.fields.description).includes(token)) reasons.push(`description:${token}`);
  }

  return {
    score,
    reason: reasons.length > 0 ? `matched ${matched}/${queryTokens.length} -> ${reasons.join(", ")}` : `matched ${matched}/${queryTokens.length}`,
    suggested_skill_refs: searchSpace.suggested_skill_refs,
  };
}

export function getBundle(bundleId, bundles) {
  if (!bundleId || !Array.isArray(bundles)) return null;
  return bundles.find((bundle) => bundle?.bundle_id === bundleId) || null;
}

export function matchBundles({ query, bundles, context = {} }) {
  const list = Array.isArray(bundles) ? bundles : [];
  const queryTokens = tokenize(query);

  const topN = Number.isFinite(context.topN) ? Math.max(1, Math.floor(context.topN)) : 3;
  const threshold = Number.isFinite(context.threshold) ? context.threshold : 20;

  const scored = list
    .map((bundle) => {
      const result = scoreBundle(queryTokens, bundle);
      return {
        bundle_id: bundle.bundle_id,
        name: bundle.name,
        score: result.score,
        reason: result.reason,
        suggested_skill_refs: result.suggested_skill_refs,
      };
    })
    .filter((item) => item.score >= threshold)
    .sort((a, b) => b.score - a.score)
    .slice(0, topN);

  return {
    query,
    query_tokens: queryTokens,
    topN,
    threshold,
    totalBundles: list.length,
    hits: scored,
    top1: scored[0] || null,
  };
}

export default {
  matchBundles,
  getBundle,
};
