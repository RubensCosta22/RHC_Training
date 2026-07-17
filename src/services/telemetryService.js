import { supabase } from "../lib/supabaseClient";

export async function logEvent(eventName, eventData = {}, profileId = null) {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { error } = await supabase.from("event_logs").insert({
      user_id: user.id,
      profile_id: profileId,
      event_name: eventName,
      event_data: eventData,
      page: window.location.pathname,
    });

    if (error) throw error;
  } catch (error) {
    console.warn("Erro ao registrar telemetria:", error);
  }
}
