import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadSkillBundlesFromDir } from "../src/skillforge/skill-bundle-loader.mjs";
import { matchBundles, getBundle } from "../src/skillforge/skill-bundle-matcher.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const bundleDir = path.resolve(__dirname, "../fixtures/skill-bundles");
  const loaded = await loadSkillBundlesFromDir(bundleDir);
  const bundles = loaded.usableBundles;

  console.log(`[bundle-matcher] loaded usable bundles: ${bundles.length}`);

  const queries = [
    "daily planning and productivity",
    "team incident response runbook",
    "meeting summary and notes",
    "release checklist automation",
  ];

  for (const query of queries) {
    const result = matchBundles({
      query,
      bundles,
      context: { topN: 3, threshold: 20 },
    });

    console.log("\n---");
    console.log(`[query] ${query}`);
    console.log(`[top1]`, result.top1);
    console.log(`[topN]`, result.hits);
    if (result.top1) {
      console.log(`[reason]`, result.top1.reason);
    }
  }

  const sampleId = bundles[0]?.bundle_id;
  if (sampleId) {
    const one = getBundle(sampleId, bundles);
    console.log("\n---");
    console.log(`[getBundle] bundle_id=${sampleId}`);
    console.log(one);
  }
}

main().catch((error) => {
  console.error("[bundle-matcher] failed", error);
  process.exitCode = 1;
});
