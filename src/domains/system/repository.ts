import type { Payload } from 'payload'
import { MasterSystemTelemetry } from './master-telemetry'
import { ReadinessChecker } from './readiness-checker'
import type { SystemHealthReportDTO, ProductionReadinessDTO, RawSystemSettingsDocument } from './types'

/**
 * System Integration Repository
 * Data store layer for system telemetry, metrics, and production readiness reports.
 */
export class SystemRepository {
  private payload: Payload

  constructor(payload: Payload) {
    this.payload = payload
  }

  async getSystemSettings(): Promise<RawSystemSettingsDocument> {
    return this.payload.findGlobal({
      slug: 'system-settings',
      depth: 1,
    }) as Promise<RawSystemSettingsDocument>
  }

  async getHealthReport(): Promise<SystemHealthReportDTO> {
    return MasterSystemTelemetry.getMasterHealthReport()
  }

  async certifyReadiness(): Promise<ProductionReadinessDTO> {
    return ReadinessChecker.certifyProductionReadiness()
  }
}
