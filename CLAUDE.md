# Working with this repository using Claude

This project is a monorepo for a Hono-based API with Drizzle ORM. When asking Claude to
make changes here, share the workspace-aware npm scripts so it can run the correct
commands. Useful entry points include:

- `npm run dev:backend` to start the API locally.
- `npm run generate:api` to rebuild the OpenAPI-driven Zod types.
- `npm run test --workspace backend` to exercise the backend suite.
- `npm run db:up` to start the PostgreSQL database with Docker Compose.
- `npm run db:down` to stop the database.

Context to provide in prompts:

- The backend lives in `apps/backend` and uses Vitest for testing.
- Shared OpenAPI assets live in `packages/openapi` and are generated with Orval.
- Environment variables should be loaded from `apps/backend/.env` during local runs.
- Local PostgreSQL runs via Docker Compose; use `npm run db:up` to start it.

When requesting updates, favor small, incremental steps and ask Claude to summarize the
tests it ran. For documentation requests, prefer short sections with bullet lists and
shell commands in fenced `bash` blocks.

## Command execution rules

**Do NOT execute the following commands unless explicitly requested by the user:**

- Git operations that modify the repository:
  - `git commit`, `git push`, `git merge`, `git rebase`, `git tag`, etc.
- GitHub operations:
  - `gh pr create`, `gh issue create`, `gh release create`, etc.
- Infrastructure operations that deploy or modify remote resources:
  - `wrangler deploy`, `wrangler publish`, `wrangler d1 execute --remote`, etc.
  - `npm run wrangler:deploy`, `npm run d1:*:remote`, etc.

**Allowed operations without explicit permission:**

- Reading operations: `git status`, `git diff`, `git log`, `gh pr view`, etc.
- Local development: `npm run dev:backend`, `npm test`, `npm run build`, etc.
- Local database operations: `npm run d1:*:local`, etc.
