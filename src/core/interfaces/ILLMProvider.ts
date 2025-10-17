// src/core/interfaces/ILLMProvider.ts

import { LLMResponse, ChatMessage } from "../types";

/**
 * ILLMProvider interface - Contract for LLM (Language Model) providers
 *
 * This interface follows the Strategy Pattern, allowing different LLM implementations
 * to be swapped without changing the business logic.
 *
 * Examples of implementations:
 * - WorkersAIProvider (Llama 3.3 on Cloudflare Workers AI)
 * - OpenAIProvider (GPT models)
 * - AnthropicProvider (Claude models)
 *
 * Benefits of this abstraction:
 * - Easy to switch between LLM providers
 * - Testable with mock implementations
 * - Follows Dependency Inversion Principle (depend on abstractions, not concretions)
 */
export interface ILLMProvider {
  /**
   * Generates a text response from the LLM based on a prompt
   *
   * @param prompt - The text prompt to send to the LLM
   * @param context - Optional: Additional context like conversation history, system prompts
   * @returns Promise resolving to the LLM's response
   *
   * @example
   * const response = await llmProvider.generate(
   *   "Analyze this meal: grilled chicken with rice",
   *   { conversationHistory: previousMessages }
   * );
   */
  generate(prompt: string, context?: any): Promise<LLMResponse>;

  /**
   * Generates a streaming response from the LLM
   * Useful for real-time user feedback in chat interfaces
   *
   * @param prompt - The text prompt to send to the LLM
   * @param context - Optional: Additional context
   * @returns AsyncIterableIterator yielding response chunks as they're generated
   *
   * @example
   * for await (const chunk of llmProvider.streamGenerate(prompt)) {
   *   console.log(chunk); // Print each chunk as it arrives
   * }
   */
  streamGenerate(prompt: string, context?: any): AsyncIterableIterator<string>;

  /**
   * Generates a response with full conversation context
   * This method accepts a full conversation history for context-aware responses
   *
   * @param messages - Array of chat messages representing the conversation
   * @param systemPrompt - Optional: System-level instructions for the LLM
   * @returns Promise resolving to the LLM's response
   *
   * @example
   * const response = await llmProvider.generateWithContext(
   *   [
   *     { role: 'user', content: 'What did I eat for breakfast?' },
   *     { role: 'assistant', content: 'You had oatmeal with berries.' },
   *     { role: 'user', content: 'How many calories was that?' }
   *   ],
   *   "You are a nutrition coach assistant."
   * );
   */
  generateWithContext(
    messages: ChatMessage[],
    systemPrompt?: string
  ): Promise<LLMResponse>;
}
