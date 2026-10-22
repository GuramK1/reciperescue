# Contributing

Start with the [local setup](README.md#quick-start) and keep demo mode enabled while working on the interface. Use synthetic recipes in tests and screenshots. Never commit credentials or private recipe data.

## Code layout

| Location          | Responsibility                                                |
| ----------------- | ------------------------------------------------------------- |
| `src/app/`        | Pages, styles, and the `/api/rescue` endpoint                 |
| `src/components/` | Recipe form state, request handling, and result presentation  |
| `src/domain/`     | Shared validation, result types, and safety policy            |
| `src/server/`     | Provider calls, uploads, rescue lifecycle, and SQLite storage |
| `tests/`          | Unit tests and desktop/mobile browser tests                   |

Keep domain validation independent of the interface. Provider integrations implement `AnalysisProvider`; storage integrations implement `RescueRepository`. Keep shared server errors in `src/server/errors.ts` so uploads and request handling do not depend on the AI adapter.

## Make a change

1. Read the relevant code and tests. For Next.js changes, check the installed guides in `node_modules/next/dist/docs/`.
2. Make the smallest change that solves the problem. Reuse existing components and dependencies. Comments should explain a decision that the code cannot make clear.
3. Test the affected behavior. Preserve validation, ownership checks, upload limits, and accessible labels and focus handling.
4. Describe the problem, resulting behavior, and checks in the pull request.

Use concrete titles such as **Fix photo validation**, **Keep recipe details after a failed request**, or **Document local model setup**.

## Run checks

```sh
npm test
npm run typecheck
npm run lint
npm run build
```

For interaction or layout changes:

```sh
npx playwright install chromium
npm run test:e2e
```

`npm run test:e2e` builds the app, then Playwright checks desktop and mobile against a dedicated production server on port 3001. Keep that port free; tests never reuse an existing server. The test server forces demo mode, disables photos, and uses `./data/e2e.db`. Unit tests use in-memory SQLite.

Inspect the screenshots under `test-results/` after UI changes. Keep temporary screenshots and reports out of commits. Refresh the selected README preview at `docs/images/reciperescue.png` when the home page changes. Provider contract tests use mock HTTP responses. Run live provider checks separately with a dedicated test key, synthetic recipes, and a spending limit.

## Changes needing extra care

- **Food safety:** include an authoritative reference, review date, and regression cases. Schema validation does not prove advice is safe.
- **Provider output:** keep demo mode visibly labeled and preserve errors. Never replace a failed model call with demo advice or expose provider error bodies.
- **Storage:** add a migration before altering a released schema. Preserve session ownership and expiry behavior.
- **Design:** preserve the existing typography, spacing, and accessible interaction states. The [Figma file](https://www.figma.com/design/G6mfTbVKvfjjHKyRS1ydpq/RecipeRescue?node-id=2-19) contains the reference screens.

The [API guide](docs/api.md) documents request shapes. The [self-hosting guide](docs/self-hosting.md) documents operational limits. Check dependency and asset licenses before adding third-party material.

## Dependency checks

Run `npm audit` and `npm audit --omit=dev` to check development and runtime dependencies separately. The 2026-10-21 audit reported five high-severity development-only findings in the Next.js lint dependency chain, all related to the [braces stack-exhaustion advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm). The runtime audit reported none. No compatible fix was available at that review; recheck before upgrading, and do not use `npm audit fix --force` without reviewing the proposed changes.
