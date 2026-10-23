/**
 * Shared layout spacing — the single source of truth for page chrome so every
 * screen lines up. Applied centrally in MainLayout (Studio is exempt: it's a
 * full-bleed IDE surface). Pages should not re-declare their own outer padding.
 */

/** Outer padding around every routed page (except Studio). */
export const PAGE_PADDING = 16;

/** Vertical gap between stacked content blocks/sections within a page. */
export const SECTION_GAP = 12;
