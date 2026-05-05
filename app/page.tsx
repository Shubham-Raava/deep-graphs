"use client";

import { useState, useSyncExternalStore } from "react";
import { Dashboard } from "./components/Dashboard";
import { OnboardingFlow } from "./components/OnboardingFlow";
import { hasPersistedKnowledge } from "./lib/localStorageState";

export default function Home() {
  const [sessionOnboarded, setSessionOnboarded] = useState<boolean | null>(null);

  const persistedOnboarded = useSyncExternalStore(
    () => () => undefined,
    () => hasPersistedKnowledge(),
    () => false,
  );
  const isOnboarded = sessionOnboarded ?? persistedOnboarded;

  if (!isOnboarded) {
    return <OnboardingFlow onComplete={() => setSessionOnboarded(true)} />;
  }

  return <Dashboard onResetComplete={() => setSessionOnboarded(false)} />;
}
