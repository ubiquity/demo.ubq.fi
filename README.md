# UbiquityOS Demo Tool

A streamlined tool to help users set up and try UbiquityOS. The tool provides a simple 3-step process:

1. **GitHub Authentication**

   - Log in with GitHub using minimal permissions (public_repo scope only)
   - This allows creating a public demo repository

2. **Repository Setup**

   - Automatically creates a public demo repository in your GitHub account
   - Configures the repository with necessary UbiquityOS settings
   - Pushes initial configuration file

3. **Interactive Demo**
   - Install the UbiquityOS GitHub app to enable AI features
   - Start the interactive demo through a GitHub issue
   - Interact with the AI assistant to explore features

The demo environment is isolated and secure:

- Creates a separate demo repository
- Repository can be deleted at any time

## Features

- **Automated Setup**: One-click repository creation and configuration
- **Minimal Permissions**: Only requests essential GitHub access
- **Interactive Demo**: Guided exploration of UbiquityOS features
- **Secure Environment**: Isolated testing environment
- **Easy Cleanup**: Demo repository can be removed anytime

## How It Works

1. Click "Login with GitHub" to authenticate
2. The tool automatically creates and configures your demo repository
3. Click "Install App" to add UbiquityOS to your repository
4. Click "Start Demo" to begin the interactive demonstration
5. Follow the AI assistant's guidance in the GitHub issue

The demo showcases:

- AI-powered task matching
- Automated task pricing
- Real-time collaboration
- Smart contract integration

## Hosting (2026-10-12)

Served by the Cloudflare Workers static-assets worker `demo-ubq-fi`
(`wrangler.toml`), routed at `demo.ubq.fi/*`. The build needs the shared
Supabase values (`SUPABASE_URL`, `SUPABASE_ANON_KEY` ).
Deno Deploy is no longer used (shutdown April 2027).

## Unified identity linking

GitHub remains the primary login. After signing in, use **Link Google Drive** or
**Link Telegram** to associate accounts with the same Supabase user. The existing
GitHub demo flow continues to use a GitHub-specific token, cached only in the
current tab so a Google OAuth token is never sent to GitHub.

### Supabase setup

1. In a linked Supabase project, apply `supabase/migrations/20261101000000_user_identities.sql` to the project's
   database (for example with `supabase db push`). It backfills GitHub/Google
   identities, synchronizes subsequent auth identity changes, and enables
   owner-only reads. Browser clients cannot insert or update identity links.
2. Keep GitHub OAuth enabled. Enable the Google provider and **manual identity
   linking** in Supabase Auth. Configure the Google OAuth client with the Supabase
   Auth callback URL shown in the provider settings. Enable the Google Drive API
   and configure the consent screen for the requested `drive.readonly` scope.
3. Allow the demo origin in Supabase Auth's redirect URL settings, including the
   `?auth_provider=github` and `?auth_provider=google` callback variants. Use a
   separate, explicitly allowed localhost URL for development.
4. Configure a Telegram bot's Mini App to open this site's HTTPS URL. Set its bot
   token as the **server-only** `TELEGRAM_BOT_TOKEN` Supabase Edge Function secret,
   then deploy with `supabase functions deploy link-telegram`. Supabase provides
   `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` to the
   function; never expose the service-role key or bot token in the browser build.

Open the site through the Telegram Mini App, sign in with GitHub, and click
**Link Telegram**. Raw signed launch data survives OAuth only in the current
browser tab and expires after ten minutes; reopen the Mini App if linking fails.
The function validates the Supabase session, Telegram HMAC signature and launch
time before storing the Telegram ID. Each provider account can belong to only
one Supabase user; repeat linking by that user is idempotent.

`public.user_identities` maps `(provider, provider_id)` to the canonical `user_id`
for event attribution. It stores identity metadata, not OAuth tokens or raw
Telegram launch data. Google linking requests read-only Drive consent; background
Drive monitoring and long-lived provider-token storage are outside this flow.

Offline authentication checks (no external test dependencies):

```sh
deno test --no-config tests/github-session.test.ts supabase/functions/link-telegram/handler.test.ts
```
