// src/application/handlers/CommandHandler.ts

import { IMessageHandler } from "../../core/interfaces/IMessageHandler";
import { ILLMProvider } from "../../core/interfaces/ILLMProvider";
import { IStateManager } from "../../core/interfaces/IStateManager";
import { ChatMessage, Command } from "../../core/types";
import { Message } from "../../core/entities/Message";
import { StateService } from "../../services/state/StateService";
import { AnalyzeMealUseCase } from "../usecases/AnalyzeMealUseCase";
import { GetRecommendationsUseCase } from "../usecases/GetRecommendationsUseCase";

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
 * CommandHandler - Handles command-style messages
 *
 * This handler processes structured commands that trigger specific actions
 * like analyzing meals, setting goals, or getting recommendations.
 *
 * Commands can be:
 * - Slash commands: /analyze-meal, /set-goals
 * - Natural language: "analyze this meal", "what should I eat"
 *
 * Responsibilities:
 * - Parse commands from messages
 * - Route to appropriate use cases
 * - Format and return responses
 * - Handle command errors gracefully
 *
 * Benefits:
 * - Separates command logic from chat logic
 * - Clear routing to business logic
 * - Easy to add new commands
 * - Follows Command Pattern
 */
export class CommandHandler implements IMessageHandler {
  private stateService: StateService;
  private analyzeMealUseCase: AnalyzeMealUseCase;
  private getRecommendationsUseCase: GetRecommendationsUseCase;

  /**
   * Creates a new CommandHandler instance
   *
   * @param llmProvider - LLM provider for AI operations
   * @param stateManager - State manager for storage operations
   *
   * @example
   * const handler = new CommandHandler(
   *   new WorkersAIProvider(env.AI),
   *   new DurableObjectStorage(storage)
   * );
   */
  constructor(llmProvider: ILLMProvider, stateManager: IStateManager) {
    this.stateService = new StateService(stateManager);
    this.analyzeMealUseCase = new AnalyzeMealUseCase(llmProvider, stateManager);
    this.getRecommendationsUseCase = new GetRecommendationsUseCase(
      llmProvider,
      stateManager
    );
  }

  /**
   * Handles an incoming command message
   *
   * @param message - The incoming command message
   * @param userId - Unique identifier for the user
   * @param context - Optional: Additional context
   * @returns Promise resolving to the response message
   *
   * @example
   * const command = new Message('user', '/analyze-meal pizza');
   * const response = await handler.handle(command, 'user-123');
   */
  async handle(
    message: ChatMessage,
    userId: string,
    _context?: any
  ): Promise<ChatMessage> {
    try {
      // Parse the command from the message
      const command = this.parseCommand(message.content);

      if (!command) {
        return new Message(
          "assistant",
          'I didn\'t understand that command. Try "help" to see available commands.'
        ).toJSON();
      }

      // Route to appropriate handler
      const responseContent = await this.executeCommand(command, userId);

      return new Message("assistant", responseContent).toJSON();
    } catch (error) {
      console.error(`Command execution failed for user ${userId}:`, error);

      return new Message(
        "assistant",
        `Sorry, I couldn't execute that command: ${getErrorMessage(error)}`
      ).toJSON();
    }
  }

  /**
   * Checks if this handler can process the given message
   * Returns true if the message looks like a command
   *
   * @param message - The message to check
   * @returns Promise resolving to true if it's a command
   */
  async canHandle(message: ChatMessage): Promise<boolean> {
    const content = message.content.trim().toLowerCase();

    // Check for slash commands
    if (content.startsWith("/")) {
      return true;
    }

    // Check for natural language commands
    const commandPatterns = [
      /^analyze\s+/,
      /^set\s+goal/,
      /^my\s+goals?$/,
      /^show\s+history/,
      /^recommend/,
      /^suggest/,
      /^help$/,
      /what\s+should\s+i\s+eat/,
    ];

    return commandPatterns.some((pattern) => pattern.test(content));
  }

  /**
   * Parses a message into a structured command
   *
   * @param content - Message content to parse
   * @returns Parsed command or null if not a valid command
   * @private
   */
  private parseCommand(content: string): Command | null {
    const trimmed = content.trim().toLowerCase();

    // Parse slash commands
    if (trimmed.startsWith("/")) {
      return this.parseSlashCommand(trimmed);
    }

    // Parse natural language commands
    return this.parseNaturalCommand(trimmed);
  }

  /**
   * Parses slash-style commands (e.g., /analyze-meal pizza)
   *
   * @param content - Command content starting with /
   * @returns Parsed command or null
   * @private
   */
  private parseSlashCommand(content: string): Command | null {
    const parts = content.split(" ");
    const commandName = parts[0].substring(1); // Remove /
    const args = parts.slice(1).join(" ");

    switch (commandName) {
      case "analyze-meal":
      case "analyze":
        return {
          type: "analyze-meal",
          payload: { mealDescription: args },
        };

      case "recommend":
      case "suggestions":
        return {
          type: "get-recommendations",
          payload: {},
        };

      case "set-goals":
      case "goals":
        return {
          type: "set-goals",
          payload: { args },
        };

      case "history":
        return {
          type: "get-history",
          payload: {},
        };

      case "help":
        return {
          type: "get-recommendations", // Temporary - should have help command
          payload: { showHelp: true },
        };

      default:
        return null;
    }
  }

  /**
   * Parses natural language commands
   *
   * @param content - Command content in natural language
   * @returns Parsed command or null
   * @private
   */
  private parseNaturalCommand(content: string): Command | null {
    // Analyze meal patterns
    if (content.startsWith("analyze")) {
      const mealDescription = content.replace(/^analyze\s+/, "");
      return {
        type: "analyze-meal",
        payload: { mealDescription },
      };
    }

    // Recommendation patterns
    if (
      content.includes("recommend") ||
      content.includes("suggest") ||
      content.includes("what should i eat")
    ) {
      return {
        type: "get-recommendations",
        payload: {},
      };
    }

    // Goals patterns
    if (content.includes("my goals") || content.includes("show goals")) {
      return {
        type: "get-history",
        payload: { showGoals: true },
      };
    }

    if (content.startsWith("set goal")) {
      return {
        type: "set-goals",
        payload: { args: content.replace(/^set\s+goals?\s*/, "") },
      };
    }

    // History patterns
    if (content.includes("show history") || content.includes("meal history")) {
      return {
        type: "get-history",
        payload: {},
      };
    }

    return null;
  }

  /**
   * Executes a parsed command
   *
   * @param command - The command to execute
   * @param userId - User identifier
   * @returns Promise resolving to response text
   * @private
   */
  private async executeCommand(
    command: Command,
    userId: string
  ): Promise<string> {
    switch (command.type) {
      case "analyze-meal":
        return await this.handleAnalyzeMeal(userId, command.payload);

      case "get-recommendations":
        return await this.handleGetRecommendations(userId, command.payload);

      case "set-goals":
        return await this.handleSetGoals(userId, command.payload);

      case "get-history":
        return await this.handleGetHistory(userId, command.payload);

      default:
        return 'Unknown command. Type "help" to see available commands.';
    }
  }

  /**
   * Handles the analyze-meal command
   *
   * @param userId - User identifier
   * @param payload - Command payload with meal description
   * @returns Promise resolving to analysis result text
   * @private
   */
  private async handleAnalyzeMeal(
    userId: string,
    payload: any
  ): Promise<string> {
    const mealDescription = payload.mealDescription;

    if (!mealDescription || mealDescription.trim().length === 0) {
      return 'Please provide a meal description. Example: "analyze grilled chicken with rice"';
    }

    const analysis = await this.analyzeMealUseCase.execute(
      userId,
      mealDescription
    );

    // Format the response
    return `**Meal Analysis: ${analysis.mealName}**

📊 **Nutrition Facts:**
- Calories: ${analysis.nutrition.calories} kcal
- Protein: ${analysis.nutrition.protein}g
- Carbs: ${analysis.nutrition.carbs}g
- Fat: ${analysis.nutrition.fat}g
${analysis.nutrition.fiber ? `- Fiber: ${analysis.nutrition.fiber}g` : ""}

🎯 **Health Score:** ${analysis.healthScore}/100

💡 **Insights:**
${analysis.insights.map((insight) => `- ${insight}`).join("\n")}`;
  }

  /**
   * Handles the get-recommendations command
   *
   * @param userId - User identifier
   * @param payload - Command payload
   * @returns Promise resolving to recommendations text
   * @private
   */
  private async handleGetRecommendations(
    userId: string,
    _payload: any
  ): Promise<string> {
    return await this.getRecommendationsUseCase.execute(userId, 3);
  }

  /**
   * Handles the set-goals command
   *
   * @param userId - User identifier
   * @param payload - Command payload with goal data
   * @returns Promise resolving to confirmation text
   * @private
   */
  private async handleSetGoals(userId: string, payload: any): Promise<string> {
    const userProfile = await this.stateService.getOrCreateUserProfile(userId);

    // Parse goals from args
    // This is simplified - in real app, would have better parsing
    const args = payload.args || "";

    if (!args) {
      const currentGoals = userProfile.goals;
      return `**Your Current Goals:**
${currentGoals.fitnessGoal ? `- Fitness Goal: ${currentGoals.fitnessGoal}` : ""}
${
  currentGoals.dailyCalories
    ? `- Daily Calories: ${currentGoals.dailyCalories}`
    : ""
}
${
  currentGoals.dailyProtein
    ? `- Daily Protein: ${currentGoals.dailyProtein}g`
    : ""
}
${
  currentGoals.dietaryRestrictions?.length
    ? `- Dietary Restrictions: ${currentGoals.dietaryRestrictions.join(", ")}`
    : ""
}

To set goals, use: "set goals calories:2000 protein:150 goal:muscle-gain"`;
    }

    // Simple parsing (production would use more robust parsing)
    const updates: any = {};

    if (args.includes("calories:")) {
      const match = args.match(/calories:(\d+)/);
      if (match) updates.dailyCalories = parseInt(match[1]);
    }

    if (args.includes("protein:")) {
      const match = args.match(/protein:(\d+)/);
      if (match) updates.dailyProtein = parseInt(match[1]);
    }

    if (args.includes("goal:")) {
      const match = args.match(/goal:(weight-loss|muscle-gain|maintenance)/);
      if (match) updates.fitnessGoal = match[1];
    }

    userProfile.updateGoals(updates);
    await this.stateService.saveUserProfile(userProfile);

    return `✅ Goals updated successfully!

${updates.dailyCalories ? `- Daily Calories: ${updates.dailyCalories}` : ""}
${updates.dailyProtein ? `- Daily Protein: ${updates.dailyProtein}g` : ""}
${updates.fitnessGoal ? `- Fitness Goal: ${updates.fitnessGoal}` : ""}`;
  }

  /**
   * Handles the get-history command
   *
   * @param userId - User identifier
   * @param payload - Command payload
   * @returns Promise resolving to history text
   * @private
   */
  private async handleGetHistory(
    userId: string,
    _payload: any
  ): Promise<string> {
    const userProfile = await this.stateService.getOrCreateUserProfile(userId);

    if (_payload.showGoals) {
      const goals = userProfile.goals;
      return `**Your Goals:**
${
  goals.fitnessGoal
    ? `- Fitness Goal: ${goals.fitnessGoal}`
    : "- No fitness goal set"
}
${
  goals.dailyCalories
    ? `- Daily Calories: ${goals.dailyCalories}`
    : "- No calorie target set"
}
${
  goals.dailyProtein
    ? `- Daily Protein: ${goals.dailyProtein}g`
    : "- No protein target set"
}
${
  goals.dietaryRestrictions?.length
    ? `- Dietary Restrictions: ${goals.dietaryRestrictions.join(", ")}`
    : "- No restrictions"
}`;
    }

    const recentMeals = userProfile.getRecentMeals(10);

    if (recentMeals.length === 0) {
      return "No meal history yet. Start by analyzing your first meal!";
    }

    let response = "**Your Recent Meals:**\n\n";

    recentMeals.forEach((meal, index) => {
      response += `${index + 1}. **${meal.mealName}**\n`;
      response += `   - ${meal.nutrition.calories} cal, ${meal.nutrition.protein}g protein\n`;
      response += `   - Score: ${meal.healthScore}/100\n\n`;
    });

    return response;
  }
}
