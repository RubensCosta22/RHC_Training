import { getFamilyContext } from './familyService'
import { getProfilesWithLastWorkout } from './profileService'
import { getStatsCenter } from './statsService'

export { buildAdminStatsSnapshot } from './adminStatsSnapshot'

export async function getAdminStatsCenter() {
  const context = await getFamilyContext()
  if (context?.role !== 'admin') throw new Error('Acesso administrativo necessario.')

  const profiles = await getProfilesWithLastWorkout()
  const entries = await Promise.all(profiles.map(async (profile) => ({
    profile,
    stats: await getStatsCenter(profile.id)
  })))

  return entries
}
