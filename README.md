# Runnelo UI

Runnelo scheduling platform frontend built with React 19 + TypeScript + Vite.

## Tech Stack

- React 19 + TypeScript
- Vite 8
- Ant Design 6 + ProComponents
- TanStack Query (server state) + Zustand (client state)
- React Router 7
- i18next (i18n, English / Chinese)
- XYFlow (DAG editor)
- MSW (dev mock)
- Vitest + Testing Library (testing)

## Modules

- **Dashboard** — overview and metrics
- **Studio** — workflow and task management with SQL / Shell / Spark / Flink task types and a built-in DAG editor
- **Admin** — resources, users, environment configs, custom parameters and alert rules
- **Runs** — workflow execution history, details and logs

## Getting Started

```bash
# Install dependencies
npm install

# Start dev server (with MSW mock)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Scripts

| Command              | Description                   |
| -------------------- | ----------------------------- |
| `npm run dev`        | Start dev server              |
| `npm run build`      | Type check + production build |
| `npm run lint`       | ESLint check                  |
| `npm run format`     | Prettier format               |
| `npm run test`       | Run tests                     |
| `npm run test:watch` | Run tests in watch mode       |
| `npm run test:backend` | Check a running backend without writes |
| `npm run test:backend:mutation` | Create, verify, and clean up backend test data |

## Project Structure

```
src/
├── api/          # API requests
├── assets/       # Static assets
├── components/   # Shared components
├── layouts/      # Layout components
├── locales/      # i18n files
├── mocks/        # MSW mock handlers
├── pages/        # Page modules
├── router/       # Route config
├── stores/       # Zustand stores
├── types/        # TypeScript type definitions
└── utils/        # Utility functions
```

The current backend compatibility contract is documented in
[`docs/backend-compatibility.md`](docs/backend-compatibility.md).
