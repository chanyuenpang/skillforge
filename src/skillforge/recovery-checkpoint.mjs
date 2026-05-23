import { loadById as loadReviewById, list as listReviews } from './review-store.mjs';
import { loadById as loadPrepById, list as listPreps } from './prep-store.mjs';
import { loadById as loadRegistryById, list as listRegistries } from './registry-store.mjs';

function pickFixtureId(input) {
  return typeof input === 'string' ? input : '';
}

function safeLoad(loader, fixtureId) {
  try {
    return loader(fixtureId) ?? null;
  } catch {
    return null;
  }
}

function stageFromReview(review) {
  if (!review) return 'none';
  if (review.status === 'approved' && review.decision === 'approve') return 'review-approved';
  if (review.status === 'approved') return 'review-approved';
  if (review.status === 'blocked') return 'review-blocked';
  if (review.status === 'rejected') return 'review-rejected';
  return 'review-seen';
}

function stageFromPrep(prep) {
  if (!prep) return 'none';
  if (prep.readiness?.overall === 'ready') return 'prep-ready';
  return 'prep-not-ready';
}

function stageFromRegistry(entry) {
  if (!entry) return 'none';
  return `registry-${entry.registryMeta?.status ?? 'unknown'}`;
}

function latestTimestamp(...values) {
  const valid = values.filter((v) => typeof v === 'string' && !Number.isNaN(Date.parse(v)));
  if (valid.length === 0) return null;
  return valid.sort().at(-1) ?? null;
}

export function lastCheckpoint(fixtureId) {
  const id = pickFixtureId(fixtureId);
  if (!id) {
    return {
      fixtureId: '',
      stage: 'none',
      canResume: false,
      review: null,
      prep: null,
      registry: null,
      updatedAt: null,
    };
  }

  const review = safeLoad(loadReviewById, id);
  const prep = safeLoad(loadPrepById, id);
  const registry = safeLoad(loadRegistryById, id);

  const stage = registry
    ? stageFromRegistry(registry)
    : prep
      ? stageFromPrep(prep)
      : review
        ? stageFromReview(review)
        : 'none';

  return {
    fixtureId: id,
    stage,
    canResume: Boolean(review || prep || registry),
    review,
    prep,
    registry,
    updatedAt: latestTimestamp(review?.updatedAt, prep?.handoffMeta?.updatedAt, registry?.registryMeta?.updatedAt),
  };
}

export function canResume(fixtureId) {
  return lastCheckpoint(fixtureId).canResume;
}

export function listCheckpointProgress() {
  const ids = new Set([
    ...listReviews().map((entry) => entry.fixtureId).filter(Boolean),
    ...listPreps().map((entry) => entry.reviewRecordRef?.fixtureId ?? entry.fixtureId).filter(Boolean),
    ...listRegistries().map((entry) => entry.fixtureId).filter(Boolean),
  ]);

  return [...ids].map((id) => lastCheckpoint(id));
}

export default {
  lastCheckpoint,
  canResume,
  listCheckpointProgress,
};
