import { supabase } from '../lib/supabaseClient'

export async function logEvent(eventName, eventData = {}, profileId = null) {
  try {
    const { error } = await supabase.rpc('log_app_event', {
      p_event_name: eventName,
      p_event_data: eventData,
      p_profile_id: profileId,
      p_page: window.location.pathname
    })

    if (error) throw error
  } catch (error) {
    console.warn('Erro ao registrar telemetria:', error)
  }
}
