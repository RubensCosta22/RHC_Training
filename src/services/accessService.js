import { supabase } from '../lib/supabaseClient'
import { normalizeEmail, validateUuid } from '../utils/validation'

export async function claimProfileInvitation() {
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError) throw userError
  const user = userData.user
  if (!user?.id || !user.email) return 0

  const { data, error } = await supabase.rpc('claim_profile_invitation')
  if (error) throw error
  return data ? 1 : 0
}

export async function getAccessContext() {
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError) throw userError
  const userId = userData.user?.id
  if (!userId) return null

  await claimProfileInvitation()

  const { data: appUser, error: appUserError } = await supabase
    .from('app_users')
    .select('user_id,role,status')
    .eq('user_id', userId)
    .maybeSingle()

  if (appUserError) throw appUserError
  if (!appUser || appUser.status !== 'active') return null

  if (appUser.role === 'admin') {
    return { role: 'admin', status: appUser.status, user_id: appUser.user_id }
  }

  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('id,name')
    .order('id')
    .limit(2)
  if (profileError) throw profileError

  return {
    role: 'user',
    status: appUser.status,
    user_id: appUser.user_id,
    profile_id: profiles?.length === 1 ? profiles[0].id : null
  }
}

export async function getPostLoginPath() {
  const context = await getAccessContext()
  if (context?.role === 'admin') return '/admin'

  const { data, error } = await supabase.from('profiles').select('id,name').order('name').limit(2)
  if (error) throw error
  const profiles = data || []
  if (profiles.length === 1) return `/dashboard/${profiles[0].id}`
  if (profiles.length === 0) throw new Error('Nenhum perfil foi associado a esta conta. Entre em contato com o administrador.')
  throw new Error('Mais de um perfil foi associado a esta conta. O acesso foi bloqueado por segurança; entre em contato com o administrador.')
}

export async function associateProfileEmail(profileId, email) {
  const cleanProfileId = validateUuid(profileId, 'Perfil')
  const cleanEmail = normalizeEmail(email)
  const { data, error } = await supabase
    .from('profile_invitations')
    .upsert({ profile_id: cleanProfileId, email: cleanEmail, status: 'pending', claimed_by: null, claimed_at: null, updated_at: new Date().toISOString() }, { onConflict: 'profile_id' })
    .select('*')
    .single()
  if (error) throw error
  return data
}

export async function listProfileAssociations() {
  const { data: profiles, error: profileError } = await supabase.from('profiles').select('id,name,is_active,created_at').order('name')
  if (profileError) throw profileError
  const profileIds = (profiles || []).map((profile) => profile.id)
  const { data: invites, error: invitesError } = profileIds.length
    ? await supabase.from('profile_invitations').select('*').in('profile_id', profileIds)
    : { data: [], error: null }
  if (invitesError) throw invitesError
  const inviteByProfile = new Map((invites || []).map((invite) => [invite.profile_id, invite]))
  return (profiles || []).map((profile) => {
    const invitation = inviteByProfile.get(profile.id) || null
    return {
      ...profile,
      invitation,
      invitation_email: invitation?.email || null,
      invitation_accepted_at: invitation?.claimed_at || null
    }
  })
}
