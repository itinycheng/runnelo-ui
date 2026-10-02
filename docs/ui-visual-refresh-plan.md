# Runnelo UI Visual Refresh Plan

Status: phase 1 theme foundation implemented; theme selection in review  
Last updated: 2026-10-02

## Goal

Keep the existing React, TypeScript, Vite, Ant Design, Ant Design Pro Components architecture and the current overall layouts. Evolve the UI toward a concise, orderly, moderately dense engineering-tool aesthetic inspired by the restraint of shadcn/ui and the operational clarity of Dagster and Kestra.

## Constraints

- Preserve routing, information architecture, business behavior, and the recognizable page layouts.
- Prefer Ant Design seed/component tokens, component properties, CSS variables, and small reusable wrappers.
- Keep handwritten CSS small and focused on cases that tokens cannot express, such as React Flow selection, resizers, and structural layout behavior.
- Do not introduce Tailwind or shadcn/ui as dependencies merely to imitate their appearance.
- Avoid decorative gradients, glass effects, widespread shadows, large radii, and a globally over-compact interface.
- Conventional SaaS blue is not the default brand direction; choose a more distinctive non-blue accent before implementation.

## Existing Strengths

- The top navigation, workspace context, full-bleed Studio/Query workspaces, and management layouts already have a sound structure.
- Shared page spacing exists in `src/constants/layout.ts`.
- The root ConfigProvider already exposes Ant Design CSS variables.
- ProTable, shared row actions, compact menu configuration, and status utilities provide useful foundations.
- Global CSS is limited in size and mostly handles cases that are difficult to express through component properties.

## Main Findings

1. The Dashboard, ProTable pages, and Studio/Query workbenches each use a reasonable local style, but do not yet feel like one system.
2. Global `borderRadius: 0` makes the interface rigid. A restrained 4/6/8px radius scale would remain technical without feeling raw.
3. Global `margin: 6` and `padding: 6` affect many derived Ant Design tokens. Density should instead be tuned at component level.
4. Colors are split between root theme tokens, ProLayout tokens, page constants, status utilities, and hard-coded component styles.
5. Dashboard metric cards use large colored gradients that compete with trend and failure information.
6. Category tags use too many hues. Color should primarily communicate runtime state; neutral categories should usually stay neutral.
7. Repeated visual styles should become small primitives rather than additional global CSS.
8. Motion is sparse and inconsistent. Some elements use `transition: all`; motion should be limited to color, border, opacity, and transform.
9. Visible accessibility risks include small low-contrast secondary text, subtle focus states, and small icon-only controls. Keyboard, assistive-technology, and measured contrast testing remain required.

## Page Review

- Login: functional but visually generic; needs clearer branding and persistent labels.
- Dashboard: useful content, but the colored metrics dominate and empty chart states consume too much space.
- Runs: strongest first list-page pilot; density is good, while filters, actions, and statuses need refinement.
- Studio: strongest engineering-tool foundation; improve panel boundaries, active states, tabs, and dense tree readability.
- Query: sound workbench layout; strengthen toolbar/editor/result hierarchy and empty-state treatment.
- Admin Resources: understandable and efficient, but visually close to default Ant Design and missing consistent page-heading treatment.

## Proposed Building Blocks

- Central `appTheme` in `src/theme.ts`.
- Small `PageHeader` and section-header conventions.
- Token-driven `Surface` or consistent `Card` usage.
- `MetricCard` for neutral dashboard metrics with restrained semantic accents.
- `StatusBadge` for semantic state and a neutral treatment for categories.
- Shared ProTable defaults for search layout, toolbar, density, borders, pagination, and row actions.
- Compact empty-state convention for tables, editors, charts, and side panels.

## Delivery Sequence

1. Theme foundation and application chrome.
2. Shared surface, header, status, metric, table, and action patterns.
3. Representative pilots: Runs, Dashboard, and Studio.
4. Apply the system to Admin, Query, Login, forms, modals, and drawers.
5. Motion, focus visibility, contrast, reduced-motion behavior, and responsive QA.

Each phase should remain independently reviewable and avoid unrelated functional changes.

## Theme Review

The earlier Carbon + Ultraviolet direction was retired because its concentrated purple branding was too close to Kestra. Three live Token presets are available from the palette icon in the application header:

- Flink Coral — graphite surfaces with a restrained Flink-derived coral signature.
- Graphite Mono — nearly monochrome and tool-like.
- Terminal Moss — muted terminal green with an industrial systems feel.

Flink Coral is the default preset. The selected preset is stored locally for comparison; keep the other two available until the visual review is complete.

## Phase 1 Result

- The root Ant Design theme and ProLayout palette now live in `src/theme.ts`.
- Broad `margin: 6`, `padding: 6`, and square-radius overrides were removed.
- The base system now uses a 4/6/8px radius scale, 32/28px controls, neutral borders and surfaces, restrained focus rings, shadowless buttons, and component-level density settings.
- Header branding is smaller and flatter: a violet mark with graphite wordmark instead of a prominent blue gradient.
- Existing Dashboard, Runs, Admin, Studio, and Query layouts remain unchanged.

## Studio DAG Preview Fix

- Seeded mock workflows now return a stable three-node, two-edge DAG through the same legacy-compatible API shape as a real backend.
- The editor remounts the React Flow viewport after asynchronous graph restoration so the graph is visible without pressing Fit View.
- Truly empty workflows show an explicit instruction to drag tasks from the left panel instead of presenting an unexplained blank canvas.
- The narrow left palette is the original draggable task-type icon list. It must not be replaced by a wide list of workflow-owned task instances.
