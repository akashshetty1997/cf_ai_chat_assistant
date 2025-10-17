// src/services/nutrition/NutritionAnalyzer.ts

import { NutritionData, MealAnalysis, UserGoals } from "../../core/types";

/**
 * NutritionAnalyzer - Domain service for nutrition analysis and calculations
 *
 * This service contains pure business logic for nutrition-related operations.
 * It doesn't depend on external services like LLM or storage.
 *
 * Responsibilities:
 * - Calculate health scores based on user goals
 * - Validate nutritional data
 * - Compare meals against targets
 * - Generate nutrition insights
 *
 * Benefits:
 * - Pure business logic (no external dependencies)
 * - Easy to test (deterministic functions)
 * - Reusable across different contexts
 * - Follows Single Responsibility Principle
 */
export class NutritionAnalyzer {
  /**
   * Calculates a health score (0-100) for a meal based on user goals
   *
   * Scoring factors:
   * - Calorie alignment with goals
   * - Protein adequacy
   * - Macronutrient balance
   * - Dietary restriction compliance
   *
   * @param nutrition - Nutritional data of the meal
   * @param userGoals - User's dietary and fitness goals
   * @returns Health score from 0-100
   *
   * @example
   * const score = analyzer.calculateHealthScore(
   *   { calories: 500, protein: 30, carbs: 50, fat: 15 },
   *   { fitnessGoal: 'muscle-gain', dailyCalories: 2400 }
   * );
   */
  calculateHealthScore(
    nutrition: NutritionData,
    userGoals?: UserGoals
  ): number {
    let score = 50; // Base score

    if (!userGoals) {
      // Without goals, just evaluate general nutritional balance
      return this.calculateGeneralHealthScore(nutrition);
    }

    // Factor 1: Calorie alignment (max 25 points)
    if (userGoals.dailyCalories) {
      const targetPerMeal = userGoals.dailyCalories / 3;
      const calorieDeviation =
        Math.abs(nutrition.calories - targetPerMeal) / targetPerMeal;

      if (calorieDeviation <= 0.15) {
        score += 25; // Within 15% of target
      } else if (calorieDeviation <= 0.3) {
        score += 15; // Within 30% of target
      } else if (calorieDeviation <= 0.5) {
        score += 5; // Within 50% of target
      }
    }

    // Factor 2: Protein adequacy (max 25 points)
    if (userGoals.dailyProtein) {
      const targetProteinPerMeal = userGoals.dailyProtein / 3;
      const proteinRatio = nutrition.protein / targetProteinPerMeal;

      if (proteinRatio >= 0.8 && proteinRatio <= 1.2) {
        score += 25; // Good protein amount
      } else if (proteinRatio >= 0.6 && proteinRatio <= 1.5) {
        score += 15; // Acceptable protein
      } else if (proteinRatio >= 0.4) {
        score += 5; // Low but present
      }
    }

    // Factor 3: Macronutrient balance (max 15 points)
    const totalMacros =
      nutrition.protein * 4 + nutrition.carbs * 4 + nutrition.fat * 9;
    const proteinPercent = (nutrition.protein * 4) / totalMacros;
    const carbPercent = (nutrition.carbs * 4) / totalMacros;
    const fatPercent = (nutrition.fat * 9) / totalMacros;

    // Good balance: P: 20-35%, C: 45-65%, F: 20-35%
    if (
      proteinPercent >= 0.2 &&
      proteinPercent <= 0.35 &&
      carbPercent >= 0.45 &&
      carbPercent <= 0.65 &&
      fatPercent >= 0.2 &&
      fatPercent <= 0.35
    ) {
      score += 15;
    } else {
      score += 8; // Some balance present
    }

    // Factor 4: Fitness goal alignment (max 10 points)
    if (userGoals.fitnessGoal) {
      score += this.evaluateFitnessGoalAlignment(
        nutrition,
        userGoals.fitnessGoal
      );
    }

    // Ensure score is within 0-100 range
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * Calculates a general health score without specific user goals
   * Based on general nutritional guidelines
   *
   * @param nutrition - Nutritional data
   * @returns Health score from 0-100
   * @private
   */
  private calculateGeneralHealthScore(nutrition: NutritionData): number {
    let score = 50;

    // Check for reasonable calorie amount (300-800 per meal)
    if (nutrition.calories >= 300 && nutrition.calories <= 800) {
      score += 20;
    } else if (nutrition.calories > 800 && nutrition.calories <= 1000) {
      score += 10;
    }

    // Check protein content (at least 15g per meal is good)
    if (nutrition.protein >= 25) {
      score += 20;
    } else if (nutrition.protein >= 15) {
      score += 15;
    } else if (nutrition.protein >= 10) {
      score += 5;
    }

    // Check for fiber if available
    if (nutrition.fiber) {
      if (nutrition.fiber >= 8) {
        score += 10;
      } else if (nutrition.fiber >= 5) {
        score += 5;
      }
    }

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * Evaluates how well the meal aligns with fitness goals
   *
   * @param nutrition - Nutritional data
   * @param fitnessGoal - User's fitness goal
   * @returns Score contribution (0-10 points)
   * @private
   */
  private evaluateFitnessGoalAlignment(
    nutrition: NutritionData,
    fitnessGoal: "weight-loss" | "muscle-gain" | "maintenance"
  ): number {
    const totalMacros =
      nutrition.protein * 4 + nutrition.carbs * 4 + nutrition.fat * 9;
    const proteinPercent = (nutrition.protein * 4) / totalMacros;

    switch (fitnessGoal) {
      case "muscle-gain":
        // High protein is good for muscle gain
        if (proteinPercent >= 0.3) return 10;
        if (proteinPercent >= 0.25) return 7;
        return 3;

      case "weight-loss":
        // High protein and moderate calories
        if (nutrition.calories <= 500 && proteinPercent >= 0.25) return 10;
        if (nutrition.calories <= 600 && proteinPercent >= 0.2) return 7;
        return 3;

      case "maintenance":
        // Balanced approach
        if (proteinPercent >= 0.2 && proteinPercent <= 0.35) return 10;
        return 5;

      default:
        return 5;
    }
  }

  /**
   * Generates insights about a meal based on its nutrition
   *
   * @param nutrition - Nutritional data
   * @param userGoals - Optional: User's goals for personalized insights
   * @returns Array of insight strings
   *
   * @example
   * const insights = analyzer.generateInsights(nutrition, userGoals);
   * // Returns: ["High in protein - great for muscle recovery!", ...]
   */
  generateInsights(nutrition: NutritionData, userGoals?: UserGoals): string[] {
    const insights: string[] = [];

    // Protein insights
    if (nutrition.protein >= 30) {
      insights.push("High in protein - great for muscle recovery and satiety!");
    } else if (nutrition.protein < 10) {
      insights.push(
        "Consider adding a protein source to make this more balanced."
      );
    }

    // Calorie insights
    if (userGoals?.dailyCalories) {
      const targetPerMeal = userGoals.dailyCalories / 3;
      if (nutrition.calories > targetPerMeal * 1.5) {
        insights.push(
          "This meal is calorie-dense. Consider a lighter option if you have other meals today."
        );
      } else if (nutrition.calories < targetPerMeal * 0.5) {
        insights.push(
          "This is a light meal. You might need to supplement with snacks."
        );
      }
    }

    // Fiber insights
    if (nutrition.fiber && nutrition.fiber >= 8) {
      insights.push("Excellent fiber content - supports digestive health.");
    } else if (nutrition.fiber && nutrition.fiber < 3) {
      insights.push("Low in fiber. Try adding vegetables or whole grains.");
    }

    // Fat insights
    if (nutrition.fat > 30) {
      insights.push(
        "High in fat. Make sure it includes healthy fats like avocado or nuts."
      );
    }

    // If no insights generated, add a general one
    if (insights.length === 0) {
      insights.push("A balanced meal overall. Keep up the good nutrition!");
    }

    // Limit to 3 insights
    return insights.slice(0, 3);
  }

  /**
   * Validates nutritional data for reasonableness
   * Helps catch LLM hallucinations or parsing errors
   *
   * @param nutrition - Nutritional data to validate
   * @returns True if data appears valid
   *
   * @example
   * if (analyzer.validateNutritionData(data)) {
   *   // Data looks reasonable
   * }
   */
  validateNutritionData(nutrition: NutritionData): boolean {
    // Check for negative values
    if (
      nutrition.calories < 0 ||
      nutrition.protein < 0 ||
      nutrition.carbs < 0 ||
      nutrition.fat < 0
    ) {
      return false;
    }

    // Check for unreasonable values (one meal shouldn't be 10,000 calories)
    if (nutrition.calories > 5000) {
      return false;
    }

    // Check if macros roughly add up to calories
    // Protein: 4 cal/g, Carbs: 4 cal/g, Fat: 9 cal/g
    const calculatedCalories =
      nutrition.protein * 4 + nutrition.carbs * 4 + nutrition.fat * 9;
    const deviation =
      Math.abs(calculatedCalories - nutrition.calories) / nutrition.calories;

    // Allow 30% deviation (LLM estimates aren't perfect)
    if (deviation > 0.3) {
      console.warn(
        "Nutritional data may be inaccurate - macro/calorie mismatch"
      );
    }

    return true;
  }

  /**
   * Compares two meals and returns which is healthier
   *
   * @param meal1 - First meal analysis
   * @param meal2 - Second meal analysis
   * @param userGoals - Optional: User goals for scoring
   * @returns -1 if meal1 is better, 1 if meal2 is better, 0 if equal
   *
   * @example
   * const better = analyzer.compareMeals(mealA, mealB, userGoals);
   */
  compareMeals(
    meal1: MealAnalysis,
    meal2: MealAnalysis,
    userGoals?: UserGoals
  ): number {
    const score1 = this.calculateHealthScore(meal1.nutrition, userGoals);
    const score2 = this.calculateHealthScore(meal2.nutrition, userGoals);

    if (score1 > score2) return -1;
    if (score2 > score1) return 1;
    return 0;
  }
}
