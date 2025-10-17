// src/core/interfaces/IWorkflowOrchestrator.ts

import { WorkflowContext } from "../types";

/**
 * IWorkflowOrchestrator interface - Contract for managing workflows
 *
 * This interface abstracts workflow execution and coordination.
 * Workflows handle long-running tasks, scheduled operations, and complex
 * multi-step processes that can't be handled in a single request.
 *
 * Possible implementations:
 * - CloudflareWorkflowsOrchestrator (uses Cloudflare Workflows)
 * - DurableObjectWorkflowOrchestrator (uses Durable Objects for coordination)
 * - SimpleQueueOrchestrator (uses message queues)
 *
 * Use cases:
 * - Scheduling meal reminders
 * - Processing batch nutrition analyses
 * - Sending delayed notifications
 * - Multi-step data processing pipelines
 *
 * Benefits:
 * - Decouples workflow logic from the main application
 * - Enables async, long-running operations
 * - Provides retry and error handling capabilities
 * - Follows Dependency Inversion Principle
 */
export interface IWorkflowOrchestrator {
  /**
   * Starts a new workflow execution
   *
   * @param workflowName - Name/type of the workflow to execute
   * @param context - Context data needed by the workflow
   * @returns Promise resolving to the workflow execution ID
   *
   * @example
   * const workflowId = await orchestrator.startWorkflow(
   *   'send-meal-reminder',
   *   { userId: '123', reminderTime: '18:00', message: 'Time to log dinner!' }
   * );
   */
  startWorkflow(
    workflowName: string,
    context: WorkflowContext
  ): Promise<string>;

  /**
   * Retrieves the current status of a workflow
   *
   * @param workflowId - Unique identifier for the workflow execution
   * @returns Promise resolving to workflow status information
   *
   * @example
   * const status = await orchestrator.getWorkflowStatus('workflow-123');
   * console.log(status.state); // 'running', 'completed', 'failed'
   */
  getWorkflowStatus(workflowId: string): Promise<WorkflowStatus>;

  /**
   * Cancels a running workflow
   *
   * @param workflowId - Unique identifier for the workflow to cancel
   * @returns Promise that resolves when workflow is cancelled
   *
   * @example
   * await orchestrator.cancelWorkflow('workflow-123');
   */
  cancelWorkflow(workflowId: string): Promise<void>;

  /**
   * Schedules a workflow to run at a specific time
   *
   * @param workflowName - Name/type of the workflow to schedule
   * @param context - Context data for the workflow
   * @param scheduledTime - Unix timestamp or ISO date string for when to run
   * @returns Promise resolving to the scheduled workflow ID
   *
   * @example
   * const workflowId = await orchestrator.scheduleWorkflow(
   *   'daily-summary',
   *   { userId: '123' },
   *   Date.now() + 86400000 // Run in 24 hours
   * );
   */
  scheduleWorkflow(
    workflowName: string,
    context: WorkflowContext,
    scheduledTime: number | string
  ): Promise<string>;

  /**
   * Retries a failed workflow
   *
   * @param workflowId - Unique identifier for the workflow to retry
   * @returns Promise that resolves when retry is initiated
   *
   * @example
   * await orchestrator.retryWorkflow('workflow-123');
   */
  retryWorkflow(workflowId: string): Promise<void>;
}

/**
 * WorkflowStatus - Represents the current state of a workflow execution
 */
export interface WorkflowStatus {
  workflowId: string;
  workflowName: string;
  state: "pending" | "running" | "completed" | "failed" | "cancelled";
  startedAt?: number;
  completedAt?: number;
  error?: string;
  result?: any;
}
