import { supabase } from "./auth-context";

declare global {
  interface Window {
    Telegram?: { WebApp?: { initData: string } };
  }
}

const TELEGRAM_DATA_KEY = "telegram-init-data";

export async function initializeUnifiedAuth() {
  // Preserve the signed launch data across the GitHub OAuth redirect in this tab.
  const launchData = window.Telegram?.WebApp?.initData || sessionStorage.getItem(TELEGRAM_DATA_KEY) || "";
  if (launchData) sessionStorage.setItem(TELEGRAM_DATA_KEY, launchData);

  const container = document.getElementById("identity-links");
  const status = document.getElementById("identity-link-status");
  const googleButton = document.getElementById("link-google") as HTMLButtonElement | null;
  const telegramButton = document.getElementById("link-telegram") as HTMLButtonElement | null;
  if (!container || !status || !googleButton || !telegramButton) return;

  const elements = { googleButton, telegramButton, status };
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) throw error;
  const hasGitHub = session?.user.identities?.some((identity: { provider: string }) => identity.provider === "github");
  container.hidden = !hasGitHub;
  if (!session || !hasGitHub) return;
  const userId = session.user.id;

  async function refresh() {
    const { data, error } = await supabase.from("user_identities").select("provider").eq("user_id", userId);
    if (error) throw error;
    const providers = new Set(data.map((identity: { provider: string }) => identity.provider));
    const isGoogleLinked = providers.has("google");
    const isTelegramLinked = providers.has("telegram");
    elements.googleButton.disabled = isGoogleLinked;
    elements.googleButton.textContent = isGoogleLinked ? "Google Drive linked" : "Link Google Drive";
    elements.telegramButton.disabled = isTelegramLinked || !launchData;
    elements.telegramButton.textContent = isTelegramLinked ? "Telegram linked" : "Link Telegram";
    elements.status.textContent = !launchData && !isTelegramLinked
      ? "Open this page from the Telegram bot's Mini App to link Telegram."
      : "Your linked accounts identify your activity.";
  }

  function bindLink(button: HTMLButtonElement, action: () => Promise<void>) {
    button.addEventListener("click", () => {
      button.disabled = true;
      elements.status.textContent = "Linking account…";
      action().then(refresh).catch((error: unknown) => {
        button.disabled = false;
        elements.status.textContent = error instanceof Error ? error.message : "Unable to link account. Please try again.";
      });
    });
  }

  bindLink(googleButton, async () => {
    const redirect = new URL(window.location.href);
    redirect.hash = "";
    redirect.searchParams.set("auth_provider", "google");
    const { error } = await supabase.auth.linkIdentity({
      provider: "google",
      options: { redirectTo: redirect.href, scopes: "https://www.googleapis.com/auth/drive.readonly" },
    });
    if (error) throw error;
  });

  bindLink(telegramButton, async () => {
    const { error } = await supabase.functions.invoke("link-telegram", { body: { initData: launchData } });
    if (error) throw new Error("Telegram linking failed. Reopen the Mini App for fresh launch data and try again.");
    sessionStorage.removeItem(TELEGRAM_DATA_KEY);
  });

  await refresh().catch(() => {
    elements.status.textContent = "Unable to load linked accounts. Please try again later.";
  });
}
