import { supabase } from '../lib/supabaseClient'
import { normalizeEmail, validateUuid } from '../utils/validation'

export async function claimFamilyProfile() {
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError) throw userError
  const user = userData.user
  if (!user?.id || !user.email) return 0

  const email = normalizeEmail(user.email)
  const { data: invitation, error: invitationError } = await supabase
    .from('profile_invitations')
    .select('id,profile_id,email,status')
    .eq('email', email)
    .eq('status', 'pending')
    .maybeSingle()

  if (invitationError) throw invitationError
  if (!invitation) return 0

  const { data: existingAppUser, error: appUserReadError } = await supabase
    .from('app_users')
    .select('user_id,role,status')
    .eq('user_id', user.id)
    .maybeSingle()
  if (appUserReadError) throw appUserReadError

  if (!existingAppUser) {
    const { error: appUserInsertError } = await supabase
      .from('app_users')
      .insert({ user_id: user.id, role: 'user', status: 'active' })
    if (appUserInsertError && appUserInsertError.code !== '23505') throw appUserInsertError
  }

  const { error: accessError } = await supabase
    .from('profile_access')
    .insert({ user_id: user.id, profile_id: invitation.profile_id })
  if (accessError && accessError.code !== '23505') throw accessError

  const { error: claimError } = await supabase
    .from('profile_invitations')
    .update({ status: 'claimed', claimed_by: user.id, claimed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', invitation.id)
    .eq('status', 'pending')
  if (claimError) throw claimError

  return 1
}

export async function getFamilyContext() {
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError) throw userError
  const userId = userData.user?.id
  if (!userId) return null

  await claimFamilyProfile()

  const { data: appUser, error: appUserError } = await supabase
    .from('app_users')
    .select('user_id,role,status')
    .eq('user_id', userId)
    .maybeSingle()

  if (appUserError) throw appUserError
  if (!appUser || appUser.status !== 'active') return null

  if (appUser.role === 'admin') {
    return { role: 'admin', status: appUser.status, user_id: appUser.user_id, group_id: null, family_group_id: null }
  }

  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('id,name')
    .order('id')
    .limit(2)
  if (profileError) throw profileError

  return {
    role: 'member',
    status: appUser.status,
    user_id: appUser.user_id,
    profile_id: profiles?.length === 1 ? profiles[0].id : null,
    group_id: null,
    family_group_id: null
  }
}

export async function getPostLoginPath() {
  const context = await getFamilyContext()
  if (context?.role === 'admin') return '/admin'

  const { data, error } = await supabase.from('profiles').select('id,name').order('name').limit(2)
  if (error) throw error
  const profiles = data || []
  if (profiles.length === 1) return `/dashboard/${profiles[0].id}`
  if (profiles.length === 0) throw new Error('Nenhum perfil foi associado a esta conta. Entre em contato com o administrador.')
  throw new Error('Mais de um perfil foi associado a esta conta. O acesso foi bloqueado por seguranca; entre em contato com o administrador.')
}

export async function createFamilyGroup() {
  throw new Error('Grupos familiares foram removidos no banco V2.')
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
