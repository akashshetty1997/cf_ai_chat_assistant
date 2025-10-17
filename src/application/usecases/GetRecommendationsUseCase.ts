// src/application/usecases/GetRecommendationsUseCase.ts

import { ILLMProvider } from "../../core/interfaces/ILLMProvider";
import { IStateManager } from "../../core/interfaces/IStateManager";
import { LLMService } from "../../services/llm/LLMService";
import { StateService } from "../../services/state/StateService";
import { MealPlanner } from "../../services/nutrition/MealPlanner";

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
 * GetRecommendationsUseCase - Use case for generating meal recommendations
 *
 * This class orchestrates the meal recommendation workflow by combining
 * rule-based suggestions with AI-powered personalization.
 *
 * Workflow:
 * 1. Get user profile and goals
 * 2. Get recent meal history to avoid repetition
 * 3. Use MealPlanner for initial filtering and suggestions
 * 4. Use LLM for personalized recommendations with descriptions
 * 5. Return formatted recommendations
 *
 * Benefits:
 * - Combines rule-based logic with AI flexibility
 * - Considers user history to avoid repetition
 * - Provides contextual, personalized suggestions
 * - Follows Use Case Pattern from Clean Architecture
 */
export class GetRecommendationsUseCase {
  private llmService: LLMService;
  private stateService: StateService;
  private mealPlanner: MealPlanner;

  /**
   * Creates a new GetRecommendationsUseCase instance
   *
   * @param llmProvider - LLM provider for AI recommendations
   * @param stateManager - State manager for storage operations
   *
   * @example
   * const useCase = new GetRecommendationsUseCase(
   *   new WorkersAIProvider(env.AI),
   *   new DurableObjectStorage(storage)
   * );
   */
  constructor(llmProvider: ILLMProvider, stateManager: IStateManager) {
    this.llmService = new LLMService(llmProvider);
    this.stateService = new StateService(stateManager);
    this.mealPlanner = new MealPlanner();
  }

  /**
   * Executes the get recommendations use case
   *
   * @param userId - Unique identifier for the user
   * @param count - Optional: Number of recommendations to return (default: 3)
   * @returns Promise resolving to recommendation text
   *
   * @throws Error if recommendation generation fails
   *
   * @example
   * const recommendations = await useCase.execute('user-123', 3);
   * console.log(recommendations);
   * // "Here are 3 meal suggestions for you:
   * //  1. Grilled Chicken with Quinoa...
   * //  2. Salmon with Sweet Potato...
   * //  3. Tofu Stir-Fry..."
   */
  async execute(userId: string, count: number = 3): Promise<string> {
    try {
      // Step 1: Get user profile to access goals and history
      const userProfile = await this.stateService.getOrCreateUserProfile(
        userId
      );

      console.log(
        `User profile loaded for ${userId}:`,
        JSON.stringify(userProfile.goals)
      );

      // Check if user has meaningful goals set (improved check)
      const hasGoals =
        userProfile.goals &&
        (userProfile.goals.dailyCalories ||
          userProfile.goals.dailyProtein ||
          userProfile.goals.fitnessGoal);

      if (!hasGoals) {
        console.log(`No goals found for user ${userId}, returning defaults`);
        return this.getDefaultRecommendations();
      }

      console.log(
        `Goals found for user ${userId}, generating personalized recommendations`
      );

      // Step 2: Get recent meals to avoid repetition
      const recentMeals = userProfile.getRecentMeals(5);

      // Step 3: Get rule-based suggestions from MealPlanner
      const suggestions = this.mealPlanner.suggestMeals(
        userProfile.goals,
        recentMeals,
        count
      );

      // Step 4: Use LLM to enhance recommendations with descriptions
      console.log(`Generating AI recommendations for user ${userId}`);
      const enhancedRecommendations =
        await this.llmService.getMealRecommendations(
          userProfile.goals,
          recentMeals
        );

      // Step 5: Combine rule-based and AI recommendations
      const finalRecommendations = this.formatRecommendations(
        suggestions,
        enhancedRecommendations
      );

      console.log(`Recommendations generated for user ${userId}`);

      return finalRecommendations;
    } catch (error) {
      console.error(`Failed to get recommendations for user ${userId}:`, error);
      throw new Error(
        `Failed to generate recommendations: ${getErrorMessage(error)}`
      );
    }
  }

  /**
   * Gets recommendations specifically for a meal type (breakfast, lunch, dinner)
   *
   * @param userId - Unique identifier for the user
   * @param mealType - Type of meal ('breakfast', 'lunch', 'dinner')
   * @param count - Optional: Number of recommendations (default: 3)
   * @returns Promise resolving to recommendations for that meal type
   *
   * @example
   * const breakfastIdeas = await useCase.executeForMealType(
   *   'user-123',
   *   'breakfast',
   *   3
   * );
   */
  async executeForMealType(
    userId: string,
    mealType: "breakfast" | "lunch" | "dinner",
    count: number = 3
  ): Promise<string> {
    try {
      const userProfile = await this.stateService.getOrCreateUserProfile(
        userId
      );
      const recentMeals = userProfile.getRecentMeals(5);

      // Build a meal-type-specific prompt
      const prompt = `Suggest ${count} ${mealType} ideas for someone with these goals:
${this.formatGoalsForPrompt(userProfile.goals)}

${
  recentMeals.length > 0
    ? `Recent meals to avoid: ${recentMeals.map((m) => m.mealName).join(", ")}`
    : ""
}

Provide specific, actionable meal ideas with brief descriptions.`;

      const recommendations = await this.llmService.generateChatResponse(
        prompt,
        [],
        userProfile.goals
      );

      return recommendations;
    } catch (error) {
      console.error(`Failed to get ${mealType} recommendations:`, error);
      throw new Error(
        `Failed to generate ${mealType} recommendations: ${getErrorMessage(
          error
        )}`
      );
    }
  }

  /**
   * Gets quick meal recommendations when user has limited time
   *
   * @param userId - Unique identifier for the user
   * @param maxPrepTime - Maximum preparation time in minutes
   * @returns Promise resolving to quick meal recommendations
   *
   * @example
   * const quickMeals = await useCase.getQuickRecommendations('user-123', 15);
   * // Returns meals that take 15 minutes or less to prepare
   */
  async getQuickRecommendations(
    userId: string,
    maxPrepTime: number
  ): Promise<string> {
    try {
      const userProfile = await this.stateService.getOrCreateUserProfile(
        userId
      );

      const prompt = `Suggest 3 quick and easy meals that take ${maxPrepTime} minutes or less to prepare.

User goals:
${this.formatGoalsForPrompt(userProfile.goals)}

Focus on simple, nutritious options that can be prepared quickly.`;

      const recommendations = await this.llmService.generateChatResponse(
        prompt,
        [],
        userProfile.goals
      );

      return recommendations;
    } catch (error) {
      console.error("Failed to get quick recommendations:", error);
      throw new Error(
        `Failed to generate quick recommendations: ${getErrorMessage(error)}`
      );
    }
  }

  /**
   * Formats goals into a readable prompt string
   *
   * @param goals - User's goals
   * @returns Formatted string
   * @private
   */
  private formatGoalsForPrompt(goals: any): string {
    const parts: string[] = [];

    if (goals.fitnessGoal) {
      parts.push(`- Fitness Goal: ${goals.fitnessGoal}`);
    }
    if (goals.dailyCalories) {
      parts.push(`- Daily Calories: ${goals.dailyCalories}`);
    }
    if (goals.dailyProtein) {
      parts.push(`- Daily Protein: ${goals.dailyProtein}g`);
    }
    if (goals.dietaryRestrictions && goals.dietaryRestrictions.length > 0) {
      parts.push(
        `- Dietary Restrictions: ${goals.dietaryRestrictions.join(", ")}`
      );
    }

    return parts.join("\n");
  }

  /**
   * Formats recommendations into a user-friendly string
   *
   * @param suggestions - Rule-based meal suggestions
   * @param aiRecommendations - AI-generated recommendations
   * @returns Formatted recommendation text
   * @private
   */
  private formatRecommendations(
    suggestions: string[],
    aiRecommendations: string
  ): string {
    // If AI recommendations are comprehensive, use them
    if (aiRecommendations && aiRecommendations.length > 100) {
      return aiRecommendations;
    }

    // Otherwise, format the rule-based suggestions
    let formatted = "Here are some meal suggestions based on your goals:\n\n";

    suggestions.forEach((meal, index) => {
      const description = this.mealPlanner.getMealDescription(meal);
      formatted += `${index + 1}. ${description}\n`;
    });

    return formatted;
  }

  /**
   * Provides default recommendations when user has no goals set
   *
   * @returns Default recommendation text
   * @private
   */
  private getDefaultRecommendations(): string {
    return `To get personalized meal recommendations, please set your nutrition goals first!

In the meantime, here are some generally healthy options:

1. **Grilled Chicken with Quinoa and Vegetables** - A balanced meal with lean protein, complex carbs, and fiber.

2. **Salmon with Sweet Potato and Asparagus** - Rich in omega-3 fatty acids and vitamins.

3. **Greek Yogurt Bowl with Berries and Granola** - Perfect for breakfast, high in protein and antioxidants.

Use the "set goals" command to personalize your recommendations!`;
  }
}
