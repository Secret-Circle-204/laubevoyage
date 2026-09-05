import fs from 'fs'
import path from 'path'

const dir = path.join(process.cwd(), 'src', 'dictionaries')

const additions: Record<string, Record<string, string>> = {
  en: {
    printConfirmation: 'Print Reservation Confirmation',
    backToBookings: 'Back to All Reservations',
    reservationDossier: 'Reservation Confirmation',
  },
  ar: {
    printConfirmation: 'طباعة تأكيد الحجز',
    backToBookings: 'العودة إلى جميع الحجوزات',
    reservationDossier: 'تأكيد الحجز',
  },
  de: {
    printConfirmation: 'Buchungsbestätigung drucken',
    backToBookings: 'Zurück zu allen Buchungen',
    reservationDossier: 'Buchungsbestätigung',
  },
  es: {
    printConfirmation: 'Imprimir confirmación de reserva',
    backToBookings: 'Volver a todas las reservas',
    reservationDossier: 'Confirmación de reserva',
  },
  fi: {
    printConfirmation: 'Tulosta varausvahvistus',
    backToBookings: 'Takaisin kaikkiin varauksiin',
    reservationDossier: 'Varausvahvistus',
  },
  fr: {
    printConfirmation: 'Imprimer la confirmation de réservation',
    backToBookings: 'Retour à toutes les réservations',
    reservationDossier: 'Confirmation de réservation',
  },
  it: {
    printConfirmation: 'Stampa conferma di prenotazione',
    backToBookings: 'Torna a tutte le prenotazioni',
    reservationDossier: 'Conferma di prenotazione',
  },
  ja: {
    printConfirmation: '予約確認書を印刷',
    backToBookings: 'すべての予約に戻る',
    reservationDossier: '予約確認書',
  },
  nl: {
    printConfirmation: 'Reserveringsbevestiging afdrukken',
    backToBookings: 'Terug naar alle boekingen',
    reservationDossier: 'Reserveringsbevestiging',
  },
  pl: {
    printConfirmation: 'Drukuj potwierdzenie rezerwacji',
    backToBookings: 'Powrót do wszystkich rezerwacji',
    reservationDossier: 'Potwierdzenie rezerwacji',
  },
  pt: {
    printConfirmation: 'Imprimir confirmação de reserva',
    backToBookings: 'Voltar para todas as reservas',
    reservationDossier: 'Confirmação de reserva',
  },
  ru: {
    printConfirmation: 'Печать подтверждения бронирования',
    backToBookings: 'Назад ко всем бронированиям',
    reservationDossier: 'Подтверждение бронирования',
  },
  zh: {
    printConfirmation: '打印预订确认单',
    backToBookings: '返回所有预订',
    reservationDossier: '预订确认单',
  },
}

for (const [lang, keys] of Object.entries(additions)) {
  const filePath = path.join(dir, `${lang}.json`)
  const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
  if (!content.bookingConfirmation) {
    content.bookingConfirmation = {}
  }
  Object.assign(content.bookingConfirmation, keys)
  fs.writeFileSync(filePath, JSON.stringify(content, null, 2) + '\n', 'utf-8')
  console.log(`Updated ${lang}.json`)
}

console.log('Done updating all 13 dictionaries.')
