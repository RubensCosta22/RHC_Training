function escapeCsv(value) {
  if (value === null || value === undefined) return ''
  const raw = String(value)
  const safe = /^[\t\r ]*[=+\-@]/.test(raw) ? `'${raw}` : raw
  const text = safe.replace(/"/g, '""')
  return /[",\n;]/.test(text) ? `"${text}"` : text
}

export function toCsv(rows = []) {
  if (!rows.length) return ''
  const headers = Object.keys(rows[0])
  const body = rows.map((row) => headers.map((header) => escapeCsv(row[header])).join(';'))
  return [headers.join(';'), ...body].join('\n')
}

export function downloadFile(filename, content, type = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
