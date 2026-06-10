import defaultConf from "../../types/default-configuration";
import {
  getSessionToken,
  gitHubLoginButtonHandler,
  googleLoginButtonHandler,
  linkTelegramIdentity,
  getTelegramUserData,
  checkIsTelegramWebApp,
  setupDemoEnvironment,
} from "./auth-context";
import { getLinkedIdentities } from "./identity-service";

/**
 * Updates the linked identities display in the toolbar.
 * Shows provider icons for each linked account.
 */
async function updateLinkedIdentitiesDisplay() {
  const linkedContainer = document.getElementById("linked-identities");
  const linkedProviders = document.getElementById("linked-providers");
  if (!linkedContainer || !linkedProviders) return;

  try {
    const identities = await getLinkedIdentities();
    if (identities.length > 0) {
      linkedContainer.style.display = "flex";
      linkedProviders.textContent = identities
        .map((id) => {
          switch (id.provider) {
            case "github":
              return "GitHub";
            case "google":
              return "Google";
            case "telegram":
              return "Telegram";
            default:
              return id.provider;
          }
        })
        .join(", ");
    } else {
      linkedContainer.style.display = "none";
    }
  } catch (error) {
    console.error("Error updating linked identities display:", error);
  }
}

/**
 * Attempts to auto-link Telegram identity if running in a Telegram WebView.
 */
async function tryAutoLinkTelegram() {
  const telegramUser = getTelegramUserData();
  if (!checkIsTelegramWebApp() || !telegramUser) return;

  console.log("Telegram WebView detected, attempting to link identity...");

  try {
    const result = await linkTelegramIdentity();
    if (result) {
      console.log("Telegram identity linked successfully:", result);
      await updateLinkedIdentitiesDisplay();
    }
  } catch (error) {
    console.error("Failed to auto-link Telegram identity:", error);
  }
}

/**
 * Sets up the identity linking UI controls after successful authentication.
 * Makes Google and Telegram link buttons visible.
 */
function showIdentityLinkingOptions() {
  const googleLink = document.getElementById("google-link") as HTMLDivElement;
  const telegramLink = document.getElementById("telegram-link") as HTMLDivElement;

  if (googleLink) {
    googleLink.style.display = "block";
    setTimeout(() => googleLink.classList.add("visible"), 50);
  }

  if (telegramLink) {
    // Only show Telegram button if not already in a Telegram WebView (auto-links)
    if (!checkIsTelegramWebApp()) {
      telegramLink.style.display = "block";
      setTimeout(() => telegramLink.classList.add("visible"), 50);
    }
  }
}

function initializeAuth() {
  const token = getSessionToken();
  const loginButton = document.getElementById("github-login") as HTMLDivElement;
  const gitHubLoginButton = document.getElementById("github-login-button") as HTMLButtonElement;

  // Add click handler to the GitHub button
  gitHubLoginButton.addEventListener("click", gitHubLoginButtonHandler);

  // Add click handler to the Google link button
  const googleLinkButton = document.getElementById("google-link-button") as HTMLButtonElement;
  if (googleLinkButton) {
    googleLinkButton.addEventListener("click", googleLoginButtonHandler);
  }

  // Add click handler to the Telegram link button
  const telegramLinkButton = document.getElementById("telegram-link-button") as HTMLButtonElement;
  if (telegramLinkButton) {
    telegramLinkButton.addEventListener("click", async () => {
      const result = await linkTelegramIdentity();
      if (result) {
        console.log("Telegram identity linked:", result);
        await updateLinkedIdentitiesDisplay();
      }
    });
  }

  // Show login button if not authenticated
  if (!token) {
    loginButton.classList.add("visible");
  } else if (loginButton) {
    // If we have a token, set up test environment
    setupDemoEnvironment(token, loginButton)
      .then(async () => {
        // After demo environment is set up, show identity linking options
        showIdentityLinkingOptions();
        await updateLinkedIdentitiesDisplay();
        await tryAutoLinkTelegram();
      })
      .catch(console.error);
  }
}

async function init() {
  if (defaultConf !== undefined) {
    try {
      initializeAuth();
    } catch (error) {
      console.error(error);
    }
  } else {
    throw new Error("Default config fetch failed");
  }
}

init().catch(console.error);

import { grid } from "../the-grid";
grid(document.getElementById("grid") as HTMLElement, () => document.body.classList.add("grid-loaded")); // @DEV: display grid background
