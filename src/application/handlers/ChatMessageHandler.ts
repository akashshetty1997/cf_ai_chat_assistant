// src/application/handlers/ChatMessageHandler.ts

import { IMessageHandler } from "../../core/interfaces/IMessageHandler";
import { ILLMProvider } from "../../core/interfaces/ILLMProvider";
import { IStateManager } from "../../core/interfaces/IStateManager";
import { ChatMessage } from "../../core/types";
import { Message } from "../../core/entities/Message";
import { LLMService } from "../../services/llm/LLMService";
import { StateService } from "../../services/state/StateService";

/**
 * Helper function to safely extract error message
 * @param error - Unknown error object
 * @returns Error message string
 */
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

/**
 * ChatMessageHandler - Handles general chat messages
 *
 * This handler processes conversational messages that don't require
 * special command handling. It maintains conversation context and
 * generates contextual responses.
 *
 * Responsibilities:
 * - Process general chat messages
 * - Maintain conversation context
 * - Generate appropriate responses
 * - Update conversation history
 *
 * Benefits:
 * - Separates chat logic from command logic
 * - Maintains clean conversation flow
 * - Easy to test and extend
 * - Follows Single Responsibility Principle
 */
export class ChatMessageHandler implements IMessageHandler {
  private llmService: LLMService;
  private stateService: StateService;

  /**
   * Creates a new ChatMessageHandler instance
   *
   * @param llmProvider - LLM provider for generating responses
   * @param stateManager - State manager for conversation storage
   *
   * @example
   * const handler = new ChatMessageHandler(
   *   new WorkersAIProvider(env.AI),
   *   new DurableObjectStorage(storage)
   * );
   */
  constructor(llmProvider: ILLMProvider, stateManager: IStateManager) {
    this.llmService = new LLMService(llmProvider);
    this.stateService = new StateService(stateManager);
  }

  /**
   * Handles an incoming chat message and generates a response
   *
   * @param message - The incoming chat message to process
   * @param userId - Unique identifier for the user
   * @param context - Optional: Additional context (unused for now)
   * @returns Promise resolving to the response message
   *
   * @example
   * const userMessage = new Message('user', 'What should I eat for dinner?');
   * const response = await handler.handle(userMessage, 'user-123');
   * console.log(response.content);
   */
  async handle(
    message: ChatMessage,
    userId: string,
    _context?: any
  ): Promise<ChatMessage> {
    try {
      // Step 1: Get or create conversation context
      const nutritionContext = await this.stateService.getOrCreateContext(
        userId
      );

      // Step 2: Get user profile for personalization
      const userProfile = await this.stateService.getOrCreateUserProfile(
        userId
      );

      // Step 3: Add user message to conversation history
      nutritionContext.addMessage(message);

      // Step 4: Generate response using LLM with full context
      console.log(`Processing chat message for user ${userId}`);
      const responseContent = await this.llmService.generateChatResponse(
        message.content,
        nutritionContext.getRecentMessages(10),
        userProfile.goals
      );

      // Step 5: Create response message
      const responseMessage = new Message("assistant", responseContent);

      // Step 6: Add assistant response to conversation history
      nutritionContext.addMessage(responseMessage.toJSON());

      // Step 7: Save updated context
      await this.stateService.saveContext(userId, nutritionContext);

      console.log(`Chat response generated for user ${userId}`);

      return responseMessage.toJSON();
    } catch (error) {
      console.error(`Failed to handle chat message for user ${userId}:`, error);

      // Return an error message to the user
      const errorMessage = new Message(
        "assistant",
        "Sorry, I encountered an error processing your message. Please try again."
      );

      return errorMessage.toJSON();
    }
  }

  /**
   * Checks if this handler can process the given message
   * For ChatMessageHandler, it can handle any message that isn't a command
   *
   * @param message - The message to check
   * @returns Promise resolving to true if this handler can process it
   *
   * @example
   * if (await handler.canHandle(message)) {
   *   const response = await handler.handle(message, userId);
   * }
   */
  async canHandle(message: ChatMessage): Promise<boolean> {
    // Check if message looks like a command (starts with /)
    const content = message.content.trim().toLowerCase();

    // If it starts with /, it's probably a command
    if (content.startsWith("/")) {
      return false;
    }

    // If it contains command keywords, defer to CommandHandler
    const commandKeywords = [
      "analyze meal",
      "set goal",
      "my goals",
      "meal history",
      "recommend",
      "suggest meal",
    ];

    // Check if message explicitly requests a command action
    for (const keyword of commandKeywords) {
      if (content.includes(keyword)) {
        // Still return true - we can handle these conversationally
        // CommandHandler will have higher priority
        return true;
      }
    }

    // Handle all other conversational messages
    return true;
  }

  /**
   * Handles streaming responses for real-time chat
   * Yields response chunks as they're generated
   *
   * @param message - The incoming chat message
   * @param userId - Unique identifier for the user
   * @returns AsyncIterableIterator yielding response chunks
   *
   * @example
   * for await (const chunk of handler.handleStream(message, userId)) {
   *   websocket.send(chunk);
   * }
   */
  async *handleStream(
    message: ChatMessage,
    userId: string
  ): AsyncIterableIterator<string> {
    try {
      // Get context and profile
      const nutritionContext = await this.stateService.getOrCreateContext(
        userId
      );
      const userProfile = await this.stateService.getOrCreateUserProfile(
        userId
      );

      // Add user message to history
      nutritionContext.addMessage(message);

      // Stream the response
      let fullResponse = "";

      for await (const chunk of this.llmService.generateStreamingResponse(
        message.content,
        nutritionContext.getRecentMessages(10),
        userProfile.goals
      )) {
        fullResponse += chunk;
        yield chunk;
      }

      // After streaming is complete, save the full response to history
      const responseMessage = new Message("assistant", fullResponse);
      nutritionContext.addMessage(responseMessage.toJSON());

      await this.stateService.saveContext(userId, nutritionContext);
    } catch (error) {
      console.error(
        `Failed to stream chat response for user ${userId}:`,
        error
      );
      yield `Sorry, I encountered an error: ${getErrorMessage(error)}`;
    }
  }

  /**
   * Clears conversation history for a user
   * Useful for "start fresh" functionality
   *
   * @param userId - Unique identifier for the user
   * @returns Promise that resolves when history is cleared
   *
   * @example
   * await handler.clearHistory('user-123');
   */
  async clearHistory(userId: string): Promise<void> {
    try {
      await this.stateService.clearContext(userId);
      console.log(`Conversation history cleared for user ${userId}`);
    } catch (error) {
      console.error(`Failed to clear history for user ${userId}:`, error);
      throw new Error(`Failed to clear history: ${getErrorMessage(error)}`);
    }
  }

  /**
   * Gets conversation history for a user
   *
   * @param userId - Unique identifier for the user
   * @param limit - Optional: Maximum number of messages to return
   * @returns Promise resolving to array of messages
   *
   * @example
   * const history = await handler.getHistory('user-123', 20);
   */
  async getHistory(userId: string, limit?: number): Promise<ChatMessage[]> {
    try {
      const context = await this.stateService.getContext(userId);

      if (!context) {
        return [];
      }

      const messages = context.conversationHistory;

      if (limit) {
        return messages.slice(-limit);
      }

      return messages;
    } catch (error) {
      console.error(`Failed to get history for user ${userId}:`, error);
      return [];
    }
  }
}
