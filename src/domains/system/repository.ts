import type { Payload } from 'payload'
import { MasterSystemTelemetry } from './master-telemetry'
import { ReadinessChecker } from './readiness-checker'
import type { SystemHealthReportDTO, ProductionReadinessDTO } from './types'

/**
 * System Integration Repository
 * Data store layer for system telemetry, metrics, and production readiness reports.
 */
export class SystemRepository {
  private payload: Payload

  constructor(payload: Payload) {
    this.payload = payload
  }

  async getHealthReport(): Promise<SystemHealthReportDTO> {
    return MasterSystemTelemetry.getMasterHealthReport()
  }

  async certifyReadiness(): Promise<ProductionReadinessDTO> {
    return ReadinessChecker.certifyProductionReadiness()
  }
}
