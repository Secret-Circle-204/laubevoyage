import React from 'react'

export const Logo: React.FC = () => {
  return (
    <div className="flex items-center gap-3 select-none">
      <div className="flex items-center justify-center p-1 rounded-md bg-[#f58220] shadow-md" style={{ width: '32px', height: '32px' }}>
        <span className="text-white font-bold text-sm tracking-widest">LV</span>
      </div>
      <span className="text-xl font-bold tracking-tight text-foreground" style={{ fontFamily: 'var(--font-sans)', color: 'var(--theme-text)' }}>
        L&apos;Aube Voyage
      </span>
    </div>
  )
}
