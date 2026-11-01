import { createLinkTelegramHandler } from "./handler.ts";
import { TelegramIdentity, verifyTelegramInitData } from "./verify.ts";

const BOT_TOKEN = "test-bot-token";
const FUNCTION_ROOT = "https://functions.example/";
const encoder = new TextEncoder();

function equal(actual: unknown, expected: unknown) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

async function signedData(fields: Record<string, string> = {}) {
  const values = { auth_date: String(Math.floor(Date.now() / 1000)), user: JSON.stringify({ id: 4242, username: "alice", first_name: "Alice" }), ...fields };
  const check = Object.entries(values).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([key, value]) => `${key}=${value}`).join("\n");
  async function hmac(key: ArrayBuffer, data: string) {
    const imported = await crypto.subtle.importKey("raw", key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    return await crypto.subtle.sign("HMAC", imported, encoder.encode(data));
  }
  const secret = await hmac(encoder.encode("WebAppData").buffer, BOT_TOKEN);
  const hash = Array.from(new Uint8Array(await hmac(secret, check)), (value) => value.toString(16).padStart(2, "0")).join("");
  return new URLSearchParams({ ...values, hash }).toString();
}

async function rejects(data: string, token = BOT_TOKEN) {
  let didReject = false;
  try {
    await verifyTelegramInitData(data, token);
  } catch {
    didReject = true;
  }
  equal(didReject, true);
}

function request(initData: string, token = "supabase-session") {
  return new Request("https://functions.example/link-telegram", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ initData, user_id: "attacker-controlled-user", provider_id: "forged-id" }),
  });
}

function handler(saveIdentity: (userId: string, identity: TelegramIdentity) => Promise<{ code: string } | null>) {
  return createLinkTelegramHandler({
    botToken: BOT_TOKEN,
    authenticate(token) {
      return Promise.resolve(token === "supabase-session" ? { id: "canonical-user", identities: [{ provider: "github" }] } : null);
    },
    saveIdentity,
  });
}

Deno.test("Telegram HMAC matches an independently generated fixed fixture", async () => {
  const data = new URLSearchParams({
    auth_date: "1700000000",
    user: '{"id":4242,"username":"alice"}',
    hash: "08e850a0303f7bfe048a8990b6d13e5c4178d4082f9b4c8d9fbb42a55db06132",
  });
  const identity = await verifyTelegramInitData(data.toString(), BOT_TOKEN, 1700000000000);
  equal(identity.providerId, "4242");
});

Deno.test("valid Telegram launch data extracts only signed, allowlisted identity fields", async () => {
  const data = await signedData({ query_id: "a=b & encoded", user: JSON.stringify({ id: 4242, username: "alice", first_name: "Alice", unknown: "discard" }) });
  const identity = await verifyTelegramInitData(data, BOT_TOKEN);
  equal(identity.providerId, "4242");
  equal(identity.identityData.id, 4242);
  equal(identity.identityData.username, "alice");
  equal(identity.identityData.unknown, undefined);
});

Deno.test("tampered signatures, wrong bots, duplicate fields, and unsafe unsigned data are rejected", async () => {
  const data = await signedData();
  await rejects(data.replace("alice", "mallory"));
  await rejects(data, "different-test-bot");
  await rejects(`${data}&auth_date=1`);
  await rejects("user=%7B%22id%22%3A4242%7D");
  await rejects("x".repeat(16385));
});

Deno.test("stale, future-dated, malformed timestamps and invalid signed user IDs are rejected", async () => {
  for (const auth_date of [String(Math.floor(Date.now() / 1000) - 601), String(Math.floor(Date.now() / 1000) + 60), "not-a-time", "0"]) {
    await rejects(await signedData({ auth_date }));
  }
  for (const user of ["null", "not-json", '{"id":"4242"}', '{"id":-1}', '{"id":1.5}']) {
    await rejects(await signedData({ user }));
  }
});

Deno.test("authenticated linking uses the verified session's user ID and Telegram's signed ID", async () => {
  const saved: { userId: string; identity: TelegramIdentity }[] = [];
  const serve = handler((userId, identity) => {
    saved.push({ userId, identity });
    return Promise.resolve(null);
  });
  const response = await serve(request(await signedData()));
  equal(response.status, 200);
  equal(saved.length, 1);
  equal(saved[0].userId, "canonical-user");
  equal(saved[0].identity.providerId, "4242");
  equal(await response.json(), { provider: "telegram", provider_id: "4242" });
});

Deno.test("invalid sessions and forged Telegram data never write identity links", async () => {
  let writes = 0;
  const serve = handler(() => {
    writes++;
    return Promise.resolve(null);
  });
  equal((await serve(request(await signedData(), "invalid-session"))).status, 401);
  equal((await serve(new Request(FUNCTION_ROOT, { method: "POST" }))).status, 401);
  equal((await serve(request("forged-data"))).status, 400);
  equal(
    (await serve(new Request(FUNCTION_ROOT, { method: "POST", headers: { Authorization: "Bearer supabase-session" }, body: "invalid-json" })))
      .status,
    400,
  );
  equal(writes, 0);
});

Deno.test("linking requires an existing GitHub identity", async () => {
  let writes = 0;
  const serve = createLinkTelegramHandler({
    botToken: BOT_TOKEN,
    authenticate() {
      return Promise.resolve({ id: "google-only-user", identities: [{ provider: "google" }] });
    },
    saveIdentity() {
      writes++;
      return Promise.resolve(null);
    },
  });
  equal((await serve(request(await signedData()))).status, 403);
  equal(writes, 0);
});

Deno.test("identity conflicts and storage errors are returned without leaking database details", async () => {
  const data = await signedData();
  equal((await handler(() => Promise.resolve({ code: "23505" }))(request(data))).status, 409);
  equal((await handler(() => Promise.resolve({ code: "unexpected-error" }))(request(data))).status, 500);
  const response = await handler(() => Promise.reject(new Error("private database details")))(request(data));
  equal(response.status, 500);
  equal(await response.json(), { error: "Unable to link Telegram" });
});

Deno.test("CORS preflight works without auth and unsupported methods cannot write", async () => {
  const serve = handler(() => Promise.reject(new Error("must not write")));
  const response = await serve(new Request(FUNCTION_ROOT, { method: "OPTIONS" }));
  equal(response.status, 204);
  equal(response.headers.get("Access-Control-Allow-Origin"), "*");
  equal((await serve(new Request(FUNCTION_ROOT))).status, 405);
});
