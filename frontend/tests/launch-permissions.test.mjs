import assert from 'node:assert/strict';
import test from 'node:test';
import { launchPermissions } from '../src/launchPermissions.js';

test('backend can deny actions even when an account is marked verified', () => {
  const onboarding = { canCreateApp: false, canTestBuild: { ANDROID: false }, canPublishProduction: { ANDROID: false } };
  assert.deepEqual(launchPermissions(onboarding, 'ANDROID', false), { canCreate: false, canPublish: false });
  assert.equal(launchPermissions(onboarding, 'ANDROID', true).canPublish, false);
});

test('backend grants test and production builds independently per platform', () => {
  const onboarding = {
    canCreateApp: true,
    canTestBuild: { ANDROID: true, IOS: false },
    canPublishProduction: { ANDROID: false, IOS: true },
  };
  assert.deepEqual(launchPermissions(onboarding, 'ANDROID', false), { canCreate: true, canPublish: true });
  assert.equal(launchPermissions(onboarding, 'ANDROID', true).canPublish, false);
  assert.equal(launchPermissions(onboarding, 'IOS', false).canPublish, false);
  assert.equal(launchPermissions(onboarding, 'IOS', true).canPublish, true);
});

test('actions stay disabled while onboarding permissions are unavailable', () => {
  for (const onboarding of [null, {}, { canCreateApp: 'true', canTestBuild: { ANDROID: 'true' } }]) {
    assert.deepEqual(launchPermissions(onboarding, 'ANDROID', false), { canCreate: false, canPublish: false });
  }
});
