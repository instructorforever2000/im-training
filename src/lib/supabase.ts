import { createClient } from "@supabase/supabase-js"

// Shared parent project "instructor-motion". Both values are public by design (publishable key,
// protected by row-level security). Override with VITE_SUPABASE_URL / VITE_SUPABASE_KEY if needed.
const URL = import.meta.env.VITE_SUPABASE_URL ?? "https://ixqrqblwodvnkruqxbqh.supabase.co"
const KEY = import.meta.env.VITE_SUPABASE_KEY ?? "sb_publishable_cgFe_hPffkg3v4iVBTI-vQ_oICmO7le"

/** Every permission in the parent project is per platform; this app is the "training" platform. */
export const PLATFORM_ID = "training"

export const supabase = createClient(URL, KEY, {
  auth: { flowType: "pkce", persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
})

/** Where Supabase sends the person back after Google / email-link sign-in. */
export const appUrl = (): string => `${window.location.origin}${import.meta.env.BASE_URL}`
