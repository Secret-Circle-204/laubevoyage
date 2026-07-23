import React from 'react'
import '../../../public/globals.css'
import './styles.css'


export const metadata = {
  title: "L'Aube Voyage | Luxury Travel & Experiences",
  description: 'Explore luxury journeys, Nile cruises, and daily tours across Egypt and beyond.',
}


export default async function RootLayout(props: { children: React.ReactNode }) {
  const { children } = props

  return (
    <html lang="en">
      <body>
        <main>{children}</main>
      </body>
    </html>
  )
}
