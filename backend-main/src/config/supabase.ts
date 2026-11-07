import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { env } from "./env.js";

const serverAuthOptions = {
  persistSession: false,
  autoRefreshToken: false,
  detectSessionInUrl: false,
} as const;

export function createPublicSupabaseClient(): SupabaseClient {
  return createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    auth: serverAuthOptions,
  });
}

export function createAdminSupabaseClient(): SupabaseClient {
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: serverAuthOptions,
  });
}
