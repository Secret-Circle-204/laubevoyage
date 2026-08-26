import nodemailer from 'nodemailer'
import type { INotificationProvider, NotificationDispatchResult } from './provider.interface'
import type { NotificationJobEntity, SenderIdentity } from '../types'
import { NotificationTemplateEngine } from '../template-engine'

/**
 * Real Production Email Notification Adapter using Nodemailer SMTP
 */
export class EmailNotificationAdapter implements INotificationProvider {
  private transporter: nodemailer.Transporter | null = null

  private getTransporter(): nodemailer.Transporter {
    if (!this.transporter) {
      const host = process.env.SMTP_HOST
      const portStr = process.env.SMTP_PORT
      const secureStr = process.env.SMTP_SECURE
      const user = process.env.SMTP_USER
      const pass = process.env.SMTP_PASSWORD

      if (!host || !portStr || !secureStr || !user || !pass) {
        throw new Error(
          `[EmailNotificationAdapter] Explicit SMTP Configuration Incomplete! All 5 variables are mandatory in .env: SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASSWORD.`,
        )
      }

      const port = Number(portStr)
      const secure = secureStr === 'true'

      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: { user, pass },
        connectionTimeout: 10000,
        greetingTimeout: 5000,
        socketTimeout: 15000,
      })
    }
    return this.transporter
  }

  async send(
    job: NotificationJobEntity,
    sender: SenderIdentity,
  ): Promise<NotificationDispatchResult> {
    if (!sender?.fromEmail || !sender?.fromName || !sender?.replyTo) {
      throw new Error(
        `[EmailNotificationAdapter] Missing required SenderIdentity for job '${job.jobId}'. Dispatch blocked.`,
      )
    }

    const fromHeader = `"${sender.fromName}" <${sender.fromEmail}>`
    const replyTo = sender.replyTo

    const rendered = NotificationTemplateEngine.renderTemplate(
      job.templateId,
      job.templateData || {},
      (job.templateData?.['locale'] as string) || 'en',
    )

    const subject = (job.templateData?.['subject'] as string) || rendered.subject
    const htmlBody = (job.templateData?.['html'] as string) || `<p>${rendered.body}</p>`
    const textBody = (job.templateData?.['text'] as string) || rendered.body

    if (!subject) {
      throw new Error(
        `[EmailNotificationAdapter] Invalid Email: Subject is missing for template '${job.templateId}'`,
      )
    }
    if (!htmlBody && !textBody) {
      throw new Error(
        `[EmailNotificationAdapter] Invalid Email: Body is missing for template '${job.templateId}'`,
      )
    }

    try {
      console.log(
        `[EmailNotificationAdapter] 📧 Sending real SMTP email to ${job.recipient} (Subject: ${subject}, From: ${fromHeader}, Reply-To: ${replyTo})...`,
      )

      // Note on duplicate delivery: Stable Message Identity (messageId) is used to assist downstream
      // mail systems (like Gmail/Outlook) in deduplicating or threading duplicate messages, but it does
      // NOT provide transactional or exactly-once delivery semantics over SMTP.
      const info = await this.getTransporter().sendMail({
        from: fromHeader,
        to: job.recipient,
        replyTo,
        subject,
        text: textBody,
        html: htmlBody,
        messageId: `<${job.jobId}@laubevoyage.com>`,
      })

      console.log(
        `[EmailNotificationAdapter] ✅ Real email sent successfully! MessageId: ${info.messageId}`,
      )
      return {
        success: true,
        providerMessageId: info.messageId,
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err)
      console.error(
        `[EmailNotificationAdapter] ❌ Real SMTP dispatch failed for ${job.recipient}:`,
        errMsg,
      )
      return {
        success: false,
        error: `SMTP Error: ${errMsg}`,
      }
    }
  }

  /**
   * Direct send method for system integrations (e.g. Payload Auth adapter)
   * that already have their own rendered HTML/subject and resolved SenderIdentity.
   * Reuses the exact same canonical nodemailer transporter instance.
   */
  async sendDirect(options: {
    to: string
    from: string
    replyTo?: string
    subject: string
    html?: string
    text?: string
  }): Promise<{ messageId?: string }> {
    const info = await this.getTransporter().sendMail({
      from: options.from,
      to: options.to,
      replyTo: options.replyTo,
      subject: options.subject,
      html: options.html,
      text: options.text,
    })
    return { messageId: info.messageId }
  }
}

export const emailNotificationAdapter = new EmailNotificationAdapter()
