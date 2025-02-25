import { DateTime } from 'luxon'

export const formatMessageDisplayDate = (createdAt: number): string => {
  const LC = process.env.LC_ALL || 'en_US.UTF-8'
  const locale = LC.split('_')[0]
  const messageDate = DateTime.fromSeconds(createdAt).setLocale(locale)
  const now = DateTime.now().setLocale(locale)
  const check = messageDate.hasSame(now, 'year') && messageDate.hasSame(now, 'day')
  if (!check) {
    return DateTime.fromSeconds(createdAt).setLocale(locale).toFormat('LLL d, t')
  }
  return DateTime.fromSeconds(createdAt).setLocale(locale).toFormat('t')
}

export const formatMessageDisplayDay = (date: string): string => {
  if (date.includes(',')) {
    return date.split(',')[0]
  }
  return 'Today'
}
