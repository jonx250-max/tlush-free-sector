import { createClient } from '@supabase/supabase-js'
import { appConfig } from './appConfig.js'

export const supabase = appConfig.requiresSupabaseConfiguration
  ? null
  : createClient(appConfig.supabaseUrl, appConfig.supabaseAnonKey)
