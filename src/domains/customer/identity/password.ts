import { createHash } from 'crypto'

/**
 * Password Service
 * Manages password hashing and reset token hashing.
 */
export class PasswordService {
  static hashPassword(password: string): string {
    return createHash('sha256').update(password).digest('hex')
  }

  static verifyPassword(password: string, hash: string): boolean {
    return this.hashPassword(password) === hash
  }
}
