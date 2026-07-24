import { supabase } from '../lib/supabaseClient'
import { logger, createRequestId } from '../lib/observability/logger'

export async function logEvent(eventName, eventData = {}, profileId = null) {
  const requestId = createRequestId()

  try {
    const { error } = await supabase.rpc('log_app_event', {
      p_event_name: eventName,
      p_event_data: eventData,
      p_profile_id: profileId,
      p_page: window.location.pathname
    })

    if (error) throw error
  } catch (error) {
    logger.warn('telemetry.delivery_failed', {
      requestId,
      action: eventName,
      profileId,
      error
    })
  }
}
