// src/services/state/StateService.ts

import { IStateManager } from "../../core/interfaces/IStateManager";
import { UserProfile } from "../../core/entities/UserProfile";
import { NutritionContext } from "../../core/entities/NutritionContext";

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
 * StateService - High-level service for state management operations
 *
 * This service acts as a facade over the state manager, providing
 * domain-specific methods for managing user profiles and conversation contexts.
 *
 * Responsibilities:
 * - User profile CRUD operations
 * - Conversation context management
 * - Key generation and naming conventions
 * - Serialization/deserialization of entities
 *
 * Benefits:
 * - Centralized state access patterns
 * - Consistent key naming across the app
 * - Type-safe entity storage
 * - Encapsulates storage implementation details
 * - Follows Facade Pattern
 */
export class StateService {
  /**
   * Creates a new StateService instance
   *
   * @param stateManager - The state manager implementation to use
   *
   * @example
   * const stateService = new StateService(
   *   new DurableObjectStorage(storage)
   * );
   */
  constructor(private stateManager: IStateManager) {}

  /**
   * Generates a consistent storage key for user profiles
   * @param userId - User identifier
   * @returns Formatted key string
   * @private
   */
  private getUserProfileKey(userId: string): string {
    return `user:${userId}:profile`;
  }

  /**
   * Generates a consistent storage key for conversation contexts
   * @param userId - User identifier
   * @returns Formatted key string
   * @private
   */
  private getContextKey(userId: string): string {
    return `user:${userId}:context`;
  }

  /**
   * Retrieves a user's profile from storage
   *
   * @param userId - Unique identifier for the user
   * @returns Promise resolving to UserProfile, or null if not found
   *
   * @example
   * const profile = await stateService.getUserProfile('user-123');
   * if (profile) {
   *   console.log(profile.goals);
   * }
   */
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      const key = this.getUserProfileKey(userId);
      const data = await this.stateManager.get<any>(key);

      if (!data) {
        return null;
      }

      // Deserialize from JSON to UserProfile entity
      return UserProfile.fromJSON(data);
    } catch (error) {
      console.error(`Failed to get user profile for ${userId}:`, error);
      throw new Error(
        `Failed to retrieve user profile: ${getErrorMessage(error)}`
      );
    }
  }

  /**
   * Saves a user's profile to storage
   *
   * @param profile - UserProfile entity to save
   * @returns Promise that resolves when save is complete
   *
   * @example
   * const profile = new UserProfile('user-123', { dailyCalories: 2000 });
   * await stateService.saveUserProfile(profile);
   */
  async saveUserProfile(profile: UserProfile): Promise<void> {
    try {
      const key = this.getUserProfileKey(profile.userId);
      // Serialize entity to JSON before storing
      await this.stateManager.save(key, profile.toJSON());
    } catch (error) {
      console.error(
        `Failed to save user profile for ${profile.userId}:`,
        error
      );
      throw new Error(`Failed to save user profile: ${getErrorMessage(error)}`);
    }
  }

  /**
   * Creates a new user profile or returns existing one
   *
   * @param userId - Unique identifier for the user
   * @returns Promise resolving to UserProfile (existing or new)
   *
   * @example
   * const profile = await stateService.getOrCreateUserProfile('user-123');
   * // Returns existing profile or creates new one
   */
  async getOrCreateUserProfile(userId: string): Promise<UserProfile> {
    const existing = await this.getUserProfile(userId);

    if (existing) {
      return existing;
    }

    // Create new profile with default values
    const newProfile = new UserProfile(userId);
    await this.saveUserProfile(newProfile);

    return newProfile;
  }

  /**
   * Deletes a user's profile from storage
   *
   * @param userId - Unique identifier for the user
   * @returns Promise that resolves when deletion is complete
   *
   * @example
   * await stateService.deleteUserProfile('user-123');
   */
  async deleteUserProfile(userId: string): Promise<void> {
    try {
      const key = this.getUserProfileKey(userId);
      await this.stateManager.delete(key);
    } catch (error) {
      console.error(`Failed to delete user profile for ${userId}:`, error);
      throw new Error(
        `Failed to delete user profile: ${getErrorMessage(error)}`
      );
    }
  }

  /**
   * Retrieves conversation context for a user
   *
   * @param userId - Unique identifier for the user
   * @returns Promise resolving to NutritionContext, or null if not found
   *
   * @example
   * const context = await stateService.getContext('user-123');
   * if (context) {
   *   const recentMessages = context.getRecentMessages(5);
   * }
   */
  async getContext(userId: string): Promise<NutritionContext | null> {
    try {
      const key = this.getContextKey(userId);
      const data = await this.stateManager.get<any>(key);

      if (!data) {
        return null;
      }

      // Deserialize from JSON to NutritionContext entity
      return NutritionContext.fromJSON(data);
    } catch (error) {
      console.error(`Failed to get context for ${userId}:`, error);
      throw new Error(`Failed to retrieve context: ${getErrorMessage(error)}`);
    }
  }

  /**
   * Saves conversation context to storage
   *
   * @param userId - Unique identifier for the user
   * @param context - NutritionContext entity to save
   * @returns Promise that resolves when save is complete
   *
   * @example
   * const context = new NutritionContext();
   * context.addMessage(message);
   * await stateService.saveContext('user-123', context);
   */
  async saveContext(userId: string, context: NutritionContext): Promise<void> {
    try {
      const key = this.getContextKey(userId);
      // Serialize entity to JSON before storing
      await this.stateManager.save(key, context.toJSON());
    } catch (error) {
      console.error(`Failed to save context for ${userId}:`, error);
      throw new Error(`Failed to save context: ${getErrorMessage(error)}`);
    }
  }

  /**
   * Creates a new context or returns existing one
   *
   * @param userId - Unique identifier for the user
   * @returns Promise resolving to NutritionContext (existing or new)
   *
   * @example
   * const context = await stateService.getOrCreateContext('user-123');
   */
  async getOrCreateContext(userId: string): Promise<NutritionContext> {
    const existing = await this.getContext(userId);

    if (existing) {
      return existing;
    }

    // Create new context
    const newContext = new NutritionContext();
    await this.saveContext(userId, newContext);

    return newContext;
  }

  /**
   * Clears conversation context for a user
   *
   * @param userId - Unique identifier for the user
   * @returns Promise that resolves when context is cleared
   *
   * @example
   * await stateService.clearContext('user-123');
   */
  async clearContext(userId: string): Promise<void> {
    try {
      const key = this.getContextKey(userId);
      await this.stateManager.delete(key);
    } catch (error) {
      console.error(`Failed to clear context for ${userId}:`, error);
      throw new Error(`Failed to clear context: ${getErrorMessage(error)}`);
    }
  }

  /**
   * Checks if a user profile exists
   *
   * @param userId - Unique identifier for the user
   * @returns Promise resolving to true if profile exists
   *
   * @example
   * const exists = await stateService.userExists('user-123');
   */
  async userExists(userId: string): Promise<boolean> {
    const key = this.getUserProfileKey(userId);
    return await this.stateManager.exists(key);
  }

  /**
   * Gets all user IDs stored in the system
   * Useful for admin operations or analytics
   *
   * @param limit - Optional: Maximum number of user IDs to return
   * @returns Promise resolving to array of user IDs
   *
   * @example
   * const userIds = await stateService.getAllUserIds(100);
   */
  async getAllUserIds(limit?: number): Promise<string[]> {
    try {
      const keys = await this.stateManager.list("user:", limit);

      // Extract user IDs from keys like "user:123:profile"
      const userIds = keys
        .filter((key) => key.endsWith(":profile"))
        .map((key) => {
          const match = key.match(/^user:(.+):profile$/);
          return match ? match[1] : null;
        })
        .filter((id): id is string => id !== null);

      return userIds;
    } catch (error) {
      console.error("Failed to get all user IDs:", error);
      throw new Error(`Failed to get user IDs: ${getErrorMessage(error)}`);
    }
  }
}
