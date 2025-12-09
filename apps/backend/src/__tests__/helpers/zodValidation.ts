/**
 * Zod-based validation helpers for API response testing
 *
 * This approach uses OpenAPI-generated Zod schemas directly,
 * avoiding manual whitelist declarations while providing
 * snapshot-test-level interface guarantees.
 */

import { expect } from 'vitest'
import type { ZodSchema } from 'zod'

/**
 * Validates that a response matches the expected Zod schema
 *
 * @param schema - The Zod schema to validate against
 * @param data - The data to validate
 * @param context - Optional context string for better error messages (e.g., "conversation", "message[0]")
 *
 * @throws Error with detailed validation errors if validation fails
 *
 * @example
 * ```typescript
 * import { getConversationsIdResponse } from 'openapi'
 *
 * const conversation = await response.json()
 * expectValidZodSchema(getConversationsIdResponse, conversation, 'conversation')
 * ```
 */
export function expectValidZodSchema<T>(
  schema: ZodSchema<T>,
  data: unknown,
  context?: string
): void {
  const result = schema.safeParse(data)

  if (!result.success) {
    const contextPrefix = context ? `${context}: ` : ''
    const errorDetails = result.error.errors
      .map(err => `  - ${err.path.join('.')}: ${err.message}`)
      .join('\n')

    throw new Error(
      `${contextPrefix}Zod schema validation failed:\n${errorDetails}\n\nReceived data: ${JSON.stringify(data, null, 2)}`
    )
  }

  // Also use Vitest's expect for better test output
  expect(result.success).toBe(true)
}

/**
 * Validates an array of items against a Zod schema
 *
 * @param schema - The Zod schema for individual array items
 * @param items - The array of items to validate
 * @param context - Optional context string (e.g., "messages", "participants")
 *
 * @example
 * ```typescript
 * import { getConversationsIdMessagesResponseItem } from 'openapi'
 *
 * const messages = await response.json()
 * expectValidZodSchemaArray(getConversationsIdMessagesResponseItem, messages, 'messages')
 * ```
 */
export function expectValidZodSchemaArray<T>(
  schema: ZodSchema<T>,
  items: unknown[],
  context?: string
): void {
  if (!Array.isArray(items)) {
    throw new Error(`${context || 'Data'} is not an array`)
  }

  items.forEach((item, index) => {
    expectValidZodSchema(schema, item, `${context || 'item'}[${index}]`)
  })
}
