import nodemailer from 'nodemailer'
import type { INotificationProvider, NotificationDispatchResult } from './provider.interface'
import type { NotificationJobEntity } from '../types'
import { NotificationTemplateEngine } from '../template-engine'

/**
 * Real Production Email Notification Adapter using Nodemailer SMTP
 */
export class EmailNotificationAdapter implements INotificationProvider {
  private transporter: nodemailer.Transporter | null = null

  private getTransporter(): nodemailer.Transporter {
    if (!this.transporter) {
      const host = process.env.SMTP_HOST
      const port = Number(process.env.SMTP_PORT || 587)
      const user = process.env.SMTP_USER
      const pass = process.env.SMTP_PASSWORD || process.env.SMTP_PASS

      if (!host || !user || !pass) {
        throw new Error(
          `[EmailNotificationAdapter] Real SMTP Configuration Missing! Please specify SMTP_HOST, SMTP_USER, and SMTP_PASSWORD in .env file.`,
        )
      }

      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: process.env.SMTP_SECURE === 'true',
        auth: { user, pass },
      })
    }
    return this.transporter
  }

  async send(job: NotificationJobEntity): Promise<NotificationDispatchResult> {
    const fromEmail = process.env.FROM_EMAIL || process.env.SMTP_USER
    const fromName = process.env.FROM_NAME || "L'Aube Voyage"
    const fromHeader = `"${fromName}" <${fromEmail}>`

    const rendered = NotificationTemplateEngine.renderTemplate(
      job.templateId,
      job.templateData || {},
      (job.templateData?.['locale'] as string) || 'en',
    )

    const subject = (job.templateData?.['subject'] as string) || rendered.subject
    const htmlBody = (job.templateData?.['html'] as string) || `<p>${rendered.body}</p>`
    const textBody = (job.templateData?.['text'] as string) || rendered.body

    if (!subject) {
      throw new Error(`[EmailNotificationAdapter] Invalid Email: Subject is missing for template '${job.templateId}'`)
    }
    if (!htmlBody && !textBody) {
      throw new Error(`[EmailNotificationAdapter] Invalid Email: Body is missing for template '${job.templateId}'`)
    }
    try {
      console.log(`[EmailNotificationAdapter] 📧 Sending real SMTP email to ${job.recipient} (Subject: ${subject})...`)

      // Note on duplicate delivery: Stable Message Identity (messageId) is used to assist downstream
      // mail systems (like Gmail/Outlook) in deduplicating or threading duplicate messages, but it does
      // NOT provide transactional or exactly-once delivery semantics over SMTP.
      const info = await this.getTransporter().sendMail({
        from: fromHeader,
        to: job.recipient,
        subject,
        text: textBody,
        html: htmlBody,
        messageId: `<${job.jobId}@laubevoyage.com>`,
      })

      console.log(`[EmailNotificationAdapter] ✅ Real email sent successfully! MessageId: ${info.messageId}`)
      return {
        success: true,
        providerMessageId: info.messageId,
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err)
      console.error(`[EmailNotificationAdapter] ❌ Real SMTP dispatch failed for ${job.recipient}:`, errMsg)
      return {
        success: false,
        error: `SMTP Error: ${errMsg}`,
      }
    }
  }
}
