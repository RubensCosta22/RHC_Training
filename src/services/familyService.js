import { supabase } from '../lib/supabaseClient'

export async function claimFamilyProfile() {
  const { data, error } = await supabase.rpc('claim_family_profile')
  if (error && error.code !== 'PGRST202') throw error
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
  const [{ data: profiles, error: profileError }, { data: invitations, error: inviteError }] = await Promise.all([
    supabase.from('profiles').select('id,name,family_group_id').order('name'),
    supabase.from('family_invitations').select('profile_id,email,accepted_at').order('created_at')
  ])
  if (profileError) throw profileError
  if (inviteError) throw inviteError
  return (profiles || []).map((profile) => ({
    ...profile,
    invitation: (invitations || []).find((item) => item.profile_id === profile.id) || null
  }))
}
