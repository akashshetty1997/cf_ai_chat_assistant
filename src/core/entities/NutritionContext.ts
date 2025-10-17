// src/core/entities/NutritionContext.ts

import { ChatMessage, MealAnalysis, UserGoals } from "../types";

/**
 * NutritionContext entity representing the current conversation context
 * Manages conversation state, current meal being discussed, and user goals
 *
 * This entity is responsible for:
 * - Maintaining conversation history for context-aware responses
 * - Tracking the current meal being analyzed
 * - Managing session-specific data
 * - Automatic context window management to prevent memory bloat
 *
 * Used by the agent to maintain conversational context across interactions
 */
export class NutritionContext {
  public conversationHistory: ChatMessage[];
  public currentMeal?: MealAnalysis;
  public userGoals?: UserGoals;
  public sessionStartTime: number;

  /**
   * Creates a new NutritionContext for a conversation session
   */
  constructor() {
    this.conversationHistory = [];
    this.sessionStartTime = Date.now();
  }

  /**
   * Adds a message to the conversation history
   * Automatically prunes old messages to keep context window manageable
   * Keeps only the last 20 messages to stay within LLM context limits
   *
   * @param message - The chat message to add
   */
  addMessage(message: ChatMessage): void {
    this.conversationHistory.push(message);

    // Keep only last 20 messages for context window management
    // This prevents exceeding LLM token limits and keeps storage bounded
    if (this.conversationHistory.length > 20) {
      this.conversationHistory = this.conversationHistory.slice(-20);
    }
  }

  /**
   * Sets the meal currently being analyzed or discussed
   * @param meal - The meal analysis to set as current
   */
  setCurrentMeal(meal: MealAnalysis): void {
    this.currentMeal = meal;
  }

  /**
   * Updates the user goals in the current context
   * Used when user changes their goals mid-conversation
   * @param goals - The user's dietary and fitness goals
   */
  setUserGoals(goals: UserGoals): void {
    this.userGoals = goals;
  }

  /**
   * Retrieves the most recent messages from conversation history
   * Useful for building LLM prompts with recent context
   *
   * @param count - Number of recent messages to retrieve (default: 10)
   * @returns Array of recent chat messages
   */
  getRecentMessages(count: number = 10): ChatMessage[] {
    return this.conversationHistory.slice(-count);
  }

  /**
   * Clears the conversation context
   * Useful for starting a new session or resetting state
   */
  clear(): void {
    this.conversationHistory = [];
    this.currentMeal = undefined;
  }

  /**
   * Serializes the context to a plain object for storage
   * @returns Plain object representation of the context
   */
  toJSON() {
    return {
      conversationHistory: this.conversationHistory,
      currentMeal: this.currentMeal,
      userGoals: this.userGoals,
      sessionStartTime: this.sessionStartTime,
    };
  }

  /**
   * Reconstructs a NutritionContext from stored JSON data
   * @param data - Plain object containing context data
   * @returns Reconstructed NutritionContext entity
   */
  static fromJSON(data: any): NutritionContext {
    const context = new NutritionContext();
    context.conversationHistory = data.conversationHistory || [];
    context.currentMeal = data.currentMeal;
    context.userGoals = data.userGoals;
    // Override auto-generated timestamp with stored value
    (context as any).sessionStartTime = data.sessionStartTime;
    return context;
  }
}
