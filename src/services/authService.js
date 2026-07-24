import { supabase } from '../lib/supabaseClient'
import { clearPreferenceStorage } from '../utils/preferenceStorage'
import { clearSelectedProfile } from '../utils/storage'
import { clearPasswordRecovery } from '../utils/authRecovery'

export async function secureSignOut() {
  try {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  } finally {
    // Treinos offline pendentes permanecem no dispositivo e continuam vinculados ao
    // ownerUserId. Isso evita perda de dados no logout sem permitir sincronização
    // por outra conta.
    clearSelectedProfile()
    clearPreferenceStorage()
    clearPasswordRecovery()
  }
}
