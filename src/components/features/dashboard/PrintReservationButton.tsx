'use client'

import React from 'react'
import { Button, type ButtonProps } from '@/components/ui'

interface PrintReservationButtonProps {
  label?: string
  className?: string
  variant?: ButtonProps['variant']
  size?: ButtonProps['size']
}

export function PrintReservationButton({
  label = '🖨️ Print Reservation Confirmation',
  className = '',
  variant = 'outline',
  size = 'sm',
}: PrintReservationButtonProps) {
  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print()
    }
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handlePrint}
      className={`print:hidden ${className}`}
      id="print-reservation-btn"
    >
      {label}
    </Button>
  )
}
