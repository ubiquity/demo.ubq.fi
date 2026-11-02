const MAX_AGE_SECONDS = 600;
const encoder = new TextEncoder();

export interface TelegramIdentity {
  providerId: string;
  identityData: { id: number; auth_date: number; [key: string]: string | number };
}

/** Validate raw Mini App initData on the server; never trust initDataUnsafe. */
export async function verifyTelegramInitData(initData: string, botToken: string, now = Date.now()): Promise<TelegramIdentity> {
  if (!initData || initData.length > 16384 || !botToken) throw new Error("Invalid Telegram launch data");
  const params = new URLSearchParams(initData);
  const keys = Array.from(params.keys());
  if (new Set(keys).size !== keys.length) throw new Error("Duplicate Telegram fields");
  const hash = params.get("hash") || "";
  if (!/^[a-fA-F0-9]{64}$/.test(hash)) throw new Error("Invalid Telegram signature");
  const authDateText = params.get("auth_date") || "";
  const authDate = Number(authDateText);
  const age = now / 1000 - authDate;
  if (!/^\d+$/.test(authDateText) || !Number.isSafeInteger(authDate) || authDate <= 0 || age > MAX_AGE_SECONDS || age < -30) {
    throw new Error("Expired Telegram launch data; reopen the Mini App");
  }

  params.delete("hash");
  const checkString = Array.from(params.keys()).sort().map((key) => `${key}=${params.get(key)}`).join("\n");
  const hmac = { name: "HMAC", hash: "SHA-256" };
  const webAppKey = await crypto.subtle.importKey("raw", encoder.encode("WebAppData"), hmac, false, ["sign"]);
  const secret = await crypto.subtle.sign("HMAC", webAppKey, encoder.encode(botToken));
  const secretKey = await crypto.subtle.importKey("raw", secret, hmac, false, ["verify"]);
  const signature = Uint8Array.from(hash.match(/.{2}/g) || [], (byte) => parseInt(byte, 16));
  if (!await crypto.subtle.verify("HMAC", secretKey, signature, encoder.encode(checkString))) throw new Error("Invalid Telegram signature");

  const user = JSON.parse(params.get("user") || "null");
  if (!user || !Number.isSafeInteger(user.id) || user.id <= 0) throw new Error("Invalid Telegram user");
  const identityData: TelegramIdentity["identityData"] = { id: user.id, auth_date: authDate };
  for (const key of ["username", "first_name", "last_name", "photo_url"]) {
    if (typeof user[key] === "string") identityData[key] = user[key];
  }
  return { providerId: String(user.id), identityData };
}
