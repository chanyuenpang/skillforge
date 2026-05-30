function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function hasText(value) {
  return typeof value === 'string' && value.trim() !== '';
}

function isStringArray(value) {
  return Array.isArray(value) && value.every((item) => hasText(item));
}

function pushError(errors, field, message) {
  errors.push({ field, message });
}

function uniq(items = []) {
  return [...new Set(items.filter((item) => hasText(item)).map((item) => String(item).trim()))];
}

export const REGISTRY_STATUS_VALUES = Object.freeze(new Set(['registered', 'failed']));

export function createRegistryEntry(skillIr, registryInputs = {}) {
  if (!isPlainObject(skillIr)) {
    throw new Error('Cannot create RegistryEntry: skillIr must be an object');
  }

  const now = new Date().toISOString();
  const registryId = hasText(registryInputs.registryId) ? registryInputs.registryId : skillIr.id;
  const status = REGISTRY_STATUS_VALUES.has(registryInputs.status) ? registryInputs.status : 'registered';

  return {
    kind: 'registry-entry',
    registryId,
    version: hasText(registryInputs.version) ? registryInputs.version : '1.0.0',
    sourceId: hasText(registryInputs.sourceId) ? registryInputs.sourceId : null,
    name: hasText(skillIr.name) ? skillIr.name : registryId,
    skillKind: skillIr.kind === 'subagent' ? 'subagent' : 'skill',
    description: hasText(skillIr.description) ? skillIr.description : '',
    sourceRef: isPlainObject(skillIr.sourceRef) ? { ...skillIr.sourceRef } : { path: null },
    routingProfile: {
      skillRole: hasText(skillIr.skillRole) ? skillIr.skillRole.trim() : 'reference',
      skillCategory: hasText(skillIr.skillCategory) ? skillIr.skillCategory.trim() : 'general',
      applicableScenes: uniq(skillIr.applicableScenes || []),
      triggerHints: uniq(skillIr.triggerHints || []),
      requiredTools: uniq(skillIr.requiredTools || []),
      toolSignals: uniq(skillIr.toolSignals || []),
      entrypointHints: uniq(skillIr.entrypointHints || []),
      toolFamilies: uniq(skillIr.toolFamilies || []),
      reportHints: uniq(skillIr.reportHints || []),
      stopRuleHints: uniq(skillIr.stopRuleHints || []),
      constraintHints: uniq(skillIr.constraintHints || []),
      workflowSkeletonSummary: hasText(skillIr.workflowSkeletonSummary) ? skillIr.workflowSkeletonSummary.trim() : '',
      tags: uniq(skillIr.tags || []),
    },
    registryMeta: {
      status,
      registeredAt: now,
      updatedAt: now,
      scanId: hasText(registryInputs.scanId) ? registryInputs.scanId : null,
      notes: Array.isArray(registryInputs.notes) ? registryInputs.notes.filter(hasText) : [],
    },
  };
}

export function validateRegistryEntry(record) {
  const errors = [];

  if (!isPlainObject(record)) {
    pushError(errors, '$', 'registry-entry must be an object');
    return { valid: false, errors };
  }

  if (record.kind !== 'registry-entry') pushError(errors, 'kind', 'must be registry-entry');
  if (!hasText(record.registryId)) pushError(errors, 'registryId', 'is required');
  if (!hasText(record.version)) pushError(errors, 'version', 'is required');
  if (!hasText(record.name)) pushError(errors, 'name', 'is required');
  if (!['skill', 'subagent'].includes(record.skillKind)) pushError(errors, 'skillKind', 'must be skill|subagent');
  if (!hasText(record.description)) pushError(errors, 'description', 'is required');

  if (!isPlainObject(record.sourceRef)) {
    pushError(errors, 'sourceRef', 'is required and must be an object');
  } else if (!hasText(record.sourceRef.path)) {
    pushError(errors, 'sourceRef.path', 'is required');
  }

  if (!isPlainObject(record.routingProfile)) {
    pushError(errors, 'routingProfile', 'is required and must be an object');
  } else {
    if (record.routingProfile.skillRole != null && !hasText(record.routingProfile.skillRole)) {
      pushError(errors, 'routingProfile.skillRole', 'must be a non-empty string when provided');
    }
    if (record.routingProfile.skillCategory != null && !hasText(record.routingProfile.skillCategory)) {
      pushError(errors, 'routingProfile.skillCategory', 'must be a non-empty string when provided');
    }
    const arrayFields = [
      'applicableScenes',
      'triggerHints',
      'requiredTools',
      'toolSignals',
      'entrypointHints',
      'toolFamilies',
      'reportHints',
      'stopRuleHints',
      'constraintHints',
      'tags',
    ];
    for (const field of arrayFields) {
      if (!isStringArray(record.routingProfile[field])) {
        pushError(errors, `routingProfile.${field}`, 'must be an array of non-empty strings');
      }
    }
    if (record.routingProfile.workflowSkeletonSummary != null && typeof record.routingProfile.workflowSkeletonSummary !== 'string') {
      pushError(errors, 'routingProfile.workflowSkeletonSummary', 'must be a string');
    }
  }

  if (!isPlainObject(record.registryMeta)) {
    pushError(errors, 'registryMeta', 'is required and must be an object');
  } else {
    if (!REGISTRY_STATUS_VALUES.has(record.registryMeta.status)) {
      pushError(errors, 'registryMeta.status', 'must be one of registered|failed');
    }
    if (!hasText(record.registryMeta.registeredAt)) pushError(errors, 'registryMeta.registeredAt', 'is required');
    if (!hasText(record.registryMeta.updatedAt)) pushError(errors, 'registryMeta.updatedAt', 'is required');
    if (record.registryMeta.scanId != null && !hasText(record.registryMeta.scanId)) {
      pushError(errors, 'registryMeta.scanId', 'must be a non-empty string when provided');
    }
  }

  return { valid: errors.length === 0, errors };
}

export default {
  REGISTRY_STATUS_VALUES,
  createRegistryEntry,
  validateRegistryEntry,
};
