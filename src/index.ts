// src/index.ts

import { NutritionAgent } from "./infrastructure/agent/NutritionAgent";

/**
 * Main entry point for the Cloudflare Worker
 *
 * This file exports:
 * 1. The Durable Object class (NutritionAgentDO)
 * 2. The default fetch handler for routing requests
 *
 * Architecture:
 * - Requests are routed to appropriate Durable Object instances
 * - Each user gets their own Durable Object for state isolation
 * - WebSocket connections are handled by Durable Objects
 */

/**
 * Environment interface defining available bindings
 */
interface Env {
  AI: any; // Workers AI binding
  NUTRITION_AGENT: DurableObjectNamespace; // Durable Object binding
}

/**
 * NutritionAgentDO - Durable Object export
 *
 * Cloudflare instantiates this class for each unique Durable Object ID.
 * Each instance maintains isolated state and handles requests for a specific user.
 */
export class NutritionAgentDO {
  private agent: NutritionAgent;

  /**
   * Constructor called by Cloudflare runtime
   * @param state - Durable Object state
   * @param env - Environment bindings
   */
  constructor(state: any, env: Env) {
    this.agent = new NutritionAgent(state, env);
  }

  /**
   * Handles HTTP requests to this Durable Object
   * @param request - Incoming request
   */
  async fetch(request: Request): Promise<Response> {
    return await this.agent.fetch(request);
  }

  /**
   * Handles incoming WebSocket messages
   * @param ws - WebSocket instance
   * @param message - Message data
   */
  async webSocketMessage(
    ws: WebSocket,
    message: string | ArrayBuffer
  ): Promise<void> {
    return await this.agent.webSocketMessage(ws, message);
  }

  /**
   * Handles WebSocket close events
   * @param ws - WebSocket instance
   * @param code - Close code
   * @param reason - Close reason
   */
  async webSocketClose(
    ws: WebSocket,
    code: number,
    reason: string
  ): Promise<void> {
    return await this.agent.webSocketClose(ws, code, reason);
  }

  /**
   * Handles WebSocket errors
   * @param ws - WebSocket instance
   * @param error - Error that occurred
   */
  async webSocketError(ws: WebSocket, error: unknown): Promise<void> {
    return await this.agent.webSocketError(ws, error);
  }

  /**
   * Handles scheduled alarms
   * Called when a scheduled alarm triggers
   */
  async alarm(): Promise<void> {
    return await this.agent.alarm();
  }
}

/**
 * Main Worker fetch handler
 * Routes incoming requests to appropriate Durable Object instances
 *
 * @param request - Incoming HTTP request
 * @param env - Environment bindings
 * @returns Response
 */
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      const url = new URL(request.url);

      // Health check endpoint (doesn't require Durable Object)
      if (url.pathname === "/") {
        return new Response(
          JSON.stringify({
            name: "Nutrition Coach Agent",
            version: "1.0.0",
            status: "running",
            endpoints: {
              websocket: "/ws?userId=YOUR_USER_ID",
              analyze: "/api/analyze",
              recommendations: "/api/recommendations",
              health: "/health",
            },
          }),
          {
            status: 200,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
            },
          }
        );
      }

      // Get or create user ID
      let userId = url.searchParams.get("userId");

      if (!userId) {
        // Extract from Authorization header or generate new
        const authHeader = request.headers.get("Authorization");
        if (authHeader && authHeader.startsWith("Bearer ")) {
          userId = authHeader.substring(7);
        } else {
          userId = crypto.randomUUID();
        }
      }

      // Get Durable Object ID for this user
      // Using userId as the name ensures same user always gets same DO
      const id = env.NUTRITION_AGENT.idFromName(userId);

      // Get the Durable Object stub
      const stub = env.NUTRITION_AGENT.get(id);

      // Forward the request to the Durable Object
      return await stub.fetch(request);
    } catch (error) {
      console.error("Worker error:", error);

      return new Response(
        JSON.stringify({
          error: "Internal server error",
          message: error instanceof Error ? error.message : "Unknown error",
        }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }
  },
};

/**
 * Export types for external use
 */
export type { Env };
