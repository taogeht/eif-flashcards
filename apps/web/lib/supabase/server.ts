import 'server-only'

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL) {
  throw new Error('SUPABASE_URL is not set. Please add it to your environment configuration.')
}

if (!SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set. Please add it to your environment configuration.')
}

export const supabaseServerClient = () =>
  createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false
    }
  })

export type SupabaseServerClient = ReturnType<typeof supabaseServerClient>
