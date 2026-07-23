export class AdminPolicy {
  /**
   * Verify Payload CMS Staff authorization (Rule 20)
   */
  public static canAccessAdminPanel(userRole?: string): boolean {
    if (!userRole) return false
    return userRole === 'admin' || userRole === 'super_admin'
  }
}
