// The onboarding API owns these gates; account status labels are display-only.
export const launchPermissions = (onboarding, platform, production) => ({
  canCreate: onboarding?.canCreateApp === true,
  canPublish: (production ? onboarding?.canPublishProduction : onboarding?.canTestBuild)?.[platform] === true,
});
