# PLAN.md

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
