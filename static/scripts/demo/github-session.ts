interface GitHubSession {
  access_token: string;
  provider_token?: string | null;
  user: {
    id: string;
    app_metadata: { provider?: string };
    identities?: { provider: string }[];
  };
}

const TOKEN_KEY = "github-provider-token";

/** Google linking replaces Supabase's provider_token, but not our GitHub token. */
export function getGitHubToken(session: GitHubSession | null, callbackUrl: URL, storage: Pick<Storage, "getItem" | "setItem" | "removeItem">) {
  if (!session) {
    storage.removeItem(TOKEN_KEY);
    return null;
  }

  let cached: { userId?: string; token?: string } | null = null;
  try {
    cached = JSON.parse(storage.getItem(TOKEN_KEY) || "null");
  } catch {
    storage.removeItem(TOKEN_KEY);
  }
  const cachedToken = cached?.userId === session.user.id && typeof cached.token === "string" ? cached.token : null;
  if (!cachedToken) storage.removeItem(TOKEN_KEY);

  const params = new URLSearchParams(callbackUrl.hash.substring(1));
  const provider = callbackUrl.searchParams.get("auth_provider");
  const isGitHubCallback = provider === "github" && params.get("access_token") === session.access_token &&
    session.user.identities?.some((identity) => identity.provider === "github");
  const isLegacyGitHubSession = provider !== "google" && session.user.app_metadata.provider === "github" &&
    !session.user.identities?.some((identity) => identity.provider !== "github");

  if (!params.has("error") && session.provider_token && (isGitHubCallback || isLegacyGitHubSession)) {
    storage.setItem(TOKEN_KEY, JSON.stringify({ userId: session.user.id, token: session.provider_token }));
    return session.provider_token;
  }
  return cachedToken;
}
