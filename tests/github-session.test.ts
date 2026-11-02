import { getGitHubToken } from "../static/scripts/demo/github-session.ts";

const GITHUB_TOKEN = "github-token";
const GOOGLE_TOKEN = "google-token";
const TOKEN_KEY = "github-provider-token";

function equal(actual: unknown, expected: unknown) {
  if (actual !== expected) throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

function storage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
    removeItem: (key: string) => {
      values.delete(key);
    },
  };
}

function session(providerToken = GITHUB_TOKEN, providers = ["github"], userId = "user-1") {
  return {
    access_token: "supabase-session",
    provider_token: providerToken,
    user: { id: userId, app_metadata: { provider: "github" }, identities: providers.map((provider) => ({ provider })) },
  };
}

const page = new URL("https://demo.example/");

Deno.test("existing GitHub sessions use the configured Supabase session, not a hardcoded storage key", () => {
  const cache = storage();
  equal(getGitHubToken(session(), page, cache), GITHUB_TOKEN);
  equal(cache.getItem(TOKEN_KEY), JSON.stringify({ userId: "user-1", token: GITHUB_TOKEN }));
});

Deno.test("Google callback and later reload retain the GitHub token, not Google's provider token", () => {
  const cache = storage();
  getGitHubToken(session(), page, cache);
  const google = session(GOOGLE_TOKEN, ["github", "google"]);
  equal(getGitHubToken(google, new URL("https://demo.example/?auth_provider=google#access_token=supabase-session"), cache), GITHUB_TOKEN);
  equal(getGitHubToken(google, page, cache), GITHUB_TOKEN);
});

Deno.test("Google-only tokens and unknown linked-provider tokens never reach GitHub", () => {
  equal(getGitHubToken(session(GOOGLE_TOKEN, ["github", "google"]), page, storage()), null);
  equal(getGitHubToken(session("other-token", ["github", "discord"]), page, storage()), null);
  equal(getGitHubToken(session(GOOGLE_TOKEN), new URL("https://demo.example/?auth_provider=google"), storage()), null);
  const google = session(GOOGLE_TOKEN, ["google"]);
  google.user.app_metadata.provider = "google";
  equal(getGitHubToken(google, page, storage()), null);
});

Deno.test("explicit GitHub reauthentication refreshes the cached token after Google linking", () => {
  const cache = storage();
  const github = session("fresh-github-token", ["github", "google"]);
  equal(getGitHubToken(github, new URL("https://demo.example/?auth_provider=github#access_token=supabase-session"), cache), "fresh-github-token");
  equal(getGitHubToken(github, page, cache), "fresh-github-token");
});

Deno.test("failed callbacks and mismatched sessions cannot overwrite the GitHub token", () => {
  const cache = storage();
  getGitHubToken(session(), page, cache);
  const linked = session("other-provider-token", ["github", "google"]);
  equal(getGitHubToken(linked, new URL("https://demo.example/?auth_provider=github#error=access_denied"), cache), GITHUB_TOKEN);
  equal(getGitHubToken(linked, new URL("https://demo.example/?auth_provider=github#access_token=another-session"), cache), GITHUB_TOKEN);
});

Deno.test("cached tokens are cleared on logout and never reused for another Supabase user", () => {
  const cache = storage();
  getGitHubToken(session(), page, cache);
  equal(getGitHubToken(session(GOOGLE_TOKEN, ["github", "google"], "user-2"), page, cache), null);
  equal(cache.getItem(TOKEN_KEY), null);
  getGitHubToken(session(), page, cache);
  equal(getGitHubToken(null, page, cache), null);
  equal(cache.getItem(TOKEN_KEY), null);
});

Deno.test("malformed cached tokens do not prevent recovery through GitHub", () => {
  const cache = storage();
  cache.setItem(TOKEN_KEY, "invalid JSON");
  equal(getGitHubToken(session(), page, cache), GITHUB_TOKEN);
});
