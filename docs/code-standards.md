# Code standards

Apply these rules to the requested change. Avoid abstractions, files, and
tests for hypothetical requirements.

## Scope and boundaries

- Define the user-visible result. Trace changes through the component, state,
  API, and displayed result. Check other callers of shared logic.
- Keep each change focused. Report unrelated findings separately.
- Keep pages and stores independent of transport DTOs. Development uses MSW;
  the new backend contract is unavailable. Do not invent or extend endpoints
  as a presumed production contract. Update the API layer and mocks when the
  contract arrives.
- Keep mocked API behavior in `src/api/` and `src/mocks/`, not page-local
  fixtures. A passing mock flow does not verify a backend integration.
- Keep server state in TanStack Query and client/session state in Zustand.
  Preserve workspace scoping in queries and state changes.
- Read Vite variables in application code through `src/config/index.ts` and
  storage keys through `src/constants/storage.ts`. The environment marker's
  mock handler reads its preview variables directly from `import.meta.env`.

## Language and UI copy

- Write new or changed source comments, documentation, test descriptions, and
  developer-facing text in English. Other languages belong in i18n locale files.
- Put user-facing UI copy in i18n and update relevant locales together.
  Avoid hardcoded copy in components.

## Tests and verification

- Test important business logic, state transitions, permissions, data
  conversion, and regressions. Keep tests few and focused. Do not test trivial
  rendering, mirror implementation, or test Ant Design itself.
- For a logic bug, reproduce the failing behavior where practical. A useful
  regression test fails without the fix and passes with it.
- The owner validates UI behavior. Describe affected screens, states, and
  interactions with a short manual path. Add UI automation only for critical
  behavior or at the owner's request.
- Run affected checks, then the [local gate](../AGENTS.md#development-workflow)
  on the final tree. Report results and any relevant check not run.

## Components and styles

Follow the [UI direction](architecture/ui-system.md#product-direction) for
changed screens.

Use the first level that expresses the needed behavior clearly:

1. Ant Design and Pro components and props.
2. Shared tokens in `src/theme.ts` and spacing in `src/constants/layout.ts`.
3. `src/global.css` for application-wide rules.
4. Colocated CSS for layout, responsive behavior, or third-party surfaces
   that components and tokens cannot express clearly.

Avoid repeated Ant Design overrides and hardcoded shared colors or spacing.
Use inline styles for state-dependent values; move repeated visual rules to
shared tokens or components.
