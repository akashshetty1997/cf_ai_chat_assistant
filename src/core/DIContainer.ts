// src/core/DIContainer.ts

/**
 * DIContainer - Dependency Injection Container
 *
 * This class implements the Dependency Injection pattern, managing service instances
 * and their dependencies throughout the application lifecycle.
 *
 * Benefits:
 * - Centralized service management
 * - Easy to swap implementations (e.g., mock services for testing)
 * - Reduces tight coupling between components
 * - Makes dependencies explicit and manageable
 * - Supports singleton pattern for shared services
 *
 * Usage:
 * 1. Register services at application startup
 * 2. Resolve services when needed in business logic
 * 3. Services can depend on other services registered in the container
 *
 * @example
 * const container = new DIContainer();
 * container.register('llmProvider', new WorkersAIProvider(env.AI));
 * container.register('stateManager', new DurableObjectStorage(storage));
 *
 * // Later in code
 * const llm = container.resolve<ILLMProvider>('llmProvider');
 */
export class DIContainer {
  // Map to store service instances by their registered names
  private services = new Map<string, any>();

  // Map to store factory functions for lazy initialization
  private factories = new Map<string, () => any>();

  /**
   * Registers a service instance with the container
   * The service will be stored as a singleton and reused
   *
   * @param key - Unique identifier for the service
   * @param instance - The service instance to register
   *
   * @example
   * container.register('llmProvider', new WorkersAIProvider(env.AI));
   */
  register<T>(key: string, instance: T): void {
    if (this.services.has(key)) {
      console.warn(`Service '${key}' is already registered. Overwriting.`);
    }
    this.services.set(key, instance);
  }

  /**
   * Registers a factory function for lazy service initialization
   * The factory will only be called when the service is first resolved
   * Useful for expensive services that might not always be needed
   *
   * @param key - Unique identifier for the service
   * @param factory - Function that creates the service instance
   *
   * @example
   * container.registerFactory('heavyService', () => new HeavyService());
   * // Service is only created when first resolved
   */
  registerFactory<T>(key: string, factory: () => T): void {
    if (this.factories.has(key)) {
      console.warn(`Factory '${key}' is already registered. Overwriting.`);
    }
    this.factories.set(key, factory);
  }

  /**
   * Resolves and returns a registered service
   * If registered as a factory, creates the instance on first access
   *
   * @param key - Unique identifier for the service
   * @returns The resolved service instance
   * @throws Error if service is not registered
   *
   * @example
   * const llm = container.resolve<ILLMProvider>('llmProvider');
   * const response = await llm.generate('Hello');
   */
  resolve<T>(key: string): T {
    // Check if already instantiated
    if (this.services.has(key)) {
      return this.services.get(key) as T;
    }

    // Check if factory exists
    if (this.factories.has(key)) {
      const factory = this.factories.get(key)!;
      const instance = factory();
      // Cache the instance for future use (singleton behavior)
      this.services.set(key, instance);
      this.factories.delete(key); // Remove factory after instantiation
      return instance as T;
    }

    // Service not found
    throw new Error(
      `Service '${key}' not found in container. Did you forget to register it?`
    );
  }

  /**
   * Checks if a service is registered in the container
   *
   * @param key - Unique identifier to check
   * @returns True if service exists, false otherwise
   *
   * @example
   * if (container.has('llmProvider')) {
   *   const llm = container.resolve<ILLMProvider>('llmProvider');
   * }
   */
  has(key: string): boolean {
    return this.services.has(key) || this.factories.has(key);
  }

  /**
   * Removes a service from the container
   *
   * @param key - Unique identifier for the service to remove
   *
   * @example
   * container.unregister('oldService');
   */
  unregister(key: string): void {
    this.services.delete(key);
    this.factories.delete(key);
  }

  /**
   * Clears all registered services and factories
   * Useful for cleanup or testing scenarios
   *
   * @example
   * container.clear(); // Remove all services
   */
  clear(): void {
    this.services.clear();
    this.factories.clear();
  }

  /**
   * Gets a list of all registered service keys
   *
   * @returns Array of service keys
   *
   * @example
   * const keys = container.keys();
   * console.log('Registered services:', keys);
   */
  keys(): string[] {
    const serviceKeys = Array.from(this.services.keys());
    const factoryKeys = Array.from(this.factories.keys());
    return [...new Set([...serviceKeys, ...factoryKeys])];
  }
}
