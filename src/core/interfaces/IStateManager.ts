// src/core/interfaces/IStateManager.ts

/**
 * IStateManager interface - Contract for state/storage management
 *
 * This interface follows the Repository Pattern, abstracting away the underlying
 * storage mechanism (Durable Objects, KV, D1, etc.)
 *
 * Possible implementations:
 * - DurableObjectStorage (uses Cloudflare Durable Objects)
 * - KVStorage (uses Cloudflare KV)
 * - D1Storage (uses Cloudflare D1 SQLite database)
 * - InMemoryStorage (for testing)
 *
 * Benefits:
 * - Decouples business logic from storage implementation
 * - Easy to swap storage backends without changing application code
 * - Simplifies testing with mock implementations
 * - Follows Open/Closed Principle (open for extension, closed for modification)
 */
export interface IStateManager {
  /**
   * Saves data to storage with the given key
   *
   * @param key - Unique identifier for the data
   * @param data - The data to store (will be serialized)
   * @returns Promise that resolves when save is complete
   *
   * @example
   * await stateManager.save('user:123', userProfile.toJSON());
   */
  save<T>(key: string, data: T): Promise<void>;

  /**
   * Retrieves data from storage by key
   *
   * @param key - Unique identifier for the data
   * @returns Promise resolving to the stored data, or null if not found
   *
   * @example
   * const userData = await stateManager.get<UserProfile>('user:123');
   * if (userData) {
   *   const profile = UserProfile.fromJSON(userData);
   * }
   */
  get<T>(key: string): Promise<T | null>;

  /**
   * Deletes data from storage by key
   *
   * @param key - Unique identifier for the data to delete
   * @returns Promise that resolves when deletion is complete
   *
   * @example
   * await stateManager.delete('user:123');
   */
  delete(key: string): Promise<void>;

  /**
   * Checks if a key exists in storage
   *
   * @param key - Unique identifier to check
   * @returns Promise resolving to true if key exists, false otherwise
   *
   * @example
   * const exists = await stateManager.exists('user:123');
   */
  exists(key: string): Promise<boolean>;

  /**
   * Lists all keys matching a prefix
   * Useful for querying related data (e.g., all keys starting with 'user:')
   *
   * @param prefix - Key prefix to match
   * @param limit - Optional: Maximum number of keys to return
   * @returns Promise resolving to array of matching keys
   *
   * @example
   * const userKeys = await stateManager.list('user:', 100);
   * // Returns: ['user:123', 'user:456', ...]
   */
  list(prefix?: string, limit?: number): Promise<string[]>;

  /**
   * Clears all data from storage
   * Use with caution - this is destructive!
   *
   * @returns Promise that resolves when all data is cleared
   *
   * @example
   * await stateManager.clear(); // Deletes everything
   */
  clear(): Promise<void>;
}
