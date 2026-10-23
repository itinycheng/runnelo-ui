# UI system

This page records Runnelo's UI direction and shared visual sources of truth.

## Product direction

Runnelo is a task scheduling UI. Keep pages clean, orderly, and practical for
engineering work:

- Make task state, dependencies, errors, and primary actions easy to scan.
- Use consistent spacing, alignment, and headings. Keep tables, forms, logs,
  and DAGs compact enough for work and spacious enough to read.
- Use neutral surfaces. Reserve accent color for focus and selection, and
  semantic color for status. Avoid decorative gradients, heavy shadows, and
  competing colors.
- Separate navigation, the active editor or canvas, and details clearly.

Apply these criteria to the screens a task changes.

## Theme and component tokens

`src/theme.ts` defines Coral, Graphite, and Moss palettes, Ant Design tokens,
and ProLayout tokens. Coral is the default. `src/stores/themeStore.ts`
persists the selection. `src/App.tsx` applies the theme; `MainLayout.tsx`
applies ProLayout tokens. `compactMenuTheme` sets popup menu density.

Change shared colors, sizes, surfaces, and interaction states in their tokens.
Components should use theme tokens or CSS variables rather than copy palette
values.

## Spacing and global rules

`src/constants/layout.ts` owns `PAGE_PADDING` and `SECTION_GAP`. MainLayout
applies page spacing; Studio and Query manage their full-bleed workspaces.
`src/global.css` holds shared typography, table, focus, motion, and scrollbar
rules.

Use component props first. Colocate CSS needed for layout, responsive behavior,
Monaco, XYFlow, or another third-party surface. Keep one-screen rules out of
global CSS.

## UI review

The owner reviews UI behavior and appearance. Handoff names affected screens,
states, interactions, and a short manual verification path.
