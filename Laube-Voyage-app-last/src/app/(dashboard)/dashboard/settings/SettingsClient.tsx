'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  User,
  Lock,
  Shield,
  Save,
  Check,
  Loader2,
  Eye,
  EyeOff,
  Mail,
  Phone,
  ChevronRight,
} from 'lucide-react'
import type { User as UserType } from '@/payload-types'
import { Button } from '@/components/premium-ui/Button'

interface SettingsClientProps {
  user: UserType
}

type TabId = 'profile' | 'security'

interface Tab {
  id: TabId
  label: string
  icon: typeof User
  description: string
}

/**
 * مكون إعدادات الـ Dashboard - تحكم كامل بالحساب
 * Dashboard Settings Client - Full account control
 */
export default function SettingsClient({ user }: SettingsClientProps) {
  const [activeTab, setActiveTab] = useState<TabId>('profile')
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  // Profile state
  const [name, setName] = useState(user.name || '')
  const [phone, setPhone] = useState('')

  // Security state
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)

  const tabs: Tab[] = [
    { id: 'profile', label: 'Profile', icon: User, description: 'Your personal information' },
    { id: 'security', label: 'Security', icon: Lock, description: 'Password & account safety' },
  ]

  const handleSaveProfile = async () => {
    setIsSaving(true)
    try {
      const response = await fetch('/api/users/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      if (response.ok) {
        setSaveSuccess(true)
        setTimeout(() => setSaveSuccess(false), 2000)
      }
    } catch (error) {
      console.error('Failed to save profile:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      alert('Passwords do not match!')
      return
    }
    if (newPassword.length < 8) {
      alert('Password must be at least 8 characters!')
      return
    }

    setIsSaving(true)
    try {
      const response = await fetch('/api/users/profile/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      })
      if (response.ok) {
        setSaveSuccess(true)
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
        setTimeout(() => setSaveSuccess(false), 2000)
      } else {
        alert('Failed to change password. Check your current password.')
      }
    } catch (error) {
      console.error('Failed to change password:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const tierColors = {
    traveler: 'from-stone-400 to-stone-600',
    explorer: 'from-amber-400 to-orange-600',
    voyager: 'from-purple-400 to-indigo-600',
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-serif font-bold text-secondary dark:text-white tracking-tighter uppercase italic">
          Settings
        </h1>
        <p className="text-stone-500 dark:text-stone-400 mt-2 font-medium">
          Manage your account preferences and security.
        </p>
      </div>

      {/* Profile Summary Card */}
      <div className="bg-white dark:bg-white/5 rounded-[32px] p-8 border border-stone-100 dark:border-white/10 shadow-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
          <div
            className={`w-20 h-20 rounded-3xl bg-gradient-to-br ${tierColors[(user.loyaltyTier as keyof typeof tierColors) || 'traveler']} flex items-center justify-center text-white text-3xl font-bold shadow-2xl uppercase`}
          >
            {user.name?.charAt(0) || user.email?.charAt(0) || 'U'}
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-serif font-bold text-secondary dark:text-white">
              {user.name || 'Traveler'}
            </h2>
            <p className="text-stone-500">{user.email}</p>
            <div className="flex items-center gap-3 mt-2">
              <span
                className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-gradient-to-r ${tierColors[(user.loyaltyTier as keyof typeof tierColors) || 'traveler']} text-white`}
              >
                {user.loyaltyTier || 'Traveler'}
              </span>
              <span className="text-sm text-stone-500">
                {(user.loyaltyPoints || 0).toLocaleString()} points
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Shield className="text-emerald-500" size={18} />
            <span className="text-sm font-medium text-emerald-600">
              {user.isVerified ? 'Verified Account' : 'Unverified'}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Tabs Navigation */}
        <div className="lg:col-span-1">
          <nav className="space-y-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-4 rounded-2xl text-left transition-all duration-300 ${
                  activeTab === tab.id
                    ? 'bg-primary/10 text-primary border border-primary/20'
                    : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-white/5'
                }`}
              >
                <tab.icon size={20} />
                <div className="flex-1">
                  <p className="font-bold text-sm">{tab.label}</p>
                  <p className="text-[10px] text-stone-400 hidden sm:block">{tab.description}</p>
                </div>
                <ChevronRight
                  size={16}
                  className={activeTab === tab.id ? 'text-primary' : 'text-stone-300'}
                />
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="lg:col-span-3">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="bg-white dark:bg-white/5 rounded-[32px] p-8 border border-stone-100 dark:border-white/10 shadow-xl"
            >
              {/* Profile Tab */}
              {activeTab === 'profile' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xl font-bold text-secondary dark:text-white mb-1">
                      Personal Information
                    </h3>
                    <p className="text-sm text-stone-500">Update your profile details.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest flex items-center gap-2">
                        <User size={12} /> Full Name
                      </label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full bg-stone-50 dark:bg-white/5 border border-stone-200 dark:border-white/10 rounded-xl py-3 px-4 text-stone-800 dark:text-white focus:outline-none focus:border-primary transition-colors"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest flex items-center gap-2">
                        <Mail size={12} /> Email Address
                      </label>
                      <input
                        type="email"
                        value={user.email || ''}
                        disabled
                        className="w-full bg-stone-100 dark:bg-white/10 border border-stone-200 dark:border-white/10 rounded-xl py-3 px-4 text-stone-500 cursor-not-allowed"
                      />
                      <p className="text-[10px] text-stone-400">Email cannot be changed.</p>
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest flex items-center gap-2">
                        <Phone size={12} /> Phone Number
                      </label>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+20 xxx xxx xxxx"
                        className="w-full bg-stone-50 dark:bg-white/5 border border-stone-200 dark:border-white/10 rounded-xl py-3 px-4 text-stone-800 dark:text-white placeholder:text-stone-400 focus:outline-none focus:border-primary transition-colors"
                      />
                    </div>
                  </div>

                  <div className="pt-6 border-t border-stone-100 dark:border-white/5">
                    <Button
                      onClick={handleSaveProfile}
                      disabled={isSaving}
                      className="bg-primary text-secondary hover:bg-yellow-300 rounded-xl px-8"
                    >
                      {isSaving ? (
                        <Loader2 className="animate-spin" size={18} />
                      ) : saveSuccess ? (
                        <>
                          <Check size={18} /> Saved!
                        </>
                      ) : (
                        <>
                          <Save size={18} /> Save Changes
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {/* Security Tab */}
              {activeTab === 'security' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xl font-bold text-secondary dark:text-white mb-1">
                      Password And Security
                    </h3>
                    <p className="text-sm text-stone-500">Keep your account safe and secure.</p>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">
                        Current Password
                      </label>
                      <div className="relative">
                        <input
                          type={showCurrentPassword ? 'text' : 'password'}
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          className="w-full bg-stone-50 dark:bg-white/5 border border-stone-200 dark:border-white/10 rounded-xl py-3 px-4 pr-12 text-stone-800 dark:text-white focus:outline-none focus:border-primary transition-colors"
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                        >
                          {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">
                        New Password
                      </label>
                      <div className="relative">
                        <input
                          type={showNewPassword ? 'text' : 'password'}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="w-full bg-stone-50 dark:bg-white/5 border border-stone-200 dark:border-white/10 rounded-xl py-3 px-4 pr-12 text-stone-800 dark:text-white focus:outline-none focus:border-primary transition-colors"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                        >
                          {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">
                        Confirm New Password
                      </label>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full bg-stone-50 dark:bg-white/5 border border-stone-200 dark:border-white/10 rounded-xl py-3 px-4 text-stone-800 dark:text-white focus:outline-none focus:border-primary transition-colors"
                      />
                    </div>
                  </div>

                  <div className="pt-6 border-t border-stone-100 dark:border-white/5">
                    <Button
                      onClick={handleChangePassword}
                      disabled={isSaving || !currentPassword || !newPassword || !confirmPassword}
                      className="bg-primary text-secondary hover:bg-yellow-300 rounded-xl px-8"
                    >
                      {isSaving ? (
                        <Loader2 className="animate-spin" size={18} />
                      ) : (
                        <>
                          <Lock size={18} /> Update Password
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
