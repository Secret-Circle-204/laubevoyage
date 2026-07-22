import { describe, it, expect, beforeEach, vi } from 'vitest'
import { CustomerWorkflowEngine } from '@/domains/customer/workflow'

describe('Customer Domain: CustomerWorkflowEngine Integration Tests', () => {
  let mockPayload: any
  let workflowEngine: CustomerWorkflowEngine

  beforeEach(() => {
    mockPayload = {
      create: vi.fn().mockImplementation(({ collection, data }) =>
        Promise.resolve({ id: 1, email: data.email, firstName: data.firstName, lastName: data.lastName, status: 'pending_verification' }),
      ),
      findByID: vi.fn().mockImplementation(({ id }) =>
        Promise.resolve({ id: 1, email: 'ahmed@laube.com', firstName: 'Ahmed', lastName: 'Hassan', status: 'pending_verification' }),
      ),
      find: vi.fn().mockResolvedValue({ docs: [] }),
      update: vi.fn().mockImplementation(({ data }) =>
        Promise.resolve({ id: 1, email: 'ahmed@laube.com', firstName: 'Ahmed', lastName: 'Hassan', status: 'active', emailVerifiedAt: new Date().toISOString() }),
      ),
    }
    workflowEngine = new CustomerWorkflowEngine(mockPayload)
  })

  it('should execute register customer workflow', async () => {
    const customer = await workflowEngine.executeRegisterWorkflow('ahmed@laube.com', 'Ahmed', 'Hassan')
    expect(customer.customerId).toBe(1)
    expect(customer.email).toBe('ahmed@laube.com')
  })
})
