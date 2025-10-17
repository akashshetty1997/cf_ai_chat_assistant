// src/services/nutrition/MealPlanner.ts

import { UserGoals, MealAnalysis } from "../../core/types";

/**
 * MealPlanner - Domain service for meal planning and recommendations
 *
 * This service generates meal suggestions and plans based on user goals,
 * preferences, and dietary restrictions.
 *
 * Responsibilities:
 * - Generate meal ideas within calorie/macro targets
 * - Filter suggestions based on dietary restrictions
 * - Avoid recently eaten meals
 * - Calculate daily nutrition totals
 *
 * Benefits:
 * - Pure business logic (deterministic and testable)
 * - No external dependencies
 * - Reusable meal planning algorithms
 * - Follows Single Responsibility Principle
 */
export class MealPlanner {
  // Common meal templates with approximate nutrition
  // In a real app, this would come from a database
  private readonly mealTemplates = [
    {
      name: "Grilled Chicken with Quinoa and Vegetables",
      calories: 450,
      protein: 35,
      carbs: 45,
      fat: 12,
      tags: ["high-protein", "balanced", "gluten-free"],
    },
    {
      name: "Salmon with Sweet Potato and Asparagus",
      calories: 520,
      protein: 38,
      carbs: 42,
      fat: 18,
      tags: ["high-protein", "omega-3", "gluten-free"],
    },
    {
      name: "Greek Yogurt Bowl with Berries and Granola",
      calories: 320,
      protein: 20,
      carbs: 48,
      fat: 8,
      tags: ["breakfast", "high-protein", "vegetarian"],
    },
    {
      name: "Tofu Stir-Fry with Brown Rice",
      calories: 400,
      protein: 22,
      carbs: 55,
      fat: 10,
      tags: ["vegan", "vegetarian", "balanced"],
    },
    {
      name: "Turkey and Avocado Wrap",
      calories: 380,
      protein: 28,
      carbs: 35,
      fat: 14,
      tags: ["high-protein", "lunch", "portable"],
    },
    {
      name: "Egg White Omelet with Vegetables",
      calories: 250,
      protein: 25,
      carbs: 15,
      fat: 8,
      tags: ["breakfast", "high-protein", "low-calorie", "vegetarian"],
    },
    {
      name: "Lentil Soup with Whole Grain Bread",
      calories: 380,
      protein: 18,
      carbs: 58,
      fat: 8,
      tags: ["vegan", "vegetarian", "high-fiber"],
    },
    {
      name: "Lean Beef with Roasted Vegetables",
      calories: 480,
      protein: 40,
      carbs: 32,
      fat: 18,
      tags: ["high-protein", "iron-rich", "paleo"],
    },
  ];

  /**
   * Suggests meals based on user goals and preferences
   *
   * @param userGoals - User's dietary and fitness goals
   * @param recentMeals - Optional: Recently eaten meals to avoid
   * @param count - Number of suggestions to return (default: 3)
   * @returns Array of meal suggestions
   *
   * @example
   * const suggestions = planner.suggestMeals(
   *   { fitnessGoal: 'muscle-gain', dailyCalories: 2400 },
   *   recentMeals,
   *   3
   * );
   */
  suggestMeals(
    userGoals: UserGoals,
    recentMeals?: MealAnalysis[],
    count: number = 3
  ): string[] {
    // Calculate target calories per meal
    const targetCaloriesPerMeal = userGoals.dailyCalories
      ? userGoals.dailyCalories / 3
      : 500;

    // Filter meals based on dietary restrictions
    let candidates = this.mealTemplates.filter((meal) =>
      this.meetsRestrictions(meal, userGoals.dietaryRestrictions || [])
    );

    // Remove recently eaten meals
    if (recentMeals && recentMeals.length > 0) {
      const recentNames = recentMeals.map((m) => m.mealName.toLowerCase());
      candidates = candidates.filter(
        (meal) => !recentNames.includes(meal.name.toLowerCase())
      );
    }

    // Score meals based on how well they match goals
    const scoredMeals = candidates.map((meal) => ({
      meal,
      score: this.scoreMealForGoals(meal, userGoals, targetCaloriesPerMeal),
    }));

    // Sort by score (descending)
    scoredMeals.sort((a, b) => b.score - a.score);

    // Return top N meal names
    return scoredMeals.slice(0, count).map((sm) => sm.meal.name);
  }

  /**
   * Checks if a meal meets dietary restrictions
   *
   * @param meal - Meal template to check
   * @param restrictions - Array of dietary restrictions
   * @returns True if meal is compatible
   * @private
   */
  private meetsRestrictions(meal: any, restrictions: string[]): boolean {
    if (restrictions.length === 0) return true;

    const normalizedRestrictions = restrictions.map((r) => r.toLowerCase());

    for (const restriction of normalizedRestrictions) {
      // Check if meal has the required tag
      if (restriction === "vegan") {
        if (!meal.tags.includes("vegan")) return false;
      } else if (restriction === "vegetarian") {
        if (!meal.tags.includes("vegetarian") && !meal.tags.includes("vegan")) {
          return false;
        }
      } else if (restriction === "gluten-free") {
        if (!meal.tags.includes("gluten-free")) return false;
      }
      // Add more restriction checks as needed
    }

    return true;
  }

  /**
   * Scores a meal based on how well it matches user goals
   *
   * @param meal - Meal template
   * @param userGoals - User's goals
   * @param targetCalories - Target calories for this meal
   * @returns Score (higher is better)
   * @private
   */
  private scoreMealForGoals(
    meal: any,
    userGoals: UserGoals,
    targetCalories: number
  ): number {
    let score = 0;

    // Score based on calorie match (max 40 points)
    const calorieDeviation =
      Math.abs(meal.calories - targetCalories) / targetCalories;
    if (calorieDeviation <= 0.1) {
      score += 40;
    } else if (calorieDeviation <= 0.2) {
      score += 30;
    } else if (calorieDeviation <= 0.35) {
      score += 20;
    } else if (calorieDeviation <= 0.5) {
      score += 10;
    }

    // Score based on protein (max 30 points)
    if (userGoals.dailyProtein) {
      const targetProtein = userGoals.dailyProtein / 3;
      const proteinRatio = meal.protein / targetProtein;

      if (proteinRatio >= 0.8 && proteinRatio <= 1.2) {
        score += 30;
      } else if (proteinRatio >= 0.6 && proteinRatio <= 1.5) {
        score += 20;
      } else if (proteinRatio >= 0.4) {
        score += 10;
      }
    }

    // Score based on fitness goal alignment (max 30 points)
    if (userGoals.fitnessGoal) {
      score += this.scoreForFitnessGoal(meal, userGoals.fitnessGoal);
    }

    return score;
  }

  /**
   * Scores a meal for alignment with fitness goals
   *
   * @param meal - Meal template
   * @param fitnessGoal - User's fitness goal
   * @returns Score contribution (0-30 points)
   * @private
   */
  private scoreForFitnessGoal(
    meal: any,
    fitnessGoal: "weight-loss" | "muscle-gain" | "maintenance"
  ): number {
    switch (fitnessGoal) {
      case "muscle-gain":
        // Favor high-protein meals
        if (meal.protein >= 35) return 30;
        if (meal.protein >= 25) return 20;
        return 10;

      case "weight-loss":
        // Favor lower calorie, high protein meals
        if (meal.calories <= 400 && meal.protein >= 25) return 30;
        if (meal.calories <= 500 && meal.protein >= 20) return 20;
        return 10;

      case "maintenance":
        // Favor balanced meals
        const proteinRatio = (meal.protein * 4) / meal.calories;
        if (proteinRatio >= 0.2 && proteinRatio <= 0.35) return 30;
        return 15;

      default:
        return 15;
    }
  }

  /**
   * Calculates total nutrition from multiple meals
   *
   * @param meals - Array of meal analyses
   * @returns Aggregated nutrition data
   *
   * @example
   * const dailyTotal = planner.calculateDailyTotal(todaysMeals);
   * console.log(`Total calories: ${dailyTotal.calories}`);
   */
  calculateDailyTotal(meals: MealAnalysis[]): {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
  } {
    return meals.reduce(
      (total, meal) => ({
        calories: total.calories + meal.nutrition.calories,
        protein: total.protein + meal.nutrition.protein,
        carbs: total.carbs + meal.nutrition.carbs,
        fat: total.fat + meal.nutrition.fat,
        fiber: total.fiber + (meal.nutrition.fiber || 0),
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }
    );
  }

  /**
   * Checks if daily goals are met with current meals
   *
   * @param meals - Array of meals eaten today
   * @param userGoals - User's daily goals
   * @returns Status object indicating progress toward goals
   *
   * @example
   * const status = planner.checkGoalProgress(todaysMeals, userGoals);
   * if (status.caloriesRemaining > 0) {
   *   console.log(`You can eat ${status.caloriesRemaining} more calories`);
   * }
   */
  checkGoalProgress(
    meals: MealAnalysis[],
    userGoals: UserGoals
  ): {
    caloriesRemaining: number;
    proteinRemaining: number;
    onTrack: boolean;
  } {
    const totals = this.calculateDailyTotal(meals);

    const caloriesRemaining = userGoals.dailyCalories
      ? userGoals.dailyCalories - totals.calories
      : 0;

    const proteinRemaining = userGoals.dailyProtein
      ? userGoals.dailyProtein - totals.protein
      : 0;

    // Consider on track if within 20% of goals
    const onTrack = userGoals.dailyCalories
      ? Math.abs(caloriesRemaining / userGoals.dailyCalories) <= 0.2
      : true;

    return {
      caloriesRemaining,
      proteinRemaining,
      onTrack,
    };
  }

  /**
   * Generates a description for a suggested meal
   *
   * @param mealName - Name of the meal
   * @returns Descriptive text about the meal
   *
   * @example
   * const description = planner.getMealDescription('Grilled Chicken with Quinoa');
   */
  getMealDescription(mealName: string): string {
    const meal = this.mealTemplates.find((m) => m.name === mealName);

    if (!meal) {
      return "A nutritious meal option.";
    }

    return `${meal.name} (~${meal.calories} cal, ${
      meal.protein
    }g protein). ${this.formatTags(meal.tags)}`;
  }

  /**
   * Formats tags into a readable string
   *
   * @param tags - Array of tags
   * @returns Formatted tag string
   * @private
   */
  private formatTags(tags: string[]): string {
    const displayTags = tags.filter(
      (t) => !["balanced", "lunch", "breakfast"].includes(t)
    );
    if (displayTags.length === 0) return "";

    return displayTags
      .map((t) =>
        t
          .split("-")
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" ")
      )
      .join(", ");
  }
}
