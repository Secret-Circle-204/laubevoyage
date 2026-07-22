import type { MaintenanceCheckpoint } from './types'

/**
 * Maintenance Checkpoint Tracker Engine
 * Tracks lastProcessedId and batch offset so interrupted long-running jobs resume gracefully.
 */
export class MaintenanceCheckpointTracker {
  private static checkpoints: Map<string, MaintenanceCheckpoint> = new Map()

  static saveCheckpoint(jobName: string, lastProcessedId: string, processedCount: number): void {
    this.checkpoints.set(jobName, {
      jobName,
      lastProcessedId,
      processedCount,
      updatedAt: new Date().toISOString(),
    })
  }

  static getCheckpoint(jobName: string): MaintenanceCheckpoint | undefined {
    return this.checkpoints.get(jobName)
  }

  static clearCheckpoint(jobName: string): void {
    this.checkpoints.delete(jobName)
  }
}
