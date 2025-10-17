// src/infrastructure/agent/NutritionAgent.ts

import { DIContainer } from "../../core/DIContainer";
import { ILLMProvider } from "../../core/interfaces/ILLMProvider";
import { IStateManager } from "../../core/interfaces/IStateManager";
import { IWorkflowOrchestrator } from "../../core/interfaces/IWorkflowOrchestrator";
import { WorkersAIProvider } from "../../services/llm/WorkersAIProvider";
import { DurableObjectStorage } from "../../services/state/DurableObjectStorage";
import { ReminderWorkflow } from "../workflows/ReminderWorkflow";
import { ConnectionHandler } from "../websocket/ConnectionHandler";
import { ChatMessageHandler } from "../../application/handlers/ChatMessageHandler";
import { CommandHandler } from "../../application/handlers/CommandHandler";

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
 * NutritionAgent - Main agent class that coordinates all components
 *
 * This is the core of the application, acting as a Durable Object that:
 * - Manages WebSocket connections
 * - Coordinates message handlers
 * - Manages workflows and reminders
 * - Maintains per-user state
 *
 * Architecture:
 * - Uses Dependency Injection for all services
 * - Implements Durable Object interface
 * - Coordinates between all layers of the application
 *
 * Benefits:
 * - Single point of coordination
 * - Clean separation of concerns
 * - Easy to test with DI
 * - Scalable with Durable Objects
 */
export class NutritionAgent {
  private state: any; // DurableObjectState type
  private env: any;
  private container: DIContainer;
  private connectionHandler: ConnectionHandler;
  private workflowOrchestrator: IWorkflowOrchestrator;
  private wsToUserId: Map<WebSocket, string> = new Map(); // Store WebSocket to userId mapping

  /**
   * Creates a new NutritionAgent instance
   *
   * @param state - Durable Object state
   * @param env - Environment bindings (AI, etc.)
   *
   * @example
   * // Cloudflare automatically instantiates this:
   * export class NutritionAgentDO {
   *   constructor(state: DurableObjectState, env: Env) {
   *     return new NutritionAgent(state, env);
   *   }
   * }
   */
  constructor(state: any, env: any) {
    this.state = state;
    this.env = env;

    // Initialize dependency injection container
    this.container = new DIContainer();

    // Setup all services
    this.setupServices();

    // Initialize connection handler
    this.connectionHandler = new ConnectionHandler();
    this.setupMessageHandlers();

    // Initialize workflow orchestrator (used in alarm() method)
    this.workflowOrchestrator = this.container.resolve<IWorkflowOrchestrator>(
      "workflowOrchestrator"
    );

    console.log("NutritionAgent initialized");
  }

  /**
   * Sets up all services in the DI container
   * @private
   */
  private setupServices(): void {
    // Register LLM Provider
    const llmProvider = new WorkersAIProvider(this.env.AI);
    this.container.register<ILLMProvider>("llmProvider", llmProvider);

    // Register State Manager
    const stateManager = new DurableObjectStorage(this.state.storage);
    this.container.register<IStateManager>("stateManager", stateManager);

    // Register Workflow Orchestrator
    const workflowOrchestrator = new ReminderWorkflow(this.state.storage);
    this.container.register<IWorkflowOrchestrator>(
      "workflowOrchestrator",
      workflowOrchestrator
    );

    console.log("Services registered in DI container");
  }

  /**
   * Sets up message handlers with the connection handler
   * Handlers are registered in priority order
   * @private
   */
  private setupMessageHandlers(): void {
    const llmProvider = this.container.resolve<ILLMProvider>("llmProvider");
    const stateManager = this.container.resolve<IStateManager>("stateManager");

    // Register CommandHandler first (higher priority)
    const commandHandler = new CommandHandler(llmProvider, stateManager);
    this.connectionHandler.registerHandler(commandHandler);

    // Register ChatMessageHandler second (fallback)
    const chatHandler = new ChatMessageHandler(llmProvider, stateManager);
    this.connectionHandler.registerHandler(chatHandler);

    console.log("Message handlers registered");
  }

  /**
   * Adds CORS headers to a response
   */
  private addCorsHeaders(response: Response): Response {
    const headers = new Headers(response.headers);
    headers.set("Access-Control-Allow-Origin", "*");
    headers.set(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, DELETE, OPTIONS"
    );
    headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  }

  /**
   * Handles incoming HTTP requests
   * Routes to appropriate handlers based on request type
   *
   * @param request - Incoming HTTP request
   * @returns Response
   *
   * @example
   * // Cloudflare calls this automatically
   */
  async fetch(request: Request): Promise<Response> {
    try {
      const url = new URL(request.url);

      // Handle CORS preflight
      if (request.method === "OPTIONS") {
        return new Response(null, {
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
          },
        });
      }

      // Handle WebSocket upgrade requests
      if (request.headers.get("Upgrade") === "websocket") {
        return await this.handleWebSocketUpgrade(request);
      }

      // Handle REST API endpoints
      if (url.pathname === "/health") {
        return this.addCorsHeaders(this.handleHealthCheck());
      }

      if (url.pathname === "/api/analyze") {
        const response = await this.handleAnalyzeRequest(request);
        return this.addCorsHeaders(response);
      }

      if (url.pathname === "/api/recommendations") {
        const response = await this.handleRecommendationsRequest(request);
        return this.addCorsHeaders(response);
      }

      // Default response
      const response = new Response("Nutrition Agent API", {
        status: 200,
        headers: { "Content-Type": "text/plain" },
      });
      return this.addCorsHeaders(response);
    } catch (error) {
      console.error("Error handling request:", error);
      const response = new Response(`Error: ${getErrorMessage(error)}`, {
        status: 500,
        headers: { "Content-Type": "text/plain" },
      });
      return this.addCorsHeaders(response);
    }
  }

  /**
   * Handles WebSocket upgrade requests
   * @param request - Upgrade request
   * @returns Response with WebSocket
   * @private
   */
  private async handleWebSocketUpgrade(request: Request): Promise<Response> {
    try {
      // Extract user ID from query params or generate one
      const url = new URL(request.url);
      const userId = url.searchParams.get("userId") || crypto.randomUUID();

      // Verify this is a WebSocket upgrade request
      const upgradeHeader = request.headers.get("Upgrade");
      if (!upgradeHeader || upgradeHeader !== "websocket") {
        return new Response("Expected Upgrade: websocket", { status: 426 });
      }

      // Create WebSocket pair
      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);

      // CRITICAL: Use state.acceptWebSocket() for Durable Objects
      // This ensures webSocketMessage(), webSocketClose(), and webSocketError() are called
      this.state.acceptWebSocket(server as WebSocket);

      // Store the user ID mapping (using Map instead of WebSocket property)
      this.wsToUserId.set(server as WebSocket, userId);

      // Handle the initial connection
      await this.connectionHandler.handleConnection(
        server as WebSocket,
        userId
      );

      console.log(`WebSocket connection established for user ${userId}`);

      // Return response with status 101 and the client WebSocket
      return new Response(null, {
        status: 101,
        webSocket: client,
      });
    } catch (error) {
      console.error("Failed to upgrade to WebSocket:", error);
      return new Response(
        `WebSocket upgrade failed: ${getErrorMessage(error)}`,
        {
          status: 500,
        }
      );
    }
  }

  /**
   * Handles health check requests
   * @returns Health check response
   * @private
   */
  private handleHealthCheck(): Response {
    return new Response(
      JSON.stringify({
        status: "healthy",
        timestamp: Date.now(),
        connections: this.connectionHandler.getActiveConnectionCount(),
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  /**
   * Handles REST API meal analysis requests
   * @param request - HTTP request
   * @returns Analysis response
   * @private
   */
  private async handleAnalyzeRequest(request: Request): Promise<Response> {
    try {
      if (request.method !== "POST") {
        return new Response("Method not allowed", { status: 405 });
      }

      const body = (await request.json()) as any;
      const { userId, mealDescription } = body;

      if (!userId || !mealDescription) {
        return new Response("Missing userId or mealDescription", {
          status: 400,
        });
      }

      // Use the analyze meal use case
      const llmProvider = this.container.resolve<ILLMProvider>("llmProvider");
      const stateManager =
        this.container.resolve<IStateManager>("stateManager");

      const { AnalyzeMealUseCase } = await import(
        "../../application/usecases/AnalyzeMealUseCase"
      );
      const useCase = new AnalyzeMealUseCase(llmProvider, stateManager);

      const result = await useCase.execute(userId, mealDescription);

      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Analysis request failed:", error);
      return new Response(JSON.stringify({ error: getErrorMessage(error) }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  /**
   * Handles REST API recommendations requests
   * @param request - HTTP request
   * @returns Recommendations response
   * @private
   */
  private async handleRecommendationsRequest(
    request: Request
  ): Promise<Response> {
    try {
      if (request.method !== "POST") {
        return new Response("Method not allowed", { status: 405 });
      }

      const body = (await request.json()) as any;
      const { userId } = body;

      if (!userId) {
        return new Response("Missing userId", { status: 400 });
      }

      // Use the recommendations use case
      const llmProvider = this.container.resolve<ILLMProvider>("llmProvider");
      const stateManager =
        this.container.resolve<IStateManager>("stateManager");

      const { GetRecommendationsUseCase } = await import(
        "../../application/usecases/GetRecommendationsUseCase"
      );
      const useCase = new GetRecommendationsUseCase(llmProvider, stateManager);

      const result = await useCase.execute(userId, 3);

      return new Response(JSON.stringify({ recommendations: result }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Recommendations request failed:", error);
      return new Response(JSON.stringify({ error: getErrorMessage(error) }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  /**
   * Handles incoming WebSocket messages
   * Called by Cloudflare Durable Objects runtime
   *
   * @param ws - WebSocket that sent the message
   * @param message - Message data
   */
  async webSocketMessage(
    ws: WebSocket,
    message: string | ArrayBuffer
  ): Promise<void> {
    try {
      // Retrieve the user ID from our mapping
      const userId = this.wsToUserId.get(ws) || "unknown";

      console.log(`📩 WebSocket message received from user ${userId}`);

      await this.connectionHandler.handleIncomingMessage(ws, userId, message);
    } catch (error) {
      console.error("Error processing WebSocket message:", error);

      // Send error message back to client
      try {
        ws.send(
          JSON.stringify({
            type: "error",
            content: "Failed to process message",
            timestamp: Date.now(),
          })
        );
      } catch (sendError) {
        console.error("Failed to send error message:", sendError);
      }
    }
  }

  /**
   * Handles WebSocket connection close
   * Called by Cloudflare Durable Objects runtime
   *
   * @param ws - WebSocket that closed
   * @param code - Close code
   * @param reason - Close reason
   */
  async webSocketClose(
    ws: WebSocket,
    code: number,
    reason: string
  ): Promise<void> {
    try {
      const userId = this.wsToUserId.get(ws) || "unknown";
      console.log(`WebSocket closed for user ${userId}: ${code} - ${reason}`);

      // Clean up the mapping
      this.wsToUserId.delete(ws);

      // Notify connection handler to clean up
      if (
        typeof (this.connectionHandler as any).handleDisconnection ===
        "function"
      ) {
        await (this.connectionHandler as any).handleDisconnection(ws, userId);
      }
    } catch (error) {
      console.error("Error handling WebSocket close:", error);
    }
  }

  /**
   * Handles WebSocket errors
   * Called by Cloudflare Durable Objects runtime
   *
   * @param ws - WebSocket that errored
   * @param error - Error that occurred
   */
  async webSocketError(ws: WebSocket, error: unknown): Promise<void> {
    const userId = this.wsToUserId.get(ws) || "unknown";
    console.error(`WebSocket error for user ${userId}:`, error);
  }

  /**
   * Handles scheduled alarms
   * Called by Cloudflare Durable Objects runtime when alarm triggers
   */
  async alarm(): Promise<void> {
    console.log("Alarm triggered");

    if (this.workflowOrchestrator instanceof ReminderWorkflow) {
      await this.workflowOrchestrator.handleAlarm();
    }
  }
}
