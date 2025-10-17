// frontend/src/types/index.ts

export interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
}

export interface UserGoals {
  dailyCalories?: number;
  dailyProtein?: number;
  dietaryRestrictions?: string[];
  fitnessGoal?: "weight-loss" | "muscle-gain" | "maintenance";
}

export interface MealAnalysis {
  mealName: string;
  nutrition: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber?: number;
  };
  healthScore: number;
  insights: string[];
}

export interface WebSocketMessage {
  type:
    | "message"
    | "system"
    | "error"
    | "stream_start"
    | "stream_chunk"
    | "stream_end";
  role?: "user" | "assistant" | "system";
  content?: string;
  messageId?: string;
  timestamp: number;
}
