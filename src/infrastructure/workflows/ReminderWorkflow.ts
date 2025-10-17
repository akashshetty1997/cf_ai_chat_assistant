// src/infrastructure/workflows/ReminderWorkflow.ts

import {
  IWorkflowOrchestrator,
  WorkflowStatus,
} from "../../core/interfaces/IWorkflowOrchestrator";
import { WorkflowContext } from "../../core/types";

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
 * ReminderWorkflow - Implementation of workflow orchestration for reminders
 *
 * This class manages scheduled reminders for users, such as:
 * - Meal logging reminders
 * - Nutrition goal check-ins
 * - Weekly progress summaries
 *
 * Uses Cloudflare Durable Objects alarms for scheduling.
 *
 * Responsibilities:
 * - Schedule reminders at specific times
 * - Execute reminder logic when triggered
 * - Track reminder status
 * - Handle reminder failures and retries
 *
 * Benefits:
 * - Decouples scheduling from business logic
 * - Reliable execution with Durable Objects
 * - Easy to extend with new reminder types
 * - Follows Strategy Pattern for different reminder types
 */
export class ReminderWorkflow implements IWorkflowOrchestrator {
  private storage: any; // Use 'any' for Cloudflare DurableObjectStorage
  private scheduledReminders = new Map<string, WorkflowStatus>();

  /**
   * Creates a new ReminderWorkflow instance
   *
   * @param storage - Durable Object storage for persistence
   *
   * @example
   * // In Durable Object constructor:
   * this.reminderWorkflow = new ReminderWorkflow(state.storage);
   */
  constructor(storage: any) {
    this.storage = storage;
    this.loadScheduledReminders();
  }

  /**
   * Loads scheduled reminders from storage on initialization
   * @private
   */
  private async loadScheduledReminders(): Promise<void> {
    try {
      const reminders = await this.storage.get("scheduled_reminders");
      if (reminders) {
        this.scheduledReminders = new Map(reminders);
      }
    } catch (error) {
      console.error("Failed to load scheduled reminders:", error);
    }
  }

  /**
   * Starts a new workflow execution
   *
   * @param workflowName - Name/type of the workflow to execute
   * @param context - Context data needed by the workflow
   * @returns Promise resolving to the workflow execution ID
   *
   * @example
   * const workflowId = await reminderWorkflow.startWorkflow(
   *   'meal-reminder',
   *   { userId: '123', message: 'Time to log your dinner!' }
   * );
   */
  async startWorkflow(
    workflowName: string,
    context: WorkflowContext
  ): Promise<string> {
    try {
      const workflowId = context.workflowId || crypto.randomUUID();

      // Create workflow status
      const status: WorkflowStatus = {
        workflowId,
        workflowName,
        state: "running",
        startedAt: Date.now(),
      };

      // Save status
      this.scheduledReminders.set(workflowId, status);
      await this.persistReminders();

      // Execute the workflow
      await this.executeWorkflow(workflowName, context);

      // Update status to completed
      status.state = "completed";
      status.completedAt = Date.now();
      this.scheduledReminders.set(workflowId, status);
      await this.persistReminders();

      console.log(`Workflow ${workflowId} (${workflowName}) completed`);

      return workflowId;
    } catch (error) {
      console.error(`Workflow ${workflowName} failed:`, error);
      throw new Error(`Failed to start workflow: ${getErrorMessage(error)}`);
    }
  }

  /**
   * Retrieves the current status of a workflow
   *
   * @param workflowId - Unique identifier for the workflow execution
   * @returns Promise resolving to workflow status information
   *
   * @example
   * const status = await reminderWorkflow.getWorkflowStatus('workflow-123');
   * console.log(status.state); // 'running', 'completed', 'failed'
   */
  async getWorkflowStatus(workflowId: string): Promise<WorkflowStatus> {
    const status = this.scheduledReminders.get(workflowId);

    if (!status) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    return status;
  }

  /**
   * Cancels a running workflow
   *
   * @param workflowId - Unique identifier for the workflow to cancel
   * @returns Promise that resolves when workflow is cancelled
   *
   * @example
   * await reminderWorkflow.cancelWorkflow('workflow-123');
   */
  async cancelWorkflow(workflowId: string): Promise<void> {
    const status = this.scheduledReminders.get(workflowId);

    if (!status) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    if (status.state === "completed" || status.state === "failed") {
      throw new Error(`Cannot cancel ${status.state} workflow`);
    }

    status.state = "cancelled";
    status.completedAt = Date.now();

    this.scheduledReminders.set(workflowId, status);
    await this.persistReminders();

    console.log(`Workflow ${workflowId} cancelled`);
  }

  /**
   * Schedules a workflow to run at a specific time
   * Uses Durable Object alarms for reliable scheduling
   *
   * @param workflowName - Name/type of the workflow to schedule
   * @param context - Context data for the workflow
   * @param scheduledTime - Unix timestamp or ISO date string for when to run
   * @returns Promise resolving to the scheduled workflow ID
   *
   * @example
   * const workflowId = await reminderWorkflow.scheduleWorkflow(
   *   'daily-summary',
   *   { userId: '123' },
   *   Date.now() + 86400000 // Run in 24 hours
   * );
   */
  async scheduleWorkflow(
    workflowName: string,
    context: WorkflowContext,
    scheduledTime: number | string
  ): Promise<string> {
    try {
      const workflowId = context.workflowId || crypto.randomUUID();
      const timestamp =
        typeof scheduledTime === "string"
          ? new Date(scheduledTime).getTime()
          : scheduledTime;

      // Create workflow status
      const status: WorkflowStatus = {
        workflowId,
        workflowName,
        state: "pending",
        startedAt: timestamp,
      };

      // Save to storage
      await this.storage.put(`workflow:${workflowId}`, {
        workflowName,
        context,
        scheduledTime: timestamp,
      });

      this.scheduledReminders.set(workflowId, status);
      await this.persistReminders();

      // Set Durable Object alarm
      await this.storage.setAlarm(timestamp);

      console.log(
        `Workflow ${workflowId} (${workflowName}) scheduled for ${new Date(
          timestamp
        ).toISOString()}`
      );

      return workflowId;
    } catch (error) {
      console.error(`Failed to schedule workflow:`, error);
      throw new Error(`Failed to schedule workflow: ${getErrorMessage(error)}`);
    }
  }

  /**
   * Retries a failed workflow
   *
   * @param workflowId - Unique identifier for the workflow to retry
   * @returns Promise that resolves when retry is initiated
   *
   * @example
   * await reminderWorkflow.retryWorkflow('workflow-123');
   */
  async retryWorkflow(workflowId: string): Promise<void> {
    const status = this.scheduledReminders.get(workflowId);

    if (!status) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    if (status.state !== "failed") {
      throw new Error(
        `Can only retry failed workflows. Current state: ${status.state}`
      );
    }

    // Get workflow data from storage
    const workflowData = await this.storage.get(`workflow:${workflowId}`);

    if (!workflowData) {
      throw new Error(`Workflow data not found for ${workflowId}`);
    }

    // Reset status
    status.state = "running";
    status.error = undefined;
    this.scheduledReminders.set(workflowId, status);
    await this.persistReminders();

    // Re-execute
    try {
      await this.executeWorkflow(
        workflowData.workflowName,
        workflowData.context
      );

      status.state = "completed";
      status.completedAt = Date.now();
    } catch (error) {
      status.state = "failed";
      status.error = getErrorMessage(error);
    }

    this.scheduledReminders.set(workflowId, status);
    await this.persistReminders();
  }

  /**
   * Alarm handler called by Durable Object when scheduled time arrives
   * This is the entry point for scheduled workflow execution
   *
   * @example
   * // In Durable Object:
   * async alarm() {
   *   await this.reminderWorkflow.handleAlarm();
   * }
   */
  async handleAlarm(): Promise<void> {
    try {
      console.log("Processing scheduled workflows...");

      // Get all scheduled workflows
      const workflows = await this.storage.list({ prefix: "workflow:" });

      for (const [key, workflowData] of workflows) {
        const data = workflowData as any;

        // Check if it's time to execute
        if (data.scheduledTime <= Date.now()) {
          const workflowId = key.toString().replace("workflow:", "");

          console.log(`Executing scheduled workflow: ${workflowId}`);

          try {
            await this.executeWorkflow(data.workflowName, data.context);

            // Update status
            const status = this.scheduledReminders.get(workflowId);
            if (status) {
              status.state = "completed";
              status.completedAt = Date.now();
              this.scheduledReminders.set(workflowId, status);
            }

            // Clean up
            await this.storage.delete(key);
          } catch (error) {
            console.error(`Scheduled workflow ${workflowId} failed:`, error);

            // Update status
            const status = this.scheduledReminders.get(workflowId);
            if (status) {
              status.state = "failed";
              status.error = getErrorMessage(error);
              this.scheduledReminders.set(workflowId, status);
            }
          }
        }
      }

      await this.persistReminders();
    } catch (error) {
      console.error("Failed to process alarm:", error);
    }
  }

  /**
   * Executes the actual workflow logic based on workflow name
   *
   * @param workflowName - Name of the workflow to execute
   * @param context - Workflow context data
   * @private
   */
  private async executeWorkflow(
    workflowName: string,
    context: WorkflowContext
  ): Promise<void> {
    switch (workflowName) {
      case "meal-reminder":
        await this.executeMealReminder(context);
        break;

      case "daily-summary":
        await this.executeDailySummary(context);
        break;

      case "goal-check-in":
        await this.executeGoalCheckIn(context);
        break;

      default:
        throw new Error(`Unknown workflow: ${workflowName}`);
    }
  }

  /**
   * Executes a meal reminder workflow
   * @param context - Workflow context
   * @private
   */
  private async executeMealReminder(context: WorkflowContext): Promise<void> {
    console.log(`Sending meal reminder to user ${context.userId}`);

    // In a real implementation, this would:
    // 1. Get user's preferred notification method
    // 2. Send notification via WebSocket, email, or push notification
    // 3. Log the reminder in user's activity

    const message = context.data.message || "Time to log your meal!";

    // Store reminder in history
    await this.storage.put(`reminder:${context.userId}:${Date.now()}`, {
      type: "meal-reminder",
      message,
      sentAt: Date.now(),
    });
  }

  /**
   * Executes a daily summary workflow
   * @param context - Workflow context
   * @private
   */
  private async executeDailySummary(context: WorkflowContext): Promise<void> {
    console.log(`Generating daily summary for user ${context.userId}`);

    // In a real implementation, this would:
    // 1. Aggregate user's meals for the day
    // 2. Calculate totals vs goals
    // 3. Generate summary message
    // 4. Send via preferred notification channel
  }

  /**
   * Executes a goal check-in workflow
   * @param context - Workflow context
   * @private
   */
  private async executeGoalCheckIn(context: WorkflowContext): Promise<void> {
    console.log(`Sending goal check-in to user ${context.userId}`);

    // In a real implementation, this would:
    // 1. Review user's progress toward goals
    // 2. Generate motivational message
    // 3. Suggest adjustments if needed
    // 4. Send notification
  }

  /**
   * Persists scheduled reminders to storage
   * @private
   */
  private async persistReminders(): Promise<void> {
    try {
      await this.storage.put(
        "scheduled_reminders",
        Array.from(this.scheduledReminders.entries())
      );
    } catch (error) {
      console.error("Failed to persist reminders:", error);
    }
  }
}
