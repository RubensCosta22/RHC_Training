export function toLocalDateKey(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function parseLocalDate(value) {
  if (value instanceof Date) return new Date(value)

  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return new Date(value)

  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
}

export function formatShortDate(value, fallback = 'sem registro') {
  if (!value) return fallback

  const date = parseLocalDate(value)
  if (Number.isNaN(date.getTime())) return fallback

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short'
  }).format(date).replace('.', '')
}
