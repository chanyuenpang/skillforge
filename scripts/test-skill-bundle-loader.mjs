import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadSkillBundlesFromDir } from "../src/skillforge/skill-bundle-loader.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const bundleDir = path.resolve(__dirname, "../fixtures/skill-bundles");

const result = await loadSkillBundlesFromDir(bundleDir);

console.log(JSON.stringify({
  bundleDir: result.bundleDir,
  totalFiles: result.bundles.length,
  usableBundleCount: result.usableBundles.length,
  usableBundles: result.usableBundles.map((bundle) => ({
    bundle_id: bundle.bundle_id,
    valid_skill_refs_count: bundle.valid_skill_refs.length,
    invalid_skill_refs_count: bundle.invalid_skill_refs.length,
  })),
  invalidFiles: result.bundles
    .filter((item) => !item.valid)
    .map((item) => ({ file: item.file, errors: item.errors })),
}, null, 2));
