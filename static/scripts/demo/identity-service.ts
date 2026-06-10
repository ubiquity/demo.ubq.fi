/**
 * IDENTITY LINKING SERVICE
 * Manages linked identities for the unified authentication system.
 * Supports linking Google Drive and Telegram identities to the current
 * Supabase-authenticated user.
 *
 * @module identity-service
 */

import { createClient, type User as SupabaseUser } from "@supabase/supabase-js";

declare const SUPABASE_URL: string;
declare const SUPABASE_ANON_KEY: string;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Represents a linked identity from an external provider.
 */
export interface LinkedIdentity {
  id?: string;
  provider: "github" | "google" | "telegram";
  provider_id: string;
  user_id: string;
  identity_data: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
}

/**
 * Represents Telegram user data extracted from Telegram.WebApp.
 */
export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  allows_write_to_pm?: boolean;
}

/**
 * Gets the current authenticated Supabase user.
 * @returns The current user or null if not authenticated
 */
export async function getCurrentUser(): Promise<SupabaseUser | null> {
  const { data } = await supabase.auth.getUser();
  return data?.user ?? null;
}

/**
 * Links a new identity to the currently authenticated Supabase user.
 *
 * Stores the linked identity in the `user_identities` table.
 * If the provider and provider_id already exist for this user, it updates the record.
 *
 * @param provider - The identity provider name
 * @param providerId - The unique identifier from the provider
 * @param identityData - Additional metadata from the provider
 * @returns The linked identity record, or null if the operation failed
 */
export async function linkIdentity(
  provider: "google" | "telegram",
  providerId: string,
  identityData: Record<string, unknown>
): Promise<LinkedIdentity | null> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      console.error("Cannot link identity: no authenticated user");
      return null;
    }

    const identity: Partial<LinkedIdentity> = {
      provider,
      provider_id: providerId,
      user_id: user.id,
      identity_data: identityData,
    };

    // Upsert: if a record with the same provider + user_id exists, update it
    const { data, error } = await supabase
      .from("user_identities")
      .upsert(identity, {
        onConflict: "user_id, provider",
        ignoreDuplicates: false,
      })
      .select()
      .single();

    if (error) {
      console.error("Error linking identity:", error);
      return null;
    }

    return data as LinkedIdentity;
  } catch (error) {
    console.error("Failed to link identity:", error);
    return null;
  }
}

/**
 * Retrieves all linked identities for the currently authenticated user.
 *
 * @returns An array of linked identities, or an empty array if none exist or an error occurred
 */
export async function getLinkedIdentities(): Promise<LinkedIdentity[]> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return [];
    }

    const { data, error } = await supabase
      .from("user_identities")
      .select("*")
      .eq("user_id", user.id);

    if (error) {
      console.error("Error fetching linked identities:", error);
      return [];
    }

    return (data as LinkedIdentity[]) ?? [];
  } catch (error) {
    console.error("Failed to get linked identities:", error);
    return [];
  }
}

/**
 * Removes a linked identity by its record ID.
 *
 * @param identityId - The ID of the identity record to remove
 * @returns True if the identity was successfully removed, false otherwise
 */
export async function unlinkIdentity(identityId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("user_identities")
      .delete()
      .eq("id", identityId);

    if (error) {
      console.error("Error unlinking identity:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Failed to unlink identity:", error);
    return false;
  }
}

/**
 * Extracts Telegram user data from the Telegram WebApp runtime.
 *
 * This function checks if the app is running inside Telegram's WebView
 * by looking for `window.Telegram.WebApp`. If available, it extracts
 * the user's identity data from the `initDataUnsafe.user` object.
 *
 * @returns The Telegram user data if available, or null if not in a Telegram WebView
 */
export function getTelegramUser(): TelegramUser | null {
  try {
    const webApp = (window as unknown as Record<string, unknown>).Telegram as
      | { WebApp?: { initDataUnsafe?: { user?: TelegramUser } } }
      | undefined;

    if (!webApp?.WebApp?.initDataUnsafe?.user) {
      return null;
    }

    return webApp.WebApp.initDataUnsafe.user;
  } catch {
    return null;
  }
}

/**
 * Detects whether the app is running inside Telegram's WebView.
 *
 * @returns True if running in a Telegram WebView, false otherwise
 */
export function isTelegramWebApp(): boolean {
  return getTelegramUser() !== null;
}
