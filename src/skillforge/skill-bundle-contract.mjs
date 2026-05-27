import { z } from "zod";

const NonEmptyString = z.string().trim().min(1);

const SkillRefSchema = z.object({
  skill_id: NonEmptyString,
  note: NonEmptyString.optional(),
});

export const SkillBundleManifestSchema = z.object({
  version: NonEmptyString,
  bundle_id: NonEmptyString,
  title: NonEmptyString.optional(),
  description: NonEmptyString.optional(),
  skill_refs: z.array(SkillRefSchema).min(1),
});

export function validateSkillBundleManifest(input) {
  const parsed = SkillBundleManifestSchema.safeParse(input);
  if (!parsed.success) {
    return {
      valid: false,
      errors: parsed.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
      data: null,
    };
  }

  return {
    valid: true,
    errors: [],
    data: parsed.data,
  };
}

export default {
  SkillBundleManifestSchema,
  validateSkillBundleManifest,
};
