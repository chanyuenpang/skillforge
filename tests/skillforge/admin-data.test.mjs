import test from 'node:test';
import assert from 'node:assert/strict';
import { getAdminOverview, listAdminSkills, listAdminRuns } from '../../src/skillforge/admin-data.mjs';

test('admin data exposes skills even when live index is unavailable', () => {
  const skillsState = listAdminSkills();
  assert.ok(Array.isArray(skillsState.skills));
  assert.ok(skillsState.skills.length > 0);
  assert.equal(typeof skillsState.skills[0].name, 'string');
  assert.equal(typeof skillsState.skills[0].description, 'string');
});

test('admin overview exposes counts and recent runs', () => {
  const overview = getAdminOverview();
  assert.ok(overview.counts.skills > 0);
  assert.ok(typeof overview.counts.runs === 'number');
  assert.ok(Array.isArray(overview.recentRuns));
});

test('admin runs return normalized matched skill arrays', () => {
  const runs = listAdminRuns({ limit: 10 });
  assert.ok(Array.isArray(runs));
  if (runs.length > 0) {
    assert.ok(Array.isArray(runs[0].matchedSkills));
    assert.equal(typeof runs[0].kind, 'string');
  }
});
