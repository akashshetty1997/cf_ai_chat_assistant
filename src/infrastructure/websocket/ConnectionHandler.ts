// src/infrastructure/websocket/ConnectionHandler.ts

import { IMessageHandler } from "../../core/interfaces/IMessageHandler";
import { ChatMessage } from "../../core/types";
import { Message } from "../../core/entities/Message";

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
 * ConnectionHandler - Manages WebSocket connections for real-time chat
 *
 * This class handles the WebSocket lifecycle, message routing, and
 * real-time communication between users and the agent.
 *
 * Note: Designed for Cloudflare Workers WebSocket API
 *
 * Responsibilities:
 * - Accept and manage WebSocket connections
 * - Parse incoming messages
 * - Route messages to appropriate handlers
 * - Send responses back to clients
 * - Handle connection errors and cleanup
 *
 * Benefits:
 * - Isolates WebSocket logic from business logic
 * - Provides clean interface for message handling
 * - Manages connection state reliably
 * - Easy to test with mock WebSockets
 */
export class ConnectionHandler {
  private handlers: IMessageHandler[] = [];
  private activeConnections = new Map<string, WebSocket>();

  /**
   * Creates a new ConnectionHandler instance
   *
   * @example
   * const connectionHandler = new ConnectionHandler();
   * connectionHandler.registerHandler(chatHandler);
   * connectionHandler.registerHandler(commandHandler);
   */
  constructor() {}

  /**
   * Registers a message handler
   * Handlers are checked in order of registration
   *
   * @param handler - Message handler to register
   *
   * @example
   * connectionHandler.registerHandler(new CommandHandler(llm, storage));
   * connectionHandler.registerHandler(new ChatMessageHandler(llm, storage));
   */
  registerHandler(handler: IMessageHandler): void {
    this.handlers.push(handler);
  }

  /**
   * Handles a new WebSocket connection
   *
   * @param ws - WebSocket instance
   * @param userId - Unique identifier for the user
   *
   * @example
   * // In Durable Object fetch handler:
   * const pair = new WebSocketPair();
   * await connectionHandler.handleConnection(pair[1], userId);
   * return new Response(null, { status: 101, webSocket: pair[0] });
   */
  async handleConnection(ws: WebSocket, userId: string): Promise<void> {
    // Store the connection
    this.activeConnections.set(userId, ws);

    console.log(`WebSocket connection established for user ${userId}`);

    // Send welcome message
    this.sendMessage(ws, {
      type: "system",
      content: "Connected to Nutrition Coach! How can I help you today?",
      timestamp: Date.now(),
    });

    // Note: In Cloudflare Workers, WebSocket events are handled by the Durable Object
    // The Durable Object will call webSocketMessage(), webSocketClose(), webSocketError()
    // This method just sets up the initial connection
  }

  /**
   * Handles an incoming WebSocket message
   * Called by Durable Object's webSocketMessage() handler
   *
   * @param ws - WebSocket instance
   * @param userId - User identifier
   * @param data - Raw message data
   *
   * @example
   * // In Durable Object:
   * async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
   *   await connectionHandler.handleIncomingMessage(ws, userId, message);
   * }
   */
  async handleIncomingMessage(
    ws: WebSocket,
    userId: string,
    data: string | ArrayBuffer
  ): Promise<void> {
    try {
      // Parse the message
      const messageText =
        typeof data === "string" ? data : new TextDecoder().decode(data);
      const parsedMessage = this.parseMessage(messageText);

      if (!parsedMessage) {
        this.sendError(ws, "Invalid message format");
        return;
      }

      console.log(
        `Processing message from user ${userId}: ${parsedMessage.content.substring(
          0,
          50
        )}...`
      );

      // Find appropriate handler
      for (const handler of this.handlers) {
        if (await handler.canHandle(parsedMessage)) {
          const response = await handler.handle(parsedMessage, userId);

          // Send response back
          this.sendMessage(ws, {
            type: "message",
            role: response.role,
            content: response.content,
            messageId: response.id,
            timestamp: response.timestamp,
          });

          return;
        }
      }

      // No handler found
      this.sendError(ws, "No handler available for this message");
    } catch (error) {
      console.error(`Error handling message for user ${userId}:`, error);
      this.sendError(
        ws,
        `Failed to process message: ${getErrorMessage(error)}`
      );
    }
  }

  /**
   * Handles streaming responses for real-time feedback
   *
   * @param ws - WebSocket instance
   * @param userId - User identifier
   * @param message - The message to process
   *
   * @example
   * await connectionHandler.handleStreamingMessage(ws, userId, userMessage);
   */
  async handleStreamingMessage(
    ws: WebSocket,
    userId: string,
    message: ChatMessage
  ): Promise<void> {
    try {
      // Find a handler that supports streaming
      for (const handler of this.handlers) {
        if (await handler.canHandle(message)) {
          // Check if handler supports streaming
          if ("handleStream" in handler) {
            const streamingHandler = handler as any;

            // Send start signal
            this.sendMessage(ws, {
              type: "stream_start",
              timestamp: Date.now(),
            });

            // Stream the response
            for await (const chunk of streamingHandler.handleStream(
              message,
              userId
            )) {
              this.sendMessage(ws, {
                type: "stream_chunk",
                content: chunk,
                timestamp: Date.now(),
              });
            }

            // Send end signal
            this.sendMessage(ws, {
              type: "stream_end",
              timestamp: Date.now(),
            });

            return;
          }
        }
      }

      // Fallback to regular handling if no streaming support
      await this.handleIncomingMessage(ws, userId, message.content);
    } catch (error) {
      console.error(`Error in streaming message for user ${userId}:`, error);
      this.sendError(ws, `Streaming failed: ${getErrorMessage(error)}`);
    }
  }

  /**
   * Handles WebSocket connection close
   * Called by Durable Object's webSocketClose() handler
   *
   * @param userId - User identifier
   *
   * @example
   * // In Durable Object:
   * async webSocketClose(ws: WebSocket, code: number, reason: string) {
   *   connectionHandler.handleConnectionClose(userId);
   * }
   */
  handleConnectionClose(userId: string): void {
    console.log(`WebSocket connection closed for user ${userId}`);
    this.activeConnections.delete(userId);
  }

  /**
   * Handles WebSocket errors
   * Called by Durable Object's webSocketError() handler
   *
   * @param userId - User identifier
   * @param error - Error that occurred
   *
   * @example
   * // In Durable Object:
   * async webSocketError(ws: WebSocket, error: unknown) {
   *   connectionHandler.handleConnectionError(userId, error);
   * }
   */
  handleConnectionError(userId: string, error: unknown): void {
    console.error(`WebSocket error for user ${userId}:`, error);
    this.activeConnections.delete(userId);
  }

  /**
   * Parses incoming message text into a ChatMessage
   *
   * @param messageText - Raw message text
   * @returns Parsed ChatMessage or null if invalid
   * @private
   */
  private parseMessage(messageText: string): ChatMessage | null {
    try {
      // Try parsing as JSON first
      const parsed = JSON.parse(messageText);

      if (parsed.content && typeof parsed.content === "string") {
        // Create a proper Message entity
        const message = new Message("user", parsed.content);
        return message.toJSON();
      }

      return null;
    } catch {
      // If not JSON, treat entire text as message content
      const message = new Message("user", messageText);
      return message.toJSON();
    }
  }

  /**
   * Sends a message through the WebSocket
   *
   * @param ws - WebSocket instance
   * @param data - Data to send
   * @private
   */
  private sendMessage(ws: WebSocket, data: any): void {
    try {
      ws.send(JSON.stringify(data));
    } catch (error) {
      console.error("Failed to send WebSocket message:", error);
    }
  }

  /**
   * Sends an error message through the WebSocket
   *
   * @param ws - WebSocket instance
   * @param errorMessage - Error message to send
   * @private
   */
  private sendError(ws: WebSocket, errorMessage: string): void {
    this.sendMessage(ws, {
      type: "error",
      content: errorMessage,
      timestamp: Date.now(),
    });
  }

  /**
   * Broadcasts a message to all connected users
   *
   * @param message - Message to broadcast
   *
   * @example
   * connectionHandler.broadcast({ type: 'system', content: 'Server maintenance in 5 minutes' });
   */
  broadcast(message: any): void {
    this.activeConnections.forEach((ws, userId) => {
      try {
        this.sendMessage(ws, message);
      } catch (error) {
        console.error(`Failed to broadcast to user ${userId}:`, error);
      }
    });
  }

  /**
   * Sends a message to a specific user
   *
   * @param userId - User identifier
   * @param message - Message to send
   * @returns True if message was sent, false if user not connected
   *
   * @example
   * const sent = connectionHandler.sendToUser('user-123', { content: 'Hello!' });
   */
  sendToUser(userId: string, message: any): boolean {
    const ws = this.activeConnections.get(userId);

    if (!ws) {
      return false;
    }

    this.sendMessage(ws, message);
    return true;
  }

  /**
   * Checks if a user is currently connected
   *
   * @param userId - User identifier
   * @returns True if user has an active connection
   *
   * @example
   * if (connectionHandler.isUserConnected('user-123')) {
   *   connectionHandler.sendToUser('user-123', notification);
   * }
   */
  isUserConnected(userId: string): boolean {
    return this.activeConnections.has(userId);
  }

  /**
   * Gets the number of active connections
   *
   * @returns Number of active connections
   *
   * @example
   * console.log(`Active users: ${connectionHandler.getActiveConnectionCount()}`);
   */
  getActiveConnectionCount(): number {
    return this.activeConnections.size;
  }

  /**
   * Closes a specific user's connection
   *
   * @param userId - User identifier
   *
   * @example
   * connectionHandler.closeConnection('user-123');
   */
  closeConnection(userId: string): void {
    const ws = this.activeConnections.get(userId);

    if (ws) {
      try {
        ws.close(1000, "Connection closed by server");
        this.activeConnections.delete(userId);
      } catch (error) {
        console.error(`Failed to close connection for user ${userId}:`, error);
      }
    }
  }

  /**
   * Closes all active connections
   * Useful for shutdown or maintenance
   *
   * @example
   * connectionHandler.closeAllConnections();
   */
  closeAllConnections(): void {
    this.activeConnections.forEach((ws, userId) => {
      try {
        ws.close(1000, "Server closing");
      } catch (error) {
        console.error(`Failed to close connection for user ${userId}:`, error);
      }
    });

    this.activeConnections.clear();
  }
}
