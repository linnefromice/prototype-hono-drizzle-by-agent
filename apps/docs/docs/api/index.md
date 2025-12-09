# API Reference

Welcome to the Prototype Hono Drizzle API documentation. This API provides endpoints for managing users, conversations, and messages.

## Base URL

- **Development**: `http://localhost:3000`
- **Production**: TBD (Cloudflare Workers deployment)

## Authentication

Currently, the API does not require authentication. This is a prototype implementation.

::: warning
Authentication will be added in future versions before production deployment.
:::

## API Endpoints

### Users API

Manage user accounts and profiles.

- **[GET /users](/api/users#get-users)** - List all users
- **[POST /users](/api/users#create-user)** - Create a new user
- **[GET /users/:id](/api/users#get-user-by-id)** - Get user by ID
- **[PUT /users/:id](/api/users#update-user)** - Update user
- **[DELETE /users/:id](/api/users#delete-user)** - Delete user

[View full Users API documentation →](/api/users)

### Conversations API

Manage conversations between users.

- **[GET /conversations](/api/conversations#list-conversations)** - List all conversations
- **[POST /conversations](/api/conversations#create-conversation)** - Create a new conversation
- **[GET /conversations/:id](/api/conversations#get-conversation)** - Get conversation by ID
- **[DELETE /conversations/:id](/api/conversations#delete-conversation)** - Delete conversation

[View full Conversations API documentation →](/api/conversations)

### Messages API

Manage messages within conversations.

- **[GET /conversations/:id/messages](/api/messages#list-messages)** - List messages in a conversation
- **[POST /conversations/:id/messages](/api/messages#create-message)** - Create a new message
- **[GET /messages/:id](/api/messages#get-message)** - Get message by ID
- **[DELETE /messages/:id](/api/messages#delete-message)** - Delete message

[View full Messages API documentation →](/api/messages)

## Interactive API Reference

For a complete interactive API reference with request/response schemas and examples, view the full OpenAPI specification:

[View Full API Reference (OpenAPI) →](/api-reference.html)

## Response Format

All API responses follow a consistent JSON format:

### Success Response

```json
{
  "data": {
    // Response data here
  }
}
```

### Error Response

```json
{
  "error": {
    "message": "Error description",
    "code": "ERROR_CODE"
  }
}
```

## Data Types

### Common Field Types

- **UUID**: String in UUID v4 format (e.g., `"550e8400-e29b-41d4-a716-446655440000"`)
- **Timestamp**: ISO 8601 datetime string (e.g., `"2024-12-10T00:00:00.000Z"`)
- **Email**: Valid email address string

## Rate Limiting

Currently, there are no rate limits implemented. This will be added in future versions.

## Versioning

The API is currently in prototype stage (v0.1.0). Version information will be added to the API once it reaches v1.0.

## Support

For issues or questions, please [open an issue on GitHub](https://github.com/linnefromice/prototype-hono-drizzle-codex/issues).
