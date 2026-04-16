# Browser-container checklist (for automatic visual screenshots)

Use this checklist to enable automatic screenshots for every visual change in agent-driven PRs.

## 1) Runtime prerequisites

- [ ] Browser tool is enabled in the agent runtime (e.g., `browser_container` / Playwright-backed session).
- [ ] Outbound network access is allowed for local preview URLs (or internal tunnel URL is exposed).
- [ ] The runtime user has permission to launch headless Chromium.

## 2) App startup contract

- [ ] CI/runner starts the app in deterministic mode (same seed/env each run).
- [ ] Dev or preview server is started before screenshot step (`npm run dev` or `npm run preview`).
- [ ] Healthcheck endpoint or URL wait condition is configured (do not take screenshots before app is ready).

## 3) Screenshot policy

- [ ] Define mandatory pages/components for capture (e.g., Dashboard, Deposits, Income Tracker).
- [ ] Define viewport(s): desktop + mobile (at least one each).
- [ ] Define naming convention: `artifacts/screenshots/<pr>/<page>-<viewport>.png`.

## 4) PR automation

- [ ] Add a pipeline step that runs screenshot capture only when UI files changed.
- [ ] Upload screenshots as build artifacts.
- [ ] Bot/agent posts markdown links to screenshots in PR body.

## 5) Reliability guardrails

- [ ] Disable animations/transitions for visual diff stability when possible.
- [ ] Freeze time/date and locale for deterministic rendering.
- [ ] Fail pipeline only on hard errors (browser boot/app down), not on minor pixel differences unless visual diffing is explicitly required.

## 6) Minimal fallback behavior

- [ ] If browser tool is unavailable, agent must explicitly state: “visual screenshot unavailable in current runtime”.
- [ ] Agent should still provide exact commands used and files changed.
