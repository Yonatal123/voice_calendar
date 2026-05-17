/** First day Sunday = 0 .. Saturday = 6 */
export function calendarCells(viewMonth: Date): { date: Date; inMonth: boolean }[] {
  const y = viewMonth.getFullYear()
  const m = viewMonth.getMonth()
  const first = new Date(y, m, 1)
  const startPad = first.getDay()
  const lastDay = new Date(y, m + 1, 0).getDate()
  const cells: { date: Date; inMonth: boolean }[] = []
  for (let i = 0; i < startPad; i++) {
    const d = new Date(y, m, 1 - (startPad - i))
    cells.push({ date: d, inMonth: false })
  }
  for (let day = 1; day <= lastDay; day++) {
    cells.push({ date: new Date(y, m, day), inMonth: true })
  }
  while (cells.length % 7 !== 0) {
    const last = cells[cells.length - 1]!.date
    const next = new Date(last)
    next.setDate(next.getDate() + 1)
    cells.push({ date: next, inMonth: false })
  }
  return cells
}

export function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0)
}

export function endOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999)
}

export function monthTitle(d: Date): string {
  return d.toLocaleString('he-IL', { month: 'long', year: 'numeric' })
}

export function formatDayHeader(d: Date): string {
  return d.toLocaleString('he-IL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}
