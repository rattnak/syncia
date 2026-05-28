import { createClient as _createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../config.js'

export function createClient() {
  return _createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      // Use chrome.storage.local instead of localStorage in the extension
      storage: {
        getItem: (key) => new Promise((resolve) => chrome.storage.local.get(key, (r) => resolve(r[key] ?? null))),
        setItem: (key, value) => chrome.storage.local.set({ [key]: value }),
        removeItem: (key) => chrome.storage.local.remove(key),
      },
      persistSession: true,
      detectSessionInUrl: false,
    },
  })
}
