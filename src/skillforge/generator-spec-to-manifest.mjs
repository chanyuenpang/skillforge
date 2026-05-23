const DEFAULT_VERSION = '0.1.0';

function asObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function cloneArray(values) {
  return asArray(values).map((item) => item);
}

function normalizeString(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function normalizeBoolean(value, fallback = false) {
  return typeof value === 'boolean' ? value : fallback;
}

function manifestNameFromSpec(spec) {
  return normalizeString(spec?.skill?.name) || 'unknown-skill';
}

function manifestTitleFromSpec(spec) {
  return normalizeString(spec?.skill?.title) || manifestNameFromSpec(spec);
}

function manifestDescriptionFromSpec(spec) {
  return normalizeString(spec?.skill?.description) || manifestTitleFromSpec(spec);
}

function buildManifestPermissions(spec) {
  const permissions = asObject(spec?.permissions);
  return {
    network: normalizeBoolean(permissions.network, false),
    externalSend: normalizeBoolean(permissions.externalSend, false),
    fileRead: normalizeBoolean(permissions.fileRead, false),
    fileWrite: normalizeBoolean(permissions.fileWrite, false),
    destructiveOperations: normalizeBoolean(permissions.destructiveOperations, false),
    privatePathRead: normalizeBoolean(permissions.privatePathRead, false),
  };
}

function buildManifestBoundaries(spec) {
  const boundaries = asObject(spec?.boundaries);
  return {
    allowed: cloneArray(boundaries.allowed),
    denied: cloneArray(boundaries.denied),
  };
}

function buildManifestTriggers(spec) {
  return cloneArray(spec?.skill?.triggerPhrases);
}

function buildManifestInputs(spec) {
  const inputs = asObject(spec?.inputs);
  return {
    required: cloneArray(inputs.required),
    optional: cloneArray(inputs.optional),
  };
}

function buildManifestOutputs(spec) {
  const outputs = asObject(spec?.outputs);
  return {
    primary: normalizeString(outputs.primary),
    format: normalizeString(outputs.format) || 'markdown',
    requiredSections: cloneArray(outputs.requiredSections),
  };
}

export function compileSpecToManifest(skillSpec) {
  const spec = asObject(skillSpec);
  const skill = asObject(spec.skill);
  const compatibility = asObject(spec.compatibility);
  const privacy = asObject(spec.privacy);
  const dependencies = asObject(spec.dependencies);

  return {
    fixtureId: normalizeString(spec.fixtureId),
    fixtureVersion: normalizeString(spec.fixtureVersion) || DEFAULT_VERSION,
    kind: 'skill-manifest',
    version: normalizeString(skill.version) || normalizeString(spec.fixtureVersion) || DEFAULT_VERSION,
    skill: {
      name: manifestNameFromSpec(spec),
      title: manifestTitleFromSpec(spec),
      description: manifestDescriptionFromSpec(spec),
      triggerPhrases: buildManifestTriggers(spec),
    },
    inputs: buildManifestInputs(spec),
    outputs: buildManifestOutputs(spec),
    boundaries: buildManifestBoundaries(spec),
    permissions: buildManifestPermissions(spec),
    dependencies: {
      noneDeclared: normalizeBoolean(dependencies.noneDeclared, false),
      items: cloneArray(dependencies.items),
    },
    privacy: {
      sourceTypes: cloneArray(privacy.sourceTypes),
      realPrivateRepositoryDataAllowed: normalizeBoolean(privacy.realPrivateRepositoryDataAllowed, false),
      realCustomerDataAllowed: normalizeBoolean(privacy.realCustomerDataAllowed, false),
      realPersonalDataAllowed: normalizeBoolean(privacy.realPersonalDataAllowed, false),
    },
    compatibility: {
      staticValidatorOnly: normalizeBoolean(compatibility.staticValidatorOnly, true),
      runtimeReplay: normalizeString(compatibility.runtimeReplay) || 'pending',
      crossPlatform: normalizeString(compatibility.crossPlatform) || 'pending',
      crossModel: normalizeString(compatibility.crossModel) || 'pending',
      ci: normalizeString(compatibility.ci) || 'pending',
    },
    checklist: {
      structure: normalizeString(spec.checklist?.structure),
      trigger: normalizeString(spec.checklist?.trigger),
      boundary: normalizeString(spec.checklist?.boundary),
      dependency: normalizeString(spec.checklist?.dependency),
      replay: normalizeString(spec.checklist?.replay),
      privacy: normalizeString(spec.checklist?.privacy),
      compatibility: normalizeString(spec.checklist?.compatibility),
    },
  };
}
