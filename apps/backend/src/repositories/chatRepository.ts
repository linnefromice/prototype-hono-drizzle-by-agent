import type {
  AddParticipantRequest,
  Bookmark,
  BookmarkListItem,
  ConversationDetail,
  ConversationRead,
  CreateConversationRequest,
  Message,
  Participant,
  Reaction,
  SendMessageRequest,
} from 'openapi'

export type MessageQueryOptions = {
  limit?: number
  before?: string
}

// Internal types that extend API types with fields determined from auth context
export type ReactionData = {
  userId: string
  emoji: string
}

export type ConversationReadData = {
  userId: string
  lastReadMessageId: string
}

export type BookmarkData = {
  userId: string
}

export interface ChatRepository {
  createConversation(data: CreateConversationRequest): Promise<ConversationDetail>
  getConversation(conversationId: string): Promise<ConversationDetail | null>
  listConversationsForUser(userId: string): Promise<ConversationDetail[]>

  addParticipant(conversationId: string, data: AddParticipantRequest): Promise<Participant>
  findParticipant(conversationId: string, userId: string): Promise<Participant | null>
  markParticipantLeft(conversationId: string, userId: string): Promise<Participant | null>

  createMessage(
    conversationId: string,
    payload: SendMessageRequest & { type: 'text' | 'system'; senderUserId: string | null; systemEvent?: string | null },
  ): Promise<Message>
  listMessages(conversationId: string, options?: MessageQueryOptions): Promise<Message[]>
  findMessageById(messageId: string): Promise<Message | null>
  deleteMessage(messageId: string, deletedByUserId: string): Promise<void>

  addReaction(messageId: string, data: ReactionData): Promise<Reaction>
  removeReaction(messageId: string, emoji: string, userId: string): Promise<Reaction | null>
  listReactions(messageId: string): Promise<Reaction[]>

  updateConversationRead(
    conversationId: string,
    data: ConversationReadData,
  ): Promise<ConversationRead>
  countUnread(conversationId: string, userId: string): Promise<number>

  addBookmark(messageId: string, data: BookmarkData): Promise<Bookmark>
  removeBookmark(messageId: string, userId: string): Promise<Bookmark | null>
  listBookmarks(userId: string): Promise<BookmarkListItem[]>
}
