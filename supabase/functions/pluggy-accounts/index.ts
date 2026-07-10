const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const itemId = url.searchParams.get("itemId");

    if (!itemId) {
      return new Response(
        JSON.stringify({ error: "itemId é obrigatório" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const clientId = Deno.env.get("PLUGGY_CLIENT_ID");
    const clientSecret = Deno.env.get("PLUGGY_CLIENT_SECRET");

    if (!clientId || !clientSecret) {
      return new Response(
        JSON.stringify({ error: "PLUGGY_CLIENT_ID ou PLUGGY_CLIENT_SECRET não configurados" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const authRes = await fetch("https://api.pluggy.ai/auth", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        clientId,
        clientSecret,
      }),
    });

    if (!authRes.ok) {
      const authError = await authRes.text();
      return new Response(
        JSON.stringify({ error: "Erro ao autenticar na Pluggy", details: authError }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const authData = await authRes.json();
    const apiKey = authData.apiKey;

    const accountsRes = await fetch(`https://api.pluggy.ai/accounts?itemId=${itemId}`, {
      method: "GET",
      headers: {
        "X-API-KEY": apiKey,
        "Content-Type": "application/json",
      },
    });

    if (!accountsRes.ok) {
      const accountsError = await accountsRes.text();
      return new Response(
        JSON.stringify({ error: "Erro ao buscar contas na Pluggy", details: accountsError }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const accountsData = await accountsRes.json();

    return new Response(
      JSON.stringify({
        accounts: accountsData.results || [],
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: "Erro interno na função",
        details: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
