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

function normalizeLanguage(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function mapRequiredSections(outputContract) {
  const sections = asArray(outputContract?.sections);
  return sections
    .map((section) => {
      if (typeof section !== 'string') return null;
      const trimmed = section.trim();
      return trimmed ? trimmed : null;
    })
    .filter(Boolean)
    .map((section) => section.replace(/\b([A-Z])/g, ' $1').replace(/\s+/g, ' ').trim().toLowerCase());
}

function buildTriggerPhrases(source, skillName, title) {
  const candidates = [];
  const triggerSource = asObject(source?.checklist);
  const explicit = asArray(triggerSource.triggerPhrases);
  for (const phrase of explicit) {
    if (typeof phrase === 'string' && phrase.trim()) candidates.push(phrase.trim());
  }
  if (skillName) candidates.push(`整理${skillName}`);
  if (title) candidates.push(title);
  return [...new Set(candidates)];
}

export function compileWorkflowToSpec(workflowSource) {
  const source = asObject(workflowSource);
  const fixtureId = typeof source.fixtureId === 'string' && source.fixtureId.trim() ? source.fixtureId.trim() : undefined;
  const version = typeof source.fixtureVersion === 'string' && source.fixtureVersion.trim() ? source.fixtureVersion.trim() : DEFAULT_VERSION;
  const name = typeof source.name === 'string' && source.name.trim() ? source.name.trim() : fixtureId || 'unknown-skill';
  const title = typeof source.summary === 'string' && source.summary.trim() ? source.summary.trim() : name;
  const skillName = name;

  const sourceContract = asObject(source.source);
  const outputContract = asObject(source.source?.outputContract);
  const permissions = asObject(source.permissions);
  const dependencies = asObject(source.dependencies);
  const checklist = asObject(source.checklist);

  return {
    fixtureId,
    fixtureVersion: version,
    kind: 'skill-spec',
    profile: typeof source.profile === 'string' && source.profile.trim() ? source.profile.trim() : 'standard',
    skill: {
      name: skillName,
      version,
      title,
      description: title,
      triggerPhrases: buildTriggerPhrases(source, skillName, title),
    },
    inputs: {
      required: cloneArray(sourceContract?.inputContract?.acceptedInputs?.slice ? [] : ['changeSummaryMaterial']),
      optional: ['releaseVersion', 'audience', 'outputLanguage', 'riskLevel'],
    },
    outputs: {
      primary: 'releaseNotes',
      format: typeof outputContract.format === 'string' && outputContract.format.trim() ? outputContract.format.trim() : 'markdown',
      requiredSections: mapRequiredSections(outputContract),
    },
    boundaries: {
      allowed: cloneArray(sourceContract?.inputContract?.acceptedInputs),
      denied: cloneArray(sourceContract?.inputContract?.rejectedInputs),
    },
    permissions: {
      network: Boolean(permissions.network === false ? false : permissions.network),
      externalSend: Boolean(permissions.externalSend === false ? false : permissions.externalSend),
      fileRead: Boolean(permissions.fileRead === false ? false : permissions.fileRead),
      fileWrite: Boolean(permissions.fileWrite === false ? false : permissions.fileWrite),
      destructiveOperations: Boolean(permissions.destructiveOperations === false ? false : permissions.destructiveOperations),
      privatePathRead: Boolean(permissions.privatePathRead === false ? false : permissions.privatePathRead),
    },
    dependencies: {
      noneDeclared: Boolean(dependencies.noneDeclared),
      items: cloneArray(dependencies.items),
    },
    privacy: {
      sourceTypes: cloneArray(sourceContract?.type ? [sourceContract.type] : []),
      realPrivateRepositoryDataAllowed: false,
      realCustomerDataAllowed: false,
    },
    compatibility: {
      staticValidatorOnly: true,
      runtimeReplay: 'pending',
      crossPlatform: 'pending',
      crossModel: 'pending',
      ci: 'pending',
    },
    checklist: {
      structure: checklist.structure,
      trigger: checklist.trigger,
      boundary: checklist.boundary,
      dependency: checklist.dependency,
      replay: checklist.replay,
      privacy: checklist.privacy,
      compatibility: checklist.compatibility,
    },
  };
}
