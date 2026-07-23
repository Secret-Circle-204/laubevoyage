'use server'

import { getDomainServices } from '@/domains/factory'

export interface RegisterFormData {
  email: string
  firstName: string
  lastName: string
}

export async function registerCustomerAction(formData: RegisterFormData) {
  try {
    if (!formData.email || !formData.firstName || !formData.lastName) {
      return { success: false, error: 'Email, First Name, and Last Name are required' }
    }

    const { customer, loyalty } = await getDomainServices()

    // 1. Execute Domain Registration Workflow
    const registeredCustomer = await customer.registerCustomer(
      formData.email,
      formData.firstName,
      formData.lastName,
    )

    // 2. Award 100 Welcome Points in Immutable Ledger
    try {
      await loyalty.grantWelcomeBonus(registeredCustomer.customerId)
    } catch (loyaltyError) {
      console.warn('[CustomerAction] Failed to grant welcome points:', loyaltyError)
    }

    return {
      success: true,
      customerId: registeredCustomer.customerId,
      email: registeredCustomer.email,
      fullName: registeredCustomer.fullName,
    }
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Customer registration failed',
    }
  }
}

export async function loginCustomerAction(email: string) {
  try {
    if (!email) {
      return { success: false, error: 'Email is required' }
    }

    const { customer } = await getDomainServices()
    const customerAccount = await customer.login(email)

    return {
      success: true,
      customerId: customerAccount.customerId,
      email: customerAccount.email,
      fullName: customerAccount.fullName,
    }
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Customer login failed',
    }
  }
}
