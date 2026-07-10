import { supabase } from "../../../lib/supabaseClient";

const authService = {
  async signIn({ email, password }) {
    return supabase.auth.signInWithPassword({ email, password });
  },

  async signUp({ email, password }) {
    return supabase.auth.signUp({ email, password });
  },

  async signOut() {
    return supabase.auth.signOut();
  },

  async resetPassword({ email }) {
    return supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login`,
    });
  },

  async getSession() {
    return supabase.auth.getSession();
  },

  onAuthStateChange(callback) {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(callback);

    return () => subscription.unsubscribe();
  },
};

export default authService;
