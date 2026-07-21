import { describe, expect, it } from 'vitest'
import { friendlyUploadError } from './uploadErrors'

describe('friendlyUploadError', () => {
  it('traduz erros seguros retornados pela função', () => {
    expect(friendlyUploadError('profile not found')).toBe(
      'Perfil não encontrado ou indisponível para esta conta.'
    )
  })

  it('não expõe mensagens internas desconhecidas', () => {
    expect(friendlyUploadError('database connection details')).toBe(
      'Falha no envio seguro da imagem.'
    )
  })
})
