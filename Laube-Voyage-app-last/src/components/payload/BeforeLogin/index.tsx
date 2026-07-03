import Image from 'next/image'

import './index.scss'

const baseClass = 'before-login'

export const BeforeLogin = () => {
  return (
    <aside className={baseClass}>
      <div className={`${baseClass}__image-wrap`}>
        <Image src="/images/auth-bg.png" alt="L'Aube Voyage" fill priority />
        <div className={`${baseClass}__overlay`} />
        <div className={`${baseClass}__branding`}>
          <Image
            src="/logos/LAube-Voyage-logo-vertical-white.svg"
            alt="L'Aube Voyage Logo"
            width={180}
            height={180}
          />
          <p className={`${baseClass}__tagline`}>Admin Panel</p>
        </div>
      </div>
    </aside>
  )
}
