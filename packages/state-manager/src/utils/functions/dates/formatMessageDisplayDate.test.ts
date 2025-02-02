import { DateTime } from 'luxon'
import { formatMessageDisplayDate } from './formatMessageDisplayDate'

describe('Format message displays date', () => {
  it('from year ago', () => {
    const createdAt = DateTime.now().plus({ years: -1 }).toSeconds()
    const result = formatMessageDisplayDate(createdAt)
    expect(result).toContain(',')
  })

  it('from day ago', () => {
    const createdAt = DateTime.now().plus({ days: -1 }).toSeconds()
    const result = formatMessageDisplayDate(createdAt)
    expect(result).toContain(',')
  })

  it('from the same day', () => {
    const createdAt = DateTime.now().toSeconds()
    const result = formatMessageDisplayDate(createdAt)
    expect(result).not.toContain(',')
  })

  it('from the same day but hours ago', () => {
    jest.spyOn(DateTime, 'now').mockImplementation(() => {
      return DateTime.fromObject({
        year: 2020,
        month: 10,
        day: 20,
        hour: 12,
      })
    })
    const createdAt = DateTime.now().plus({ hours: -2 }).toSeconds()
    const result = formatMessageDisplayDate(createdAt)
    expect(result).not.toContain(',')
  })

  it('from minute before midnight', () => {
    jest.spyOn(DateTime, 'now').mockImplementation(() => {
      return DateTime.fromObject({
        year: 2020,
        month: 10,
        day: 20,
        hour: 0,
      })
    })
    const createdAt = DateTime.now().plus({ minutes: -1 }).toSeconds()
    const result = formatMessageDisplayDate(createdAt)
    expect(result).toContain(',')
  }),
    it('does not display leading zero on date', () => {
      jest.spyOn(DateTime, 'now').mockImplementation(() => {
        return DateTime.fromObject({
          year: 2020,
          month: 10,
          day: 2,
          hour: 0,
        })
      })
      const createdAt = DateTime.now().plus({ minutes: -1 }).toSeconds()
      const result = formatMessageDisplayDate(createdAt)
      expect(result).toBe('Oct 1, 11:59 PM')
    })
})
