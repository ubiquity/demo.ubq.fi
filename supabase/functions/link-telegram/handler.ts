import { TelegramIdentity, verifyTelegramInitData } from "./verify.ts";

interface Dependencies {
  botToken: string;
  authenticate: (token: string) => Promise<{ id: string; identities?: { provider: string }[] } | null>;
  saveIdentity: (userId: string, identity: TelegramIdentity) => Promise<{ code: string } | null>;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export function createLinkTelegramHandler(deps: Dependencies) {
  return async function handleRequest(request: Request): Promise<Response> {
    function reply(status: number, body: Record<string, unknown>) {
      return Response.json(body, { status, headers: corsHeaders });
    }
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
    if (request.method !== "POST") return reply(405, { error: "Method not allowed" });
    const token = request.headers.get("Authorization")?.match(/^Bearer (\S+)$/i)?.[1];
    if (!token) return reply(401, { error: "Authentication required" });

    try {
      const user = await deps.authenticate(token);
      if (!user) return reply(401, { error: "Invalid session" });
      if (!user.identities?.some((identity) => identity.provider === "github")) return reply(403, { error: "Sign in with GitHub first" });

      let identity: TelegramIdentity;
      try {
        const body = await request.json();
        if (typeof body?.initData !== "string") throw new Error("Missing launch data");
        identity = await verifyTelegramInitData(body.initData, deps.botToken);
      } catch {
        return reply(400, { error: "Invalid or expired Telegram launch data" });
      }

      // user_id comes exclusively from the verified Supabase session, never the body.
      const error = await deps.saveIdentity(user.id, identity);
      if (error?.code === "23505") return reply(409, { error: "Telegram account is already linked to another user" });
      if (error) return reply(500, { error: "Unable to save identity" });
      return reply(200, { provider: "telegram", provider_id: identity.providerId });
    } catch {
      return reply(500, { error: "Unable to link Telegram" });
    }
  };
}
