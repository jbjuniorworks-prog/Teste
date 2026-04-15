import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://eroemwteqyuwccpafdtl.supabase.co' 
// Use a chave que começa com eyJ que você configurou
const supabaseAnonKey = 'sb_publishable_LDUQUNhcC4D21BNQdnFSdw__qwYuzxw'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)