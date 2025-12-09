# Documentation Site

This directory contains the VitePress documentation site for the Prototype Hono Drizzle API.

## Overview

The documentation site provides:
- **API Reference**: Auto-generated from OpenAPI specifications
- **Snapshot Tests**: Visual representation of API response structures
- **Complete API Documentation**: Detailed endpoint documentation with schemas and examples

## Local Development

```bash
# Install dependencies (from repository root)
npm install

# Start development server
npm run dev --workspace docs

# Build documentation
npm run build --workspace docs

# Preview built site
npm run serve --workspace docs
```

## Build Process

The build process automatically:
1. Copies OpenAPI specification from `packages/openapi/openapi.yaml`
2. Generates static API reference HTML using Redocly CLI
3. Parses Vitest snapshot files and generates Markdown documentation
4. Builds VitePress site

## Project Structure

```
apps/docs/
├── docs/
│   ├── .vitepress/
│   │   └── config.ts              # VitePress configuration
│   ├── index.md                   # Home page
│   ├── api/
│   │   ├── index.md               # API overview
│   │   ├── users.md               # Users API documentation
│   │   ├── conversations.md       # Conversations API documentation
│   │   └── messages.md            # Messages API documentation
│   ├── snapshots/
│   │   ├── index.md               # Snapshot testing overview
│   │   ├── users.md               # User API snapshots (auto-generated)
│   │   ├── conversations.md       # Conversation API snapshots (auto-generated)
│   │   └── messages.md            # Message API snapshots (auto-generated)
│   └── public/
│       ├── openapi.yaml           # OpenAPI spec (auto-copied)
│       └── api-reference.html     # API reference (auto-generated)
├── scripts/
│   └── generate-snapshot-docs.ts  # Snapshot to Markdown converter
└── package.json
```

## Automatic Deployment

The documentation is automatically deployed to GitHub Pages when changes are pushed to the `main` branch.

### GitHub Pages Setup

To enable automatic deployment, configure GitHub Pages in your repository settings:

1. Go to **Settings** > **Pages**
2. Under **Source**, select **GitHub Actions**
3. The workflow will automatically deploy on push to `main`

The workflow (`.github/workflows/deploy-docs.yml`) triggers on changes to:
- `packages/openapi/**` - OpenAPI specification updates
- `apps/backend/src/routes/__snapshots__/**` - Snapshot test updates
- `apps/docs/**` - Documentation content updates
- `.github/workflows/deploy-docs.yml` - Workflow configuration updates

### Deployment URL

After deployment, the documentation will be available at:
```
https://<username>.github.io/prototype-hono-drizzle-codex/
```

## Scripts

| Script | Description |
|--------|-------------|
| `dev` | Start development server |
| `build` | Build production site (runs all generation steps) |
| `serve` | Preview production build locally |
| `copy:openapi` | Copy OpenAPI spec to public directory |
| `generate:api-reference` | Generate static API reference HTML |
| `generate:snapshots` | Generate snapshot documentation from test files |

## Technologies

- **[VitePress](https://vitepress.dev/)** - Static site generator
- **[Redocly CLI](https://redocly.com/docs/cli/)** - OpenAPI to HTML converter
- **[tsx](https://github.com/esbuild-kit/tsx)** - TypeScript execution for build scripts
- **Vue 3** - VitePress component framework

## Snapshot Generation

Snapshots are automatically generated from Vitest test files located in:
```
apps/backend/src/routes/__snapshots__/
```

The generation script:
1. Parses Vitest snapshot format using regex
2. Extracts test names and snapshot data
3. Formats test names for readability
4. Generates Markdown files with JSON code blocks

### Normalization

Dynamic values are normalized in snapshots:
- UUIDs: `<UUID:1>`, `<UUID:2>`, etc.
- Timestamps: `<DATETIME:1>`, `<DATETIME:2>`, etc.

This ensures stable snapshots across test runs while validating complete response structures.

## Contributing

When adding new API endpoints or modifying existing ones:

1. Update OpenAPI specification in `packages/openapi/openapi.yaml`
2. Add/update snapshot tests in `apps/backend/src/routes/*.test.ts`
3. Run tests to generate snapshots: `npm run test --workspace backend -- -u`
4. Build documentation to verify: `npm run build --workspace docs`
5. Documentation will automatically update on merge to `main`

## Troubleshooting

### Build Failures

If the build fails with dead link errors:
- Ensure all linked pages exist in the `docs/` directory
- Check that sidebar links in `.vitepress/config.ts` match actual file paths

### Snapshot Generation Issues

If snapshots aren't generating:
- Verify snapshot files exist in `apps/backend/src/routes/__snapshots__/`
- Check that snapshot files follow Vitest format: `exports[\`...\`] = \`...\`;`
- Run `npm run generate:snapshots --workspace docs` manually to debug

### GitHub Pages Not Updating

If deployment succeeds but pages don't update:
- Check GitHub Actions logs for errors
- Verify GitHub Pages is configured to use **GitHub Actions** as source
- Clear browser cache or try incognito mode

## License

This documentation is part of the prototype-hono-drizzle-codex project.
