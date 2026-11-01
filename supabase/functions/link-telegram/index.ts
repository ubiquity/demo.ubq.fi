import { createClient } from "npm:@supabase/supabase-js@2.39.7";
import { createLinkTelegramHandler } from "./handler.ts";

function requiredEnv(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

const url = requiredEnv("SUPABASE_URL");
const options = { auth: { persistSession: false, autoRefreshToken: false } };
const authClient = createClient(url, requiredEnv("SUPABASE_ANON_KEY"), options);
const admin = createClient(url, requiredEnv("SUPABASE_SERVICE_ROLE_KEY"), options);

Deno.serve(createLinkTelegramHandler({
  botToken: requiredEnv("TELEGRAM_BOT_TOKEN"),
  async authenticate(token) {
    const { data, error } = await authClient.auth.getUser(token);
    return error ? null : data.user;
  },
  async saveIdentity(userId, identity) {
    const { error } = await admin.from("user_identities").upsert({
      user_id: userId,
      provider: "telegram",
      provider_id: identity.providerId,
      identity_data: identity.identityData,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id,provider" });
    return error;
  },
}));
