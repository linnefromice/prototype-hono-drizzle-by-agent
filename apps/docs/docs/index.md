---
layout: home

hero:
  name: Prototype Hono Drizzle API
  text: API Documentation & Testing
  tagline: Complete API reference and snapshot testing results
  actions:
    - theme: brand
      text: API Reference
      link: /api/
    - theme: alt
      text: Snapshot Tests
      link: /snapshots/
    - theme: alt
      text: GitHub
      link: https://github.com/linnefromice/prototype-hono-drizzle-codex

features:
  - icon: 📚
    title: Complete API Documentation
    details: Auto-generated from OpenAPI specification with detailed endpoint descriptions, request/response schemas, and examples.

  - icon: ✅
    title: Snapshot Testing Results
    details: Visual representation of API response snapshots with normalized UUIDs and timestamps for stable comparison.

  - icon: 🚀
    title: Built with Modern Stack
    details: Hono framework, Drizzle ORM, SQLite database, TypeScript, and deployed on Cloudflare Workers.

  - icon: 🔄
    title: Continuously Updated
    details: Documentation automatically regenerated on every commit to main branch via GitHub Actions.
---

## About This Project

This documentation site provides comprehensive information about the Prototype Hono Drizzle API, including:

- **API Reference**: Interactive API documentation generated from OpenAPI specifications
- **Snapshot Tests**: Visualization of API response structures with normalized test data
- **Development Guide**: Information about the tech stack and architecture

## Quick Links

- [API Overview](/api/) - Start exploring the API endpoints
- [Users API](/api/users) - User management endpoints
- [Conversations API](/api/conversations) - Conversation management
- [Messages API](/api/messages) - Message handling

## Technology Stack

- **Framework**: [Hono](https://hono.dev/) - Ultra-fast web framework
- **ORM**: [Drizzle](https://orm.drizzle.team/) - TypeScript ORM
- **Database**: SQLite (local) / Cloudflare D1 (production)
- **Testing**: [Vitest](https://vitest.dev/) with snapshot testing
- **Deployment**: [Cloudflare Workers](https://workers.cloudflare.com/)
