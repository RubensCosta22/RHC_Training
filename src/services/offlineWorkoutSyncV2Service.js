import { logger, createRequestId } from '../lib/observability/logger'
import { getPendingWorkouts, replacePendingWorkouts } from '../utils/storage'
import { saveWorkoutSessionV2 } from './workoutCompletionV2Service'
import { buildProgramExposurePayloads } from './programExecutionService'
import { supabase } from '../lib/supabaseClient'

let pendingSyncPromise = null

async function runPendingWorkoutSyncV2() {
  const requestId = createRequestId()
  const pending = getPendingWorkouts()
  if (!pending.length || !navigator.onLine) return { synced: 0, remaining: pending.length }

  const { data, error } = await supabase.auth.getUser()
  if (error) throw error
  const userId = data.user?.id
  if (!userId) return { synced: 0, remaining: pending.length }

  const remaining = []
  let synced = 0

  for (const item of pending) {
    if (item.ownerUserId !== userId) {
      remaining.push(item)
      continue
    }

    try {
      const { ownerUserId: _ownerUserId, offlineId: _offlineId, ...payload } = item
      const programExposures = Array.isArray(payload.programExposures)
        ? payload.programExposures
        : await buildProgramExposurePayloads({
            profileId: payload.profileId,
            exercises: payload.exercises || []
          })
      await saveWorkoutSessionV2({ ...payload, programExposures })
      synced += 1
    } catch (syncError) {
      logger.warn('offline_sync_v2.item_failed', {
        requestId,
        userId,
        profileId: item.profileId,
        draftId: item.draftId,
        offlineId: item.offlineId,
        error: syncError
      })
      remaining.push(item)
    }
  }

  // Do not overwrite workouts queued while the network requests were in flight.
  replacePendingWorkouts(remaining, pending.map((item) => item.offlineId))
  const remainingCount = getPendingWorkouts().length
  logger.info('offline_sync_v2.completed', {
    requestId,
    userId,
    pendingCount: pending.length,
    synced,
    remaining: remainingCount
  })
  return { synced, remaining: remainingCount }
}

export function syncPendingWorkoutsV2() {
  if (pendingSyncPromise) return pendingSyncPromise
  pendingSyncPromise = runPendingWorkoutSyncV2().finally(() => { pendingSyncPromise = null })
  return pendingSyncPromise
}
