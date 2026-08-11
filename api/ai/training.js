import { createClient } from '@supabase/supabase-js'
import { aiResponseSchema, buildAiContext, buildGeminiPrompt, normalizeAiRequest } from '../../server/ai-training-context.js'

const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash'
const REQUEST_TIMEOUT_MS = 15_000
const RATE_WINDOW_MS = 60 * 60 * 1000
const RATE_LIMIT = 10
const requestWindows = new Map()

function json(response, status, payload) {
  response.status(status)
  response.setHeader('Content-Type', 'application/json; charset=utf-8')
  response.setHeader('Cache-Control', 'no-store')
  return response.json(payload)
}

function checkRateLimit(userId, now = Date.now()) {
  const current = requestWindows.get(userId)
  if (!current || now - current.startedAt >= RATE_WINDOW_MS) {
    requestWindows.set(userId, { startedAt: now, count: 1 })
    return true
  }
  if (current.count >= RATE_LIMIT) return false
  current.count += 1
  return true
}

function getBearerToken(request) {
  const authorization = String(request.headers.authorization || '')
  return authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : ''
}

async function loadTrainingContext(supabase, profileId) {
  const [profileResult, sessionsResult, plansResult] = await Promise.all([
    supabase.from('profiles').select('id,goal').eq('id', profileId).maybeSingle(),
    supabase.from('workout_sessions')
      .select('workout_code,workout_date,duration_minutes,total_volume,completion_percentage,workout_exercises(exercise_name,weight,sets,actual_reps,completed)')
      .eq('profile_id', profileId).is('archived_at', null)
      .order('workout_date', { ascending: false }).limit(30),
    supabase.from('workout_plans').select('workout_code,title,description').eq('profile_id', profileId)
      .eq('is_active', true).order('workout_code')
  ])

  const failure = [profileResult, sessionsResult, plansResult].find((result) => result.error)
  if (failure?.error) throw failure.error
  if (!profileResult.data) return null

  return buildAiContext({
    profile: profileResult.data,
    sessions: sessionsResult.data || [],
    plans: plansResult.data || []
  })
}

async function callGemini(prompt) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(MODEL)}:generateContent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': process.env.GEMINI_API_KEY
      },
      signal: controller.signal,
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: 'Você é o assistente de treino do RHC Training. Responda em português do Brasil, seja conservador, transparente e orientado pelos dados.' }]
        },
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.35,
          maxOutputTokens: 1800,
          responseMimeType: 'application/json',
          responseJsonSchema: aiResponseSchema
        }
      })
    })

    const payload = await response.json().catch(() => ({}))
    if (!response.ok) {
      const error = new Error('Falha ao consultar o Gemini.')
      error.status = response.status === 429 ? 429 : 502
      error.cause = payload?.error?.status || payload?.error?.message
      throw error
    }
    const text = payload?.candidates?.[0]?.content?.parts?.find((part) => part.text)?.text
    if (!text) throw new Error('O Gemini não retornou uma recomendação válida.')
    return JSON.parse(text)
  } finally {
    clearTimeout(timeout)
  }
}

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST')
    return json(response, 405, { error: 'Método não permitido.' })
  }
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY || !process.env.GEMINI_API_KEY) {
    return json(response, 503, { error: 'Módulo de IA ainda não configurado.' })
  }

  try {
    const token = getBearerToken(request)
    if (!token) return json(response, 401, { error: 'Sessão obrigatória.' })

    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false }
    })
    const { data: auth, error: authError } = await supabase.auth.getUser(token)
    if (authError || !auth.user) return json(response, 401, { error: 'Sessão inválida ou expirada.' })
    if (!checkRateLimit(auth.user.id)) return json(response, 429, { error: 'Limite de IA atingido. Tente novamente mais tarde.' })

    const input = normalizeAiRequest(request.body)
    const context = await loadTrainingContext(supabase, input.profileId)
    if (!context) return json(response, 404, { error: 'Perfil não encontrado ou sem permissão.' })

    const result = await callGemini(buildGeminiPrompt({ ...input, context }))
    return json(response, 200, { model: MODEL, generatedAt: new Date().toISOString(), result })
  } catch (error) {
    if (error?.name === 'AbortError') return json(response, 504, { error: 'O assistente demorou demais para responder.' })
    const status = Number(error?.status) || (String(error?.message).includes('inválid') ? 400 : 500)
    console.error('ai.training_failed', { status, message: error?.message, cause: error?.cause })
    return json(response, status, { error: status >= 500 ? 'Não foi possível gerar a recomendação agora.' : error.message })
  }
}
