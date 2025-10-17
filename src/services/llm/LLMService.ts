// src/services/llm/LLMService.ts

import { ILLMProvider } from "../../core/interfaces/ILLMProvider";
import { ChatMessage, UserGoals } from "../../core/types";
import { PromptBuilder } from "./PromptBuilder";

/**
 * LLMService - High-level service for LLM operations
 *
 * This service acts as a facade over the LLM provider, adding business logic
 * and convenience methods for common operations.
 *
 * Responsibilities:
 * - Coordinate between PromptBuilder and LLM Provider
 * - Add retry logic and error handling
 * - Provide domain-specific generation methods
 * - Cache responses if needed (future enhancement)
 *
 * Benefits:
 * - Simplified API for the rest of the application
 * - Centralized error handling
 * - Easy to add caching, rate limiting, or other cross-cutting concerns
 * - Follows Facade Pattern
 */
export class LLMService {
  /**
   * Creates a new LLMService instance
   *
   * @param provider - The LLM provider implementation to use
   *
   * @example
   * const llmService = new LLMService(
   *   new WorkersAIProvider(env.AI)
   * );
   */
  constructor(private provider: ILLMProvider) {}

  /**
   * Generates a chat response with conversation context
   *
   * @param userMessage - The user's current message
   * @param conversationHistory - Previous messages for context
   * @param userGoals - Optional: User's goals for personalized responses
   * @returns Promise resolving to the assistant's response
   *
   * @example
   * const response = await llmService.generateChatResponse(
   *   "What should I eat for breakfast?",
   *   previousMessages,
   *   { fitnessGoal: 'muscle-gain' }
   * );
   */
  async generateChatResponse(
    userMessage: string,
    conversationHistory: ChatMessage[],
    userGoals?: UserGoals
  ): Promise<string> {
    try {
      // Build the prompt with full context
      const prompt = PromptBuilder.buildChatPrompt(
        userMessage,
        conversationHistory,
        userGoals
      );

      // Generate response from LLM
      const response = await this.provider.generate(prompt);

      // Add validation here
      if (!this.validateResponse(response.content)) {
        throw new Error("Generated response failed validation");
      }

      return response.content;
    } catch (error) {
      console.error("Error generating chat response:", error);
      throw new Error("Failed to generate response. Please try again.");
    }
  }

  /**
   * Analyzes a meal and returns nutritional information
   * Uses specialized prompt for structured output
   *
   * @param mealDescription - User's description of the meal
   * @param userGoals - Optional: User's goals for personalized analysis
   * @returns Promise resolving to parsed meal analysis
   *
   * @example
   * const analysis = await llmService.analyzeMeal(
   *   "Grilled chicken breast with quinoa and broccoli",
   *   userGoals
   * );
   */
  async analyzeMeal(
    mealDescription: string,
    userGoals?: UserGoals
  ): Promise<any> {
    try {
      // Build specialized meal analysis prompt
      const prompt = PromptBuilder.buildMealAnalysisPrompt(
        mealDescription,
        userGoals
      );

      // Generate response
      const response = await this.provider.generate(prompt);

      // Parse JSON response
      // LLM should return JSON, but we need to handle potential parsing errors
      const parsed = this.parseJSONResponse(response.content);

      return parsed;
    } catch (error) {
      console.error("Error analyzing meal:", error);
      throw new Error("Failed to analyze meal. Please try again.");
    }
  }

  /**
   * Generates meal recommendations based on user goals
   *
   * @param userGoals - User's dietary and fitness goals
   * @param recentMeals - Optional: Recent meals to avoid repetition
   * @returns Promise resolving to meal recommendation text
   *
   * @example
   * const recommendations = await llmService.getMealRecommendations(
   *   { fitnessGoal: 'weight-loss', dailyCalories: 1800 },
   *   recentMeals
   * );
   */
  async getMealRecommendations(
    userGoals: UserGoals,
    recentMeals?: any[]
  ): Promise<string> {
    try {
      const prompt = PromptBuilder.buildRecommendationPrompt(
        userGoals,
        recentMeals
      );

      const response = await this.provider.generate(prompt);

      // Add validation here
      if (!this.validateResponse(response.content)) {
        throw new Error("Generated recommendations failed validation");
      }

      return response.content;
    } catch (error) {
      console.error("Error generating recommendations:", error);
      throw new Error("Failed to generate recommendations. Please try again.");
    }
  }

  /**
   * Generates a streaming response for real-time display
   *
   * @param userMessage - The user's message
   * @param conversationHistory - Previous messages
   * @param userGoals - Optional: User's goals
   * @returns AsyncIterableIterator yielding response chunks
   *
   * @example
   * for await (const chunk of llmService.generateStreamingResponse(message, history)) {
   *   websocket.send(chunk);
   * }
   */
  async *generateStreamingResponse(
    userMessage: string,
    conversationHistory: ChatMessage[],
    userGoals?: UserGoals
  ): AsyncIterableIterator<string> {
    try {
      // Build prompt
      const prompt = PromptBuilder.buildChatPrompt(
        userMessage,
        conversationHistory,
        userGoals
      );

      // Stream response chunks
      for await (const chunk of this.provider.streamGenerate(prompt)) {
        yield chunk;
      }
    } catch (error) {
      console.error("Error in streaming response:", error);
      throw new Error("Failed to generate streaming response.");
    }
  }

  /**
   * Parses JSON response from LLM
   * Handles cases where LLM returns JSON wrapped in markdown code blocks
   *
   * @param content - Raw content from LLM
   * @returns Parsed JSON object
   * @private
   */
  private parseJSONResponse(content: string): any {
    try {
      // Remove markdown code blocks if present
      let cleaned = content.trim();

      // Remove ```json and ``` markers
      if (cleaned.startsWith("```json")) {
        cleaned = cleaned.slice(7);
      } else if (cleaned.startsWith("```")) {
        cleaned = cleaned.slice(3);
      }

      if (cleaned.endsWith("```")) {
        cleaned = cleaned.slice(0, -3);
      }

      cleaned = cleaned.trim();

      // Parse JSON
      return JSON.parse(cleaned);
    } catch (error) {
      console.error("Failed to parse JSON response:", content);
      // Return a fallback structure
      return {
        error: "Failed to parse response",
        rawContent: content,
      };
    }
  }

  /**
   * Validates that the response is appropriate and safe
   * Can be extended with content moderation logic
   *
   * @param content - Response content to validate
   * @returns True if valid, false otherwise
   * @private
   */
  private validateResponse(content: string): boolean {
    // Basic validation
    if (!content || content.trim().length === 0) {
      return false;
    }

    // Can add more validation rules here
    // - Check for inappropriate content
    // - Verify response format
    // - Check length constraints

    return true;
  }
}
