# Error Feedback Design QA

- Source visual truth: `/private/var/folders/vz/15sqf_1s0pd042m2yt1yxkbm0000gn/T/codex-clipboard-522833d8-4a32-42f3-b2f9-c362e5fde6c8.png`
- Prior implementation evidence: `/private/var/folders/vz/15sqf_1s0pd042m2yt1yxkbm0000gn/T/codex-clipboard-afa24e89-fe1f-45dc-815c-d8ac47ea4fc1.png`
- Implementation: `http://127.0.0.1:4173/#/login` with the API pointed at an intentionally unavailable local endpoint.
- Browser-rendered implementation evidence: Codex in-app browser capture, 1280 × 720 px viewport, device scale 1. The browser capture is inline and does not expose a filesystem screenshot path.
- States checked: persistent network-error notification, a second failed request during the same outage, live relative timestamp, error-details drawer, notification dismissal on drawer open, initial Runs failure, and Runs refresh failure with stale data.
- Source pixels: 1064 × 906. Prior implementation pixels: 1636 × 1196. Implementation browser viewport: 1280 × 720 at device scale 1. Crops differ, so comparison focused on the top-right notification region rather than page content.

## Full-view comparison

- The notification is anchored at the top-right without blocking the active page and is constrained to a compact 360 px width.
- Error notices now use a three-pixel semantic error border, compact padding, a relative timestamp, left-aligned actions, the existing Runnelo typography, and a neutral elevated surface.
- Two failures from different endpoints during one network outage visibly produced one notification, rather than the two duplicate cards in the prior screenshot.
- The persistent timestamp visibly advanced from `Just now` to seconds elapsed while the card remained open.
- The details view uses a right-side drawer and structured diagnostic rows rather than exposing raw stack text in the notification.

## Focused region comparison

- Notification title, explanation, `Just now` timestamp, left error border, close action, and left-aligned `View details` action were visibly checked in the browser.
- Details drawer width, label alignment, request-method/path presentation, timestamp, close action, and copy action were visibly checked.
- Four distinct notices are covered by an automated DOM test confirming that only three remain visible; two network endpoints are covered by a regression test confirming the same deduplication key.
- Runs integration tests cover both a retryable initial-load error and a non-blocking stale-data refresh error.

## Required fidelity surfaces

- Fonts and typography: existing application font stack, 400/500 weights, and Ant Design hierarchy retained.
- Spacing and layout rhythm: the notification is 360 px wide with 12–14 px padding, a 28 px content offset, compact actions, and a 440 px detail drawer.
- Colors and tokens: existing semantic error and theme tokens are used; no new hard-coded product palette was introduced.
- Image and icon fidelity: existing Ant Design icons are used; no raster assets or replacement artwork are required.
- Copy and content: every error explains what failed, what the user should do next, and exposes safe request diagnostics without query-string values.

## Comparison history

- P1: The prior implementation used Ant Design's default large notification cards and produced duplicate network-error cards for different failed endpoints.
- Fix: Added compact semantic styles and made network/timeout keys outage-scoped rather than URL-scoped.
- Post-fix evidence: browser capture showed one compact card with a left error rule, timestamp, and left-aligned action after two failed network requests; DOM count remained `1`.
- P1: Persistent notices initially kept the text `Just now` indefinitely, and Runs refresh failures were silent after data had loaded.
- Fix: Added a live relative-time component and a contextual inline refresh alert that preserves stale rows and offers retry.
- Post-fix evidence: browser capture showed the timestamp advancing to `20s ago`; automated Runs integration tests verify both initial and refetch failures.
- P2: Login network failures also invoked the page's legacy static message, creating a second presentation channel and an Ant Design context warning.
- Fix: Login now leaves transport failures to the global notification while keeping invalid-credential 401 messages local through the contextual App message API.
- Post-fix evidence: clicking Login with the API unavailable left one notification in the DOM and produced no new warning log.
- P2: The notification initially remained visible over the details drawer and obscured the drawer header/content.
- Fix: Opening `View details` now dismisses that notification before opening the drawer.
- Post-fix evidence: browser capture showed the drawer unobstructed and the notification count at zero.

## Primary interactions and console check

- Tested opening details from a persistent request failure and closing the notification/drawer.
- Tested two different failing endpoints during the same outage; one notification remained visible.
- Tested the no-backend state in the in-app browser and inspected the final computed notification layout.
- Tested that the hash-based login route does not emit an incorrect session-expired notification for a 401.
- Tested that login network failures do not add a second static message; invalid credentials retain a local message path.
- No new runtime errors or current Ant Design deprecation warnings remained after the final changes; older log entries from the pre-fix session were not reproduced.

## Findings

- No actionable P0/P1/P2 visual or interaction differences remain.

## Follow-up polish

- P3: Add a product-level retry callback only for operations whose idempotency is known; global request errors intentionally expose details but do not blindly replay mutations.

## Login Background QA

- Source visual truth: `/Users/tiger/.codex/visualizations/2026/10/10/01a1252c-d994-7eb0-b34a-42653c9baadb/runnelo-login-lifecycle-dependency.html`, `Expanded Task` variant.
- Implementation: `http://127.0.0.1:4173/#/login`.
- Browser-rendered implementation evidence: Codex in-app browser captures at 1280 × 720, 390 × 844, and 2560 × 1080 CSS px, device scale 1. The browser captures are inline and do not expose filesystem screenshot paths.
- State: Coral light theme, local login form, dependency background visible, no notification overlay.

### Full-view comparison

- The production page preserves the centered 400 px login card and clean central reading zone.
- One expanded `aggregate_daily` task shows `CREATED → SUBMITTED → WAITING → RUNNING`, with branches to `SUCCESS`, `FAILURE`, and `KILLED`.
- Six peripheral task nodes are connected by seven dependency edges, producing one coherent topology instead of unrelated line fragments.
- Background contrast remains subordinate to the form while semantic status dots remain readable.

### Focused region comparison

- The first browser capture showed the expanded lifecycle panel touching the top crop at the 1280 × 720 viewport.
- Fix: moved the lifecycle panel and its transition nodes down by 30 SVG units.
- Post-fix capture shows clear top spacing and no collision with the login card.
- A later responsive pass found the desktop `slice` scaling cropped task nodes on portrait screens and lifecycle states on ultrawide screens.
- Fix: desktop now uses `meet`; mobile uses a dedicated 390 × 844 topology with the complete seven-state lifecycle and four connected tasks.
- Post-fix evidence: the 390 × 844 capture shows all lifecycle states plus `extract`, `publish`, `quality`, and `notify`; the 2560 × 1080 DOM measurement confirms right-side task bounds remain within the viewport.
- The mobile terminal-state routes were refined into one shared trunk with separate top-edge drops for `SUCCESS`, `FAILURE`, and `KILLED`, avoiding line crossings through state nodes.
- A final implementation refactor moved topology styles, breakpoint selection, theme-token mapping, and SVG animation into typed TS modules and removed `Login.css`; a post-refactor 1280 × 720 capture showed no visual drift.

### Required fidelity surfaces

- Fonts and typography: application and monospace theme tokens are reused; labels remain secondary to login content.
- Spacing and layout rhythm: card proportions are unchanged; the lifecycle panel, side tasks, and lower tasks maintain an even perimeter around the clear center.
- Colors and tokens: all surfaces, lines, status colors, and the active Coral route use Ant Design theme variables and work with the existing theme system.
- Image and icon fidelity: the topology is a native data diagram rather than a decorative raster asset; existing Ant Design form icons and the Runnelo wordmark remain unchanged.
- Copy and content: task names and execution statuses use scheduler vocabulary already present in the product.

### Interaction and accessibility

- The background is pointer-transparent and `aria-hidden`, so it does not enter the accessibility tree or block the form.
- Active-path and running-state SVG animation is omitted when TS detects `prefers-reduced-motion`.
- Mobile styling switches to a purpose-built compact topology, reduces opacity, and removes only the nonessential lifecycle caption.
- Browser console inspection showed no errors or warnings in the final visual state.

### Findings

- No actionable P0/P1/P2 differences remain.

final result: passed
