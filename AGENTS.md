# Agent guidelines

- Use short sections with bullet lists for documentation changes. Keep sentences concise.
- Put shell commands inside fenced code blocks tagged as `bash`.
- Reference workspace-aware npm scripts (for example `npm run dev:backend`) when noting
  how to run tasks.
- In PR messages, include a brief summary of the documentation updates and list any
  tests or checks that were run.

## Command execution restrictions

**Do NOT execute these commands unless explicitly requested:**

- Git modifications: `git commit`, `git push`, `git merge`, `git rebase`, `git tag`
- GitHub operations: `gh pr create`, `gh issue create`, `gh release create`
- Infrastructure deployments: `wrangler deploy`, `wrangler d1 execute --remote`, `npm run wrangler:deploy`, `npm run d1:*:remote`

**Safe to execute without permission:**

- Read-only: `git status`, `git diff`, `git log`, `gh pr view`
- Local dev: `npm run dev:backend`, `npm test`, `npm run build`
- Local DB: `npm run d1:*:local`
