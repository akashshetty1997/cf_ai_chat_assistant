// src/core/types/index.ts

/**
 * Core type definitions for the nutrition coach agent
 * These types are used across the entire application
 */

/**
 * Represents the role of a message in the conversation
 */
export type MessageRole = "user" | "assistant" | "system";

/**
 * Response structure from the LLM provider
 */
export interface LLMResponse {
  content: string; // The generated text response
  tokensUsed?: number; // Optional: number of tokens consumed
  finishReason?: string; // Optional: why generation stopped (e.g., 'stop', 'length')
}

/**
 * Structure of a single chat message
 */
export interface ChatMessage {
  id: string; // Unique identifier for the message
  role: MessageRole; // Who sent the message
  content: string; // The actual message text
  timestamp: number; // Unix timestamp when message was created
}

/**
 * Nutritional information for a meal or food item
 */
export interface NutritionData {
  calories: number; // Total calories
  protein: number; // Protein in grams
  carbs: number; // Carbohydrates in grams
  fat: number; // Fat in grams
  fiber?: number; // Optional: Fiber in grams
}

/**
 * Complete analysis of a meal
 */
export interface MealAnalysis {
  mealName: string; // Name/description of the meal
  nutrition: NutritionData; // Nutritional breakdown
  healthScore: number; // Score from 0-100 based on user's goals
  insights: string[]; // AI-generated insights about the meal
}

/**
 * User's dietary and fitness goals
 */
export interface UserGoals {
  dailyCalories?: number; // Target daily calorie intake
  dailyProtein?: number; // Target daily protein in grams
  dietaryRestrictions?: string[]; // e.g., ['vegan', 'gluten-free']
  fitnessGoal?: "weight-loss" | "muscle-gain" | "maintenance";
}

/**
 * Context passed to workflow executions
 */
export interface WorkflowContext {
  userId: string; // User identifier
  workflowId: string; // Unique workflow execution ID
  data: Record<string, any>; // Flexible data payload
}

/**
 * Available command types the agent can handle
 */
export type CommandType =
  | "analyze-meal" // Analyze nutritional content of a meal
  | "get-recommendations" // Get meal recommendations
  | "set-goals" // Update user's goals
  | "get-history" // Retrieve meal history
  | "schedule-reminder"; // Schedule a reminder

/**
 * Structure for commands sent to the agent
 */
export interface Command {
  type: CommandType; // Type of command to execute
  payload: Record<string, any>; // Command-specific data
}
