import { supabase } from '../lib/supabaseClient'

// V2 compatibility facade. The UI still imports familyService while the V2
// database intentionally has no families/family_members model.
export async function claimFamilyProfile() {
  return 0
}

export async function getFamilyContext() {
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError) throw userError
  const userId = userData.user?.id
  if (!userId) return null

  const { data: appUser, error: appUserError } = await supabase
    .from('app_users')
    .select('user_id,role,status')
    .eq('user_id', userId)
    .maybeSingle()

  if (appUserError) throw appUserError
  if (!appUser || appUser.status !== 'active') return null

  if (appUser.role === 'admin') {
    return {
      role: 'admin',
      status: appUser.status,
      user_id: appUser.user_id,
      group_id: null,
      family_group_id: null
    }
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

// Family groups do not exist in V2. Keep explicit failures until the admin UI
// is migrated to the V2 user/profile administration RPCs.
export async function createFamilyGroup() {
  throw new Error('Grupos familiares foram removidos no banco V2.')
}

export async function associateProfileEmail() {
  throw new Error('A associacao de usuarios deve ser feita pelo administrador no fluxo V2.')
}

export async function listProfileAssociations() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id,name,is_active,created_at')
    .order('name')

  if (error) throw error
  return (data || []).map((profile) => ({
    ...profile,
    invitation: null,
    invitation_email: null,
    invitation_accepted_at: null
  }))
}
