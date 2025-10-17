// src/core/entities/UserProfile.ts

import { UserGoals, MealAnalysis } from "../types";

/**
 * UserProfile entity representing a user's complete profile
 * Manages user goals, meal history, and preferences
 *
 * This entity is responsible for:
 * - Storing and updating user dietary goals
 * - Managing meal history with automatic pruning
 * - Tracking user preferences and metadata
 *
 * Follows Single Responsibility Principle: Only manages user profile data
 */
export class UserProfile {
  public readonly userId: string;
  public goals: UserGoals;
  public mealHistory: MealAnalysis[];
  public preferences: Record<string, any>;
  public createdAt: number;
  public updatedAt: number;

  /**
   * Creates a new UserProfile instance
   * @param userId - Unique identifier for the user
   * @param goals - Initial dietary and fitness goals (optional)
   */
  constructor(userId: string, goals: UserGoals = {}) {
    this.userId = userId;
    this.goals = goals;
    this.mealHistory = [];
    this.preferences = {};
    this.createdAt = Date.now();
    this.updatedAt = Date.now();
  }

  /**
   * Updates user goals with partial updates
   * Preserves existing goals and only updates provided fields
   * @param newGoals - Partial goals object to merge with existing goals
   */
  updateGoals(newGoals: Partial<UserGoals>): void {
    this.goals = { ...this.goals, ...newGoals };
    this.updatedAt = Date.now();
  }

  /**
   * Adds a meal to the user's history
   * Automatically prunes history to keep only last 30 meals to prevent storage bloat
   * @param meal - The meal analysis to add
   */
  addMeal(meal: MealAnalysis): void {
    this.mealHistory.push(meal);
    this.updatedAt = Date.now();

    // Keep only last 30 meals to avoid storage bloat
    // This ensures bounded storage growth per user
    if (this.mealHistory.length > 30) {
      this.mealHistory = this.mealHistory.slice(-30);
    }
  }

  /**
   * Retrieves the most recent meals from history
   * @param count - Number of recent meals to retrieve (default: 5)
   * @returns Array of recent meal analyses
   */
  getRecentMeals(count: number = 5): MealAnalysis[] {
    return this.mealHistory.slice(-count);
  }

  /**
   * Gets all meals logged today
   * Note: This is a simplified implementation
   * @returns Array of today's meals
   */
  getTodaysMeals(): MealAnalysis[] {
    // TODO: Add timestamp to MealAnalysis to enable proper filtering
    // For now, returns all meals - to be implemented with timestamps
    return this.mealHistory;
  }

  /**
   * Serializes the profile to a plain object for storage
   * @returns Plain object representation of the profile
   */
  toJSON() {
    return {
      userId: this.userId,
      goals: this.goals,
      mealHistory: this.mealHistory,
      preferences: this.preferences,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  /**
   * Reconstructs a UserProfile from stored JSON data
   * @param data - Plain object containing profile data
   * @returns Reconstructed UserProfile entity
   */
  static fromJSON(data: any): UserProfile {
    const profile = new UserProfile(data.userId, data.goals);
    profile.mealHistory = data.mealHistory || [];
    profile.preferences = data.preferences || {};
    // Override auto-generated timestamps with stored values
    (profile as any).createdAt = data.createdAt;
    (profile as any).updatedAt = data.updatedAt;
    return profile;
  }
}
