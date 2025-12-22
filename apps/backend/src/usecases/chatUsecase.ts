import type {
  AddParticipantRequest,
  Bookmark,
  BookmarkListItem,
  BookmarkRequest,
  ConversationDetail,
  ConversationRead,
  CreateConversationRequest,
  Message,
  Participant,
  Reaction,
  ReactionRequest,
  SendMessageRequest,
  UpdateConversationReadRequest,
} from 'openapi'
import type { ChatRepository, MessageQueryOptions } from '../repositories/chatRepository'
import { HttpError } from '../utils/errors'
import {
  CHAT_ERRORS,
  HTTP_ERRORS,
  notFound,
  required,
} from '../utils/errorMessages'

export class ChatUsecase {
  constructor(private readonly repo: ChatRepository) {}

  async createConversation(data: CreateConversationRequest): Promise<ConversationDetail> {
    if (data.type === 'group' && !data.name) {
      throw HTTP_ERRORS.badRequest(CHAT_ERRORS.GROUP_NAME_REQUIRED)
    }

    if (data.participantIds.length === 0) {
      throw HTTP_ERRORS.badRequest(CHAT_ERRORS.PARTICIPANT_REQUIRED)
    }

    return this.repo.createConversation(data)
  }

  async listConversationsForUser(userId: string): Promise<ConversationDetail[]> {
    if (!userId) {
      throw HTTP_ERRORS.required('userId')
    }

    return this.repo.listConversationsForUser(userId)
  }

  async getConversation(conversationId: string): Promise<ConversationDetail> {
    const conversation = await this.repo.getConversation(conversationId)
    if (!conversation) {
      throw HTTP_ERRORS.notFound('Conversation')
    }

    return conversation
  }

  async addParticipant(conversationId: string, data: AddParticipantRequest) {
    await this.getConversation(conversationId)
    return this.repo.addParticipant(conversationId, data)
  }

  async markParticipantLeft(conversationId: string, userId: string) {
    await this.getConversation(conversationId)
    const participant = await this.repo.markParticipantLeft(conversationId, userId)
    if (!participant) {
      throw HTTP_ERRORS.notFound('Participant')
    }
    await this.createSystemMessage(conversationId, { systemEvent: 'leave', senderUserId: null })
    return participant
  }

  async listMessages(
    conversationId: string,
    userId: string,
    options: MessageQueryOptions = {},
  ): Promise<Message[]> {
    const participant = await this.ensureActiveParticipant(conversationId, userId)
    if (!participant) {
      throw HTTP_ERRORS.forbidden(CHAT_ERRORS.NOT_PARTICIPANT)
    }

    return this.repo.listMessages(conversationId, options)
  }

  async sendMessage(conversationId: string, senderId: string, payload: SendMessageRequest) {
    await this.ensureActiveParticipant(conversationId, senderId)

    if (payload.replyToMessageId) {
      const referenced = await this.repo.findMessageById(payload.replyToMessageId)
      if (!referenced || referenced.conversationId !== conversationId) {
        throw HTTP_ERRORS.badRequest(CHAT_ERRORS.MESSAGE_CONVERSATION_MISMATCH)
      }
    }

    return this.repo.createMessage(conversationId, { ...payload, senderUserId: senderId, type: 'text' })
  }

  async addReaction(messageId: string, userId: string, emoji: string): Promise<Reaction> {
    const message = await this.repo.findMessageById(messageId)
    if (!message) {
      throw HTTP_ERRORS.notFound('Message')
    }

    await this.ensureActiveParticipant(message.conversationId, userId)

    return this.repo.addReaction(messageId, { userId, emoji })
  }

  async removeReaction(messageId: string, emoji: string, userId: string) {
    const message = await this.repo.findMessageById(messageId)
    if (!message) {
      throw HTTP_ERRORS.notFound('Message')
    }

    await this.ensureActiveParticipant(message.conversationId, userId)

    const removed = await this.repo.removeReaction(messageId, emoji, userId)
    if (!removed) {
      throw HTTP_ERRORS.notFound('Reaction')
    }

    return removed
  }

  async listReactions(messageId: string): Promise<Reaction[]> {
    const message = await this.repo.findMessageById(messageId)
    if (!message) {
      throw HTTP_ERRORS.notFound('Message')
    }

    return this.repo.listReactions(messageId)
  }

  async markConversationRead(
    conversationId: string,
    userId: string,
    lastReadMessageId: string,
  ): Promise<ConversationRead> {
    await this.ensureActiveParticipant(conversationId, userId)

    const message = await this.repo.findMessageById(lastReadMessageId)
    if (!message || message.conversationId !== conversationId) {
      throw HTTP_ERRORS.badRequest(CHAT_ERRORS.LAST_READ_MESSAGE_MISMATCH)
    }

    return this.repo.updateConversationRead(conversationId, { userId, lastReadMessageId })
  }

  async countUnread(conversationId: string, userId: string): Promise<number> {
    await this.ensureActiveParticipant(conversationId, userId)
    return this.repo.countUnread(conversationId, userId)
  }

  async addBookmark(messageId: string, userId: string): Promise<Bookmark> {
    const message = await this.repo.findMessageById(messageId)
    if (!message) {
      throw HTTP_ERRORS.notFound('Message')
    }

    await this.ensureActiveParticipant(message.conversationId, userId)

    return this.repo.addBookmark(messageId, { userId })
  }

  async removeBookmark(messageId: string, userId: string): Promise<Bookmark> {
    const message = await this.repo.findMessageById(messageId)
    if (!message) {
      throw HTTP_ERRORS.notFound('Message')
    }

    await this.ensureActiveParticipant(message.conversationId, userId)

    const removed = await this.repo.removeBookmark(messageId, userId)
    if (!removed) {
      throw HTTP_ERRORS.notFound('Bookmark')
    }

    return removed
  }

  async listBookmarks(userId: string): Promise<BookmarkListItem[]> {
    if (!userId) {
      throw HTTP_ERRORS.required('userId')
    }

    return this.repo.listBookmarks(userId)
  }

  async deleteMessage(messageId: string, requestUserId: string): Promise<void> {
    const message = await this.repo.findMessageById(messageId)
    if (!message) {
      throw HTTP_ERRORS.notFound('Message')
    }

    // Check if the user is the sender of the message
    if (message.senderUserId !== requestUserId) {
      // Check if the user is an admin of the conversation
      const participant = await this.repo.findParticipant(message.conversationId, requestUserId)
      if (!participant || participant.role !== 'admin') {
        throw HTTP_ERRORS.forbidden(CHAT_ERRORS.DELETE_MESSAGE_UNAUTHORIZED)
      }
    }

    await this.repo.deleteMessage(messageId, requestUserId)
  }

  async createSystemMessage(
    conversationId: string,
    payload: { systemEvent: string; senderUserId: string | null; text?: string | null },
  ) {
    return this.repo.createMessage(conversationId, { ...payload, type: 'system' })
  }

  private async ensureActiveParticipant(
    conversationId: string,
    userId: string,
  ): Promise<Participant | null> {
    const participant = await this.repo.findParticipant(conversationId, userId)
    if (!participant || participant.leftAt) {
      throw HTTP_ERRORS.forbidden(CHAT_ERRORS.NOT_ACTIVE_PARTICIPANT)
    }

    return participant
  }
}
