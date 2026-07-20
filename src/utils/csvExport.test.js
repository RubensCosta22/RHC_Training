import { describe, expect, it } from 'vitest'
import { toCsv } from './csvExport'

describe('csvExport', () => {
  it.each([
    '=HYPERLINK("https://example.com")',
    '+SUM(1;1)',
    '-1+1',
    '@SUM(1;1)',
    '\t=CMD()',
    '\r+CMD()'
  ])('neutraliza formula iniciada por %s', (value) => {
    const csv = toCsv([{ observacoes: value }])
    expect(csv.split('\n')[1]).toContain("'")
    expect(csv.split('\n')[1]).not.toMatch(/^"?[\t\r ]*[=+\-@]/)
  })

  it('preserva texto comum e escapa separadores', () => {
    expect(toCsv([{ academia: 'RHC; Centro' }])).toBe('academia\n"RHC; Centro"')
  })
})
