import { supabase } from '../lib/supabaseClient'
import { clearPreferenceStorage } from '../utils/preferenceStorage'
import { clearWorkoutStorage } from '../utils/storage'
import { clearPasswordRecovery } from '../utils/authRecovery'

export async function secureSignOut() {
  try {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  } finally {
    clearWorkoutStorage()
    clearPreferenceStorage()
    clearPasswordRecovery()
  }
}
