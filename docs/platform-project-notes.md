# Working preferences

- Keep changes within the user's request. Ask before adding substantially more functionality.
- Use Git author and committer `kifrip <25287470+kifrip@users.noreply.github.com>`.
- Default validation: `npm run check` (rules and production build). For relevant UI or input changes, add `npm run test:smoke` against the running dev/preview server via `TEST_URL`.
- Run the full browser/mobile/theme suites only when the changed behavior warrants them. Balance simulations are for economic changes. Reuse successful checks during a task unless further changes or failures justify repeating them.
- Ordinary pushes run the fast CI checks. Use the manual workflow's `full_tests` option for the full mobile/theme regression pass.
- Report concise pass/fail summaries and timings. Read detailed logs or inspect screenshots when a failure or visual change requires it. Do not routinely repeat the same browser suites on the published site; verify the deployment status instead.
