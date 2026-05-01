# PLAN.md

## 2026-05-01 Large Model UX Optimizations

Completed:
- Added `src/utils/rectangleIndexUtils.ts` and moved editor/viewer render paths to one render index per rectangle-array change for child counts, depth, descendants, z-index, locked ancestors, font sizing, resize/drag permissions, and render ordering.
- Passed heatmap colors into `RectangleComponent` as renderer-computed props instead of per-rectangle store subscriptions.
- Replaced autosave JSON string comparisons with reference checks and deferred saves while drag, resize, hierarchy drag, or virtual drag is active, flushing once when idle.
- Added `MultiSelectActionControls` for floating toolbar and property panel bulk operations: alignment, distribution, same size, copy, duplicate, and delete.
- Added shared viewport fit math, an editor `Fit View` toolbar action, `F` shortcut registration, draggable minimap viewport behavior, persistent desktop hierarchy search with keyboard match navigation, and selected-rectangle breadcrumb paths.
- Fixed the hierarchy tree search auto-expand loop so search no longer repeatedly re-renders under test.
- Fixed URL viewer heatmap scoping so diagrams without `heatmapState` do not inherit persisted editor heatmap colors or legends.

Tests:
- Added unit coverage for rectangle indexing, z-index parity, viewport fitting, and autosave deferral.
- Added component coverage for multi-select action availability and hierarchy search keyboard navigation.
- Added regression coverage for URL viewer heatmap scoping when persisted editor heatmap state is enabled.

Verification:
- `node node_modules/eslint/bin/eslint.js . --max-warnings 0` passes.
- `node node_modules/typescript/bin/tsc --noEmit` passes.
- `node node_modules/vitest/vitest.mjs run src/test/ViewerRectangleRenderer.test.tsx src/test/MultiSelectActionControls.test.tsx src/test/HierarchyOutlinePanel.test.tsx src/test/viewportUtils.test.ts src/test/rectangleIndexUtils.test.ts src/test/autosaveSubscription.test.ts` passes: 18 tests across 6 files.
- `node node_modules/vite/bin/vite.js build` passes.
- `npm run lint` passes.
- `npm run typecheck` passes.
- `npm run test:run` passes: 149 tests across 11 files.
- `npm run build` passes.
- Browser-smoked the large fixture in the editor after reload: 1,062 rectangles render, `Fit View` is available and applies a fitted transform, and no browser console errors were captured.

## 2026-05-01 Large Model UX Baseline

Completed:
- Added `public/test-models/large-diagram.json` as a deterministic stress fixture with 1,062 rectangles, 6 roots, 48 text labels, four hierarchy levels, manual positioning, descriptions, and heatmap values.
- Validated the fixture for v2.0 format, duplicate IDs, and missing parent references.

Verification:
- `npm run lint` passes.
- `npm run build` passes.
- Browser-tested the fixture through the URL viewer at `http://localhost:3000/?url=http%3A%2F%2Flocalhost%3A3000%2Ftest-models%2Flarge-diagram.json`.
- Confirmed 1,062 rendered rectangle components, working pan, working wheel zoom to 110%, and no captured browser console errors.

## 2026-04-29 Dependency Refresh

Completed:
- Updated runtime and development packages to current compatible versions.
- Kept Vite on `7.3.2` because `vite-plugin-pwa@1.2.0` does not currently peer with Vite 8.
- Removed obsolete `@types/react-router-dom`; React Router 7 provides its own types.
- Added an npm override so Workbox uses `@rollup/plugin-terser@^1.0.0`, resolving the vulnerable `serialize-javascript` chain.
- Preserved the project's existing classic React Hooks lint scope after `eslint-plugin-react-hooks@7` expanded its recommended rules to include React Compiler checks.

Verification:
- `npm audit` passes with 0 vulnerabilities.
- `npm run lint` passes.
- `npm run typecheck` passes.
- `npm run build` passes.
- `npm run test:run` passes: 132 tests across 6 files.

Follow-up:
- Revisit Vite 8 once `vite-plugin-pwa` publishes a compatible peer range.
- Consider the build warnings for bundle size and mixed static/dynamic imports when planning performance work.
