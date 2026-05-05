# Learner model: mastery, confusion, and exposure

This document mirrors the runtime behavior in [`app/lib/localStorageState.ts`](../app/lib/localStorageState.ts) and related types in [`app/types/knowledgeGraph.ts`](../app/types/knowledgeGraph.ts).

## Stored state per concept

| Field | Range | Meaning |
|-------|--------|---------|
| `mastery_score` | 0–1 | Summarized competence on the concept |
| `exposure_score` | 0–1 | Engagement (views, quizzes) |
| `confusion_score` | 0–1 | Modeled struggle / uncertainty |
| `last_updated` | ms epoch | Last time this row was written |
| `last_mastery_update_reason` | enum (optional) | Why scores last changed (telemetry / debugging) |

New concepts hydrate with roughly mastery **0.1**, exposure **~0.3**, confusion **~0.2**.

## Two mastery update paths

1. **Quiz path** (`submitQuizAttempt`): weighted accuracy / speed / hints, transitive prerequisite cap with soft blend, EMA with prior mastery. This is the primary measurement path for assessments.

2. **UI path** (`applyLearningEvent`): small capped deltas for taps (“understood”, “confusing”, “view”, etc.). Intentionally weaker than quiz math so self-report does not outweigh measured performance.

Skill onboarding uses [`answerToMastery`](../app/lib/localStorageState.ts) (yes/somewhat/no → 0.7 / 0.4 / 0.1) for initial seeds.

## Quiz mastery formula (snapshot)

From [`calculateMasteryFromQuiz`](../app/lib/localStorageState.ts):

- **60%** accuracy  
- **20%** speed (vs ~2 minutes)  
- **20%** inverse hint density  

Then: transitive prerequisite minimum cap → soft cap blend → EMA with stored mastery.

## Confusion

**Quiz:** bumps from wrong ratio and hints, smoothed with prior; extra decay when accuracy ≥ 0.8.

**UI:** “confusing” / doubt increase confusion; “view” applies a small decay (revisit reinforcement).

**Weak subtopics (Gemini):** when `subtopic_breakdown` shows weak areas, confusion can rise slightly on **other same-subject concepts** whose name/chapter text matches the subtopic label (spread signal).

## Spaced interaction gap

When the learner touches a concept after **~1.5+ idle days**, a mild adjustment may apply before other updates: small mastery decay (forgetting) and optional confusion easing after longer gaps. See `applyInteractionGapAdjustment` in code.

## Where scores are consumed

- [`computeNextBestConcept`](../app/lib/graphLearningMetrics.ts): ranks by roughly `mastery - 0.55 * confusion` (plus focal / exposure tweaks).
- [`computeCoverageMetrics`](../app/lib/graphLearningMetrics.ts): engagement and prerequisite blocking use mastery and exposure thresholds.

## Future extensions

- IRT / Bayesian item models if questions are calibrated.  
- Stronger subtopic → concept-ID mapping than text match.  
- Explicit merge of UI vs quiz in one latent variable.
