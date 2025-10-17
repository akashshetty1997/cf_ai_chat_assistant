// src/core/interfaces/IMessageHandler.ts

import { ChatMessage } from '../types';

/**
 * IMessageHandler interface - Contract for handling incoming messages
 * 
 * This interface follows the Chain of Responsibility Pattern, allowing
 * multiple handlers to process messages in sequence or independently.
 * 
 * Different handlers can be implemented for:
 * - Text message processing
 * - Command parsing
 * - Intent detection
 * - Response formatting
 * 
 * Benefits:
 * - Separates message processing logic from routing
 * - Allows for flexible message processing pipelines
 * - Easy to add new handlers without modifying existing code
 * - Follows Single Responsibility Principle
 */
export interface IMessageHandler {
  /**
   * Handles an incoming message and generates a response
   * 
   * @param message - The incoming chat message to process
   * @param userId - Unique identifier for the user sending the message
   * @param context - Optional: Additional context like conversation history
   * @returns Promise resolving to the response message
   * 
   * @example
   * const userMessage = new Message('user', 'I had pizza for lunch');
   * const response = await messageHandler.handle(userMessage, 'user-123');
   */
  handle(
    message: ChatMessage,
    userId: string,
    context?: any
  ): Promise<ChatMessage>;

  /**
   * Checks if this handler can process the given message
   * Useful for implementing conditional handling logic
   * 
   * @param message - The message to check
   * @returns Promise resolving to true if this handler can process the message
   * 
   * @example
   * if (await handler.canHandle(message)) {
   *   const response = await handler.handle(message, userId);
   * }
   */
  canHandle(message: ChatMessage): Promise<boolean>;
}

/**
 * IStreamingMessageHandler interface - Extension for streaming responses
 * 
 * Extends IMessageHandler to support real-time streaming responses
 * Useful for providing immediate feedback in chat interfaces
 */
export interface IStreamingMessageHandler extends IMessageHandler {
  /**
   * Handles a message and streams the response in chunks
   * 
   * @param message - The incoming chat message to process
   * @param userId - Unique identifier for the user
   * @param context - Optional: Additional context
   * @returns AsyncIterableIterator yielding response chunks as they're generated
   * 
   * @example
   * for await (const chunk of handler.handleStream(message, userId)) {
   *   websocket.send(chunk); // Send each chunk immediately
   * }
   */
  handleStream(
    message: ChatMessage,
    userId: string,
    context?: any
  ): AsyncIterableIterator<string>;
}