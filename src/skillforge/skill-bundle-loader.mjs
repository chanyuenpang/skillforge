import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { parseYaml } from "./loader.mjs";
import { validateSkillBundleManifest } from "./skill-bundle-contract.mjs";

function normalizeSkillRef(ref, index) {
  const skillId = ref?.skill_id;
  if (typeof skillId !== "string" || skillId.trim() === "") {
    return {
      ...ref,
      __valid: false,
      __reason: `skill_refs[${index}] missing skill_id`,
    };
  }

  return {
    ...ref,
    skill_id: skillId.trim(),
    __valid: true,
  };
}

function normalizeManifestSkillRefs(manifest) {
  const refs = Array.isArray(manifest.skill_refs) ? manifest.skill_refs : [];
  const normalized = refs.map((ref, idx) => normalizeSkillRef(ref, idx));
  const valid_skill_refs = normalized.filter((ref) => ref.__valid).map(({ __valid, ...rest }) => rest);
  const invalid_skill_refs = normalized
    .filter((ref) => !ref.__valid)
    .map(({ __valid, ...rest }) => rest);

  return {
    ...manifest,
    valid_skill_refs,
    invalid_skill_refs,
  };
}

export async function loadSkillBundlesFromDir(bundleDir) {
  const entries = await readdir(bundleDir, { withFileTypes: true });
  const files = entries.filter((entry) => entry.isFile() && /\.(ya?ml|json)$/iu.test(entry.name));

  const bundles = [];

  for (const file of files) {
    const fullPath = path.join(bundleDir, file.name);
    let raw;
    try {
      raw = await readFile(fullPath, "utf8");
    } catch (error) {
      bundles.push({
        file: fullPath,
        valid: false,
        errors: [{ code: "BUNDLE_READ_FAILED", message: error?.message || "Unable to read bundle file" }],
      });
      continue;
    }

    let parsed;
    try {
      parsed = file.name.endsWith(".json") ? JSON.parse(raw) : parseYaml(raw, file.name);
    } catch (error) {
      bundles.push({
        file: fullPath,
        valid: false,
        errors: [{ code: "BUNDLE_PARSE_FAILED", message: error?.message || "Unable to parse bundle file" }],
      });
      continue;
    }

    const check = validateSkillBundleManifest(parsed);
    if (!check.valid) {
      bundles.push({
        file: fullPath,
        valid: false,
        errors: check.errors.map((e) => ({ code: "BUNDLE_SCHEMA_INVALID", ...e })),
      });
      continue;
    }

    const normalized = normalizeManifestSkillRefs(check.data);
    bundles.push({
      file: fullPath,
      valid: true,
      bundle: normalized,
      warnings: normalized.invalid_skill_refs.map((ref) => ({
        code: "BUNDLE_SKILL_REF_INVALID",
        message: ref.__reason || "Invalid skill reference",
      })),
    });
  }

  return {
    bundleDir: path.resolve(bundleDir),
    bundles,
    usableBundles: bundles
      .filter((item) => item.valid && item.bundle?.valid_skill_refs?.length > 0)
      .map((item) => ({
        file: item.file,
        ...item.bundle,
      })),
  };
}

export default {
  loadSkillBundlesFromDir,
};
