// src/services/llm/WorkersAIProvider.ts

import { ILLMProvider } from "../../core/interfaces/ILLMProvider";
import { LLMResponse, ChatMessage } from "../../core/types";
import  { getErrorMessage } from "../state/DurableObjectStorage";

/**
 * WorkersAIProvider - Implementation of ILLMProvider using Cloudflare Workers AI
 *
 * This class provides access to Llama 3.3 (70B) running on Cloudflare's AI infrastructure.
 * It implements the Strategy Pattern, allowing easy swapping with other LLM providers.
 *
 * Features:
 * - Text generation using Llama 3.3
 * - Streaming responses for real-time feedback
 * - Context-aware conversation handling
 * - Automatic prompt formatting
 *
 * Cloudflare Workers AI benefits:
 * - No cold starts (runs at the edge)
 * - Low latency
 * - Cost-effective (included in Workers plan)
 * - No API keys needed (uses Workers binding)
 */
export class WorkersAIProvider implements ILLMProvider {
  private readonly modelName = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";

  /**
   * Creates a new WorkersAIProvider instance
   *
   * @param ai - Cloudflare AI binding from Workers environment
   *
   * @example
   * // In your Worker's fetch handler:
   * const llmProvider = new WorkersAIProvider(env.AI);
   */
  constructor(private ai: Ai) {}

  /**
   * Generates a text response from Llama 3.3
   *
   * @param prompt - The text prompt to send to the model
   * @param context - Optional: Additional context (currently unused, for future extensions)
   * @returns Promise resolving to the LLM's response
   *
   * @throws Error if the AI request fails
   */
  async generate(prompt: string, _context?: any): Promise<LLMResponse> {
    try {
      // Call Workers AI with the Llama 3.3 model
      const response = await this.ai.run(this.modelName, {
        prompt: this.sanitizePrompt(prompt),
        max_tokens: 1024, // Maximum tokens to generate
        temperature: 0.7, // Controls randomness (0.0 = deterministic, 1.0 = creative)
      });

      // Workers AI returns response in specific format
      const content = this.extractContent(response);

      return {
        content,
        tokensUsed: (response as any).tokens_used,
        finishReason: "stop",
      };
    } catch (error) {
      console.error("WorkersAI generation error:", error);
      throw new Error(`Failed to generate response: ${getErrorMessage(error)}`);

    }
  }

  /**
   * Generates a streaming response from Llama 3.3
   * Yields chunks as they are generated for real-time display
   *
   * @param prompt - The text prompt to send to the model
   * @param context - Optional: Additional context
   * @returns AsyncIterableIterator yielding response chunks
   *
   * @example
   * for await (const chunk of provider.streamGenerate(prompt)) {
   *   websocket.send(chunk);
   * }
   */
  async *streamGenerate(
    prompt: string,
    _context?: any
  ): AsyncIterableIterator<string> {
    try {
      // Call Workers AI with streaming enabled
      const response = await this.ai.run(this.modelName, {
        prompt: this.sanitizePrompt(prompt),
        max_tokens: 1024,
        temperature: 0.7,
        stream: true, // Enable streaming
      });

      // Workers AI returns a ReadableStream for streaming responses
      const stream = response as ReadableStream;
      const reader = stream.getReader();
      const decoder = new TextDecoder();

      // Read chunks from the stream
      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        // Decode and yield the chunk
        const chunk = decoder.decode(value, { stream: true });
        yield chunk;
      }
    } catch (error) {
      console.error("WorkersAI streaming error:", error);
      throw new Error(`Failed to stream response: ${getErrorMessage(error)}`);
    }
  }

  /**
   * Generates a response with full conversation context
   * Formats messages into a prompt that maintains conversation flow
   *
   * @param messages - Array of chat messages representing the conversation
   * @param systemPrompt - Optional: System-level instructions for the model
   * @returns Promise resolving to the LLM's response
   */
  async generateWithContext(
    messages: ChatMessage[],
    systemPrompt?: string
  ): Promise<LLMResponse> {
    // Build a formatted prompt with conversation context
    let prompt = "";

    // Add system prompt if provided
    if (systemPrompt) {
      prompt += `System: ${systemPrompt}\n\n`;
    }

    // Add conversation history
    for (const msg of messages) {
      const role = msg.role === "user" ? "User" : "Assistant";
      prompt += `${role}: ${msg.content}\n`;
    }

    // Add final prompt for the assistant to respond
    prompt += "Assistant:";

    // Use the standard generate method with formatted prompt
    return this.generate(prompt);
  }

  /**
   * Sanitizes the prompt by trimming whitespace and basic validation
   *
   * @param prompt - Raw prompt string
   * @returns Cleaned prompt string
   * @private
   */
  private sanitizePrompt(prompt: string): string {
    return prompt.trim();
  }

  /**
   * Extracts the text content from Workers AI response
   * Handles different response formats
   *
   * @param response - Raw response from Workers AI
   * @returns Extracted text content
   * @private
   */
  private extractContent(response: any): string {
    // Workers AI response format: { response: "text" } or { choices: [{text: "text"}] }
    if (typeof response === "string") {
      return response;
    }

    if (response.response) {
      return response.response;
    }

    if (response.choices && response.choices[0]?.text) {
      return response.choices[0].text;
    }

    // Fallback: try to stringify if format is unexpected
    return JSON.stringify(response);
  }
}
