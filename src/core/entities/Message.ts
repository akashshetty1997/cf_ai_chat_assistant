// src/core/entities/Message.ts

import { MessageRole, ChatMessage } from "../types";

/**
 * Message entity representing a single chat message
 * Implements the ChatMessage interface with additional utility methods
 *
 * This class encapsulates message creation and serialization logic,
 * following the Entity pattern from Domain-Driven Design
 */
export class Message implements ChatMessage {
  public readonly id: string;
  public readonly role: MessageRole;
  public readonly content: string;
  public readonly timestamp: number;

  /**
   * Creates a new Message instance
   * @param role - The role of the message sender (user, assistant, system)
   * @param content - The actual message text
   * @param id - Optional: Custom ID, generates UUID if not provided
   */
  constructor(role: MessageRole, content: string, id?: string) {
    this.id = id || crypto.randomUUID();
    this.role = role;
    this.content = content;
    this.timestamp = Date.now();
  }

  /**
   * Converts the Message entity to a plain JSON object
   * Useful for serialization and storage
   * @returns Plain object representation of the message
   */
  toJSON(): ChatMessage {
    return {
      id: this.id,
      role: this.role,
      content: this.content,
      timestamp: this.timestamp,
    };
  }

  /**
   * Creates a Message instance from stored JSON data
   * Useful for deserialization from database or state storage
   * @param data - Plain object containing message data
   * @returns Reconstructed Message entity
   */
  static fromJSON(data: ChatMessage): Message {
    const msg = new Message(data.role, data.content, data.id);
    // Override the auto-generated timestamp with the stored one
    // We cast to 'any' to bypass readonly restriction during deserialization
    (msg as any).timestamp = data.timestamp;
    return msg;
  }
}
