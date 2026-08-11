import { describe, expect, it } from 'vitest'
import { buildAiContext, buildGeminiPrompt, normalizeAiRequest } from './ai-training-context'

describe('AI training context', () => {
  it('aceita somente intenções e restrições conhecidas', () => {
    expect(normalizeAiRequest({
      profileId: '550e8400-e29b-41d4-a716-446655440000',
      intent: 'suggest_workout',
      constraints: { availableMinutes: 45, focus: '<script>pernas</script>' }
    })).toEqual({
      profileId: '550e8400-e29b-41d4-a716-446655440000',
      intent: 'suggest_workout',
      constraints: { availableMinutes: 45, equipment: null, focus: 'scriptpernas/script' }
    })
    expect(() => normalizeAiRequest({ profileId: 'x', intent: 'chat' })).toThrow()
  })

  it('remove identificadores diretos do contexto enviado ao modelo', () => {
    const context = buildAiContext({
      profile: { name: 'Henrique', birth_date: '1996-08-10', gender: 'homem', goal: 'Força', invitation_email: 'x@example.com' },
      sessions: [{ workout_code: 'A', workout_date: '2026-08-10', total_volume: 1000, workout_exercises: [] }],
      now: new Date(2026, 7, 11)
    })
    expect(context.profile).toEqual({ goal: 'Força' })
    expect(JSON.stringify(context)).not.toContain('Henrique')
    expect(JSON.stringify(context)).not.toContain('@')
    expect(JSON.stringify(context)).not.toContain('1996')
    expect(JSON.stringify(context)).not.toContain('homem')
  })

  it('instrui o modelo a separar evidência de inferência', () => {
    const prompt = buildGeminiPrompt({ intent: 'analyze_progress', constraints: {}, context: {} })
    expect(prompt).toContain('Diferencie fatos de inferências')
    expect(prompt).toContain('avaliação profissional')
  })
})
