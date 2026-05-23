import { validateReviewRecord } from "./review-record.mjs";
import { validatePublishPrep } from "./publish-prep.mjs";
import { validateRegistryEntry } from "./registry-entry.mjs";

const PROFILE_VALUES = new Set(["simple", "standard", "advanced-reserved"]);
const WORKFLOW_SOURCE_KIND = "workflow-source";
const SOURCE_TYPE_VALUES = new Set([
  "public-fictional-sample",
  "public-fictional-synthetic-sample",
  "manual",
  "doc",
  "chat",
  "code",
  "mixed",
]);

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function hasText(value) {
  return typeof value === "string" && value.trim() !== "";
}

function isNonEmptyStringArray(value) {
  return Array.isArray(value) && value.length > 0 && value.every((item) => hasText(item));
}

function pushError(errors, field, message) {
  errors.push({ field, message });
}

function validatePermissions(errors, permissions, fieldPath) {
  if (!isPlainObject(permissions)) {
    pushError(errors, fieldPath, "must be an object");
    return;
  }

  for (const key of [
    "network",
    "externalSend",
    "fileRead",
    "fileWrite",
    "destructiveOperations",
    "privatePathRead",
  ]) {
    if (typeof permissions[key] !== "boolean") {
      pushError(errors, `${fieldPath}.${key}`, "must be a boolean");
    }
  }
}

function validateWorkflowSource(data) {
  const errors = [];

  if (!isPlainObject(data)) {
    pushError(errors, "$", "workflow-source must be an object");
    return { valid: false, errors };
  }

  if (data.kind !== WORKFLOW_SOURCE_KIND) {
    pushError(errors, "kind", `must be ${WORKFLOW_SOURCE_KIND}`);
  }

  if (!hasText(data.fixtureId)) pushError(errors, "fixtureId", "is required");
  if (!hasText(data.fixtureVersion)) pushError(errors, "fixtureVersion", "is required");
  if (!hasText(data.name)) pushError(errors, "name", "is required");
  if (!hasText(data.summary)) pushError(errors, "summary", "is required");

  if (data.profile !== undefined && !PROFILE_VALUES.has(data.profile)) {
    pushError(errors, "profile", "must be one of simple|standard|advanced-reserved");
  }

  if (!isPlainObject(data.source)) {
    pushError(errors, "source", "is required and must be an object");
  } else {
    if (!SOURCE_TYPE_VALUES.has(data.source.type)) {
      pushError(errors, "source.type", "must be one of public-fictional-sample|public-fictional-synthetic-sample|manual|doc|chat|code|mixed");
    }
    if (!hasText(data.source.language)) pushError(errors, "source.language", "is required");

    if (!isPlainObject(data.source.inputContract)) {
      pushError(errors, "source.inputContract", "is required and must be an object");
    } else {
      if (!isNonEmptyStringArray(data.source.inputContract.acceptedInputs)) {
        pushError(errors, "source.inputContract.acceptedInputs", "must be a non-empty array of strings");
      }
      if (!isNonEmptyStringArray(data.source.inputContract.rejectedInputs)) {
        pushError(errors, "source.inputContract.rejectedInputs", "must be a non-empty array of strings");
      }
    }

    if (!isPlainObject(data.source.outputContract)) {
      pushError(errors, "source.outputContract", "is required and must be an object");
    } else {
      if (data.source.outputContract.format !== "markdown") {
        pushError(errors, "source.outputContract.format", "must be markdown");
      }
      if (!isNonEmptyStringArray(data.source.outputContract.sections)) {
        pushError(errors, "source.outputContract.sections", "must be a non-empty array of strings");
      }
    }
  }

  if (!isPlainObject(data.permissions)) {
    pushError(errors, "permissions", "is required and must be an object");
  } else {
    validatePermissions(errors, data.permissions, "permissions");
  }

  if (!isPlainObject(data.checklist)) {
    pushError(errors, "checklist", "is required and must be an object");
  } else {
    for (const field of [
      "structure",
      "trigger",
      "boundary",
      "dependency",
      "replay",
      "privacy",
      "compatibility",
    ]) {
      if (!hasText(data.checklist[field])) pushError(errors, `checklist.${field}`, "is required");
    }
  }

  if (data.resources !== undefined) {
    if (!isPlainObject(data.resources)) {
      pushError(errors, "resources", "must be an object when provided");
    } else {
      if (data.resources.templates !== undefined && !Array.isArray(data.resources.templates)) {
        pushError(errors, "resources.templates", "must be an array when provided");
      }
      if (data.resources.examples !== undefined && !Array.isArray(data.resources.examples)) {
        pushError(errors, "resources.examples", "must be an array when provided");
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

function validateReviewRecordSchema(data) {
  return validateReviewRecord(data);
}

function validateRegistryEntrySchema(data) {
  return validateRegistryEntry(data);
}

export const schemaRegistry = Object.freeze({
  "workflow-source": Object.freeze({
    name: "workflow-source",
    version: "0.1.0",
    validate: validateWorkflowSource,
  }),
  "review-record": Object.freeze({
    name: "review-record",
    version: "0.1.0",
    validate: validateReviewRecordSchema,
  }),
  "publish-prep": Object.freeze({
    name: "publish-prep",
    version: "0.1.0",
    validate: validatePublishPrep,
  }),
  "registry-entry": Object.freeze({
    name: "registry-entry",
    version: "0.1.0",
    validate: validateRegistryEntrySchema,
  }),
});

export function getSchema(name) {
  return schemaRegistry[name] ?? null;
}

export function validateSchema(name, data) {
  const schema = getSchema(name);

  if (!schema) {
    return { valid: true, errors: [] };
  }

  return schema.validate(data);
}

export default validateSchema;
