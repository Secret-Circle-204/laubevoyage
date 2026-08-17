import { describe, it, expect, beforeEach, vi } from 'vitest'
import { CustomerWorkflowEngine } from '@/domains/customer/workflow'

describe('Customer Domain: CustomerWorkflowEngine Integration Tests', () => {
  let mockPayload: any
  let workflowEngine: CustomerWorkflowEngine

  beforeEach(() => {
    mockPayload = {
      db: {
        beginTransaction: vi.fn().mockResolvedValue('test-transaction-id'),
        commitTransaction: vi.fn().mockResolvedValue(undefined),
        rollbackTransaction: vi.fn().mockResolvedValue(undefined),
      },
      create: vi.fn().mockImplementation(({ collection, data }) =>
        Promise.resolve({ id: 1, email: data.email, firstName: data.firstName, lastName: data.lastName, status: 'pending_verification' }),
      ),
      findByID: vi.fn().mockImplementation(({ id }) =>
        Promise.resolve({ id: 1, email: 'ahmed@laube.com', firstName: 'Ahmed', lastName: 'Hassan', status: 'pending_verification', _verified: true }),
      ),
      find: vi.fn().mockResolvedValue({ docs: [] }),
      verifyEmail: vi.fn().mockResolvedValue(true),
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

  it('should execute verify email workflow', async () => {
    mockPayload.find.mockImplementation(({ collection, where }: { collection?: string; where?: any }) => {
      if (where?._verificationToken || where?.email) {
        return Promise.resolve({
          docs: [{ id: 1, email: 'ahmed@laube.com', firstName: 'Ahmed', lastName: 'Hassan', status: 'pending_verification' }]
        })
      }
      return Promise.resolve({ docs: [] })
    })

    const result = await workflowEngine.executeVerifyEmailWorkflow('some_token', 'ahmed@laube.com')
    expect(result.status).toBe('VERIFIED')
    if (result.status === 'VERIFIED') {
      expect(result.customer.customerId).toBe(1)
      expect(result.customer.status).toBe('active')
      expect(result.customer.isEmailVerified).toBe(true)
    }
  })
})
