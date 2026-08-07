import { supabase } from '../lib/supabaseClient'
import { normalizeEmail, sanitizeText, validateUuid } from '../utils/validation'

export async function claimFamilyProfile() {
  const { data, error } = await supabase.rpc('claim_family_profile')
  if (error && error.code !== 'PGRST202') throw error
  const { error: normalizeError } = await supabase.rpc('normalize_my_family_access')
  if (normalizeError && normalizeError.code !== 'PGRST202') throw normalizeError
  return Number(data || 0)
}

export async function getFamilyContext() {
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError) throw userError
  const userId = userData.user?.id
  if (!userId) return null

  await claimFamilyProfile()

  const { data, error } = await supabase.rpc('get_my_family_context')

  if (error) throw error
  return data || null
}

export async function getPostLoginPath() {
  const context = await getFamilyContext()
  if (context?.role === 'admin') return '/admin'

  // Fail closed: uma conta familiar comum deve possuir exatamente um perfil
  // acessivel. Nunca escolha silenciosamente o primeiro perfil retornado pelo RLS.
  const { data, error } = await supabase
    .from('profiles')
    .select('id,name')
    .order('name')
    .limit(2)

  if (error) throw error

  const profiles = data || []
  if (profiles.length === 1) return `/dashboard/${profiles[0].id}`

  if (profiles.length === 0) {
    throw new Error('Nenhum perfil foi associado a esta conta. Entre em contato com o administrador.')
  }

  throw new Error('Mais de um perfil foi associado a esta conta. O acesso foi bloqueado por seguranca; entre em contato com o administrador.')
}

export async function createFamilyGroup(name, adminEmail) {
  const cleanName = sanitizeText(name || 'Familia RHC', 80) || 'Familia RHC'
  const cleanAdminEmail = normalizeEmail(adminEmail)
  const { data, error } = await supabase.rpc('create_family_group', {
    p_name: cleanName,
    p_admin_email: cleanAdminEmail
  })
  if (error) throw error
  return data
}

export async function associateProfileEmail(profileId, email) {
  const cleanProfileId = validateUuid(profileId, 'Perfil')
  const cleanEmail = normalizeEmail(email)
  const { error } = await supabase.rpc('invite_profile_user', {
    p_profile_id: cleanProfileId,
    p_email: cleanEmail
  })
  if (error) throw error
}

export async function listProfileAssociations() {
  const { data, error } = await supabase.rpc('get_family_profile_associations')
  if (error) throw error
  return (data || []).map((profile) => ({
    ...profile,
    invitation: profile.invitation_email ? {
      email: profile.invitation_email,
      accepted_at: profile.invitation_accepted_at
    } : null
  }))
}
