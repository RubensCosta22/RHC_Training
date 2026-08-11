import { supabase } from '../lib/supabaseClient'
import { validateUuid } from '../utils/validation'

const ALLOWED_INTENTS = new Set(['suggest_workout', 'analyze_progress'])

export async function requestAiTraining({ profileId, intent, constraints = {} }) {
  const cleanProfileId = validateUuid(profileId, 'Perfil')
  if (!ALLOWED_INTENTS.has(intent)) throw new Error('Objetivo de IA inválido.')

  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new Error('Faça login novamente para usar o assistente.')

  const response = await fetch('/api/ai/training', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ profileId: cleanProfileId, intent, constraints })
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(payload.error || 'Não foi possível consultar o assistente.')
  return payload
}
