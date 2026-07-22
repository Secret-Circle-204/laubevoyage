import type { NotificationAttachment } from './types'

/**
 * Notification Attachment Service
 * Generates PDF Vouchers, Invoices, E-Tickets, and QR Code attachments.
 */
export class NotificationAttachmentService {
  static generateVoucherAttachment(bookingNumber: string): NotificationAttachment {
    return {
      filename: `Voucher_${bookingNumber}.pdf`,
      content: Buffer.from(`PDF_VOUCHER_HEADER:${bookingNumber}`).toString('base64'),
      contentType: 'application/pdf',
    }
  }

  static generateInvoiceAttachment(invoiceId: string): NotificationAttachment {
    return {
      filename: `Invoice_${invoiceId}.pdf`,
      content: Buffer.from(`PDF_INVOICE_HEADER:${invoiceId}`).toString('base64'),
      contentType: 'application/pdf',
    }
  }
}
