const ALLOWED_INTENTS = new Set(['suggest_workout', 'analyze_progress'])

function cleanText(value, maxLength = 160) {
  return String(value || '').replace(/[<>]/g, '').trim().slice(0, maxLength)
}

function daysAgo(value, now) {
  const date = new Date(`${value}T12:00:00`)
  if (!Number.isFinite(date.getTime())) return null
  return Math.max(0, Math.floor((now.getTime() - date.getTime()) / 86_400_000))
}

export function normalizeAiRequest(body = {}) {
  const intent = ALLOWED_INTENTS.has(body.intent) ? body.intent : null
  const profileId = cleanText(body.profileId, 36)
  if (!intent) throw new Error('Objetivo de IA inválido.')
  if (!/^[0-9a-f-]{36}$/i.test(profileId)) throw new Error('Perfil inválido.')

  const constraints = body.constraints && typeof body.constraints === 'object' ? body.constraints : {}
  return {
    intent,
    profileId,
    constraints: {
      availableMinutes: Math.max(0, Math.min(240, Number(constraints.availableMinutes) || 0)) || null,
      equipment: cleanText(constraints.equipment, 240) || null,
      focus: cleanText(constraints.focus, 160) || null
    }
  }
}

export function buildAiContext({ profile, sessions = [], plans = [], now = new Date() }) {
  return {
    profile: {
      goal: cleanText(profile?.goal, 200) || null
    },
    recentSessions: sessions.slice(0, 30).map((session) => ({
      code: cleanText(session.workout_code, 2),
      daysAgo: daysAgo(session.workout_date, now),
      durationMinutes: Number(session.duration_minutes || 0),
      volumeKg: Number(session.total_volume || 0),
      completionPercent: Number(session.completion_percentage || 0),
      exercises: (session.workout_exercises || []).slice(0, 12).map((exercise) => ({
        name: cleanText(exercise.exercise_name, 120),
        weightKg: Number(exercise.weight || 0),
        sets: Number(exercise.sets || 0),
        reps: cleanText(exercise.actual_reps, 40),
        completed: Boolean(exercise.completed)
      }))
    })),
    availablePlans: plans.slice(0, 6).map((plan) => ({
      code: cleanText(plan.workout_code, 2),
      title: cleanText(plan.title, 120),
      description: cleanText(plan.description, 300) || null
    }))
  }
}

export function buildGeminiPrompt({ intent, constraints, context }) {
  const task = intent === 'suggest_workout'
    ? 'Sugira a próxima sessão usando prioritariamente os planos já disponíveis. Não invente diagnóstico, lesão ou prescrição clínica.'
    : 'Analise a evolução recente, destaque sinais apoiados pelos dados e proponha próximos passos conservadores.'

  return [
    task,
    'Use apenas os dados fornecidos. Diferencie fatos de inferências. Não recomende cargas máximas nem mudanças bruscas.',
    'Se houver dor, limitação, sinais de lesão ou dados insuficientes, recomende avaliação profissional e explicite a incerteza.',
    `Restrições declaradas: ${JSON.stringify(constraints)}`,
    `Contexto do treino: ${JSON.stringify(context)}`
  ].join('\n')
}

export const aiResponseSchema = {
  type: 'object',
  properties: {
    summary: { type: 'string' },
    insights: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          detail: { type: 'string' },
          evidence: { type: 'string' }
        },
        required: ['title', 'detail', 'evidence']
      }
    },
    recommendation: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        rationale: { type: 'string' },
        durationMinutes: { type: 'integer' },
        exercises: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              sets: { type: 'integer' },
              reps: { type: 'string' },
              note: { type: 'string' }
            },
            required: ['name', 'sets', 'reps', 'note']
          }
        }
      },
      required: ['title', 'rationale', 'durationMinutes', 'exercises']
    },
    warnings: { type: 'array', items: { type: 'string' } },
    disclaimer: { type: 'string' }
  },
  required: ['summary', 'insights', 'recommendation', 'warnings', 'disclaimer']
}
