// src/services/llm/PromptBuilder.ts

import { ChatMessage, UserGoals, MealAnalysis } from "../../core/types";

/**
 * PromptBuilder - Utility class for constructing LLM prompts
 *
 * This class encapsulates all prompt construction logic, keeping prompts
 * consistent and maintainable in one place.
 *
 * Responsibilities:
 * - Build system prompts for different scenarios
 * - Format conversation history for context
 * - Create specialized prompts for nutrition analysis
 * - Inject user goals and preferences into prompts
 *
 * Benefits:
 * - Single source of truth for all prompts
 * - Easy to update prompts without touching business logic
 * - Testable prompt construction
 * - Follows Single Responsibility Principle
 */
export class PromptBuilder {
  /**
   * Builds a system prompt defining the AI agent's role and behavior
   *
   * @param userGoals - Optional: User's dietary goals to personalize the prompt
   * @returns Complete system prompt string
   */
  static buildSystemPrompt(userGoals?: UserGoals): string {
    let prompt = `You are a helpful nutrition coach assistant. Your role is to:
- Analyze meals and provide nutritional information
- Give personalized recommendations based on user goals
- Answer questions about nutrition and healthy eating
- Be encouraging and supportive
- Provide accurate, science-based nutrition advice

Provide clear, helpful responses. Include practical details and actionable advice.`;

    // Personalize based on user goals if available
    if (userGoals) {
      prompt += "\n\nUser Goals:\n";

      if (userGoals.fitnessGoal) {
        prompt += `- Fitness Goal: ${userGoals.fitnessGoal}\n`;
      }

      if (userGoals.dailyCalories) {
        prompt += `- Daily Calorie Target: ${userGoals.dailyCalories} calories\n`;
      }

      if (userGoals.dailyProtein) {
        prompt += `- Daily Protein Target: ${userGoals.dailyProtein}g\n`;
      }

      if (
        userGoals.dietaryRestrictions &&
        userGoals.dietaryRestrictions.length > 0
      ) {
        prompt += `- Dietary Restrictions: ${userGoals.dietaryRestrictions.join(
          ", "
        )}\n`;
      }
    }

    return prompt;
  }

  /**
   * Builds a prompt for analyzing a meal description
   *
   * @param mealDescription - User's description of the meal
   * @param userGoals - Optional: User's dietary goals for personalized analysis
   * @returns Prompt string for meal analysis
   */
  static buildMealAnalysisPrompt(
    mealDescription: string,
    userGoals?: UserGoals
  ): string {
    let prompt = `Analyze the following meal and provide nutritional information.

Meal: ${mealDescription}`;

    if (userGoals) {
      prompt += `\n\nConsider the user's goals when providing insights:`;
      if (userGoals.fitnessGoal) {
        prompt += `\n- Goal: ${userGoals.fitnessGoal}`;
      }
      if (userGoals.dietaryRestrictions) {
        prompt += `\n- Restrictions: ${userGoals.dietaryRestrictions.join(
          ", "
        )}`;
      }
    }

    prompt += `\n\nProvide your response as JSON with this exact structure:
{
  "calories": number,
  "protein": number,
  "carbs": number,
  "fat": number,
  "fiber": number,
  "healthScore": number (0-100),
  "insights": ["insight1", "insight2", "insight3"]
}

Respond only with the JSON, no additional text.`;

    return prompt;
  }

  /**
   * Builds a prompt for generating meal recommendations
   *
   * @param userGoals - User's dietary goals
   * @param recentMeals - Optional: Recent meals to avoid repetition
   * @returns Prompt string for meal recommendations
   */
  static buildRecommendationPrompt(
    userGoals: UserGoals,
    recentMeals?: MealAnalysis[]
  ): string {
    let prompt = `Suggest 3 healthy meal ideas based on the following goals:\n`;

    if (userGoals.fitnessGoal) {
      prompt += `- Fitness Goal: ${userGoals.fitnessGoal}\n`;
    }

    if (userGoals.dailyCalories) {
      prompt += `- Target Calories per Meal: ~${Math.round(
        userGoals.dailyCalories / 3
      )} calories\n`;
    }

    if (userGoals.dailyProtein) {
      prompt += `- Target Protein per Meal: ~${Math.round(
        userGoals.dailyProtein / 3
      )}g\n`;
    }

    if (
      userGoals.dietaryRestrictions &&
      userGoals.dietaryRestrictions.length > 0
    ) {
      prompt += `- Dietary Restrictions: ${userGoals.dietaryRestrictions.join(
        ", "
      )}\n`;
    }

    // Add recent meals to avoid repetition
    if (recentMeals && recentMeals.length > 0) {
      prompt += `\nRecent meals (avoid suggesting similar meals):\n`;
      recentMeals.forEach((meal) => {
        prompt += `- ${meal.mealName}\n`;
      });
    }

    prompt += `\nFor each meal, provide:
- Meal name
- Description
- Key ingredients
- Approximate calories
- Approximate protein content

Provide 3 diverse, balanced meal suggestions.`;

    return prompt;
  }

  /**
   * Formats conversation history for context in prompts
   *
   * @param messages - Array of chat messages
   * @param maxMessages - Maximum number of recent messages to include
   * @returns Formatted conversation string
   */
  static formatConversationHistory(
    messages: ChatMessage[],
    maxMessages: number = 10
  ): string {
    const recentMessages = messages.slice(-maxMessages);

    return recentMessages
      .map(
        (msg) => `${msg.role === "user" ? "User" : "Assistant"}: ${msg.content}`
      )
      .join("\n");
  }

  /**
   * Builds a general chat prompt with conversation context
   *
   * @param userMessage - The user's current message
   * @param conversationHistory - Previous messages for context
   * @param userGoals - Optional: User's goals for personalization
   * @returns Complete prompt with context
   */
  static buildChatPrompt(
    userMessage: string,
    conversationHistory: ChatMessage[],
    userGoals?: UserGoals
  ): string {
    let prompt = this.buildSystemPrompt(userGoals);

    if (conversationHistory.length > 0) {
      prompt += `\n\nConversation History:\n`;
      prompt += this.formatConversationHistory(conversationHistory, 8);
    }

    prompt += `\n\nUser: ${userMessage}\nAssistant:`;

    return prompt;
  }
}
