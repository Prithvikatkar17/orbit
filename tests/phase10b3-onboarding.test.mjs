import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  SettingsSchema,
  ONBOARDING_CURRENT_VERSION,
  THEME_PERSONALITIES,
} from "../src/lib/schemas/settings.ts";

function readSrc(relPath) {
  return fs.readFileSync(path.resolve(relPath), "utf8");
}

// ---------------------------------------------------------------------------
// 1. Settings Schema Versioned Onboarding Attributes
// ---------------------------------------------------------------------------
test("Phase 10B.3 — SettingsSchema supports versioned onboarding completion fields", () => {
  assert.equal(ONBOARDING_CURRENT_VERSION, 1, "ONBOARDING_CURRENT_VERSION must be 1");
  assert.equal(THEME_PERSONALITIES.length, 7, "All 7 theme personalities must be available");

  // Valid settings without onboarding (backward compatibility for existing records)
  const legacyRecord = {
    id: "user_settings",
    theme: "system",
    themePersonality: "archivist",
    updatedAt: new Date().toISOString(),
  };
  const parsedLegacy = SettingsSchema.parse(legacyRecord);
  assert.equal(parsedLegacy.onboardingCompletedVersion, undefined);
  assert.equal(parsedLegacy.onboardingCompletedAt, undefined);

  // Settings with completed onboarding
  const completedRecord = {
    id: "user_settings",
    theme: "dark",
    themePersonality: "midnight",
    onboardingCompletedVersion: 1,
    onboardingCompletedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  const parsedCompleted = SettingsSchema.parse(completedRecord);
  assert.equal(parsedCompleted.onboardingCompletedVersion, 1);
  assert.ok(parsedCompleted.onboardingCompletedAt);
});

// ---------------------------------------------------------------------------
// 2. Onboarding Service Implementation & Contract
// ---------------------------------------------------------------------------
test("Phase 10B.3 — Onboarding service implements first-launch detection and persistence", () => {
  const service = readSrc("src/lib/services/onboarding-service.ts");

  // Key functions exported
  assert.match(service, /export async function checkOnboardingStatus/);
  assert.match(service, /export async function completeOnboarding/);
  assert.match(service, /export const ONBOARDING_STORAGE_KEY/);

  // Differentiates fresh vs existing users
  assert.match(service, /needsOnboarding/, "Must calculate needsOnboarding flag");
  assert.match(service, /isExistingUser/, "Must calculate isExistingUser flag");
  assert.match(service, /db\.tasks\.count/, "Must check existing user entities in DB");
  assert.match(service, /db\.habits\.count/, "Must check existing user habits in DB");

  // Safe fallback on IndexedDB error
  assert.match(service, /catch.*err.*IndexedDB/s, "Must handle IndexedDB failure gracefully without throwing");

  // Never overwrite existing user theme
  assert.match(service, /autoMarkExistingUserCompleted/, "Must auto-mark existing users without modifying their theme");
});

// ---------------------------------------------------------------------------
// 3. Onboarding Wizard 3-Step Structure & Components
// ---------------------------------------------------------------------------
test("Phase 10B.3 — OnboardingWizard implements the 3-step onboarding flow", () => {
  const wizard = readSrc("src/components/onboarding/onboarding-wizard.tsx");

  // Step 1: Discover
  assert.match(wizard, /Your Personal Space\. Everything in Place\./, "Step 1 must communicate ORBIT core purpose");
  assert.match(wizard, /Tasks & Goals/, "Must introduce Tasks");
  assert.match(wizard, /Daily Routines/, "Must introduce Habits/Routines");
  assert.match(wizard, /Calendar/, "Must introduce Calendar");
  assert.match(wizard, /Personal Library/, "Must introduce Library");
  assert.match(wizard, /Insights & Rhythm/, "Must introduce Insights");

  // Step 2: Choose Personality
  assert.match(wizard, /Choose Your Personality/, "Step 2 must present theme selection");
  assert.match(wizard, /THEME_PERSONALITIES/, "Must map through all 7 theme personalities");
  assert.match(wizard, /ThemePersonalityCard/, "Must reuse theme preview cards");
  assert.match(wizard, /handleSelectPersonality/, "Must support live theme switching during onboarding");

  // Step 3: Preview Workspace
  assert.match(wizard, /Preview Your Workspace/, "Step 3 must preview the dashboard");
  assert.match(wizard, /Today's Focus|Today&apos;s Focus/, "Preview must show Today's Focus tile");
  assert.match(wizard, /Daily Routines/, "Preview must show Daily Routines tile");
  assert.match(wizard, /Enter ORBIT/, "Must provide Enter ORBIT completion action");

  // Stepper progress indicator
  assert.match(wizard, /aria-label="Onboarding Progress"/, "Must include accessible progress stepper");
  assert.match(wizard, /aria-current=\{isActive \? "step" : undefined\}/, "Must announce active step");

  // Skip capability
  assert.match(wizard, /Skip for now|Skip setup/, "Must provide a way to skip onboarding");
});

// ---------------------------------------------------------------------------
// 4. Application Shell Mounting & Zero Legacy Color Classes
// ---------------------------------------------------------------------------
test("Phase 10B.3 — Application shell mounts OnboardingWizard inside ThemePersonalityProvider", () => {
  const layout = readSrc("src/app/layout.tsx");

  assert.match(layout, /OnboardingWizard/, "layout.tsx must import OnboardingWizard");
  assert.match(
    layout,
    /<ThemePersonalityProvider>.*<OnboardingWizard \/>.*<\/ThemePersonalityProvider>/s,
    "OnboardingWizard must be mounted inside ThemePersonalityProvider"
  );
});

test("Phase 10B.3 — Onboarding components use Quiet Desk semantic orbit-* tokens", () => {
  const files = [
    "src/components/onboarding/onboarding-wizard.tsx",
    "src/components/theme-preview-card.tsx",
    "src/lib/services/onboarding-service.ts",
  ];

  for (const f of files) {
    const content = readSrc(f);
    assert.doesNotMatch(
      content,
      /\b(?:bg|text|border)-(?:slate|indigo|violet)-\d{2,3}\b/,
      `${f} must not contain hardcoded slate/indigo/violet classes`
    );
  }
});
