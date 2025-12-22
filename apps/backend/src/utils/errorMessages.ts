/**
 * Common error message utilities
 *
 * This module provides standardized error messages for the application.
 * - COMMON: Fully reusable error messages/generators
 * - CHAT: Chat/conversation-specific error constants
 * - USER: User-specific error constants
 */

// ============================================================================
// COMMON ERROR MESSAGE GENERATORS
// ============================================================================

/**
 * Generic "not found" error message generator
 */
export const notFound = (resource: string) => `${resource} not found`

/**
 * Generic "required field" error message generator
 */
export const required = (field: string) => `${field} is required`

/**
 * Generic "unauthorized action" error message generator
 */
export const unauthorized = (action: string) => `You are not authorized to ${action}`

/**
 * Generic "must belong to" error message generator
 */
export const mustBelongTo = (item: string, container: string) =>
  `${item} must belong to the ${container}`

// ============================================================================
// CHAT/CONVERSATION ERROR MESSAGES
// ============================================================================

export const CHAT_ERRORS = {
  // Conversation validation
  GROUP_NAME_REQUIRED: 'Group conversations require a name',
  PARTICIPANT_REQUIRED: 'At least one participant is required',

  // Conversation access
  NOT_PARTICIPANT: 'You are not a participant in this conversation',
  NOT_ACTIVE_PARTICIPANT: 'User is not an active participant in this conversation',

  // Message-related
  MESSAGE_CONVERSATION_MISMATCH: 'Referenced message must belong to the same conversation',
  LAST_READ_MESSAGE_MISMATCH: 'lastReadMessageId must belong to the conversation',

  // Authorization
  DELETE_MESSAGE_UNAUTHORIZED: 'You are not authorized to delete this message',
} as const

// ============================================================================
// USER ERROR MESSAGES
// ============================================================================

export const USER_ERRORS = {
  // User-specific errors with dynamic values should use factory functions
} as const

/**
 * User error message generators
 */
export const userNotFoundByIdAlias = (idAlias: string) =>
  `User with idAlias "${idAlias}" not found`

// ============================================================================
// HTTP ERROR FACTORY FUNCTIONS
// ============================================================================

import { HttpError } from './errors'

/**
 * Common HTTP error factories for consistent error creation
 */
export const HTTP_ERRORS = {
  notFound: (resource: string) => new HttpError(404, notFound(resource)),
  required: (field: string) => new HttpError(400, required(field)),
  forbidden: (action: string) => new HttpError(403, unauthorized(action)),
  badRequest: (message: string) => new HttpError(400, message),
} as const
