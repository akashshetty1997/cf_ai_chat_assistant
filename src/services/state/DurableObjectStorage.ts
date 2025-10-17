// src/services/state/DurableObjectStorage.ts

import { IStateManager } from "../../core/interfaces/IStateManager";

/**
 * Helper function to safely extract error message
 * @param error - Unknown error object
 * @returns Error message string
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

/**
 * DurableObjectStorage - Implementation of IStateManager using Cloudflare Durable Objects
 *
 * Durable Objects provide strongly consistent, low-latency storage with automatic persistence.
 * Perfect for:
 * - User session state
 * - Conversation history
 * - Real-time data that needs consistency
 * - WebSocket connection state
 *
 * Key features:
 * - Strong consistency (no eventual consistency issues)
 * - Fast reads/writes (in-memory with persistence)
 * - Automatic durability (survives restarts)
 * - Isolated per user/session
 *
 * Note: This implementation wraps Durable Object's native storage API
 * to conform to our IStateManager interface
 */
export class DurableObjectStorage implements IStateManager {
  /**
   * Creates a new DurableObjectStorage instance
   *
   * @param storage - Native Durable Object storage instance
   *
   * @example
   * // Inside a Durable Object class:
   * class NutritionAgentDO {
   *   constructor(state: DurableObjectState) {
   *     this.stateManager = new DurableObjectStorage(state.storage);
   *   }
   * }
   */
  constructor(private storage: any) {}

  /**
   * Saves data to Durable Object storage
   * Data is automatically serialized to JSON
   *
   * @param key - Unique identifier for the data
   * @param data - The data to store
   * @returns Promise that resolves when save is complete
   *
   * @example
   * await storage.save('user:123:profile', userProfile.toJSON());
   */
  async save<T>(key: string, data: T): Promise<void> {
    try {
      // Durable Objects storage automatically handles serialization
      await this.storage.put(key, data);
    } catch (error) {
      console.error(`Failed to save key '${key}':`, error);
      throw new Error(`Storage save failed: ${getErrorMessage(error)}`);
    }
  }

  /**
   * Retrieves data from Durable Object storage
   *
   * @param key - Unique identifier for the data
   * @returns Promise resolving to the stored data, or null if not found
   *
   * @example
   * const profileData = await storage.get<UserProfile>('user:123:profile');
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.storage.get(key) as T | undefined;
      return value === undefined ? null : value;
    } catch (error) {
      console.error(`Failed to get key '${key}':`, error);
      throw new Error(`Storage get failed: ${getErrorMessage(error)}`);
    }
  }

  /**
   * Deletes data from storage
   *
   * @param key - Unique identifier for the data to delete
   * @returns Promise that resolves when deletion is complete
   *
   * @example
   * await storage.delete('user:123:temp-data');
   */
  async delete(key: string): Promise<void> {
    try {
      await this.storage.delete(key);
    } catch (error) {
      console.error(`Failed to delete key '${key}':`, error);
      throw new Error(`Storage delete failed: ${getErrorMessage(error)}`);
    }
  }

  /**
   * Checks if a key exists in storage
   *
   * @param key - Unique identifier to check
   * @returns Promise resolving to true if key exists, false otherwise
   *
   * @example
   * const hasProfile = await storage.exists('user:123:profile');
   */
  async exists(key: string): Promise<boolean> {
    try {
      const value = await this.storage.get(key);
      return value !== undefined;
    } catch (error) {
      console.error(`Failed to check existence of key '${key}':`, error);
      return false;
    }
  }

  /**
   * Lists all keys matching a prefix
   *
   * @param prefix - Optional: Key prefix to match (empty for all keys)
   * @param limit - Optional: Maximum number of keys to return
   * @returns Promise resolving to array of matching keys
   *
   * @example
   * const userKeys = await storage.list('user:', 50);
   * // Returns: ['user:123', 'user:456', ...]
   */
  async list(prefix?: string, limit?: number): Promise<string[]> {
    try {
      // Durable Objects list() returns a Map
      const options: any = {};

      if (prefix) {
        options.prefix = prefix;
      }

      if (limit) {
        options.limit = limit;
      }

      const map = await this.storage.list(options);

      // Convert Map keys to array of strings
      return Array.from(map.keys()).map(String);
    } catch (error) {
      console.error(`Failed to list keys with prefix '${prefix}':`, error);
      throw new Error(`Storage list failed: ${getErrorMessage(error)}`);
    }
  }

  /**
   * Clears all data from storage
   * ⚠️ WARNING: This is destructive and irreversible!
   *
   * @returns Promise that resolves when all data is cleared
   *
   * @example
   * await storage.clear(); // Deletes everything
   */
  async clear(): Promise<void> {
    try {
      await this.storage.deleteAll();
    } catch (error) {
      console.error("Failed to clear storage:", error);
      throw new Error(`Storage clear failed: ${getErrorMessage(error)}`);
    }
  }

  /**
   * Performs a batch get operation
   * More efficient than multiple individual get() calls
   *
   * @param keys - Array of keys to retrieve
   * @returns Promise resolving to Map of key-value pairs
   *
   * @example
   * const data = await storage.getMultiple(['user:123', 'user:456']);
   * const user123 = data.get('user:123');
   */
  async getMultiple<T>(keys: string[]): Promise<Map<string, T>> {
    try {
      const results = await this.storage.get(keys);
      return results as Map<string, T>;
    } catch (error) {
      console.error("Failed to get multiple keys:", error);
      throw new Error(`Storage getMultiple failed: ${getErrorMessage(error)}`);
    }
  }

  /**
   * Performs a batch save operation
   * More efficient than multiple individual save() calls
   *
   * @param entries - Map of key-value pairs to save
   * @returns Promise that resolves when all saves are complete
   *
   * @example
   * const entries = new Map([
   *   ['user:123', userData],
   *   ['user:456', otherUserData]
   * ]);
   * await storage.saveMultiple(entries);
   */
  async saveMultiple<T>(entries: Map<string, T>): Promise<void> {
    try {
      // Convert Map to object for Durable Objects put()
      const entriesObj: Record<string, T> = {};
      entries.forEach((value, key) => {
        entriesObj[key] = value;
      });

      await this.storage.put(entriesObj);
    } catch (error) {
      console.error("Failed to save multiple entries:", error);
      throw new Error(`Storage saveMultiple failed: ${getErrorMessage(error)}`);
    }
  }

  /**
   * Gets the current alarm time if one is set
   * Useful for scheduled tasks
   *
   * @returns Promise resolving to alarm timestamp, or null if no alarm set
   */
  async getAlarm(): Promise<number | null> {
    try {
      return await this.storage.getAlarm();
    } catch (error) {
      console.error("Failed to get alarm:", error);
      return null;
    }
  }

  /**
   * Sets an alarm to trigger at a specific time
   * The Durable Object's alarm() method will be called at this time
   *
   * @param scheduledTime - Unix timestamp (milliseconds) when to trigger
   * @returns Promise that resolves when alarm is set
   *
   * @example
   * // Set alarm for 1 hour from now
   * await storage.setAlarm(Date.now() + 3600000);
   */
  async setAlarm(scheduledTime: number): Promise<void> {
    try {
      await this.storage.setAlarm(scheduledTime);
    } catch (error) {
      console.error("Failed to set alarm:", error);
      throw new Error(`Storage setAlarm failed: ${getErrorMessage(error)}`);
    }
  }
}