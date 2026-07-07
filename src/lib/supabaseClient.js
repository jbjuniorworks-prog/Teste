import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("As variáveis REACT_APP_SUPABASE_URL e REACT_APP_SUPABASE_ANON_KEY não foram definidas.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);