import type { CustomerDocumentItem } from './types'

/**
 * Dashboard Unified Documents Hub
 * Manages official customer travel documentation: PDF Vouchers, Invoices, E-Tickets, and Attachments.
 */
export class DashboardDocumentsHub {
  static getCustomerDocuments(bookingNumber: string): CustomerDocumentItem[] {
    return [
      {
        documentId: `doc_v_${bookingNumber}`,
        title: `Travel Voucher ${bookingNumber}`,
        type: 'voucher',
        bookingNumber,
        fileUrl: `/api/documents/voucher/${bookingNumber}.pdf`,
        createdAt: new Date().toISOString(),
      },
      {
        documentId: `doc_i_${bookingNumber}`,
        title: `Official Invoice ${bookingNumber}`,
        type: 'invoice',
        bookingNumber,
        fileUrl: `/api/documents/invoice/${bookingNumber}.pdf`,
        createdAt: new Date().toISOString(),
      },
      {
        documentId: `doc_t_${bookingNumber}`,
        title: `E-Ticket ${bookingNumber}`,
        type: 'e_ticket',
        bookingNumber,
        fileUrl: `/api/documents/ticket/${bookingNumber}.pdf`,
        createdAt: new Date().toISOString(),
      },
    ]
  }
}
