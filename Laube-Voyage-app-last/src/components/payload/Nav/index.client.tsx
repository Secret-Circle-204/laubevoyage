'use client'


// Inline helper — replaces the missing @payloadcms/translations package
const getTranslation = (label: Record<string, string> | string, i18n: { language: string }): string => {
  if (typeof label === 'string') return label
  if (typeof label === 'object' && label !== null) {
    return label[i18n.language] || label['en'] || Object.values(label)[0] || ''
  }
  return String(label || '')
}
import { useConfig, useTranslation } from '@payloadcms/ui'
import { baseClass } from './index'
import { EntityType, formatAdminURL, NavGroupType } from '@payloadcms/ui/shared'
import { usePathname } from 'next/navigation'
import LinkWithDefault from 'next/link'
import { NavPreferences } from 'payload'
import { FC, Fragment, useState, useEffect } from 'react'
import { getNavIcon } from './navIconMap'

type Props = {
  groups: NavGroupType[]
  navPreferences: NavPreferences | null
}

const CustomNavGroup: FC<{ label: Record<string, string> | string; children: React.ReactNode }> = ({ label, children }) => {
  const { i18n } = useTranslation()
  const translatedLabel = getTranslation(label, i18n)
  const storageKey = `nav-group-state-${translatedLabel}`

  // Always start open by default
  const [isOpen, setIsOpen] = useState(true)

  useEffect(() => {
    // Only close if explicitly saved as closed in localStorage
    const savedState = window.localStorage.getItem(storageKey)
    if (savedState === 'closed') {
      setIsOpen(false)
    }
  }, [storageKey])

  const toggle = () => {
    const newState = !isOpen
    setIsOpen(newState)
    window.localStorage.setItem(storageKey, newState ? 'open' : 'closed')
  }

  return (
    <div className={`nav-group ${!isOpen ? 'nav-group--collapsed' : ''}`}>
      <div className="nav-group__toggle" onClick={toggle}>
        <div className="nav-group__label">{translatedLabel}</div>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </div>
      <div className="nav-group__content">{children}</div>
    </div>
  )
}

export const NavClient: FC<Props> = ({ groups }) => {
  const pathname = usePathname()

  const {
    config: {
      routes: { admin: adminRoute },
    },
  } = useConfig()

  const { i18n } = useTranslation()

  return (
    <Fragment>
      {groups.map(({ entities, label }, key) => {
        return (
          <CustomNavGroup key={key} label={label}>
            {entities
              .filter(({ slug }) => slug !== 'emails')
              .map(({ slug, type, label }, i) => {
              let href: string
              let id: string

              if (type === EntityType.collection) {
                href = formatAdminURL({ adminRoute, path: `/collections/${slug}` })
                id = `nav-${slug}`
              } else {
                href = formatAdminURL({ adminRoute, path: `/globals/${slug}` })
                id = `nav-global-${slug}`
              }

              const Link = LinkWithDefault

              const LinkElement = Link || 'a'
              const activeCollection =
                pathname.startsWith(href) && ['/', undefined].includes(pathname[href.length])

              const Icon = getNavIcon(slug)

              return (
                <LinkElement
                  className={[`${baseClass}__link`, activeCollection && `active`]
                    .filter(Boolean)
                    .join(' ')}
                  href={href}
                  id={id}
                  key={i}
                  prefetch={false}
                >
                  {Icon && <Icon className={`${baseClass}__icon`} />}
                  <span className={`${baseClass}__link-label`}>{getTranslation(label, i18n)}</span>
                </LinkElement>
              )
            })}
          </CustomNavGroup>
        )
      })}
    </Fragment>
  )
}
