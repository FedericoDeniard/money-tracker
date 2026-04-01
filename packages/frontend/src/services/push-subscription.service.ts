import { getConfig } from "../config";
import { getSupabase } from "../lib/supabase";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Converts a base64url string to a Uint8Array.
 * Required by PushManager.subscribe() for the applicationServerKey.
 */
function urlBase64ToUint8Array(base64url: string): Uint8Array {
  const base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(
    base64.length + ((4 - (base64.length % 4)) % 4),
    "="
  );
  const raw = atob(padded);
  return Uint8Array.from(raw, c => c.charCodeAt(0));
}

// ─── Push support detection ───────────────────────────────────────────────────

/**
 * Returns true if the browser supports Web Push notifications.
 * Checks both the Notification API and PushManager availability.
 */
export function isPushSupported(): boolean {
  return (
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const PushSubscriptionService = {
  /**
   * Returns the current PushSubscription if the user is already subscribed,
   * or null if not subscribed or push is not supported.
   */
  async getSubscription(): Promise<PushSubscription | null> {
    if (!isPushSupported()) return null;

    const registration = await navigator.serviceWorker.ready;
    return registration.pushManager.getSubscription();
  },

  /**
   * Subscribes the current user to push notifications:
   * 1. Requests Notification permission
   * 2. Subscribes via PushManager using the VAPID public key
   * 3. Upserts the subscription into push_subscriptions table
   *
   * Throws if permission is denied or VAPID key is not configured.
   */
  async subscribe(): Promise<PushSubscription> {
    if (!isPushSupported()) {
      throw new Error("Push notifications are not supported in this browser");
    }

    // Request notification permission
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      throw new Error("Notification permission denied");
    }

    // Get the VAPID public key from config
    const config = await getConfig();
    if (!config.vapidPublicKey) {
      throw new Error(
        "Push notifications are not configured (missing VAPID_PUBLIC_KEY)"
      );
    }

    // Subscribe via the browser's PushManager
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(config.vapidPublicKey),
    });

    // Persist the subscription to the database
    const supabase = await getSupabase();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      throw new Error("User not authenticated");
    }

    const json = subscription.toJSON();
    const keys = json.keys as { p256dh: string; auth: string };

    const { error } = await supabase.from("push_subscriptions").upsert(
      {
        user_id: user.id,
        endpoint: subscription.endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
      },
      { onConflict: "endpoint" }
    );

    if (error) throw error;

    return subscription;
  },

  /**
   * Unsubscribes the current device from push notifications:
   * 1. Unsubscribes via the browser's PushManager
   * 2. Deletes the subscription from push_subscriptions table
   */
  async unsubscribe(): Promise<void> {
    if (!isPushSupported()) return;

    const subscription = await PushSubscriptionService.getSubscription();
    if (!subscription) return;

    // Unsubscribe in the browser first
    await subscription.unsubscribe();

    // Remove from database
    const supabase = await getSupabase();
    const { error } = await supabase
      .from("push_subscriptions")
      .delete()
      .eq("endpoint", subscription.endpoint);

    if (error) throw error;
  },
};
