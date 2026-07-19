import { supabase } from '../lib/supabaseClient'

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

export async function createFamilyGroup(name, adminEmail) {
  const { data, error } = await supabase.rpc('create_family_group', {
    p_name: name || 'Familia RHC',
    p_admin_email: adminEmail
  })
  if (error) throw error
  return data
}

export async function associateProfileEmail(profileId, email) {
  const { error } = await supabase.rpc('invite_profile_user', {
    p_profile_id: profileId,
    p_email: email
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
