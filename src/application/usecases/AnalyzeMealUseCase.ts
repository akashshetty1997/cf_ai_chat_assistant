// src/application/usecases/AnalyzeMealUseCase.ts

import { ILLMProvider } from "../../core/interfaces/ILLMProvider";
import { IStateManager } from "../../core/interfaces/IStateManager";
import { MealAnalysis } from "../../core/types";
import { NutritionAnalyzer } from "../../services/nutrition/NutritionAnalyzer";
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
 * AnalyzeMealUseCase - Use case for analyzing a meal's nutritional content
 *
 * This class orchestrates the meal analysis workflow by coordinating
 * multiple services to achieve a business goal.
 *
 * Workflow:
 * 1. Get user profile from storage
 * 2. Use LLM to analyze meal description and extract nutrition data
 * 3. Use NutritionAnalyzer to calculate health score
 * 4. Generate insights based on user goals
 * 5. Store meal in user's history
 *
 * Benefits:
 * - Encapsulates complex business logic in one place
 * - Coordinates multiple services
 * - Separates use case logic from infrastructure
 * - Easy to test and modify
 * - Follows Use Case Pattern from Clean Architecture
 */
export class AnalyzeMealUseCase {
  private llmService: LLMService;
  private stateService: StateService;
  private nutritionAnalyzer: NutritionAnalyzer;

  /**
   * Creates a new AnalyzeMealUseCase instance
   *
   * @param llmProvider - LLM provider for AI analysis
   * @param stateManager - State manager for storage operations
   *
   * @example
   * const useCase = new AnalyzeMealUseCase(
   *   new WorkersAIProvider(env.AI),
   *   new DurableObjectStorage(storage)
   * );
   */
  constructor(llmProvider: ILLMProvider, stateManager: IStateManager) {
    this.llmService = new LLMService(llmProvider);
    this.stateService = new StateService(stateManager);
    this.nutritionAnalyzer = new NutritionAnalyzer();
  }

  /**
   * Executes the meal analysis use case
   *
   * @param userId - Unique identifier for the user
   * @param mealDescription - User's description of the meal
   * @returns Promise resolving to complete meal analysis
   *
   * @throws Error if analysis fails
   *
   * @example
   * const analysis = await useCase.execute(
   *   'user-123',
   *   'Grilled chicken breast with quinoa and steamed broccoli'
   * );
   * console.log(`Health Score: ${analysis.healthScore}`);
   */
  async execute(
    userId: string,
    mealDescription: string
  ): Promise<MealAnalysis> {
    try {
      // Step 1: Get user profile to access goals
      const userProfile = await this.stateService.getOrCreateUserProfile(
        userId
      );

      // Step 2: Use LLM to analyze the meal and extract nutrition data
      console.log(`Analyzing meal for user ${userId}: ${mealDescription}`);
      const llmAnalysis = await this.llmService.analyzeMeal(
        mealDescription,
        userProfile.goals
      );

      // Step 3: Validate the LLM's nutrition data
      if (!this.nutritionAnalyzer.validateNutritionData(llmAnalysis)) {
        throw new Error("Invalid nutrition data from analysis");
      }

      // Step 4: Calculate health score based on user goals
      const healthScore = this.nutritionAnalyzer.calculateHealthScore(
        llmAnalysis,
        userProfile.goals
      );

      // Step 5: Generate insights
      const insights =
        llmAnalysis.insights ||
        this.nutritionAnalyzer.generateInsights(llmAnalysis, userProfile.goals);

      // Step 6: Build the meal analysis result
      const mealAnalysis: MealAnalysis = {
        mealName: mealDescription,
        nutrition: {
          calories: llmAnalysis.calories,
          protein: llmAnalysis.protein,
          carbs: llmAnalysis.carbs,
          fat: llmAnalysis.fat,
          fiber: llmAnalysis.fiber || 0,
        },
        healthScore,
        insights,
      };

      // Step 7: Save meal to user's history
      userProfile.addMeal(mealAnalysis);
      await this.stateService.saveUserProfile(userProfile);

      console.log(
        `Meal analysis completed for user ${userId}. Score: ${healthScore}`
      );

      return mealAnalysis;
    } catch (error) {
      console.error(`Failed to analyze meal for user ${userId}:`, error);
      throw new Error(`Meal analysis failed: ${getErrorMessage(error)}`);
    }
  }

  /**
   * Analyzes multiple meals in batch
   * Useful for analyzing a full day's worth of meals at once
   *
   * @param userId - Unique identifier for the user
   * @param mealDescriptions - Array of meal descriptions
   * @returns Promise resolving to array of meal analyses
   *
   * @example
   * const analyses = await useCase.executeBatch('user-123', [
   *   'Oatmeal with berries',
   *   'Chicken salad',
   *   'Salmon with vegetables'
   * ]);
   */
  async executeBatch(
    userId: string,
    mealDescriptions: string[]
  ): Promise<MealAnalysis[]> {
    const results: MealAnalysis[] = [];

    for (const description of mealDescriptions) {
      try {
        const analysis = await this.execute(userId, description);
        results.push(analysis);
      } catch (error) {
        console.error(`Failed to analyze meal "${description}":`, error);
        // Continue with other meals even if one fails
      }
    }

    return results;
  }

  /**
   * Re-analyzes a meal with updated user goals
   * Useful when user changes their goals and wants to see updated scores
   *
   * @param userId - Unique identifier for the user
   * @param mealDescription - Meal description
   * @returns Promise resolving to updated meal analysis
   *
   * @example
   * // User changed goals, re-analyze previous meal
   * const updated = await useCase.reanalyze('user-123', 'Grilled chicken');
   */
  async reanalyze(
    userId: string,
    mealDescription: string
  ): Promise<MealAnalysis> {
    // Simply execute again - it will use the latest user goals
    return this.execute(userId, mealDescription);
  }
}
