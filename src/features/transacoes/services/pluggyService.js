import { supabase } from "../../../lib/supabaseClient";

async function extractErrorMessage(error) {
  if (error?.context?.json) {
    try {
      const body = await error.context.json();
      if (body?.error) return body.error;
    } catch {
      // response body wasn't JSON, fall through to the generic message
    }
  }

  return error?.message || "Não foi possível concluir a ação.";
}

const pluggyService = {
  async getConnectToken() {
    const { data, error } = await supabase.functions.invoke("pluggy-token");
    if (error) throw new Error(await extractErrorMessage(error));
    return data.connectToken;
  },

  async getAccounts(itemId) {
    const { data, error } = await supabase.functions.invoke(
      `pluggy-accounts?itemId=${encodeURIComponent(itemId)}`
    );
    if (error) throw new Error(await extractErrorMessage(error));
    return data.accounts;
  },
};

export default pluggyService;
