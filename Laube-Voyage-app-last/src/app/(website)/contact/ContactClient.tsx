'use client'

import { motion } from 'framer-motion'
import { Phone, Mail, MapPin, Clock, Send, MessageCircle } from 'lucide-react'
import { useState } from 'react'

interface ContactInfo {
  icon: typeof Phone
  title: string
  value: string
  subtext: string
}

interface CompanySettings {
  email?: string
  phone?: string
  address?: string
  instagram?: string
  facebook?: string
  linkedin?: string
}

interface ContactClientProps {
  settings: CompanySettings
}

const subjectOptions = [
  { value: 'booking', label: 'New Booking Inquiry' },
  { value: 'reservation', label: 'Existing Reservation' },
  { value: 'loyalty', label: 'Loyalty Program Question' },
  { value: 'feedback', label: 'General Feedback' },
  { value: 'partnership', label: 'Partnership Opportunity' },
]

export default function ContactClient({ settings }: ContactClientProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: 'booking',
    destination: '',
    message: '',
  })
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')

  // Dynamic contact info from CMS
  const contactInfo: ContactInfo[] = [
    {
      icon: Phone,
      title: 'Reservations',
      value: settings.phone || '+20 2 2345 6789',
      subtext: 'Mon-Fri 9AM-6PM EET',
    },
    {
      icon: Mail,
      title: 'General Inquiries',
      value: settings.email || 'info@laubevoyage.com',
      subtext: 'We respond within 24 hours',
    },
    {
      icon: MapPin,
      title: 'Head Office',
      value: 'Cairo, Egypt',
      subtext:
        settings.address || '6th, El-Margoushy street, 6th District, Nasr City, Cairo, Egypt',
    },
    {
      icon: Clock,
      title: 'Business Hours',
      value: 'Sun-Thu: 9AM - 6PM',
      subtext: 'Emergency: 24/7 Support',
    },
  ]

  // Dynamic social links from CMS
  const socialLinks = [
    { name: 'Facebook', url: settings.facebook || '#' },
    { name: 'Instagram', url: settings.instagram || '#' },
    { name: 'LinkedIn', url: settings.linkedin || '#' },
  ].filter((s) => s.url && s.url !== '#')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('loading')

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (res.ok) {
        setStatus('success')
        setFormData({
          name: '',
          email: '',
          phone: '',
          subject: 'booking',
          destination: '',
          message: '',
        })
      } else {
        setStatus('error')
      }
    } catch {
      setStatus('error')
    }
  }

  return (
    <main className="min-h-screen bg-background dark:bg-dark transition-colors duration-500">
      {/* Hero Section */}
      <section className="relative py-24 bg-gradient-to-br from-primary/10 via-background to-secondary/5 dark:from-primary/20 dark:via-dark dark:to-secondary/10">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-3xl mx-auto"
          >
            <h1 className="text-4xl md:text-5xl font-serif font-bold text-dark dark:text-white mb-4">
              Connect With Us
            </h1>
            <p className="text-lg text-gray dark:text-stone-400">
              Your journey begins with a conversation. Our dedicated team is ready to craft your
              perfect travel experience.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Contact Info Cards */}
      <section className="py-16 container mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {contactInfo.map((item, index) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="p-6 bg-white dark:bg-[#1a1718] border border-gray/10 dark:border-white/10 hover:border-primary/30 transition-all duration-300"
            >
              <div className="w-12 h-12 bg-primary/10 dark:bg-primary/20 flex items-center justify-center mb-4">
                <item.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold text-dark dark:text-white mb-1">{item.title}</h3>
              <p className="text-primary font-medium">{item.value}</p>
              <p className="text-sm text-gray dark:text-stone-400 mt-1">{item.subtext}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Form & Map Section */}
      <section className="py-16 bg-gradient-to-b from-gray/5 to-background dark:from-[#1a1718]/50 dark:to-dark">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Contact Form */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              className="bg-white dark:bg-[#1a1718] p-8 border border-gray/10 dark:border-white/10"
            >
              <h2 className="text-2xl font-serif font-bold text-dark dark:text-white mb-6">
                Send Us a Message
              </h2>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-dark dark:text-white mb-2">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-3 bg-background dark:bg-dark border border-gray/20 dark:border-white/20 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-dark dark:text-white placeholder:text-gray"
                      placeholder="Your name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-dark dark:text-white mb-2">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-4 py-3 bg-background dark:bg-dark border border-gray/20 dark:border-white/20 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-dark dark:text-white placeholder:text-gray"
                      placeholder="your@email.com"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-dark dark:text-white mb-2">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-4 py-3 bg-background dark:bg-dark border border-gray/20 dark:border-white/20 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-dark dark:text-white placeholder:text-gray"
                      placeholder="+20 xxx xxx xxxx"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-dark dark:text-white mb-2">
                      Subject *
                    </label>
                    <select
                      required
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      className="w-full px-4 py-3 bg-background dark:bg-dark border border-gray/20 dark:border-white/20 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-dark dark:text-white"
                    >
                      {subjectOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-dark dark:text-white mb-2">
                    Destination of Interest
                  </label>
                  <input
                    type="text"
                    value={formData.destination}
                    onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                    className="w-full px-4 py-3 bg-background dark:bg-dark border border-gray/20 dark:border-white/20 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-dark dark:text-white placeholder:text-gray"
                    placeholder="e.g. Rome, Dubai, Local Egypt Tour"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-dark dark:text-white mb-2">
                    Your Message *
                  </label>
                  <div className="relative">
                    <textarea
                      required
                      rows={5}
                      minLength={50}
                      maxLength={1000}
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      className="w-full px-4 py-3 pb-8 bg-background dark:bg-dark border border-gray/20 dark:border-white/20 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all resize-none text-dark dark:text-white placeholder:text-gray"
                      placeholder="Tell us about your travel dreams... (minimum 50 characters)"
                    />
                    <div className="absolute bottom-2 right-3 text-[10px] text-gray dark:text-stone-500 font-medium tracking-wider">
                      {formData.message.length} / 1000
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={status === 'loading'}
                  className="w-full py-4 bg-primary hover:bg-primary/90 text-white font-semibold flex items-center justify-center gap-2 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {status === 'loading' ? (
                    'Sending...'
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      Send Message
                    </>
                  )}
                </button>

                {status === 'success' && (
                  <p className="text-green-600 dark:text-green-400 text-center font-medium">
                    ✓ Message sent successfully! We&apos;ll be in touch soon.
                  </p>
                )}
                {status === 'error' && (
                  <p className="text-red-600 dark:text-red-400 text-center font-medium">
                    Something went wrong. Please try again or contact us directly.
                  </p>
                )}
              </form>
            </motion.div>

            {/* Map & Quick Contact */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              className="space-y-6"
            >
              {/* Map Embed & Link */}
              <div className="group relative bg-white dark:bg-[#1a1718] border border-gray/10 dark:border-white/10 overflow-hidden h-[300px]">
                <iframe
                  src="https://maps.google.com/maps?q=El-Margoushy%20street,%206th%20District,%20Nasr%20City,%20Cairo,%20Egypt&t=&z=15&ie=UTF8&iwloc=&output=embed"
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="L'Aube Voyage Office Location"
                />
                
                {/* Hyperlink Overlay to open Google Maps directly */}
                <a 
                  href="https://maps.google.com/maps?q=El-Margoushy%20street,%206th%20District,%20Nasr%20City,%20Cairo,%20Egypt"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute inset-0 z-10 bg-black/5 hover:bg-black/0 transition-colors flex flex-col justify-end p-4"
                >
                  <span className="bg-primary hover:bg-primary/90 text-white text-xs font-bold uppercase tracking-widest py-3 px-6 text-center shadow-lg transition-transform transform translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100">
                    Open in Google Maps
                  </span>
                </a>
              </div>

              {/* WhatsApp CTA */}
              <div className="bg-gradient-to-r from-green-600 to-green-500 p-6 text-white">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-white/20 flex items-center justify-center">
                    <MessageCircle className="w-7 h-7" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">Need Instant Help?</h3>
                    <p className="text-white/80 text-sm">
                      Chat with us on WhatsApp for immediate assistance
                    </p>
                  </div>
                  <a
                    href={`https://wa.me/${settings.phone?.replace(/\D/g, '') || '201234567890'}?text=Hello%20L'Aube%20Voyage,%20I%20need%20help%20with...`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-6 py-3 bg-white text-green-600 font-semibold hover:bg-white/90 transition-colors"
                  >
                    Chat Now
                  </a>
                </div>
              </div>

              {/* Social Links */}
              <div className="bg-white dark:bg-[#1a1718] p-6 border border-gray/10 dark:border-white/10">
                <h3 className="font-semibold text-dark dark:text-white mb-4">Follow Our Journey</h3>
                <div className="flex gap-4">
                  {socialLinks.length > 0
                    ? socialLinks.map((social) => (
                        <a
                          key={social.name}
                          href={social.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-4 py-2 bg-gray/10 dark:bg-white/10 hover:bg-primary hover:text-white text-dark dark:text-white transition-all text-sm font-medium"
                        >
                          {social.name}
                        </a>
                      ))
                    : ['Facebook', 'Instagram', 'LinkedIn'].map((name) => (
                        <span
                          key={name}
                          className="px-4 py-2 bg-gray/10 dark:bg-white/10 text-gray dark:text-stone-400 text-sm font-medium cursor-default"
                        >
                          {name}
                        </span>
                      ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>
    </main>
  )
}
