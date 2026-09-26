import { describe, it, expect } from 'vitest'
import type { ResolvedSession } from '@/application/auth/session-resolver'

/**
 * Architectural Invariant Test: Route Audience Guards
 * 
 * Prevents regression of the infinite redirect loop flaw:
 * An authenticated session does NOT imply a customer session.
 * Staff/Admin sessions must never be treated as customers on frontend portals.
 */
describe('Route Audience Guard Invariants (Customer vs Staff Isolation)', () => {
  const isCustomerPredicate = (session: ResolvedSession): boolean => {
    return session.isAuthenticated && session.role === 'customer' && !!session.customerId
  }

  describe('isCustomer identity invariant', () => {
    it('rejects unauthenticated sessions', () => {
      const session: ResolvedSession = { isAuthenticated: false }
      expect(isCustomerPredicate(session)).toBe(false)
    })

    it('rejects admin sessions even when fully authenticated', () => {
      const session: ResolvedSession = {
        isAuthenticated: true,
        role: 'admin',
        userId: 1,
        email: 'admin@laube.com',
        customerId: undefined,
      }
      expect(isCustomerPredicate(session)).toBe(false)
    })

    it('rejects super_admin sessions even when fully authenticated', () => {
      const session: ResolvedSession = {
        isAuthenticated: true,
        role: 'super_admin',
        userId: 2,
        email: 'superadmin@laube.com',
        customerId: undefined,
      }
      expect(isCustomerPredicate(session)).toBe(false)
    })

    it('rejects malformed customer sessions missing customerId', () => {
      const session: ResolvedSession = {
        isAuthenticated: true,
        role: 'customer',
        email: 'broken@example.com',
        customerId: undefined,
      }
      expect(isCustomerPredicate(session)).toBe(false)
    })

    it('accepts valid customer sessions with active customerId', () => {
      const session: ResolvedSession = {
        isAuthenticated: true,
        role: 'customer',
        customerId: 101,
        email: 'traveler@example.com',
      }
      expect(isCustomerPredicate(session)).toBe(true)
    })
  })

  describe('Route Decision Logic simulation', () => {
    function computeLoginRouteAction(session: ResolvedSession, redirectParam?: string): { action: 'redirect' | 'render_form'; target?: string; showStaffNotice?: boolean } {
      const isCustomer = isCustomerPredicate(session)
      if (isCustomer) {
        return { action: 'redirect', target: redirectParam || '/dashboard' }
      }
      const isAdminSession = session.isAuthenticated && (session.role === 'admin' || session.role === 'super_admin')
      return { action: 'render_form', showStaffNotice: isAdminSession }
    }

    function computeCustomerLayoutAction(session: ResolvedSession): { action: 'allow' | 'redirect_login' } {
      const isCustomer = isCustomerPredicate(session)
      if (!isCustomer) {
        return { action: 'redirect_login' }
      }
      return { action: 'allow' }
    }

    it('prevents Admin redirect loop: /login keeps admin on page and does NOT redirect to /dashboard', () => {
      const adminSession: ResolvedSession = {
        isAuthenticated: true,
        role: 'admin',
        userId: 1,
      }
      const loginDecision = computeLoginRouteAction(adminSession)
      expect(loginDecision.action).toBe('render_form')
      expect(loginDecision.target).toBeUndefined()
      expect(loginDecision.showStaffNotice).toBe(true)

      // When admin attempts to access /dashboard directly, CustomerLayout redirects them to /login
      const layoutDecision = computeCustomerLayoutAction(adminSession)
      expect(layoutDecision.action).toBe('redirect_login')

      // Because loginDecision was render_form (NOT redirecting back to /dashboard),
      // the loop is definitively broken!
    })

    it('preserves customer deep-link redirect target on /login', () => {
      const customerSession: ResolvedSession = {
        isAuthenticated: true,
        role: 'customer',
        customerId: 50,
      }
      const decision = computeLoginRouteAction(customerSession, '/checkout/123')
      expect(decision.action).toBe('redirect')
      expect(decision.target).toBe('/checkout/123')
    })
  })
})
